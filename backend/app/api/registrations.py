from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List
import uuid

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin
from app.models.registration import Registration, RegistrationStatus
from app.models.event import Event, EventStatus
from app.models.user import User, UserRole
from app.schemas.registration import RegistrationCreate, RegistrationResponse

router = APIRouter(prefix="/registrations", tags=["Înregistrări"])

@router.post("/", response_model=RegistrationResponse, status_code=201)
async def register_to_event(
    data: RegistrationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verifică evenimentul
    event_result = await db.execute(select(Event).where(Event.id == data.event_id))
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Evenimentul nu există")
    if event.status != EventStatus.published:
        raise HTTPException(status_code=400, detail="Evenimentul nu este disponibil")
    if not event.requires_registration:
        raise HTTPException(status_code=400, detail="Evenimentul nu necesită înregistrare")

    # Verifică înregistrare existentă
    existing = await db.execute(
        select(Registration).where(
            Registration.event_id == data.event_id,
            Registration.user_id == current_user.id,
            Registration.status != RegistrationStatus.cancelled,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ești deja înregistrat la acest eveniment")

    # Verifică locuri disponibile
    reg_status = RegistrationStatus.registered
    if event.max_participants:
        count_result = await db.execute(
            select(func.count(Registration.id)).where(
                Registration.event_id == data.event_id,
                Registration.status == RegistrationStatus.registered,
            )
        )
        count = count_result.scalar()
        if count >= event.max_participants:
            reg_status = RegistrationStatus.waitlist

    registration = Registration(
        user_id=current_user.id,
        event_id=data.event_id,
        status=reg_status,
        ticket_code=str(uuid.uuid4())[:8].upper(),
    )
    db.add(registration)
    await db.commit()
    await db.refresh(registration)

    # Încarcă relațiile
    result = await db.execute(
        select(Registration)
        .options(
            selectinload(Registration.user),
            selectinload(Registration.event),
        )
        .where(Registration.id == registration.id)
    )
    return result.scalar_one()

@router.get("/my", response_model=List[RegistrationResponse])
async def my_registrations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Registration)
        .options(
            selectinload(Registration.user),
            selectinload(Registration.event),
        )
        .where(Registration.user_id == current_user.id)
        .order_by(Registration.registered_at.desc())
    )
    return result.scalars().all()

@router.delete("/{registration_id}", status_code=204)
async def cancel_registration(
    registration_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Registration).where(Registration.id == registration_id)
    )
    registration = result.scalar_one_or_none()
    if not registration:
        raise HTTPException(status_code=404, detail="Înregistrarea nu există")
    if registration.user_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Nu ai permisiuni")

    registration.status = RegistrationStatus.cancelled
    await db.commit()

@router.get("/event/{event_id}", response_model=List[RegistrationResponse])
async def event_registrations(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Evenimentul nu există")

    if current_user.role != UserRole.admin and event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Nu ai permisiuni")

    result = await db.execute(
        select(Registration)
        .options(
            selectinload(Registration.user),
            selectinload(Registration.event),
        )
        .where(Registration.event_id == event_id)
    )
    return result.scalars().all()

@router.post("/{registration_id}/checkin", response_model=RegistrationResponse)
async def checkin_registration(
    registration_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import datetime, timezone
    result = await db.execute(
        select(Registration)
        .options(
            selectinload(Registration.user),
            selectinload(Registration.event),
        )
        .where(Registration.id == registration_id)
    )
    registration = result.scalar_one_or_none()
    if not registration:
        raise HTTPException(status_code=404, detail="Înregistrarea nu există")

    if current_user.role != UserRole.admin and registration.event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Nu ai permisiuni")

    registration.checked_in = True
    registration.checked_in_at = datetime.now(timezone.utc)
    registration.status = RegistrationStatus.attended
    await db.commit()
    await db.refresh(registration)
    return registration