from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import settings

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="D11 API foundation for cricket match operations.",
)

# Allow all origins (including Vercel preview & production URLs)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def root_health():
    return {"status": "ok"}

app.include_router(router)
app.include_router(router, prefix="/api/v1")