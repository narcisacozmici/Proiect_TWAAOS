# USV Events — Documentație Instalare

## Cerințe sistem
- Docker Desktop 24+
- Docker Compose 2+
- Git

## Instalare rapidă

### 1. Clonare / dezarhivare proiect
```bash
# Dacă ai arhiva ZIP:
unzip usv-events.zip
cd usv-events

# Sau dacă ai repo Git:
git clone <url-proiect>
cd usv-events
```

### 2. Configurare variabile de mediu
```bash
cp .env.example .env
```
Editează `.env` și completează:
- `GOOGLE_CLIENT_ID` — din [Google Cloud Console](https://console.cloud.google.com/)
- `GOOGLE_CLIENT_SECRET` — din Google Cloud Console
- `SECRET_KEY` — generează cu: `python -c "import secrets; print(secrets.token_hex(32))"`
- `POSTGRES_PASSWORD` — o parolă sigură la alegere

### 3. Pornire aplicație
```bash
docker compose up --build
```
Prima pornire durează 2-3 minute (se construiesc imaginile).

### 4. Creare cont administrator
Deschide browser la `http://localhost:8000/docs`  
Folosește endpoint-ul `POST /api/v1/auth/create-admin` cu datele adminului dorit.

> **Notă de securitate:** Endpoint-ul `/create-admin` funcționează o singură dată — 
> după crearea primului admin devine inaccesibil automat.

### 5. Acces aplicație
| Serviciu | URL |
|----------|-----|
| Frontend | http://localhost |
| Backend API | http://localhost:8000 |
| Documentație API (Swagger) | http://localhost:8000/docs |

---

## Structura proiect
```
usv-events/
├── backend/          FastAPI + Python 3.12
│   ├── app/
│   │   ├── api/      Endpoint-uri REST
│   │   ├── models/   Modele SQLAlchemy
│   │   ├── schemas/  Scheme Pydantic
│   │   └── services/ Logică business
│   └── Dockerfile
├── frontend/         React + Vite + TailwindCSS
│   └── src/
├── nginx/            Reverse proxy
├── docker-compose.yml
├── .env              ← NU se comite în Git! (creat din .env.example)
└── .env.example      ← Template cu variabile necesare
```

## Tehnologii folosite
- **Backend:** FastAPI, Python 3.12, SQLAlchemy (async), PostgreSQL 16
- **Frontend:** React 18, Vite, TailwindCSS, React Router
- **Autentificare:** JWT, Google OAuth 2.0 (restricționat la @student.usv.ro)
- **Infrastructură:** Docker, Docker Compose, Nginx, Redis

## Funcționalități principale
- Vizualizare și filtrare avansată evenimente (categorie, dată, facultate, mod participare, etc.)
- Sortare după dată, titlu sau rating
- Export eveniment în Google Calendar sau fișier `.ics` (Outlook, Apple Calendar)
- Autentificare studenți via Google OAuth (@student.usv.ro)
- Autentificare organizatori/admin via email+parolă
- Creare/editare/ștergere evenimente cu validare admin
- Generare automată cod QR pentru fiecare eveniment
- Sistem de feedback/rating după autentificare
- Înregistrare la evenimente cu cod bilet și check-in
- Gestionare participanți + export CSV
- Rapoarte admin (statistici lunare, per organizator, rating mediu)
- Upload materiale și banner pentru evenimente

## Oprire aplicație
```bash
docker compose down
```

## Resetare completă (șterge și datele)
```bash
docker compose down -v
```
