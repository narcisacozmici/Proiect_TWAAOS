from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.models.event import Event, EventStatus
from app.models.registration import Registration, RegistrationStatus
from app.models.user import User, UserRole
from app.models.feedback import Feedback


async def get_general_stats(db: AsyncSession) -> dict:
    """Raport general: evenimente/lună, participare medie, evenimente per organizator."""

    # 1. Număr total de evenimente
    total_result = await db.execute(select(func.count(Event.id)))
    total_events = total_result.scalar() or 0

    # 2. Număr de utilizatori
    total_users_result = await db.execute(select(func.count(User.id)))
    total_users = total_users_result.scalar() or 0

    # 3. Evenimente pe lună (ultimele 12 luni)
    events_result = await db.execute(
        select(Event.start_date, Event.id)
        .where(Event.status != EventStatus.cancelled)
        .order_by(Event.start_date)
    )
    events_raw = events_result.all()

    monthly: dict = {}
    for row in events_raw:
        if row.start_date:
            key = row.start_date.strftime("%Y-%m")
            monthly[key] = monthly.get(key, 0) + 1
    monthly_report = [{"month": k, "count": v} for k, v in sorted(monthly.items())]

    # 4. Participare medie per eveniment (înregistrări confirmate)
    reg_result = await db.execute(
        select(Registration.event_id, func.count(Registration.id).label("cnt"))
        .where(Registration.status == RegistrationStatus.registered)
        .group_by(Registration.event_id)
    )
    reg_rows = reg_result.all()
    avg_participation = round(sum(r.cnt for r in reg_rows) / len(reg_rows), 2) if reg_rows else 0

    # 5. Evenimente per organizator
    org_result = await db.execute(
        select(User.id, User.full_name, User.email, func.count(Event.id).label("total"))
        .join(Event, Event.organizer_id == User.id)
        .where(User.role == UserRole.organizer)
        .group_by(User.id, User.full_name, User.email)
        .order_by(func.count(Event.id).desc())
    )
    organizer_stats = [
        {"id": r.id, "name": r.full_name or r.email, "total_events": r.total}
        for r in org_result.all()
    ]

    # 6. Rating mediu global
    avg_rating_result = await db.execute(
        select(func.avg(Feedback.rating))
    )
    avg_rating = round(float(avg_rating_result.scalar() or 0), 2)

    # 7. Statistici pe status
    status_result = await db.execute(
        select(Event.status, func.count(Event.id).label("cnt"))
        .group_by(Event.status)
    )
    status_stats = {str(r.status): r.cnt for r in status_result.all()}

    return {
        "total_events": total_events,
        "total_users": total_users,
        "monthly_report": monthly_report,
        "average_participation": avg_participation,
        "organizer_stats": organizer_stats,
        "average_rating": avg_rating,
        "events_by_status": status_stats,
    }
