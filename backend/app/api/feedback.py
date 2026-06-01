from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin
from app.models.feedback import Feedback
from app.models.event import Event
from app.models.registration import Registration, RegistrationStatus
from app.models.user import User, UserRole
from app.schemas.feedback import FeedbackCreate, FeedbackResponse

router = APIRouter(prefix="/feedback", tags=["Feedback"])

@router.get("/event/{event_id}", response_model=List[FeedbackResponse])
async def get_event_feedback(
    event_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Feedback).where(Feedback.event_id == event_id)
    )
    feedbacks = result.scalars().all()

    response = []
    for fb in feedbacks:
        user_result = await db.execute(select(User).where(User.id == fb.user_id))
        user = user_result.scalar_one_or_none()
        fb_dict = {
            "id": fb.id,
            "rating": fb.rating,
            "comment": fb.comment,
            "is_anonymous": fb.is_anonymous,
            "created_at": fb.created_at,
            "event_id": fb.event_id,
            "user": None if fb.is_anonymous else (
                {
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": user.role,
                    "is_active": user.is_active,
                    "avatar_url": user.avatar_url,
                    "created_at": user.created_at,
                } if user else None
            )
        }
        response.append(fb_dict)
    return response

@router.post("/event/{event_id}", response_model=FeedbackResponse, status_code=201)
async def create_feedback(
    event_id: int,
    data: FeedbackCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verifică că evenimentul există
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Evenimentul nu există")

    # Verifică că nu a mai lăsat feedback
    existing = await db.execute(
        select(Feedback).where(
            Feedback.event_id == event_id,
            Feedback.user_id == current_user.id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ai lăsat deja un feedback pentru acest eveniment")

    feedback = Feedback(
        user_id=current_user.id,
        event_id=event_id,
        rating=data.rating,
        comment=data.comment,
        is_anonymous=data.is_anonymous,
    )
    db.add(feedback)

    # Actualizează rating-ul mediu al evenimentului
    await db.commit()

    ratings_result = await db.execute(
        select(func.avg(Feedback.rating), func.count(Feedback.id))
        .where(Feedback.event_id == event_id)
    )
    avg_rating, count = ratings_result.one()
    event.avg_rating = round(float(avg_rating), 2)
    event.rating_count = count
    await db.commit()
    await db.refresh(feedback)

    return {
        "id": feedback.id,
        "rating": feedback.rating,
        "comment": feedback.comment,
        "is_anonymous": feedback.is_anonymous,
        "created_at": feedback.created_at,
        "event_id": feedback.event_id,
        "user": None if feedback.is_anonymous else {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "role": current_user.role,
            "is_active": current_user.is_active,
            "avatar_url": current_user.avatar_url,
            "created_at": current_user.created_at,
        }
    }

@router.delete("/{feedback_id}", status_code=204)
async def delete_feedback(
    feedback_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Feedback).where(Feedback.id == feedback_id))
    feedback = result.scalar_one_or_none()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback-ul nu există")

    if current_user.role != UserRole.admin and feedback.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Nu ai permisiuni")

    await db.delete(feedback)
    await db.commit()