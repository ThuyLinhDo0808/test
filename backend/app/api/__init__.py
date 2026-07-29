from fastapi import APIRouter
from app.api.chatbot import router as chatbot_router
from app.api.doc import router as doc_router
from app.api.admin import router as admin_routes
from app.api.tests import router as test_router

chat_router = APIRouter()
admin_router = APIRouter()

chat_router.include_router(chatbot_router, prefix="/chatbot", tags=["chatbot"])
admin_router.include_router(admin_routes, prefix="", tags=["admin"])
admin_router.include_router(doc_router, prefix="/doc", tags=["doc"])
