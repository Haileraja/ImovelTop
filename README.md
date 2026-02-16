
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
  