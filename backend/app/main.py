from fastapi.middleware.cors import CORSMiddleware
from .api import chat_router, admin_router, test_router
from .dependencies import lifespan
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.exception_handlers import request_validation_exception_handler

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router, prefix="/api/chat")
app.include_router(admin_router, prefix="/api/admin")
app.include_router(test_router, prefix="/test")


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    body = await request.body()
    print("\n=== [VALIDATION ERROR] ===")
    print("Path:", request.url.path)
    print("Method:", request.method)
    print("Headers:", dict(request.headers))
    print("Raw body:", body.decode("utf-8"))
    print("Validation errors:", exc.errors())
    print("==========================\n")
    return await request_validation_exception_handler(request, exc)
