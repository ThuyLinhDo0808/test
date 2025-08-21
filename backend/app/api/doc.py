import os
from uuid import uuid4
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
from celery.result import AsyncResult
from app.tasks.celery import document_indexing
from app.dependencies import get_vector_manager, get_sql_manager
from app.core import UPLOAD_DIR, ALLOWED_EXT
from app.services import VectorStoreManager

router = APIRouter()


@router.post("/upload_doc/")
async def upload_file(
    file: UploadFile = File(...), sql_manager=Depends(get_sql_manager)
):
    """
    Uploads a document (PDF or DOCX), processes its contents, and indexes it into the Chroma vector store.

    This endpoint accepts a file upload from the frontend, temporarily saves the file on the server,
    then spawn a worker task to read the file, parse its contents, and index it into the Chroma vector store.
    The file is deleted after processing to free up server space.
    This function also tracks the upload task in the database.

    Parameters
    ----------
    file (UploadFile): The uploaded file to be indexed. Only `.pdf` and `.docx` extensions are allowed.

    Returns
    -------
    dict: A dictionary containing the status message, original file_name and task_id.

    Raises
    ------
    HTTPException
        - 400: If the uploaded file type is not supported.
        - 500: If an error occurs during file reading, parsing, or vector store indexing.
    """
    file_name = file.filename
    ext = os.path.splitext(file_name)[-1].lower()
    print(f"Received file: {file_name} with extension {ext}")
    if ext not in ALLOWED_EXT:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Only .pdf and .docx are allowed.",
        )

    try:
        file_path = os.path.join(UPLOAD_DIR, f"{uuid4()}{ext}")

        with open(file_path, "wb") as f:
            contents = await file.read()
            f.write(contents)
            f.flush()

        file_size = len(contents)  # Size in bytes

        # Call the Celery task to process the file
        task = document_indexing.apply_async(args=[file_path, file_name])

        # Track in DB
        sql_manager.insert_upload_task(
            task_id=task.id,
            file_name=file_name,
            file_size=file_size,
            file_type=ext,
            status="PENDING",
        )

    except Exception as e:
        print(f"Error processing file {file_name}: {str(e)}")

        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

    return {
        "Status": "Document sent to background processing",
        "file_name": file_name,
        "task_id": task.id,
    }


@router.get("/get_task/{task_id}/")
async def get_status(task_id: str, sql_manager=Depends(get_sql_manager)) -> dict:
    """
    Retrieves the status of a Celery task using its task ID.
    This endpoint allows the user to check the status of a previously submitted task.
    This will automatically update the task status in the database if the task is finished.
    Args:
        task_id (str): The ID of the Celery task to check.

    Returns:
        dict: A dictionary containing the task ID and its current status.
    """
    task_result = AsyncResult(task_id)
    status = task_result.status

    # If task is finished (and DB status is still pending), update DB
    if status in {"SUCCESS", "FAILURE"}:
        try:
            sql_manager.update_task_status(task_id, status)
        except RuntimeError as e:
            raise HTTPException(status_code=500, detail=str(e))

    result = {
        "task_id": task_id,
        "task_status": task_result.status,
    }

    return result


@router.get("/pending_tasks/")
async def get_pending_tasks(sql_manager=Depends(get_sql_manager)):
    """
    Return all upload tasks with status 'PENDING'.
    Each task contains: task_id, file_name, file_size, file_type, status
    """
    tasks = sql_manager.get_pending_upload_tasks()
    return {"tasks": tasks}


@router.get("/get_all_tasks/")
async def get_all_tasks(sql_manager=Depends(get_sql_manager)):
    """
    Return all upload tasks.
    Each task contains: task_id, file_name, file_size, file_type, status
    """
    try:
        # Fetch all tasks from the database
        tasks = sql_manager.get_upload_tasks()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"tasks": tasks}


@router.delete("/delete_success_tasks/")
async def delete_success_tasks(sql_manager=Depends(get_sql_manager)):
    """
    Deletes all successful upload tasks from the database. (Clean the notification)
    This is used to clear completed tasks from the task tracking table.
    """
    try:
        sql_manager.delete_success_tasks()
        return {"message": "All successful upload tasks deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/delete_doc/{file_name}/")
async def delete_file(
    file_name: str, vector_manager: VectorStoreManager = Depends(get_vector_manager)
):
    """
    Deletes a document from the Chroma vector store and removes the file from disk.

    Args:
        file_name (str): The name of the document to delete.
    """
    # Fetch the document
    document = await vector_manager.get_doc_by_file_name(file_name)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Extract and normalize the physical path
    raw_path = document.get("physical_path")
    if not raw_path:
        raise HTTPException(status_code=400, detail="Missing physical path in metadata")

    if isinstance(raw_path, list):
        raw_path = raw_path[0]

    file_path = Path(UPLOAD_DIR) / raw_path
    file_path = file_path.resolve()

    # Safety check: ensure file is inside UPLOAD_DIR
    if not str(file_path).startswith(str(Path(UPLOAD_DIR).resolve())):
        raise HTTPException(status_code=403, detail="Invalid file path")

    # Try to delete the file
    try:
        os.remove(file_path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found on disk")
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Error deleting file: {str(e)}")

    # Delete from vector store
    await vector_manager.delete_doc_by_name(file_name)


@router.get("/all_docs/")
async def get_docs_list(
    vector_manager: VectorStoreManager = Depends(get_vector_manager),
):
    """
    Retrieves a list of all documents stored in the Chroma vector store.
    The documents are grouped by their source (e.g., file name)

    Returns
    -------
    dict: A dictionary containing the documents grouped by their source.

    """
    docs_by_source = await vector_manager.get_all_docs()

    return {"documents": docs_by_source}


@router.get("/download/{file_name}/")
async def download_file(
    file_name: str, vector_manager: VectorStoreManager = Depends(get_vector_manager)
) -> FileResponse:
    """
    Downloads a file from the server using its file name.

    Args:
        file_name (str): The name of the file to download.
    """
    # Fetch the document
    document = await vector_manager.get_doc_by_file_name(file_name)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Extract and normalize the physical path
    raw_path = document.get("physical_path")
    if not raw_path:
        raise HTTPException(status_code=400, detail="Missing physical path in metadata")

    if isinstance(raw_path, list):
        raw_path = raw_path[0]

    file_path = Path(UPLOAD_DIR) / raw_path
    file_path = file_path.resolve()

    # Safety check: ensure file is inside UPLOAD_DIR
    if not str(file_path).startswith(str(Path(UPLOAD_DIR).resolve())):
        raise HTTPException(status_code=403, detail="Invalid file path")

    return FileResponse(
        path=file_path, media_type="application/octet-stream", filename=file_name
    )
