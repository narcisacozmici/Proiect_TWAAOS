from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.schemas.user import UserResponse

class FeedbackCreate(BaseModel):
    rating: float = Field(..., ge=1.0, le=5.0)
    comment: Optional[str] = None
    is_anonymous: bool = False

class FeedbackResponse(BaseModel):
    id: int
    rating: float
    comment: Optional[str] = None
    is_anonymous: bool
    created_at: datetime
    user: Optional[UserResponse] = None
    event_id: int

    model_config = {"from_attributes": True}