from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.registration import RegistrationStatus
from app.schemas.user import UserResponse
from app.schemas.event import EventListResponse

class RegistrationCreate(BaseModel):
    event_id: int

class RegistrationResponse(BaseModel):
    id: int
    status: RegistrationStatus
    registered_at: datetime
    ticket_code: Optional[str] = None
    checked_in: bool
    checked_in_at: Optional[datetime] = None
    user: Optional[UserResponse] = None
    event: Optional[EventListResponse] = None

    model_config = {"from_attributes": True}