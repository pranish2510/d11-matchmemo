from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    timestamp: str
    ai_configured: bool
