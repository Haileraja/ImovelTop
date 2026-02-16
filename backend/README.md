Quickstart — Imobiliária FastAPI backend

1) Create & activate a virtual environment (macOS):

   python -m venv .venv
   source .venv/bin/activate

2) Install dependencies:

   pip install -r requirements.txt

3) Run the server:

   uvicorn backend.app.main:app --reload --port 8000

4) API endpoints (dev):

   GET  /properties
   GET  /properties/{id}
   POST /properties       (requires Bearer token of a `vendedor` or `admin`)
   DELETE /properties/{id} (requires Bearer token of `admin`)
   POST /auth/login      (body: {"role":"vendedor"|"admin"|"cliente"}) -> returns JWT + user

Notes:
- The project uses SQLite (file: imobiliaria.db) and is seeded on startup with demo users/properties.
- Security: the app now reads `SECRET_KEY` from `backend/.env` (or environment). Copy `backend/.env.example` -> `backend/.env` and set a strong SECRET_KEY before production.
- Docker: a `backend/Dockerfile` and top-level `docker-compose.yml` have been added for local containerized development.
