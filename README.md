# ImovelTop

ImovelTop is a small real-estate demo application built with a TypeScript React frontend (Vite) and a Python FastAPI backend (SQLModel + SQLite). The app provides property listings, user accounts (cliente, vendedor, admin), visit-request workflows, and image uploads.

## High-level overview
- Frontend: React + TypeScript, Vite, Tailwind CSS, Radix UI + lucide icons.
- Backend: FastAPI, SQLModel (SQLite), JWT auth, simple file uploads served from a local `uploads` folder.
- Data: SQLite DB located at `backend/app/imobiliaria.db` (created/seeded on startup).

## Main features
- Browse and filter properties (tipo, cidade, preço, tipologia).
- Login / register (demo login by role available at `/auth/login`).
- Clients can request visits for properties and include preferred date, time, and phone.
- Admin panel: view visit requests, approve/reject (with admin info), view users and properties.
- Vendors/Admins can add properties with main image + gallery uploads. Frontend shows file previews and upload progress.

## Project layout
- `src/` — frontend app (Vite + React)
  - `src/app/components/` — React components (PropertyCard, PropertyDetails, AddPropertyForm, AdminPanel, etc.)
  - `src/app/api.ts` — client API helpers for calling the backend
  - `src/app/types/` — shared TypeScript types
- `backend/app/` — FastAPI app
  - `backend/app/main.py` — API routes and startup logic
  - `backend/app/models.py` — SQLModel models (Property, User, VisitRequest)
  - `backend/app/initial_data.py` — seeding mock data (Mozambique towns, example users)
  - `backend/app/uploads/` — saved uploaded files (created at runtime)

## API summary
The backend is served at `http://localhost:8000` by default. Important endpoints:

- Authentication
  - `POST /auth/login` — demo login by role (body: `{ "role": "cliente" | "vendedor" | "admin" }`). Returns JWT + user.
  - `POST /auth/token` — login with email + password
  - `POST /auth/register` — register new user
  - `GET /auth/me` — current user info (Bearer token)

- Properties
  - `GET /properties` — list properties (supports filters)
  - `GET /properties/{property_id}` — get property
  - `POST /properties` — create property (JSON, requires `vendedor` or `admin`)
  - `DELETE /properties/{property_id}` — delete property (admin)
  - `POST /properties/upload` — multipart form endpoint to create properties with file uploads (fields + `imagem_file` and `galeria_files`)

- Visit requests
  - `POST /properties/{property_id}/visit-requests` — client requests a visit (accepts `preferred_date`, `preferred_time`, `phone`)
  - `GET /visit-requests` — admin lists all visit requests (includes `status`, `admin_id`, `admin_note`, `decided_at`)
  - `PATCH /visit-requests/{request_id}` — admin approve/reject a request (body: `{ status: 'approved' | 'rejected', admin_note?: string }`)

- Users
  - `GET /users` — admin lists users

Uploaded images are saved to `backend/app/uploads` and served at `/uploads/<filename>`.

## Running locally

Backend
```bash
cd backend/app
# start FastAPI
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Frontend
```bash
# from repo root
npm install
npm run dev
# open http://localhost:5174
```

Notes:
- If the backend adds new columns, startup logic attempts lightweight SQLite-friendly ALTER TABLE migrations.
- The backend creates and serves `backend/app/uploads` for file access.

## Example quick commands
- Demo login as client (returns token):
```bash
curl -X POST http://127.0.0.1:8000/auth/login -H 'Content-Type: application/json' -d '{"role":"cliente"}'
```

- Create visit request (client token required):
```bash
curl -X POST http://127.0.0.1:8000/properties/1/visit-requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"preferred_date":"2026-03-01","preferred_time":"15:30","phone":"+258841234567"}'
```

- Upload property with files (admin token required):
```bash
curl -X POST http://127.0.0.1:8000/properties/upload \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "titulo=Teste" -F "descricao=..." -F "tipo=venda" -F "preco=100000" \
  -F "imagem_file=@/path/to/main.jpg" -F "galeria_files=@/path/to/extra1.jpg" -F "galeria_files=@/path/to/extra2.jpg"
```

## Development notes & TODOs
- Add stricter server-side validation for uploaded images (types, max size) and for visit-request fields.
- Consider moving file storage to object storage (S3) for production and serving via CDN.
- Add client view for users to list their own visit requests.
- Improve admin UX (notes on approve/reject, email notifications, calendar integration).

## Contact / Further work
If you'd like, I can:
- Add client-side file-size/type validation and cancellation for uploads.
- Add image optimization/resizing server-side.
- Add tests and CI for backend migrations and API.

---
Generated on 2026-02-24 by the project maintainer helper.

  # Imobiliária app

  This is a code bundle for Imobiliária app. The original project is available at https://www.figma.com/design/PhkCl1hre67eL3Q7tr9tlx/Imobili%C3%A1ria-app.

  ## Running the code

  Run `npm i` to install the dependencies.

Run `npm run dev` to start the frontend development server.

Backend (FastAPI / SQLite):

1) Create virtualenv and install dependencies:

   python -m venv .venv
   source .venv/bin/activate
   pip install -r backend/requirements.txt

2) Copy `backend/.env.example` -> `backend/.env` and set a SECRET_KEY for local dev.

3) Start backend:

   uvicorn backend.app.main:app --reload --port 8000

Docker (backend):

  docker-compose up --build

The backend is available at http://localhost:8000 and the frontend at http://localhost:5173/.
  