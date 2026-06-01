from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime,
    Text, Enum, ForeignKey, Float
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base

class ParticipationMode(str, enum.Enum):
    fizic = "fizic"
    online = "online"
    hibrid = "hibrid"

class EventStatus(str, enum.Enum):
    draft = "draft"
    pending = "pending"       # așteaptă validare admin
    published = "published"
    cancelled = "cancelled"
    finished = "finished"

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)
    participation_mode = Column(
        Enum(ParticipationMode),
        default=ParticipationMode.fizic,
        nullable=False
    )
    status = Column(
        Enum(EventStatus),
        default=EventStatus.pending,
        nullable=False
    )

    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)

    registration_link = Column(String(500), nullable=True)
    registration_deadline = Column(DateTime(timezone=True), nullable=True)
    max_participants = Column(Integer, nullable=True)
    requires_registration = Column(Boolean, default=False)
    is_free = Column(Boolean, default=True)

    faculty = Column(String(255), nullable=True)  # facultate/departament organizator
    qr_code_path = Column(String(500), nullable=True)
    banner_path = Column(String(500), nullable=True)
    sponsors = Column(Text, nullable=True)  # JSON string

    # Rating mediu
    avg_rating = Column(Float, default=0.0)
    rating_count = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Chei externe
    organizer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

    # Relații
    organizer = relationship(
        "User", back_populates="organized_events",
        foreign_keys=[organizer_id]
    )
    category = relationship("Category", back_populates="events")
    materials = relationship(
        "EventMaterial", back_populates="event",
        cascade="all, delete-orphan"
    )
    registrations = relationship(
        "Registration", back_populates="event",
        cascade="all, delete-orphan"
    )
    feedbacks = relationship(
        "Feedback", back_populates="event",
        cascade="all, delete-orphan"
    )


class EventMaterial(Base):
    __tablename__ = "event_materials"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=True)  # pdf, image, pptx etc.
    file_size = Column(Integer, nullable=True)      # bytes
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("Event", back_populates="materials")