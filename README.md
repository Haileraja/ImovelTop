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
  
🔴 Problemas Críticos
#	Problema	Impacto
1	Sem validação de senha	Qualquer string vazia é aceita como password no registro
2	SQL Injection potencial no ilike	Os filtros cidade, search usam f-strings com %{value}% — SQLModel/SQLAlchemy parametriza, mas é má prática
3	Sem rate limiting	/auth/login, /auth/token, /auth/forgot-password podem ser brute-forced
4	Token JWT nunca expira de verdade	Se create_access_token não define exp, o token vive para sempre
5	/auth/login bypassa autenticação	Qualquer pessoa pode fazer login como admin só enviando {"role": "admin"} — isto é o "acesso rápido" mas é uma falha grave
6	COUNT via len() em memória	count_properties carrega TODOS os registros e faz len() em vez de SELECT COUNT(*)
7	Sem transação atômica nas operações compostas	Visit request + múltiplas notifications podem falhar parcialmente
8	Upload sem validação de tipo de ficheiro	Qualquer ficheiro (.exe, .php) pode ser carregado via /properties/upload
9	Schema migration via PRAGMA é frágil	Só funciona em SQLite, vai quebrar se mudar para PostgreSQL
🟡 Problemas de Arquitetura
#	Problema	Sugestão
10	Ficheiro monolítico (600+ linhas)	Dividir em routers: auth.py, properties.py, visits.py, chat.py, admin.py
11	Lógica de negócio nos endpoints	Extrair para uma camada services/
12	Sem paginação no chat/notifications/reviews	Com muitos dados, vai carregar tudo em memória
13	Imports dentro de funções	from security import verify_password e get_password_hash dentro de funções — deviam estar no topo
14	Sem logging	Nenhum log de erros, ações de admin, ou auditoria
15	response_model inconsistente	Alguns endpoints têm, outros retornam dict diretamente
🟢 Melhorias de Qualidade
#	Melhoria
16	Adicionar testes automatizados (pytest + httpx)
17	Usar Alembic para migrations em vez de PRAGMA
18	Adicionar health check endpoint (/health)
19	Limitar tamanho do upload (max 5MB por ficheiro)
20	Soft delete em vez de hard delete nos imóveis
21	Índices na DB para campos mais consultados (cidade, tipo, user_id)
22	Compressão de imagens no upload (pillow/tinify)

ase 1 (Segurança):
  - Validação de senha forte
  - Upload file type validation + size limit  
  - Remover /auth/login (acesso rápido inseguro) ou proteger com flag
  - Mover imports para o topo

Fase 2 (Arquitectura):
  - Dividir em routers (APIRouter)
  - Camada de services
  - COUNT real na DB
  - Paginação em chat/notifications

Fase 3 (Qualidade):
  - Logging com structlog
  - Health check
  - Testes com pytest
  - Alembic migrations

  🟢 Funcionalidades Novas
#	Feature	Valor
21	Simulador de crédito/financiamento	Widget que calcula prestação mensal com base no preço, entrada e taxa de juro
22	Agenda visual (calendário)	Ver agendamentos num calendário mensal em vez de lista
23	Galeria fullscreen com swipe	Abrir fotos em lightbox com navegação swipe (mobile-friendly)
24	QR Code do imóvel	Gerar QR code para partilhar/imprimir em panfletos
25	Marca d'água nas fotos	Proteger fotos dos imóveis com logo da plataforma
26	Exportar lista de imóveis em PDF/Excel	Para o admin/vendedor gerar relatórios
27	Sistema de comissões	Vendedor define comissão, admin acompanha
28	Contrato digital	Gerar contrato de arrendamento/compra pré-preenchido em PDF
29	Histórico de preços	Gráfico mostrando evolução do preço do imóvel
30	Integração WhatsApp	Botão "Enviar no WhatsApp" para partilhar imóvel diretamente

CRÍTICO (5 problemas)
#	Problema	Ficheiro
1	JWT Secret hardcoded — SECRET_KEY = 'CHANGE_THIS_SECRET_KEY' como fallback. Sem .env, qualquer atacante pode forjar tokens admin	security.py
2	Utilizadores desactivados mantêm acesso — get_current_user() nunca verifica is_active. Um user desactivado continua a usar o token até expirar (7 dias)	security.py
3	Rate limiting fraco — In-memory, reseta ao reiniciar, não partilhado entre workers, e cresce sem limite (memory leak)	main.py
4	Upload sem limite real de body — O ficheiro já foi carregado em memória antes do validate_upload correr. Um ficheiro de 500MB pode crashar o servidor	main.py
5	CORS com 20+ origens localhost — Em produção, qualquer página local pode fazer requests autenticados	main.py