# USV Events 🎓

Platformă centralizată pentru gestionarea evenimentelor universitare la Universitatea "Ștefan cel Mare" din Suceava.

## Descriere

USV Events permite studenților, organizatorilor și administratorilor să gestioneze eficient evenimentele universitare: conferințe, workshop-uri, seminarii, târguri de cariere și alte activități.

## Funcționalități principale

- Vizualizare și filtrare avansată a evenimentelor (categorie, dată, facultate, mod participare)
- Sortare după dată, titlu sau rating
- Export eveniment în Google Calendar sau fișier `.ics` (Outlook, Apple Calendar)
- Autentificare studenți via Google OAuth (`@student.usv.ro`)
- Autentificare organizatori/admin via email + parolă
- Creare/editare/ștergere evenimente cu validare admin
- Generare automată cod QR pentru fiecare eveniment
- Sistem de feedback și rating
- Înregistrare la evenimente cu cod bilet și check-in
- Export CSV participanți
- Rapoarte admin (statistici lunare, per organizator, rating mediu)

## Tehnologii folosite

| Componentă | Tehnologie |
|---|---|
| Backend | FastAPI + Python 3.12 + SQLAlchemy async |
| Frontend | React 18 + Vite + TailwindCSS |
| Bază de date | PostgreSQL 16 |
| Cache | Redis 7 |
| Reverse Proxy | Nginx |
| Infrastructură | Docker + Docker Compose |

## Cerințe sistem

- Docker Desktop 24+
- Docker Compose 2+
- Git

## Instalare rapidă

### 1. Clonare repository

```bash
git clone https://github.com/narcisacozmici/Proiect_TWAAOS.git
cd Proiect_TWAAOS
```

### 2. Configurare variabile de mediu

```bash
cp .env.example .env
```

Editați `.env` și completați:
- `SECRET_KEY` — șir random de minim 32 caractere
- `POSTGRES_PASSWORD` — parolă la alegere
- `GOOGLE_CLIENT_ID` și `GOOGLE_CLIENT_SECRET` — din [Google Cloud Console](https://console.cloud.google.com/)

### 3. Pornire aplicație

```bash
docker compose up --build
```

### 4. Creare cont administrator

Deschideți `http://localhost:8000/docs` și folosiți `POST /api/v1/auth/create-admin`.

### 5. Accesare aplicație

| Serviciu | URL |
|---|---|
| Frontend | http://localhost |
| Backend API | http://localhost:8000 |
| Documentație API | http://localhost:8000/docs |

## Structura proiectului

```
Proiect_TWAAOS/
├── backend/          # FastAPI + Python
├── frontend/         # React + Vite
├── nginx/            # Reverse proxy
├── docker-compose.yml
├── .env.example
├── INSTALARE.md
└── Documentatie_Instalare_USV_Events.pdf
```

## Documentație

Consultați fișierul `Documentatie_Instalare_USV_Events.pdf` pentru ghidul complet de instalare și configurare.

## Materie

TWAAOS-SIC — Universitatea "Ștefan cel Mare" din Suceava, 2025-2026
