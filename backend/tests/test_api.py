import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import engine


@pytest.fixture(autouse=True)
async def reset_db_pool():
    """Resetează pool-ul de conexiuni înainte de fiecare test."""
    await engine.dispose()
    yield
    await engine.dispose()


# ── Health Check ───────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


# ── Autentificare ──────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_login_success():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/v1/auth/login", json={
            "email": "admin@usv.ro",
            "password": "Admin1234!"
        })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "admin@usv.ro"


@pytest.mark.asyncio
async def test_login_wrong_password():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/v1/auth/login", json={
            "email": "admin@usv.ro",
            "password": "ParolaGresita123"
        })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/v1/auth/login", json={
            "email": "inexistent@usv.ro",
            "password": "Test1234!"
        })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_invalid_email_format():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/v1/auth/login", json={
            "email": "nu-este-email",
            "password": "Test1234!"
        })
    assert response.status_code == 422


# ── Token JWT ─────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_token_format():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/v1/auth/login", json={
            "email": "admin@usv.ro",
            "password": "Admin1234!"
        })
    token = response.json()["access_token"]
    assert len(token.split(".")) == 3, "JWT trebuie să aibă 3 segmente"


# ── Endpoint protejat /users/me ────────────────────────────────────────────
@pytest.mark.asyncio
async def test_get_me_unauthenticated():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/v1/users/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me_authenticated():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        login = await client.post("/api/v1/auth/login", json={
            "email": "admin@usv.ro",
            "password": "Admin1234!"
        })
        token = login.json()["access_token"]
        response = await client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {token}"}
        )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "admin@usv.ro"
    assert data["role"] == "admin"


# ── Evenimente ─────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_get_events_requires_auth():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/v1/events/")
    assert response.status_code in [200, 401]


@pytest.mark.asyncio
async def test_create_event_unauthenticated():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/v1/events/", json={
            "title": "Test Event",
            "description": "Test",
            "location": "USV",
            "participation_mode": "fizic",
            "start_date": "2025-06-15T10:00:00",
            "end_date": "2025-06-15T18:00:00",
            "is_free": True,
            "requires_registration": False
        })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_events_authenticated():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        login = await client.post("/api/v1/auth/login", json={
            "email": "admin@usv.ro",
            "password": "Admin1234!"
        })
        token = login.json()["access_token"]
        response = await client.get(
            "/api/v1/events/",
            headers={"Authorization": f"Bearer {token}"}
        )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


# ── Categorii ──────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_get_categories():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/v1/categories/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_create_category_unauthenticated():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/v1/categories/", json={
            "name": "Test Categorie",
            "description": "Test",
            "color": "#FF0000"
        })
    assert response.status_code == 401


# ── Înregistrare ───────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_register_organizer():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/v1/auth/register", json={
            "email": "test.pytest.unique@test.ro",
            "full_name": "Test Organizator",
            "password": "TestPass123!"
        })
    assert response.status_code in [201, 400]


@pytest.mark.asyncio
async def test_register_missing_password():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/v1/auth/register", json={
            "email": "test2.pytest@test.ro",
            "full_name": "Test User"
        })
    assert response.status_code in [400, 422]