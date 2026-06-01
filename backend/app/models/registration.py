from sqlalchemy import Column, Integer, ForeignKey, DateTime, Enum, Boolean, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base

class RegistrationStatus(str, enum.Enum):
    registered = "registered"
    waitlist = "waitlist"
    cancelled = "cancelled"
    attended = "attended"

class Registration(Base):
    __tablename__ = "registrations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    status = Column(
        Enum(RegistrationStatus),
        default=RegistrationStatus.registered,
        nullable=False
    )
    registered_at = Column(DateTime(timezone=True), server_default=func.now())
    ticket_code = Column(String(100), unique=True, nullable=True)
    checked_in = Column(Boolean, default=False)
    checked_in_at = Column(DateTime(timezone=True), nullable=True)

    # Relații
    user = relationship("User", back_populates="registrations")
    event = relationship("Event", back_populates="registrations")