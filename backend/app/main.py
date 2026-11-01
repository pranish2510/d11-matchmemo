from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import settings

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="D11 API foundation for cricket match operations.",
)

# 100% Robust CORS Policy: Works seamlessly locally and on Vercel production/previews
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins safely when credentials mode is disabled
    allow_credentials=False,  # MUST be False when allow_origins is ["*"] to prevent 400 preflight rejection
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def root_health():
    return {"status": "ok"}

app.include_router(router)
app.include_router(router, prefix="/api/v1")