"""
The VectorStoreManager class manages a vector store for document retrieval and FAQ storage.
It uses the Chroma library for vector storage and OllamaEmbeddings for embeddings.

Key Responsibilities
- Document Management: Uploads, retrieves, and deletes documents in the vector store.
- FAQ Management: Stores, retrieves, updates, and deletes FAQs.
- Text Splitting: Splits documents into smaller chunks for efficient storage.

Interactions
- Conversation Manager: Provides document retrieval capabilities for the ConversationManager.
- Chroma: Uses the Chroma library for vector storage.
- OllamaEmbeddings: Uses the OllamaEmbeddings library for embedding generation.

"""

import uuid
from pathlib import Path
from langchain_core.documents import Document
from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma
from langchain_community.vectorstores.utils import filter_complex_metadata
from langchain_community.document_loaders import (
    UnstructuredWordDocumentLoader,
    PyPDFLoader,
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.core import (
    EMBEDDING_MODEL_NAME,
    CHROMA_PERSISTS_DIR,
    COLLECTION_NAME,
    OLLAMA_BASE_URL,
    ALLOWED_EXT,
    CHUNK_OVERLAP,
    CHUNK_SIZE,
)
from app.models import FAQ


class VectorStoreManager:
    def __init__(
        self,
        model_name: str = EMBEDDING_MODEL_NAME,
        collection_name: str = COLLECTION_NAME,
        persist_directory: str = CHROMA_PERSISTS_DIR,
    ):
        """
        A wrapper class for initializing and managing a Chroma vector store using Ollama embeddings.
        It initializes a Chroma vector store instance using the specified embedding model and provides access
        to it via the `get_vectorstore` method.

        Args:
            model_name (str, optional): The LLM model name to load for embeddings. Defaults to EMBEDDING_MODEL_NAME. If you ever switch the embedding model, you will also need to re-embed the documents.
            collection_name (str, optional): The name of collection. Defaults to COLLECTION_NAME.
            persist_directory (str, optional): The directory for persiststence. Defaults to CHROMA_PERSISTS_DIR.
        """
        self.embeddings = OllamaEmbeddings(model=model_name, base_url=OLLAMA_BASE_URL)
        self.vector_store = Chroma(
            collection_name=collection_name,
            embedding_function=self.embeddings,
            persist_directory=persist_directory,
        )
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP
        )
        self.initialize_vectorstore()

    def initialize_vectorstore(self):
        """
        Initialize to prevent latency during the first request.
        """
        _ = self.vector_store.get()

    def get_vectorstore(self) -> Chroma:
        """
        Returns the initialized Chroma vector store instance.

        Returns:
            Chroma: The Chroma vector store object configured during initialization.
        """
        return self.vector_store

    def upload_doc(self, path: str, file_name: str):
        """
        Uploads a document to the Chroma vector store using the DoclingLoader and HybridChunker.
        The document is processed and its metadata is filtered before being added to the vector store.
        This function is synchronous and should be called in a background task.

        Args:
            path (str): The path to the document file to be uploaded.
            file_name (str): The name of the document file to be uploaded.

        Raises:
            ValueError: If an error occurs during processing.
            Exception: If an unexpected error occurs
        """
        try:
            ext = Path(path).suffix.lower()

            if ext == ALLOWED_EXT[0]:  # .pdf
                loader = PyPDFLoader(file_path=path)
            elif ext == ALLOWED_EXT[1]:  # .docx
                loader = UnstructuredWordDocumentLoader(path)

            documents = loader.lazy_load()
            documents = filter_complex_metadata(documents)

            # Remove "\n" from the text content
            # This is because PyPDFLoader kept adding "\n" to the text content
            # Or this is because of the file

            file_path = Path(path)

            for doc in documents:
                doc.metadata.update(
                    {
                        "source": file_name,
                        "physical_path": file_path.name,
                        "tag": "document",
                    }
                )

            splits = self.text_splitter.split_documents(documents)

            for doc in splits:
                doc.page_content = doc.page_content.replace("\n", " ")

            if not splits:
                raise ValueError("No valid document content found to upload.")
            else:
                self.vector_store.add_documents(splits)
        except ValueError as e:
            raise ValueError(f"{str(e)}")
        except Exception as e:
            raise Exception(f"An unexpected error occurred: {str(e)}")

    async def delete_doc_by_name(self, file_name: str):
        """
        Deletes a document from the Chroma vector store using its file name.

        Args:
            file_name (str): The name of the document to delete.
        """
        await self.vector_store.adelete(where={"source": file_name})

    async def get_all_docs(self) -> dict:
        """
        Get all documents from the vector store and organize them by their source.

        Returns:
            dict: A dictionary where keys are source names and values are lists of documents
        """
        docs = self.vector_store.get(where={"tag": "document"})

        documents = docs["documents"]
        metadatas = docs["metadatas"]

        docs_by_source = {}

        for doc, meta in zip(documents, metadatas):
            source = meta.get("source", "unknown")
            docs_by_source.setdefault(source, []).append(doc)

        return docs_by_source

    async def get_doc_by_file_name(self, file_name: str):
        """
        Get documents by file name from the vector store.

        Args:
            file_name (str): The name of the document to retrieve.
        """
        docs = self.vector_store.get(where={"source": file_name})

        documents = docs["documents"]
        metadatas = docs["metadatas"]

        docs_by_source = {}

        for doc, meta in zip(documents, metadatas):
            source = meta.get("source", "unknown")
            local_path = meta.get("physical_path", "unknown")
            docs_by_source.setdefault(source, []).append(doc)
            docs_by_source.setdefault("physical_path", []).append(local_path)

        return docs_by_source

    async def add_faq(self, faq: FAQ) -> dict:
        """
        Adds a FAQ to the vector store. The FAQ is converted into a document format
        and stored in the vector store with a unique ID.

        Args:
            faq (FAQ): The FAQ object containing the question and answer.

        Returns:
            dict: A dictionary containing the ID of the added FAQ and the FAQ object itself.
        """
        content = f'Question = "{faq.question}"\n' f'Answer = "{faq.answer}"\n'
        doc_id = str(uuid.uuid4())

        document = Document(
            page_content=content,
            metadata={
                "tag": "faq",
                "faq_id": doc_id,
                "question": faq.question,
                "answer": faq.answer,
            },
        )

        await self.vector_store.aadd_documents([document], ids=[doc_id])

        return {"id": doc_id, "faq": faq}

    async def get_faqs(self) -> dict:
        """
        Retrieves all FAQs from the vector store. The FAQs are filtered based on their metadata.

        Returns:
            dict: A dictionary containing a list of FAQs, each with its ID, question, and answer.
        """
        documents = self.vector_store.get(where={"tag": "faq"})
        # metadata already contains all we need
        metadatas = documents["metadatas"]

        return [
            {
                "id": meta["faq_id"],
                "question": meta["question"],
                "answer": meta["answer"],
            }
            for meta in metadatas
        ]

    async def delete_faq(self, faq_id: str) -> bool:
        """
        Deletes a FAQ from the vector store using its ID. The FAQ is identified by its unique ID.

        Args:
            faq_id (str): The ID of the FAQ to delete.

        Returns:
            bool: True if the FAQ was successfully deleted, False otherwise.
        """
        status = await self.vector_store.adelete(where={"faq_id": faq_id})
        return status

    async def update_faq(self, faq_id: str, faq: FAQ) -> dict:
        """
        Updates an existing FAQ in the vector store. The FAQ is converted into a document format

        Args:
            faq_id (str): The ID of the FAQ to update.
            faq (FAQ): The FAQ object containing the updated question and answer.

        Returns:
            dict: A dictionary containing the ID of the updated FAQ and the updated FAQ object.
        """
        content = (
            f"Type: FAQ Entry\n"
            f"Category: FAQ\n"
            f'Question = "{faq.question}"\n'
            f'Answer = "{faq.answer}"\n'
        )

        document = Document(
            page_content=content,
            metadata={
                "tag": "faq",
                "faq_id": faq_id,
                "question": faq.question,
                "answer": faq.answer,
            },
        )

        self.vector_store.update_document(faq_id, document)
        return {"id": faq_id, "faq": faq}


class RAPTOR:
    pass
