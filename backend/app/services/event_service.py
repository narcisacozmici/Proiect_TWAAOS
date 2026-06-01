from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, asc
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime

from app.models.event import Event, EventStatus, EventMaterial
from app.models.user import User, UserRole
from app.schemas.event import EventCreate, EventUpdate

async def get_events(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 20,
    category_id: Optional[int] = None,
    participation_mode: Optional[str] = None,
    search: Optional[str] = None,
    organizer_id: Optional[int] = None,
    faculty: Optional[str] = None,
    start_date_from: Optional[datetime] = None,
    start_date_to: Optional[datetime] = None,
    is_free: Optional[bool] = None,
    requires_registration: Optional[bool] = None,
    has_qr: Optional[bool] = None,
    sort_by: Optional[str] = "start_date",
    sort_order: Optional[str] = "asc",
    status: Optional[str] = None,
    current_user: Optional[User] = None,
) -> List[Event]:
    query = select(Event).options(
        selectinload(Event.organizer),
        selectinload(Event.category),
        selectinload(Event.materials),
    )

    filters = []

    # Filtrare după rol
    if current_user and current_user.role == UserRole.admin:
        if status:
            filters.append(Event.status == status)
    elif current_user and current_user.role == UserRole.organizer:
        if status:
            filters.append(Event.status == status)
        else:
            filters.append(or_(
                Event.status == EventStatus.published,
                Event.organizer_id == current_user.id
            ))
    else:
        filters.append(Event.status == EventStatus.published)

    if category_id:
        filters.append(Event.category_id == category_id)
    if participation_mode:
        filters.append(Event.participation_mode == participation_mode)
    if organizer_id:
        filters.append(Event.organizer_id == organizer_id)
    if faculty:
        filters.append(Event.faculty.ilike(f"%{faculty}%"))
    if start_date_from:
        filters.append(Event.start_date >= start_date_from)
    if start_date_to:
        filters.append(Event.start_date <= start_date_to)
    if is_free is not None:
        filters.append(Event.is_free == is_free)
    if requires_registration is not None:
        filters.append(Event.requires_registration == requires_registration)
    if has_qr is not None:
        if has_qr:
            filters.append(Event.qr_code_path.isnot(None))
        else:
            filters.append(Event.qr_code_path.is_(None))
    if search:
        filters.append(or_(
            Event.title.ilike(f"%{search}%"),
            Event.description.ilike(f"%{search}%"),
            Event.location.ilike(f"%{search}%"),
            Event.faculty.ilike(f"%{search}%"),
        ))

    if filters:
        query = query.where(and_(*filters))

    # Sortare
    sort_columns = {
        "start_date": Event.start_date,
        "title": Event.title,
        "avg_rating": Event.avg_rating,
        "created_at": Event.created_at,
    }
    sort_col = sort_columns.get(sort_by, Event.start_date)
    order_fn = desc if sort_order == "desc" else asc
    query = query.order_by(order_fn(sort_col)).offset(skip).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


async def get_event_by_id(db: AsyncSession, event_id: int) -> Optional[Event]:
    result = await db.execute(
        select(Event)
        .options(
            selectinload(Event.organizer),
            selectinload(Event.category),
            selectinload(Event.materials),
        )
        .where(Event.id == event_id)
    )
    return result.scalar_one_or_none()


async def create_event(
    db: AsyncSession,
    data: EventCreate,
    organizer: User,
) -> Event:
    event = Event(
        **data.model_dump(),
        organizer_id=organizer.id,
        status=EventStatus.pending if organizer.role == UserRole.organizer else EventStatus.published,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return await get_event_by_id(db, event.id)


async def update_event(
    db: AsyncSession,
    event: Event,
    data: EventUpdate,
) -> Event:
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(event, key, value)
    await db.commit()
    await db.refresh(event)
    return await get_event_by_id(db, event.id)


async def delete_event(db: AsyncSession, event: Event) -> None:
    await db.delete(event)
    await db.commit()


async def approve_event(db: AsyncSession, event: Event) -> Event:
    event.status = EventStatus.published
    await db.commit()
    await db.refresh(event)
    return event


async def reject_event(db: AsyncSession, event: Event) -> Event:
    event.status = EventStatus.cancelled
    await db.commit()
    await db.refresh(event)
    return event
