from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta
import httpx

from app.core.database import get_db
from app.core.security import (
    verify_password, get_password_hash,
    create_access_token
)
from app.core.config import settings
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserLogin, Token, UserResponse

router = APIRouter(prefix="/auth", tags=["Autentificare"])

@router.post("/login", response_model=Token)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    """
    Autentifică un utilizator cu email și parolă.

    Args:
        data (UserLogin): Obiect cu câmpurile email și password.
        db (AsyncSession): Sesiunea asincronă a bazei de date.

    Returns:
        Token: Token JWT de acces, tipul tokenului și datele utilizatorului.

    Raises:
        HTTPException 401: Dacă email-ul sau parola sunt incorecte.
        HTTPException 403: Dacă contul utilizatorului este dezactivat.

    Example::

        POST /api/v1/auth/login
        Body: {"email": "admin@usv.ro", "password": "Admin1234!"}
    """
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email sau parola incorecta"
        )
    if not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email sau parola incorecta"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cont dezactivat"
        )

    token = create_access_token(
        data={"sub": str(user.id), "role": user.role.value},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register_organizer(data: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email deja inregistrat"
        )

    if not data.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Parola este obligatorie"
        )

    user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=get_password_hash(data.password),
        role=UserRole.organizer,
        is_active=True,
        is_verified=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(
        data={"sub": str(user.id), "role": user.role.value}
    )
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/google/login")
async def google_login():
    google_auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={settings.GOOGLE_REDIRECT_URI}"
        "&response_type=code"
        "&scope=openid email profile"
        "&access_type=offline"
    )
    return RedirectResponse(url=google_auth_url)

@router.get("/google/callback")
async def google_callback(code: str, db: AsyncSession = Depends(get_db)):
    async with httpx.AsyncClient(timeout=30.0) as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            }
        )
        token_data = token_response.json()

        if "error" in token_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Eroare Google OAuth: {token_data['error']}"
            )

        user_response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {token_data['access_token']}"}
        )
        google_user = user_response.json()

    email = google_user.get("email", "")

    if not email.endswith("@student.usv.ro"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doar adresele @student.usv.ro sunt acceptate"
        )

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            email=email,
            full_name=google_user.get("name"),
            google_id=google_user.get("id"),
            avatar_url=google_user.get("picture"),
            role=UserRole.student,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        user.google_id = google_user.get("id")
        user.avatar_url = google_user.get("picture")
        if google_user.get("name"):
            user.full_name = google_user.get("name")
        await db.commit()
        await db.refresh(user)

    token = create_access_token(
    data={
        "sub": str(user.id),
        "role": user.role.value,
        "email": user.email,
        "full_name": user.full_name or "",
    }
)

    return RedirectResponse(
        url=f"{settings.FRONTEND_URL}/auth/callback?token={token}"
    )

@router.post("/create-admin", response_model=UserResponse, status_code=201)
async def create_admin(data: UserCreate, db: AsyncSession = Depends(get_db)):
    """
    Creează primul cont de administrator.
    Acest endpoint funcționează DOAR dacă nu există niciun admin în baza de date.
    După crearea primului admin, endpoint-ul devine inaccesibil.
    """
    # Verifică dacă există deja un admin
    existing_admin = await db.execute(select(User).where(User.role == UserRole.admin))
    if existing_admin.scalar_one_or_none():
        raise HTTPException(
            status_code=403,
            detail="Un administrator există deja. Contactați administratorul curent."
        )

    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(400, detail="Email deja inregistrat")

    user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=get_password_hash(data.password),
        role=UserRole.admin,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)
# Notă: /create-admin este protejat — funcționează DOAR dacă nu există niciun admin în DB
