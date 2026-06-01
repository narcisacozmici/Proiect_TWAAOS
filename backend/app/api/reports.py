from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import csv
import io

from app.core.database import get_db
from app.core.dependencies import require_admin, get_current_user
from app.models.registration import Registration
from app.models.event import Event
from app.models.user import User, UserRole
from app.services.reports import get_general_stats

router = APIRouter(prefix="/reports", tags=["Rapoarte"])


@router.get("/stats")
async def general_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Raport general pentru administrator."""
    return await get_general_stats(db)


@router.get("/events/{event_id}/participants/export")
async def export_participants_csv(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export CSV cu participanții unui eveniment (organizator sau admin)."""

    # Verifică că evenimentul există și utilizatorul are permisiuni
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    if not event:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Evenimentul nu există")

    if current_user.role != UserRole.admin and event.organizer_id != current_user.id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Nu ai permisiuni")

    # Preia înregistrările cu date utilizator
    reg_result = await db.execute(
        select(Registration)
        .options(selectinload(Registration.user))
        .where(Registration.event_id == event_id)
        .order_by(Registration.registered_at)
    )
    registrations = reg_result.scalars().all()

    # Generează CSV în memorie
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Nr.", "Nume", "Email", "Status", "Cod bilet", "Data inscrierii", "Check-in"])

    for i, reg in enumerate(registrations, 1):
        user = reg.user
        writer.writerow([
            i,
            user.full_name if user else "-",
            user.email if user else "-",
            reg.status.value,
            reg.ticket_code or "-",
            reg.registered_at.strftime("%d.%m.%Y %H:%M") if reg.registered_at else "-",
            "Da" if reg.checked_in else "Nu",
        ])

    output.seek(0)
    filename = f"participanti_eveniment_{event_id}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
