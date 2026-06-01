from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.event import ParticipationMode, EventStatus
from app.schemas.category import CategoryResponse
from app.schemas.user import UserResponse

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    faculty: Optional[str] = None
    participation_mode: ParticipationMode = ParticipationMode.fizic
    start_date: datetime
    end_date: datetime
    category_id: Optional[int] = None
    registration_link: Optional[str] = None
    registration_deadline: Optional[datetime] = None
    max_participants: Optional[int] = None
    requires_registration: bool = False
    is_free: bool = True
    sponsors: Optional[str] = None

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    faculty: Optional[str] = None
    participation_mode: Optional[ParticipationMode] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    category_id: Optional[int] = None
    registration_link: Optional[str] = None
    registration_deadline: Optional[datetime] = None
    max_participants: Optional[int] = None
    requires_registration: Optional[bool] = None
    is_free: Optional[bool] = None
    sponsors: Optional[str] = None
    status: Optional[EventStatus] = None

class MaterialResponse(BaseModel):
    id: int
    filename: str
    file_path: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    uploaded_at: datetime

    model_config = {"from_attributes": True}

class EventResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    faculty: Optional[str] = None
    participation_mode: ParticipationMode
    status: EventStatus
    start_date: datetime
    end_date: datetime
    registration_link: Optional[str] = None
    registration_deadline: Optional[datetime] = None
    max_participants: Optional[int] = None
    requires_registration: bool
    is_free: bool
    qr_code_path: Optional[str] = None
    banner_path: Optional[str] = None
    sponsors: Optional[str] = None
    avg_rating: float
    rating_count: int
    created_at: datetime
    organizer: Optional[UserResponse] = None
    category: Optional[CategoryResponse] = None
    materials: List[MaterialResponse] = []

    model_config = {"from_attributes": True}

class EventListResponse(BaseModel):
    id: int
    title: str
    location: Optional[str] = None
    faculty: Optional[str] = None
    participation_mode: ParticipationMode
    status: EventStatus
    start_date: datetime
    end_date: datetime
    is_free: bool
    requires_registration: bool
    avg_rating: float
    qr_code_path: Optional[str] = None
    banner_path: Optional[str] = None
    category: Optional[CategoryResponse] = None
    organizer: Optional[UserResponse] = None

    model_config = {"from_attributes": True}

class EventFilter(BaseModel):
    category_id: Optional[int] = None
    participation_mode: Optional[ParticipationMode] = None
    organizer_id: Optional[int] = None
    faculty: Optional[str] = None
    start_date_from: Optional[datetime] = None
    start_date_to: Optional[datetime] = None
    is_free: Optional[bool] = None
    requires_registration: Optional[bool] = None
    has_qr: Optional[bool] = None
    search: Optional[str] = None
    status: Optional[EventStatus] = EventStatus.published
