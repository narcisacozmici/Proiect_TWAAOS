from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import aiofiles
import os
import uuid
from datetime import datetime

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_organizer, require_admin
from app.models.user import User, UserRole
from app.models.event import Event, EventMaterial, EventStatus
from app.schemas.event import EventCreate, EventUpdate, EventResponse, EventListResponse
from app.services import event_service
from app.utils.qr_generator import generate_qr_code

router = APIRouter(prefix="/events", tags=["Evenimente"])


@router.get("/", response_model=List[EventListResponse])
async def list_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    category_id: Optional[int] = Query(None),
    participation_mode: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    organizer_id: Optional[int] = Query(None),
    faculty: Optional[str] = Query(None),
    start_date_from: Optional[datetime] = Query(None),
    start_date_to: Optional[datetime] = Query(None),
    is_free: Optional[bool] = Query(None),
    requires_registration: Optional[bool] = Query(None),
    has_qr: Optional[bool] = Query(None),
    sort_by: Optional[str] = Query("start_date", description="start_date, title, avg_rating"),
    sort_order: Optional[str] = Query("asc", description="asc sau desc"),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    return await event_service.get_events(
        db=db,
        skip=skip,
        limit=limit,
        category_id=category_id,
        participation_mode=participation_mode,
        search=search,
        organizer_id=organizer_id,
        faculty=faculty,
        start_date_from=start_date_from,
        start_date_to=start_date_to,
        is_free=is_free,
        requires_registration=requires_registration,
        has_qr=has_qr,
        sort_by=sort_by,
        sort_order=sort_order,
        status=status,
        current_user=current_user,
    )


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
):
    event = await event_service.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Evenimentul nu există")
    return event


@router.get("/{event_id}/export-ics")
async def export_ics(
    event_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Exportă evenimentul ca fișier .ics (iCalendar) pentru orice calendar."""
    event = await event_service.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Evenimentul nu există")

    def fmt_dt(dt: datetime) -> str:
        return dt.strftime("%Y%m%dT%H%M%SZ")

    description = (event.description or "").replace("\n", "\\n").replace(",", "\\,")
    location = (event.location or "").replace(",", "\\,")
    organizer_name = ""
    if event.organizer:
        organizer_name = event.organizer.full_name or event.organizer.email

    ics_content = "\r\n".join([
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//USV Events//RO",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        f"UID:{event.id}@usv-events",
        f"DTSTAMP:{fmt_dt(datetime.utcnow())}",
        f"DTSTART:{fmt_dt(event.start_date)}",
        f"DTEND:{fmt_dt(event.end_date)}",
        f"SUMMARY:{event.title}",
        f"DESCRIPTION:{description}",
        f"LOCATION:{location}",
        f"ORGANIZER;CN={organizer_name}:MAILTO:{event.organizer.email if event.organizer else ''}",
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR",
        "",
    ])

    filename = f"event_{event.id}.ics"
    return Response(
        content=ics_content,
        media_type="text/calendar",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/", response_model=EventResponse, status_code=201)
async def create_event(
    data: EventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organizer),
):
    event = await event_service.create_event(db, data, current_user)

    try:
        qr_path = await generate_qr_code(
            event_id=event.id,
            event_title=event.title,
        )
        event.qr_code_path = qr_path
        await db.commit()
    except Exception:
        pass

    return await event_service.get_event_by_id(db, event.id)


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: int,
    data: EventUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await event_service.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Evenimentul nu există")

    if current_user.role != UserRole.admin and event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Nu ai permisiuni")

    return await event_service.update_event(db, event, data)


@router.delete("/{event_id}", status_code=204)
async def delete_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await event_service.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Evenimentul nu există")

    if current_user.role != UserRole.admin and event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Nu ai permisiuni")

    await event_service.delete_event(db, event)


@router.post("/{event_id}/approve", response_model=EventResponse)
async def approve_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    event = await event_service.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Evenimentul nu există")
    return await event_service.approve_event(db, event)


@router.post("/{event_id}/reject", response_model=EventResponse)
async def reject_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    event = await event_service.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Evenimentul nu există")
    return await event_service.reject_event(db, event)


@router.post("/{event_id}/upload-banner", response_model=EventResponse)
async def upload_banner(
    event_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await event_service.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Evenimentul nu există")

    if current_user.role != UserRole.admin and event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Nu ai permisiuni")

    ext = file.filename.split(".")[-1].lower()
    if ext not in ["jpg", "jpeg", "png", "webp"]:
        raise HTTPException(status_code=400, detail="Format invalid. Acceptat: jpg, png, webp")

    filename = f"{uuid.uuid4()}.{ext}"
    path = f"media/events/{filename}"

    async with aiofiles.open(path, "wb") as f:
        content = await file.read()
        await f.write(content)

    event.banner_path = f"/media/events/{filename}"
    await db.commit()

    return await event_service.get_event_by_id(db, event_id)


@router.post("/{event_id}/materials", response_model=EventResponse)
async def upload_material(
    event_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await event_service.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Evenimentul nu există")

    if current_user.role != UserRole.admin and event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Nu ai permisiuni")

    filename = f"{uuid.uuid4()}_{file.filename}"
    path = f"media/materials/{filename}"

    async with aiofiles.open(path, "wb") as f:
        content = await file.read()
        await f.write(content)

    material = EventMaterial(
        event_id=event_id,
        filename=file.filename,
        file_path=f"/media/materials/{filename}",
        file_type=file.filename.split(".")[-1].lower(),
        file_size=len(content),
    )
    db.add(material)
    await db.commit()

    return await event_service.get_event_by_id(db, event_id)
