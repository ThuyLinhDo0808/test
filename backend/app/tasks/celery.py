from celery import Celery
from app.core import CELERY_BROKER_URL, CELERY_RESULT_BACKEND
from app.dependencies import get_vector_manager

celery = Celery("worker", broker=CELERY_BROKER_URL, backend=CELERY_RESULT_BACKEND)


@celery.task(name="document_indexing")
def document_indexing(path: str, file_name: str):
    """
    Uploads a document to the Chroma vector store using the DoclingLoader and HybridChunker using a background task.
    Args:
        path (str): The path to the document file to be uploaded.
        file_name (str): The name of the document file to be uploaded.

    Raises:
        ValueError: If an error occurs during processing.
        Exception: If an unexpected error occurs
    """
    vector_manager = get_vector_manager()

    try:
        vector_manager.upload_doc(path, file_name)

    except ValueError as e:
        raise ValueError(f"Error processing file: {str(e)}")
    except Exception as e:
        raise Exception(f"Upload failed: {str(e)}")
    finally:
        print(f"Document {file_name} indexed successfully.")
