import os
import re
import json
import shutil
import random
import logging
import time
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from uuid import uuid4
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Form, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, field_validator
from sqlmodel import Session, select
from sqlalchemy import func, text
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from database import create_db_and_tables, engine, get_session
from models import (
    Property, User, VisitRequest, Favorite, Notification,
    ChatMessage, Review, PasswordResetToken, EmailVerification,
    Cliente, Vendedor, PriceHistory,
)
from initial_data import seed
from security import (
    create_access_token, get_current_user, require_roles,
    verify_password, get_password_hash,
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("imobiliaria")

# ---------------------------------------------------------------------------
# Mailtrap SMTP Sandbox config
# ---------------------------------------------------------------------------
SMTP_HOST = os.getenv("SMTP_HOST", "sandbox.smtp.mailtrap.io")
SMTP_PORT = int(os.getenv("SMTP_PORT", "2525"))
SMTP_USER = os.getenv("SMTP_USER", "0188c1a5fe0b2d")
SMTP_PASS = os.getenv("SMTP_PASS", "4012e4cd689d55")
MAILTRAP_SENDER_EMAIL = os.getenv("MAILTRAP_SENDER_EMAIL", "noreply@imoveltop.co.mz")
MAILTRAP_SENDER_NAME = os.getenv("MAILTRAP_SENDER_NAME", "ImovelTop")

# Upload constraints
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_UPLOAD_SIZE_MB = 10
MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024
MAX_REQUEST_BODY_MB = 50  # total multipart body limit (multiple images)
MAX_REQUEST_BODY_BYTES = MAX_REQUEST_BODY_MB * 1024 * 1024

# Password policy
MIN_PASSWORD_LENGTH = 5

# ---------------------------------------------------------------------------
# Rate limiting (in-memory, bounded)
# ---------------------------------------------------------------------------
_rate_limit_store: Dict[str, List[float]] = defaultdict(list)
_RATE_LIMIT_MAX_KEYS = 10_000  # prevent unbounded growth
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX = 10  # max requests per window


def check_rate_limit(key: str, max_requests: int = RATE_LIMIT_MAX, window: int = RATE_LIMIT_WINDOW) -> None:
    """Raise 429 if the key has exceeded max_requests in the last `window` seconds."""
    now = time.time()
    timestamps = _rate_limit_store[key]
    # prune old entries
    _rate_limit_store[key] = [t for t in timestamps if now - t < window]
    if len(_rate_limit_store[key]) >= max_requests:
        raise HTTPException(status_code=429, detail="Demasiadas tentativas. Tente novamente mais tarde.")
    _rate_limit_store[key].append(now)
    # Periodic cleanup: remove stale keys when store grows too large
    if len(_rate_limit_store) > _RATE_LIMIT_MAX_KEYS:
        stale_keys = [k for k, v in _rate_limit_store.items() if not v or now - v[-1] > window]
        for k in stale_keys:
            del _rate_limit_store[k]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def user_to_dict(user: User) -> Dict[str, Any]:
    return {
        "id": user.id,
        "nome": user.nome,
        "email": user.email,
        "role": user.role,
        "phone": user.phone,
        "is_active": user.is_active,
    }


def validate_date_string(value: str) -> str:
    """Validate ISO date (YYYY-MM-DD). Raises ValueError on bad format or past dates."""
    try:
        d = datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        raise ValueError("Data inválida. Use o formato AAAA-MM-DD.")
    if d < date.today():
        raise ValueError("A data não pode ser no passado.")
    return value


def validate_time_string(value: str) -> str:
    """Validate time (HH:MM). Raises ValueError on bad format or outside 08:00-17:00."""
    if not re.match(r"^\d{2}:\d{2}$", value):
        raise ValueError("Hora inválida. Use o formato HH:MM.")
    h, m = int(value[:2]), int(value[3:])
    if h < 0 or h > 23 or m < 0 or m > 59:
        raise ValueError("Hora inválida.")
    # Business hours: 08:00 – 17:00
    total_minutes = h * 60 + m
    if total_minutes < 480 or total_minutes > 1020:  # 8*60=480, 17*60=1020
        raise ValueError("Horário fora do período de atendimento (08:00 – 17:00).")
    return value


def validate_password_policy(v: str) -> str:
    """Simple password policy: minimum 5 characters."""
    if len(v) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"A senha deve ter pelo menos {MIN_PASSWORD_LENGTH} caracteres")
    return v


def save_upload_file(file: UploadFile, uploads_directory: str) -> str:
    """Validate & save an uploaded image file. Returns the URL path."""
    validate_upload(file)
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    fname = f"{uuid4().hex}{ext}"
    dest = os.path.join(uploads_directory, fname)
    with open(dest, "wb") as out_file:
        shutil.copyfileobj(file.file, out_file)
    return f"/uploads/{fname}"


def build_visit_request_read(req: VisitRequest, prop: Optional[Property], user: Optional[User]) -> "VisitRequestRead":
    """Build a VisitRequestRead from a VisitRequest + related objects."""
    return VisitRequestRead(
        id=req.id,
        property_id=req.property_id,
        property_title=prop.titulo if prop else "",
        user_id=req.user_id,
        user_name=user.nome if user else "",
        requested_at=req.requested_at,
        preferred_date=req.preferred_date or None,
        preferred_time=req.preferred_time or None,
        phone=req.phone or None,
        status=req.status,
        admin_id=req.admin_id,
        admin_note=req.admin_note,
        decided_at=req.decided_at,
    )


# ---------------------------------------------------------------------------
# App & middleware
# ---------------------------------------------------------------------------

# Frontend URL for email links (password reset, etc.)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
if not os.path.exists(uploads_dir):
    os.makedirs(uploads_dir, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown logic."""
    logger.info("Starting up \u2014 creating tables and seeding data\u2026")
    create_db_and_tables()

    # Schema migrations (sqlite ALTER TABLE for columns added after initial release)
    try:
        with engine.connect() as conn:
            cols = [c[1] for c in conn.execute(text("PRAGMA table_info('user')")).fetchall()]
            if "hashed_password" not in cols:
                conn.execute(text("ALTER TABLE user ADD COLUMN hashed_password TEXT"))
            if "phone" not in cols:
                conn.execute(text("ALTER TABLE user ADD COLUMN phone TEXT"))
            if "email_verified" not in cols:
                conn.execute(text("ALTER TABLE user ADD COLUMN email_verified INTEGER DEFAULT 1"))
            if "is_active" not in cols:
                conn.execute(text("ALTER TABLE user ADD COLUMN is_active INTEGER DEFAULT 1"))

            vr_cols = [c[1] for c in conn.execute(text("PRAGMA table_info('visitrequest')")).fetchall()]
            for col, coltype in [
                ("preferred_date", "TEXT"),
                ("preferred_time", "TEXT"),
                ("phone", "TEXT"),
                ("admin_id", "TEXT"),
                ("admin_note", "TEXT"),
                ("decided_at", "TEXT"),
            ]:
                if col not in vr_cols:
                    conn.execute(text(f"ALTER TABLE visitrequest ADD COLUMN {col} {coltype}"))
            if "status" not in vr_cols:
                conn.execute(text("ALTER TABLE visitrequest ADD COLUMN status TEXT DEFAULT 'pending'"))

            prop_cols = [c[1] for c in conn.execute(text("PRAGMA table_info('property')")).fetchall()]
            if "deleted" not in prop_cols:
                conn.execute(text("ALTER TABLE property ADD COLUMN deleted INTEGER DEFAULT 0"))
            if "deleted_at" not in prop_cols:
                conn.execute(text("ALTER TABLE property ADD COLUMN deleted_at TEXT"))
            if "tipoImovel" not in prop_cols:
                conn.execute(text("ALTER TABLE property ADD COLUMN tipoImovel TEXT"))
            for feat_col in [
                "garagemNumCarros", "garagemFechada", "arCondicionado", "ginasio",
                "escritorio", "salaJogos", "salaTV", "areaLazer", "mobilada",
                "sistemaSeguranca", "elevador",
            ]:
                if feat_col not in prop_cols:
                    default = "0" if feat_col == "garagemNumCarros" else "0"
                    col_type = "INTEGER" if feat_col == "garagemNumCarros" else "INTEGER"
                    conn.execute(text(f"ALTER TABLE property ADD COLUMN {feat_col} {col_type} DEFAULT {default}"))

            # --- admin verification columns ---
            if "verificadoAdmin" not in prop_cols:
                conn.execute(text("ALTER TABLE property ADD COLUMN verificadoAdmin INTEGER DEFAULT 0"))
            if "verificadoNota" not in prop_cols:
                conn.execute(text("ALTER TABLE property ADD COLUMN verificadoNota TEXT"))

            # --- price history table ---
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS pricehistory (
                    id TEXT PRIMARY KEY,
                    property_id TEXT NOT NULL,
                    old_price REAL NOT NULL,
                    new_price REAL NOT NULL,
                    changed_at TEXT NOT NULL
                )
            """))

            # --- cliente KYC columns ---
            cli_cols = [c[1] for c in conn.execute(text("PRAGMA table_info('cliente')")).fetchall()]
            for kyc_col in ["documento_id", "nuit", "comprovativo_residencia", "capacidade_financeira", "tipo_interesse"]:
                if kyc_col not in cli_cols:
                    conn.execute(text(f"ALTER TABLE cliente ADD COLUMN {kyc_col} TEXT"))

            conn.commit()
    except Exception as e:
        logger.warning(f"Schema migration warning: {e}")

    with Session(engine) as session:
        seed(session)

    # Cleanup expired unverified EmailVerification records (>15 min old)
    try:
        with Session(engine) as session:
            cutoff = (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat()
            expired = session.exec(
                select(EmailVerification).where(
                    EmailVerification.verified == False,
                    EmailVerification.created_at < cutoff,
                )
            ).all()
            for ev in expired:
                session.delete(ev)
            if expired:
                session.commit()
                logger.info(f"Cleaned up {len(expired)} expired verification records")
    except Exception as e:
        logger.warning(f"Verification cleanup warning: {e}")

    logger.info("Startup complete.")
    yield  # app runs here
    logger.info("Shutting down.")


app = FastAPI(title="Imobiliaria API", lifespan=lifespan)

app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# CORS: use CORS_ORIGINS env (comma-separated) for production; fall back to localhost for dev
_default_origins = "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5180,http://localhost:5181"
origins = [o.strip() for o in os.getenv("CORS_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request body size limiter middleware
@app.middleware("http")
async def limit_request_body(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_REQUEST_BODY_BYTES:
        return JSONResponse(
            status_code=413,
            content={"detail": f"Request body too large. Maximum {MAX_REQUEST_BODY_MB}MB allowed."},
        )
    return await call_next(request)


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    nome: str
    email: Optional[str] = None
    password: str
    role: str
    phone: Optional[str] = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return validate_password_policy(v)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        pattern = r"^[\w.+-]+@[\w-]+\.[\w.]+$"
        if not re.match(pattern, v):
            raise ValueError("Email inválido")
        return v.lower().strip()


class EmailVerifyRequest(BaseModel):
    email: str
    code: str


class TokenLoginRequest(BaseModel):
    identifier: str
    password: str


class PropertyCreate(BaseModel):
    titulo: str
    descricao: str
    tipo: str
    preco: float
    localizacao: str
    cidade: str
    tipoImovel: Optional[str] = None
    tipologia: str
    area: float
    imagem: Optional[str] = None
    galeria: Optional[List[str]] = []
    quartos: int
    casasBanho: int
    garagem: bool = False
    garagemNumCarros: int = 0
    garagemFechada: bool = False
    arCondicionado: bool = False
    piscina: bool = False
    ginasio: bool = False
    escritorio: bool = False
    salaJogos: bool = False
    salaTV: bool = False
    jardim: bool = False
    areaLazer: bool = False
    mobilada: bool = False
    sistemaSeguranca: bool = False
    elevador: bool = False
    anoConstructao: int
    certificadoEnergetico: str
    caracteristicas: Optional[List[str]] = []
    # New fields for dynamic form
    negociavel: Optional[str] = None
    tipoAnunciante: Optional[str] = None
    contacto: Optional[str] = None
    disponibilidade: Optional[str] = None
    diasEspecificos: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    dadosEspecificos: Optional[str] = None


class PropertyUpdate(BaseModel):
    """All-optional schema for PUT /properties/{id}."""
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    tipo: Optional[str] = None
    preco: Optional[float] = None
    localizacao: Optional[str] = None
    cidade: Optional[str] = None
    tipoImovel: Optional[str] = None
    tipologia: Optional[str] = None
    area: Optional[float] = None
    imagem: Optional[str] = None
    galeria: Optional[List[str]] = None
    quartos: Optional[int] = None
    casasBanho: Optional[int] = None
    garagem: Optional[bool] = None
    garagemNumCarros: Optional[int] = None
    garagemFechada: Optional[bool] = None
    arCondicionado: Optional[bool] = None
    piscina: Optional[bool] = None
    ginasio: Optional[bool] = None
    escritorio: Optional[bool] = None
    salaJogos: Optional[bool] = None
    salaTV: Optional[bool] = None
    jardim: Optional[bool] = None
    areaLazer: Optional[bool] = None
    mobilada: Optional[bool] = None
    sistemaSeguranca: Optional[bool] = None
    elevador: Optional[bool] = None
    anoConstructao: Optional[int] = None
    certificadoEnergetico: Optional[str] = None
    caracteristicas: Optional[List[str]] = None
    # New fields for dynamic form
    negociavel: Optional[str] = None
    tipoAnunciante: Optional[str] = None
    contacto: Optional[str] = None
    disponibilidade: Optional[str] = None
    diasEspecificos: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    dadosEspecificos: Optional[str] = None


class VisitRequestCreate(BaseModel):
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None
    phone: Optional[str] = None

    @field_validator("preferred_date")
    @classmethod
    def check_date(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return validate_date_string(v)
        return v

    @field_validator("preferred_time")
    @classmethod
    def check_time(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return validate_time_string(v)
        return v


class VisitRequestRead(BaseModel):
    id: str
    property_id: str
    property_title: str
    user_id: str
    user_name: str
    requested_at: str
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = "pending"
    admin_id: Optional[str] = None
    admin_note: Optional[str] = None
    decided_at: Optional[str] = None

    model_config = {"from_attributes": True}


class VisitRequestAction(BaseModel):
    status: str
    admin_note: Optional[str] = None


class VisitRequestUpdate(BaseModel):
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None

    @field_validator("preferred_date")
    @classmethod
    def check_date(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return validate_date_string(v)
        return v

    @field_validator("preferred_time")
    @classmethod
    def check_time(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return validate_time_string(v)
        return v


class ProfileUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class ClienteKYCUpdate(BaseModel):
    documento_id: Optional[str] = None
    nuit: Optional[str] = None
    comprovativo_residencia: Optional[str] = None
    capacidade_financeira: Optional[str] = None
    tipo_interesse: Optional[str] = None  # compra | arrendamento | ambos


class ChatMessageCreate(BaseModel):
    receiver_id: str
    property_id: Optional[str] = None
    message: str


class ChatMessageRead(BaseModel):
    id: str
    sender_id: str
    sender_name: str
    receiver_id: str
    receiver_name: str
    property_id: Optional[str] = None
    message: str
    created_at: str
    read: bool

    model_config = {"from_attributes": True}


class ReviewCreate(BaseModel):
    rating: int
    comment: Optional[str] = None

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError("A avaliação deve ser entre 1 e 5")
        return v


class ReviewRead(BaseModel):
    id: str
    property_id: str
    user_id: str
    user_name: str
    rating: int
    comment: Optional[str] = None
    created_at: str

    model_config = {"from_attributes": True}


class PasswordResetRequest(BaseModel):
    email: str


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return validate_password_policy(v)


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return validate_password_policy(v)


class AdminUserUpdate(BaseModel):
    """For PATCH /admin/users/{id} — admin can change role or is_active."""
    role: Optional[str] = None
    is_active: Optional[bool] = None


class NotificationRead(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: str
    read: bool
    created_at: str
    link: Optional[str] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Mailtrap helpers
# ---------------------------------------------------------------------------

def _send_email(to_email: str, subject: str, body: str) -> bool:
    """Send an email via Mailtrap SMTP sandbox."""
    if not SMTP_PASS:
        logger.warning(f"SMTP_PASS not set — skipping email send for {to_email}")
        return True

    try:
        msg = MIMEMultipart()
        msg["From"] = f"{MAILTRAP_SENDER_NAME} <{MAILTRAP_SENDER_EMAIL}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain", "utf-8"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(MAILTRAP_SENDER_EMAIL, to_email, msg.as_string())

        logger.info(f"Email sent to {to_email}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return True  # Still return True since the code is printed to console


def send_verification_email(to_email: str, code: str, user_name: str) -> bool:
    """Send a 6-digit verification code via Mailtrap SMTP sandbox."""
    # Always print the code to the console for easy local development
    logger.info(f"===== VERIFICATION CODE for {to_email}: {code} =====")
    print(f"\n{'='*60}")
    print(f"  VERIFICATION CODE for {to_email}: {code}")
    print(f"{'='*60}\n")

    subject = "ImovelTop — Código de Verificação"
    body = (
        f"Olá {user_name},\n\n"
        f"O seu código de verificação é: {code}\n\n"
        f"Este código expira em 15 minutos.\n\n"
        f"Se não solicitou esta conta, ignore este email.\n\n"
        f"— Equipa ImovelTop"
    )
    return _send_email(to_email, subject, body)


def send_password_reset_email(to_email: str, token: str, user_name: str) -> bool:
    """Send a password-reset link via Mailtrap SMTP sandbox."""
    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
    # Always print the token to the console for development
    logger.info(f"===== PASSWORD RESET TOKEN for {to_email}: {token} =====")
    print(f"\n{'='*60}")
    print(f"  PASSWORD RESET TOKEN for {to_email}: {token}")
    print(f"  Reset link: {reset_link}")
    print(f"{'='*60}\n")

    subject = "ImovelTop — Redefinir Senha"
    body = (
        f"Olá {user_name},\n\n"
        f"Recebemos um pedido para redefinir a sua senha.\n\n"
        f"O seu token de redefinição é: {token}\n\n"
        f"Ou clique no link: {reset_link}\n\n"
        f"Este token expira em 1 hora.\n\n"
        f"Se não solicitou esta alteração, ignore este email.\n\n"
        f"— Equipa ImovelTop"
    )
    return _send_email(to_email, subject, body)


# ---------------------------------------------------------------------------
# Upload validation
# ---------------------------------------------------------------------------

def validate_upload(file: UploadFile) -> None:
    """Raise HTTPException if file type or size is invalid."""
    if file.content_type and file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de ficheiro não permitido: {file.content_type}. Use JPEG, PNG, WebP ou GIF.",
        )
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    if size > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"Ficheiro demasiado grande ({size // 1024 // 1024}MB). Máximo: {MAX_UPLOAD_SIZE_MB}MB.",
        )


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


# =====================================================================
# AUTH ENDPOINTS
# =====================================================================

@app.post("/auth/token")
def token_login(payload: TokenLoginRequest, request: Request):
    """Login using email or phone + password (returns JWT). Rate limited."""
    check_rate_limit(f"login:{request.client.host}", max_requests=10, window=60)
    identifier = payload.identifier.strip().lower()
    with Session(engine) as session:
        # Try finding user by email first, then by phone, then by nome
        user = session.exec(select(User).where(User.email == identifier)).first()
        if not user:
            # Normalize phone: strip spaces/dashes for comparison
            cleaned = identifier.replace(" ", "").replace("-", "")
            user = session.exec(select(User).where(User.phone == cleaned)).first()
        if not user:
            # Try by nome (case-insensitive)
            all_users = session.exec(select(User)).all()
            user = next((u for u in all_users if u.nome and u.nome.lower() == identifier), None)
        if not user or not user.hashed_password:
            raise HTTPException(status_code=400, detail="Credenciais incorrectas")
        if not verify_password(payload.password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Credenciais incorrectas")
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Conta desactivada. Contacte o suporte.")
        if user.email and not user.email_verified:
            raise HTTPException(status_code=403, detail="Email não verificado. Verifique o código enviado ao seu email.")
        token = create_access_token({"sub": user.id, "role": user.role})
        logger.info(f"Login: {user.email or user.phone}")
        return {"access_token": token, "token_type": "bearer", "user": user_to_dict(user)}


@app.post("/auth/register")
def register(req: RegisterRequest, request: Request):
    """Create a new user. Sends verification email if email provided. Rate limited."""
    check_rate_limit(f"register:{request.client.host}", max_requests=5, window=300)
    if req.role not in ("vendedor", "cliente"):
        raise HTTPException(status_code=400, detail="Invalid role")
    with Session(engine) as session:
        # Check phone uniqueness if phone provided
        if req.phone:
            cleaned_phone = req.phone.replace(" ", "").replace("-", "")
            existing_phone = session.exec(select(User).where(User.phone == cleaned_phone)).first()
            if existing_phone:
                raise HTTPException(status_code=400, detail="Telefone já registado")

        # If email provided, check for existing user
        if req.email:
            exists = session.exec(select(User).where(User.email == req.email)).first()
            if exists:
                if not exists.email_verified:
                    code = f"{random.randint(0, 999999):06d}"
                    verification = EmailVerification(
                        id=str(uuid4()),
                        user_id=exists.id,
                        code=code,
                        email=exists.email,
                        created_at=datetime.now(timezone.utc).isoformat(),
                    )
                    session.add(verification)
                    session.commit()
                    if not send_verification_email(exists.email, code, exists.nome):
                        logger.warning(f"Failed to send verification email to {exists.email}")
                    logger.info(f"Re-sent verification to unverified user: {exists.email}")
                    return {"message": "verification_required", "email": exists.email}
                raise HTTPException(status_code=400, detail="Email already registered")

        new_user = User(
            id=str(uuid4()),
            nome=req.nome,
            email=req.email or None,
            role=req.role,
            phone=req.phone or None,
            hashed_password=get_password_hash(req.password),
            email_verified=not req.email,  # Auto-verify if no email provided
        )
        session.add(new_user)
        session.flush()

        # Create role-specific record in independent table
        now_iso = datetime.now(timezone.utc).isoformat()
        if req.role == "cliente":
            session.add(Cliente(
                id=str(uuid4()),
                user_id=new_user.id,
                nome=req.nome,
                email=req.email or None,
                phone=req.phone or None,
                created_at=now_iso,
            ))
        elif req.role == "vendedor":
            session.add(Vendedor(
                id=str(uuid4()),
                user_id=new_user.id,
                nome=req.nome,
                email=req.email or None,
                phone=req.phone or None,
                created_at=now_iso,
            ))

        # Only send verification email if email was provided
        if req.email:
            code = f"{random.randint(0, 999999):06d}"
            verification = EmailVerification(
                id=str(uuid4()),
                user_id=new_user.id,
                code=code,
                email=new_user.email,
                created_at=datetime.now(timezone.utc).isoformat(),
            )
            session.add(verification)
            session.commit()
            if not send_verification_email(new_user.email, code, new_user.nome):
                logger.warning(f"Failed to send verification email to {new_user.email}")
            logger.info(f"New registration (pending verification): {new_user.email} as {new_user.role}")
            return {"message": "verification_required", "email": new_user.email}
        else:
            # No email — account is immediately active, generate token and login
            session.commit()
            token = create_access_token({"sub": new_user.id, "role": new_user.role})
            logger.info(f"New registration (no email, auto-verified): {new_user.nome} as {new_user.role}")
            return {"access_token": token, "token_type": "bearer", "user": user_to_dict(new_user)}


@app.post("/auth/verify-email")
def verify_email(payload: EmailVerifyRequest, request: Request):
    """Verify the 6-digit code. Rate limited."""
    check_rate_limit(f"verify:{request.client.host}", max_requests=10, window=60)
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == payload.email.strip().lower())).first()
        if not user:
            raise HTTPException(status_code=400, detail="Email não encontrado")

        verification = session.exec(
            select(EmailVerification).where(
                EmailVerification.user_id == user.id,
                EmailVerification.verified == False,
            ).order_by(EmailVerification.created_at.desc())
        ).first()

        if not verification:
            raise HTTPException(status_code=400, detail="Nenhum código de verificação pendente")

        created = datetime.fromisoformat(verification.created_at)
        if (datetime.now(timezone.utc) - created).total_seconds() > 900:
            raise HTTPException(status_code=400, detail="Código expirado. Solicite um novo código.")

        if verification.attempts >= 5:
            raise HTTPException(status_code=400, detail="Demasiadas tentativas. Solicite um novo código.")

        if verification.code != payload.code.strip():
            verification.attempts += 1
            session.add(verification)
            session.commit()
            remaining = 5 - verification.attempts
            raise HTTPException(status_code=400, detail=f"Código inválido. {remaining} tentativas restantes.")

        verification.verified = True
        session.add(verification)
        user.email_verified = True
        session.add(user)
        session.commit()
        session.refresh(user)

        token = create_access_token({"sub": user.id, "role": user.role})
        logger.info(f"Email verified: {user.email}")
        return {"access_token": token, "token_type": "bearer", "user": user_to_dict(user)}


@app.post("/auth/resend-code")
def resend_verification_code(payload: PasswordResetRequest, request: Request):
    """Resend verification code. Rate limited."""
    check_rate_limit(f"resend:{request.client.host}", max_requests=3, window=120)
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == payload.email.strip().lower())).first()
        if not user or user.email_verified:
            return {"message": "Se o email existir e não estiver verificado, um novo código será enviado."}

        code = f"{random.randint(0, 999999):06d}"
        verification = EmailVerification(
            id=str(uuid4()),
            user_id=user.id,
            code=code,
            email=user.email,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        session.add(verification)
        session.commit()
        send_verification_email(user.email, code, user.nome)
        logger.info(f"Resent verification code to: {user.email}")
        return {"message": "Novo código enviado."}


@app.get("/auth/me")
def me(current_user: User = Depends(get_current_user)):
    return user_to_dict(current_user)


@app.patch("/auth/profile")
def update_profile(payload: ProfileUpdate, current_user: User = Depends(get_current_user)):
    """Update the current user's profile fields."""
    with Session(engine) as session:
        user = session.get(User, current_user.id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if payload.nome is not None:
            user.nome = payload.nome
        if payload.email is not None:
            existing = session.exec(select(User).where(User.email == payload.email)).first()
            if existing and existing.id != user.id:
                raise HTTPException(status_code=400, detail="Email already in use")
            user.email = payload.email
        if payload.phone is not None:
            user.phone = payload.phone
        session.add(user)

        # Keep role-specific table in sync
        if user.role == "cliente":
            cli = session.exec(select(Cliente).where(Cliente.user_id == user.id)).first()
            if cli:
                if payload.nome is not None:
                    cli.nome = payload.nome
                if payload.email is not None:
                    cli.email = payload.email
                if payload.phone is not None:
                    cli.phone = payload.phone
                session.add(cli)
        elif user.role == "vendedor":
            ven = session.exec(select(Vendedor).where(Vendedor.user_id == user.id)).first()
            if ven:
                if payload.nome is not None:
                    ven.nome = payload.nome
                if payload.email is not None:
                    ven.email = payload.email
                if payload.phone is not None:
                    ven.phone = payload.phone
                session.add(ven)

        session.commit()
        session.refresh(user)
        return user_to_dict(user)


@app.get("/auth/kyc")
def get_kyc(current_user: User = Depends(get_current_user)):
    """Get KYC data for the current client."""
    if current_user.role != "cliente":
        raise HTTPException(status_code=403, detail="Apenas clientes têm dados KYC")
    with Session(engine) as session:
        cli = session.exec(select(Cliente).where(Cliente.user_id == current_user.id)).first()
        if not cli:
            return {"documento_id": "", "nuit": "", "comprovativo_residencia": "", "capacidade_financeira": "", "tipo_interesse": ""}
        return {
            "documento_id": cli.documento_id or "",
            "nuit": cli.nuit or "",
            "comprovativo_residencia": cli.comprovativo_residencia or "",
            "capacidade_financeira": cli.capacidade_financeira or "",
            "tipo_interesse": cli.tipo_interesse or "",
        }


@app.patch("/auth/kyc")
def update_kyc(payload: ClienteKYCUpdate, current_user: User = Depends(get_current_user)):
    """Update KYC data for the current client."""
    if current_user.role != "cliente":
        raise HTTPException(status_code=403, detail="Apenas clientes têm dados KYC")
    with Session(engine) as session:
        cli = session.exec(select(Cliente).where(Cliente.user_id == current_user.id)).first()
        if not cli:
            raise HTTPException(status_code=404, detail="Cliente not found")
        if payload.documento_id is not None:
            cli.documento_id = payload.documento_id
        if payload.nuit is not None:
            cli.nuit = payload.nuit
        if payload.comprovativo_residencia is not None:
            cli.comprovativo_residencia = payload.comprovativo_residencia
        if payload.capacidade_financeira is not None:
            cli.capacidade_financeira = payload.capacidade_financeira
        if payload.tipo_interesse is not None:
            cli.tipo_interesse = payload.tipo_interesse
        session.add(cli)
        session.commit()
        session.refresh(cli)
        return {
            "documento_id": cli.documento_id or "",
            "nuit": cli.nuit or "",
            "comprovativo_residencia": cli.comprovativo_residencia or "",
            "capacidade_financeira": cli.capacidade_financeira or "",
            "tipo_interesse": cli.tipo_interesse or "",
        }


@app.post("/auth/change-password")
def change_password(payload: PasswordChangeRequest, current_user: User = Depends(get_current_user)):
    """Change password for the authenticated user."""
    with Session(engine) as session:
        user = session.get(User, current_user.id)
        if not user or not user.hashed_password:
            raise HTTPException(status_code=400, detail="Conta sem senha definida")
        if not verify_password(payload.current_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Senha actual incorrecta")
        user.hashed_password = get_password_hash(payload.new_password)
        session.add(user)
        session.commit()
        logger.info(f"Password changed: {user.email}")
        return {"message": "Senha alterada com sucesso"}


@app.delete("/auth/account", status_code=200)
def delete_account(current_user: User = Depends(get_current_user)):
    """Delete own account (RGPD right to be forgotten). Anonymises related data."""
    with Session(engine) as session:
        user = session.get(User, current_user.id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Soft-delete user's properties
        my_props = session.exec(select(Property).where(Property.vendedorId == user.id)).all()
        for p in my_props:
            p.deleted = True
            p.deleted_at = datetime.now(timezone.utc).isoformat()
            session.add(p)

        # Delete favorites, notifications, visit requests
        for fav in session.exec(select(Favorite).where(Favorite.user_id == user.id)).all():
            session.delete(fav)
        for notif in session.exec(select(Notification).where(Notification.user_id == user.id)).all():
            session.delete(notif)
        for vr in session.exec(select(VisitRequest).where(VisitRequest.user_id == user.id)).all():
            session.delete(vr)

        # Anonymise reviews
        for rev in session.exec(select(Review).where(Review.user_id == user.id)).all():
            rev.user_name = "Utilizador removido"
            rev.user_id = "deleted"
            session.add(rev)

        # Anonymise chat messages
        for msg in session.exec(select(ChatMessage).where(
            (ChatMessage.sender_id == user.id) | (ChatMessage.receiver_id == user.id)
        )).all():
            session.delete(msg)

        # Delete verification / reset tokens
        for v in session.exec(select(EmailVerification).where(EmailVerification.user_id == user.id)).all():
            session.delete(v)
        for rt in session.exec(select(PasswordResetToken).where(PasswordResetToken.user_id == user.id)).all():
            session.delete(rt)

        # Delete role-specific records
        for cli in session.exec(select(Cliente).where(Cliente.user_id == user.id)).all():
            session.delete(cli)
        for ven in session.exec(select(Vendedor).where(Vendedor.user_id == user.id)).all():
            session.delete(ven)

        # Delete the user
        session.delete(user)
        session.commit()
        logger.info(f"Account deleted (RGPD): {user.email}")
        return {"message": "Conta eliminada com sucesso. Os seus dados foram removidos."}


# =====================================================================
# PASSWORD RESET
# =====================================================================

@app.post("/auth/forgot-password")
def forgot_password(payload: PasswordResetRequest, request: Request):
    """Generate a reset token and send it via Mailtrap."""
    check_rate_limit(f"forgot:{request.client.host}", max_requests=3, window=300)
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == payload.email.strip().lower())).first()
        if not user:
            return {"message": "Se o email existir, receberá instruções para redefinir a senha."}
        token_str = uuid4().hex
        reset = PasswordResetToken(
            id=str(uuid4()),
            user_id=user.id,
            token=token_str,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        session.add(reset)
        session.commit()
        # Send via Mailtrap (or print to console)
        send_password_reset_email(user.email, token_str, user.nome)
        # Return the token so the frontend can auto-fill it (dev-friendly)
        return {"message": "Se o email existir, receberá instruções para redefinir a senha.", "token": token_str}


@app.post("/auth/reset-password")
def reset_password(payload: PasswordResetConfirm):
    """Reset password using token."""
    with Session(engine) as session:
        reset = session.exec(
            select(PasswordResetToken).where(
                PasswordResetToken.token == payload.token,
                PasswordResetToken.used == False,
            )
        ).first()
        if not reset:
            raise HTTPException(status_code=400, detail="Token inválido ou expirado")
        created = datetime.fromisoformat(reset.created_at)
        if (datetime.now(timezone.utc) - created).total_seconds() > 3600:
            raise HTTPException(status_code=400, detail="Token expirado")
        user = session.get(User, reset.user_id)
        if not user:
            raise HTTPException(status_code=400, detail="Utilizador não encontrado")
        user.hashed_password = get_password_hash(payload.new_password)
        reset.used = True
        session.add(user)
        session.add(reset)
        session.commit()
        return {"message": "Senha redefinida com sucesso"}


# =====================================================================
# PROPERTIES
# =====================================================================

@app.get("/properties", response_model=List[Property])
def list_properties(
    tipo: Optional[str] = None,
    cidade: Optional[str] = None,
    preco_max: Optional[float] = None,
    preco_min: Optional[float] = None,
    tipologia: Optional[str] = None,
    quartos_min: Optional[int] = None,
    quartos_max: Optional[int] = None,
    area_min: Optional[float] = None,
    area_max: Optional[float] = None,
    search: Optional[str] = None,
    garagem: Optional[bool] = None,
    piscina: Optional[bool] = None,
    jardim: Optional[bool] = None,
    page: Optional[int] = None,
    per_page: Optional[int] = None,
):
    with Session(engine) as session:
        q = select(Property).where(Property.deleted == False)
        if tipo and tipo != "todos":
            q = q.where(Property.tipo == tipo)
        if cidade:
            q = q.where(Property.cidade.ilike(f"%{cidade}%"))
        if preco_max is not None:
            q = q.where(Property.preco <= preco_max)
        if preco_min is not None:
            q = q.where(Property.preco >= preco_min)
        if tipologia and tipologia != "todos":
            q = q.where(Property.tipologia == tipologia)
        if quartos_min is not None:
            q = q.where(Property.quartos >= quartos_min)
        if quartos_max is not None:
            q = q.where(Property.quartos <= quartos_max)
        if area_min is not None:
            q = q.where(Property.area >= area_min)
        if area_max is not None:
            q = q.where(Property.area <= area_max)
        if garagem is not None:
            q = q.where(Property.garagem == garagem)
        if piscina is not None:
            q = q.where(Property.piscina == piscina)
        if jardim is not None:
            q = q.where(Property.jardim == jardim)
        if search:
            q = q.where(
                Property.titulo.ilike(f"%{search}%")
                | Property.descricao.ilike(f"%{search}%")
                | Property.localizacao.ilike(f"%{search}%")
                | Property.cidade.ilike(f"%{search}%")
            )
        if page and per_page:
            q = q.offset((page - 1) * per_page).limit(per_page)
        return session.exec(q).all()


@app.get("/properties/count")
def count_properties(
    tipo: Optional[str] = None,
    cidade: Optional[str] = None,
    preco_max: Optional[float] = None,
    preco_min: Optional[float] = None,
    tipologia: Optional[str] = None,
    quartos_min: Optional[int] = None,
    area_min: Optional[float] = None,
    area_max: Optional[float] = None,
    search: Optional[str] = None,
    garagem: Optional[bool] = None,
    piscina: Optional[bool] = None,
    jardim: Optional[bool] = None,
):
    with Session(engine) as session:
        q = select(func.count(Property.id)).where(Property.deleted == False)
        if tipo and tipo != "todos":
            q = q.where(Property.tipo == tipo)
        if cidade:
            q = q.where(Property.cidade.ilike(f"%{cidade}%"))
        if preco_max is not None:
            q = q.where(Property.preco <= preco_max)
        if preco_min is not None:
            q = q.where(Property.preco >= preco_min)
        if tipologia and tipologia != "todos":
            q = q.where(Property.tipologia == tipologia)
        if quartos_min is not None:
            q = q.where(Property.quartos >= quartos_min)
        if area_min is not None:
            q = q.where(Property.area >= area_min)
        if area_max is not None:
            q = q.where(Property.area <= area_max)
        if garagem is not None:
            q = q.where(Property.garagem == garagem)
        if piscina is not None:
            q = q.where(Property.piscina == piscina)
        if jardim is not None:
            q = q.where(Property.jardim == jardim)
        if search:
            q = q.where(
                Property.titulo.ilike(f"%{search}%")
                | Property.descricao.ilike(f"%{search}%")
                | Property.localizacao.ilike(f"%{search}%")
                | Property.cidade.ilike(f"%{search}%")
            )
        count = session.exec(q).one()
        return {"count": count}


@app.get("/properties/{property_id}", response_model=Property)
def get_property(property_id: str):
    with Session(engine) as session:
        prop = session.get(Property, property_id)
        if not prop or prop.deleted:
            raise HTTPException(status_code=404, detail="Property not found")
        return prop


@app.post("/properties", response_model=Property, status_code=201)
def create_property(payload: PropertyCreate, current_user: User = Depends(require_roles(["vendedor", "admin"]))):
    with Session(engine) as session:
        new_id = str(uuid4())
        prop = Property(
            id=new_id,
            titulo=payload.titulo,
            descricao=payload.descricao,
            tipo=payload.tipo,
            preco=payload.preco,
            localizacao=payload.localizacao,
            cidade=payload.cidade,
            tipoImovel=payload.tipoImovel or "",
            tipologia=payload.tipologia,
            area=payload.area,
            imagem=payload.imagem or "",
            galeria=payload.galeria or ([payload.imagem] if payload.imagem else []),
            vendedorId=current_user.id,
            vendedorNome=current_user.nome,
            createdAt=date.today().isoformat(),
            quartos=payload.quartos,
            casasBanho=payload.casasBanho,
            garagem=payload.garagem,
            garagemNumCarros=payload.garagemNumCarros,
            garagemFechada=payload.garagemFechada,
            arCondicionado=payload.arCondicionado,
            piscina=payload.piscina,
            ginasio=payload.ginasio,
            escritorio=payload.escritorio,
            salaJogos=payload.salaJogos,
            salaTV=payload.salaTV,
            jardim=payload.jardim,
            areaLazer=payload.areaLazer,
            mobilada=payload.mobilada,
            sistemaSeguranca=payload.sistemaSeguranca,
            elevador=payload.elevador,
            anoConstructao=payload.anoConstructao,
            certificadoEnergetico=payload.certificadoEnergetico,
            caracteristicas=payload.caracteristicas or [],
            # New fields for dynamic form
            negociavel=payload.negociavel,
            tipoAnunciante=payload.tipoAnunciante,
            contacto=payload.contacto,
            disponibilidade=payload.disponibilidade,
            diasEspecificos=payload.diasEspecificos,
            latitude=payload.latitude,
            longitude=payload.longitude,
            dadosEspecificos=payload.dadosEspecificos,
        )
        session.add(prop)
        session.commit()
        session.refresh(prop)
        return prop


@app.put("/properties/{property_id}", response_model=Property)
def update_property(property_id: str, payload: PropertyUpdate, current_user: User = Depends(require_roles(["vendedor", "admin"]))):
    """Update property. Vendor can only edit own; admin can edit any."""
    with Session(engine) as session:
        prop = session.get(Property, property_id)
        if not prop or prop.deleted:
            raise HTTPException(status_code=404, detail="Property not found")
        if current_user.role == "vendedor" and prop.vendedorId != current_user.id:
            raise HTTPException(status_code=403, detail="Só pode editar os seus próprios imóveis")
        update_data = payload.model_dump(exclude_unset=True)
        # Track price changes for price history + notify favorited users
        if "preco" in update_data and update_data["preco"] != prop.preco:
            old_price = prop.preco
            new_price = update_data["preco"]
            ph = PriceHistory(
                id=uuid4().hex,
                property_id=property_id,
                old_price=old_price,
                new_price=new_price,
                changed_at=datetime.now(timezone.utc).isoformat(),
            )
            session.add(ph)
            # Notify users who favorited this property
            favs = session.exec(select(Favorite).where(Favorite.property_id == property_id)).all()
            direction = "baixou" if new_price < old_price else "subiu"
            for fav in favs:
                notif = Notification(
                    id=uuid4().hex,
                    user_id=fav.user_id,
                    title=f"Preço {direction}!",
                    message=f"O imóvel \"{prop.titulo}\" {direction} de {old_price:,.0f} MT para {new_price:,.0f} MT.",
                    type="price_alert",
                    created_at=datetime.now(timezone.utc).isoformat(),
                    link=f"?property={property_id}",
                )
                session.add(notif)
        for field, value in update_data.items():
            setattr(prop, field, value)
        session.add(prop)
        session.commit()
        session.refresh(prop)
        return prop


# ---------------------------------------------------------------------------
# Admin property verification
# ---------------------------------------------------------------------------
class AdminVerifyPayload(BaseModel):
    verificado: bool
    nota: Optional[str] = None


@app.patch("/admin/properties/{property_id}/verify")
def admin_verify_property(
    property_id: str, payload: AdminVerifyPayload,
    current_user: User = Depends(require_roles(["admin"])),
):
    """Admin marks a property as verified/unverified."""
    with Session(engine) as session:
        prop = session.get(Property, property_id)
        if not prop or prop.deleted:
            raise HTTPException(status_code=404, detail="Property not found")
        prop.verificadoAdmin = payload.verificado
        prop.verificadoNota = payload.nota
        session.add(prop)
        session.commit()
        session.refresh(prop)
        # Notify the vendor
        notif = Notification(
            id=uuid4().hex,
            user_id=prop.vendedorId,
            title="Verificação de Imóvel" if payload.verificado else "Verificação Removida",
            message=f"O imóvel \"{prop.titulo}\" foi {'verificado' if payload.verificado else 'des-verificado'} pelo administrador." + (f" Nota: {payload.nota}" if payload.nota else ""),
            type="info",
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        session.add(notif)
        session.commit()
        return {"ok": True, "verificadoAdmin": prop.verificadoAdmin, "verificadoNota": prop.verificadoNota}


# ---------------------------------------------------------------------------
# Price History
# ---------------------------------------------------------------------------
@app.get("/properties/{property_id}/price-history")
def get_price_history(property_id: str):
    """Return price change history for a property."""
    with Session(engine) as session:
        prop = session.get(Property, property_id)
        if not prop:
            raise HTTPException(status_code=404, detail="Property not found")
        history = session.exec(
            select(PriceHistory).where(PriceHistory.property_id == property_id).order_by(PriceHistory.changed_at.desc())
        ).all()
        return [{"id": h.id, "old_price": h.old_price, "new_price": h.new_price, "changed_at": h.changed_at} for h in history]


# ---------------------------------------------------------------------------
# Watermark (backend utility using Pillow)
# ---------------------------------------------------------------------------
@app.post("/admin/watermark/{property_id}")
async def watermark_property_images(
    property_id: str,
    current_user: User = Depends(require_roles(["admin"])),
):
    """Apply watermark to all images of a property."""
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        raise HTTPException(status_code=500, detail="Pillow not installed")

    with Session(engine) as session:
        prop = session.get(Property, property_id)
        if not prop or prop.deleted:
            raise HTTPException(status_code=404, detail="Property not found")

        watermarked = []
        all_images = [prop.imagem] + list(prop.galeria or [])
        for img_url in all_images:
            if not img_url or not img_url.startswith("/uploads/"):
                continue
            filepath = os.path.join(uploads_dir, img_url.replace("/uploads/", ""))
            if not os.path.exists(filepath):
                continue
            try:
                img = Image.open(filepath).convert("RGBA")
                overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
                draw = ImageDraw.Draw(overlay)
                text = "ImovelTop"
                try:
                    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", max(24, img.size[0] // 20))
                except Exception:
                    font = ImageFont.load_default()
                bbox = draw.textbbox((0, 0), text, font=font)
                tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
                x = img.size[0] - tw - 20
                y = img.size[1] - th - 20
                draw.text((x, y), text, fill=(255, 255, 255, 100), font=font)
                result = Image.alpha_composite(img, overlay).convert("RGB")
                result.save(filepath)
                watermarked.append(img_url)
            except Exception as e:
                logger.warning(f"Watermark failed for {img_url}: {e}")

        return {"ok": True, "watermarked": len(watermarked)}


@app.post("/properties/upload", response_model=Property, status_code=201)
async def upload_property(
    titulo: str = Form(...),
    descricao: str = Form(...),
    tipo: str = Form(...),
    preco: float = Form(...),
    localizacao: str = Form(...),
    cidade: str = Form(...),
    tipoImovel: str = Form(""),
    tipologia: str = Form(...),
    area: float = Form(...),
    quartos: int = Form(...),
    casasBanho: int = Form(...),
    garagem: bool = Form(False),
    garagemNumCarros: int = Form(0),
    garagemFechada: bool = Form(False),
    arCondicionado: bool = Form(False),
    piscina: bool = Form(False),
    ginasio: bool = Form(False),
    escritorio: bool = Form(False),
    salaJogos: bool = Form(False),
    salaTV: bool = Form(False),
    jardim: bool = Form(False),
    areaLazer: bool = Form(False),
    mobilada: bool = Form(False),
    sistemaSeguranca: bool = Form(False),
    elevador: bool = Form(False),
    anoConstructao: int = Form(...),
    certificadoEnergetico: str = Form("B"),
    caracteristicas: str = Form(""),
    imagem_url: Optional[str] = Form(None),
    galeria_urls: Optional[str] = Form(None),
    imagem_file: UploadFile = File(None),
    galeria_files: List[UploadFile] = File([]),
    current_user: User = Depends(require_roles(["vendedor", "admin"])),
):
    try:
        caracteristicas_list = json.loads(caracteristicas) if caracteristicas else []
    except Exception:
        caracteristicas_list = [c.strip() for c in (caracteristicas or "").split(",") if c.strip()]

    saved_urls: List[str] = []

    # main image
    main_image_url = None
    if imagem_file:
        main_image_url = save_upload_file(imagem_file, uploads_dir)
    elif imagem_url:
        main_image_url = imagem_url

    # gallery files — validation errors now surface properly
    gallery_errors: List[str] = []
    for f in galeria_files or []:
        if f and f.filename:
            try:
                saved_urls.append(save_upload_file(f, uploads_dir))
            except HTTPException as e:
                gallery_errors.append(f"{f.filename}: {e.detail}")

    if gallery_errors:
        raise HTTPException(status_code=400, detail=f"Erros na galeria: {'; '.join(gallery_errors)}")

    # gallery URLs
    if galeria_urls:
        try:
            parsed = json.loads(galeria_urls)
            if isinstance(parsed, list):
                saved_urls.extend(parsed)
        except Exception:
            saved_urls.extend([u.strip() for u in galeria_urls.split(",") if u.strip()])

    gallery = list(saved_urls)
    if main_image_url and main_image_url not in gallery:
        gallery.insert(0, main_image_url)
    if not gallery and main_image_url:
        gallery = [main_image_url]
    if not gallery:
        gallery = ["/uploads/default.jpg"]

    with Session(engine) as session:
        new_id = str(uuid4())
        prop = Property(
            id=new_id,
            titulo=titulo,
            descricao=descricao,
            tipo=tipo,
            preco=preco,
            localizacao=localizacao,
            cidade=cidade,
            tipoImovel=tipoImovel,
            tipologia=tipologia,
            area=area,
            imagem=main_image_url or (gallery[0] if gallery else ""),
            galeria=gallery,
            vendedorId=current_user.id,
            vendedorNome=current_user.nome,
            createdAt=date.today().isoformat(),
            quartos=quartos,
            casasBanho=casasBanho,
            garagem=garagem,
            garagemNumCarros=garagemNumCarros,
            garagemFechada=garagemFechada,
            arCondicionado=arCondicionado,
            piscina=piscina,
            ginasio=ginasio,
            escritorio=escritorio,
            salaJogos=salaJogos,
            salaTV=salaTV,
            jardim=jardim,
            areaLazer=areaLazer,
            mobilada=mobilada,
            sistemaSeguranca=sistemaSeguranca,
            elevador=elevador,
            anoConstructao=anoConstructao,
            certificadoEnergetico=certificadoEnergetico,
            caracteristicas=caracteristicas_list,
        )
        session.add(prop)
        session.commit()
        session.refresh(prop)
        return prop


@app.delete("/properties/{property_id}", status_code=200)
def delete_property(
    property_id: str,
    current_user: User = Depends(require_roles(["vendedor", "admin"])),
):
    """Soft-delete a property. Vendor can delete own; admin can delete any."""
    with Session(engine) as session:
        prop = session.get(Property, property_id)
        if not prop or prop.deleted:
            raise HTTPException(status_code=404, detail="Property not found")
        if current_user.role == "vendedor" and prop.vendedorId != current_user.id:
            raise HTTPException(status_code=403, detail="Só pode apagar os seus próprios imóveis")
        prop.deleted = True
        prop.deleted_at = datetime.now(timezone.utc).isoformat()
        session.add(prop)
        session.commit()
        return {"message": "Imóvel removido com sucesso"}


@app.post("/properties/{property_id}/restore", status_code=200)
def restore_property(property_id: str, current_user: User = Depends(require_roles(["admin"]))):
    """Admin-only: restore a soft-deleted property."""
    with Session(engine) as session:
        prop = session.get(Property, property_id)
        if not prop:
            raise HTTPException(status_code=404, detail="Property not found")
        if not prop.deleted:
            raise HTTPException(status_code=400, detail="Imóvel não está eliminado")
        prop.deleted = False
        prop.deleted_at = None
        session.add(prop)
        session.commit()
        session.refresh(prop)
        return prop


# =====================================================================
# VISIT REQUESTS
# =====================================================================

# Business hours time slots (08:00 – 17:00, every 30 min)
VISIT_TIME_SLOTS = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00",
]

@app.get("/properties/{property_id}/visit-availability")
def visit_availability(
    property_id: str,
    visit_date: str = Query(..., alias="date"),
    current_user: User = Depends(require_roles(["cliente"])),
):
    """Return which time slots are blocked for a given property+date.
    Checks: property conflicts, client conflicts, vendor daily limit, admin daily limit + same-time."""
    # validate date
    try:
        d = datetime.strptime(visit_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Data inválida. Use AAAA-MM-DD.")
    if d < date.today():
        raise HTTPException(status_code=400, detail="A data não pode ser no passado.")

    with Session(engine) as session:
        prop = session.get(Property, property_id)
        if not prop or prop.deleted:
            raise HTTPException(status_code=404, detail="Property not found")

        # All active visits for this date (platform-wide)
        all_day_visits = session.exec(
            select(VisitRequest).where(
                VisitRequest.preferred_date == visit_date,
                VisitRequest.status.in_(["pending", "approved"]),
            )
        ).all()

        # Property visits for this date
        property_times = {v.preferred_time for v in all_day_visits if v.property_id == property_id and v.preferred_time}

        # Client's own visits for this date (across all properties)
        client_times = {v.preferred_time for v in all_day_visits if v.user_id == current_user.id and v.preferred_time}

        # Client already has a visit for THIS property on THIS date => block ALL slots
        client_already_booked_this_property = any(
            v.user_id == current_user.id and v.property_id == property_id
            for v in all_day_visits
        )

        # Vendor daily count (visits across all vendor's properties)
        vendor_prop_ids = {p.id for p in session.exec(select(Property).where(Property.vendedorId == prop.vendedorId)).all()}
        vendor_day_count = sum(1 for v in all_day_visits if v.property_id in vendor_prop_ids)
        vendor_full = vendor_day_count >= 3

        # Admin daily count and times
        admin_day_count = len(all_day_visits)
        admin_full = admin_day_count >= 10
        admin_times = {v.preferred_time for v in all_day_visits if v.preferred_time}

        blocked: dict[str, str] = {}
        for slot in VISIT_TIME_SLOTS:
            if client_already_booked_this_property:
                blocked[slot] = "Já tem um agendamento para este imóvel neste dia"
            elif slot in property_times:
                blocked[slot] = "Já existe visita neste imóvel neste horário"
            elif slot in client_times:
                blocked[slot] = "Já tem um agendamento neste horário"
            elif vendor_full:
                blocked[slot] = "O vendedor atingiu o limite de 3 visitas/dia"
            elif admin_full:
                blocked[slot] = "Limite de 10 agendamentos/dia atingido"
            elif slot in admin_times:
                blocked[slot] = "Horário indisponível (administração ocupada)"

        return {
            "date": visit_date,
            "property_id": property_id,
            "slots": VISIT_TIME_SLOTS,
            "blocked": blocked,
            "vendor_day_count": vendor_day_count,
            "vendor_day_limit": 3,
            "admin_day_count": admin_day_count,
            "admin_day_limit": 10,
            "client_already_booked": client_already_booked_this_property,
        }


@app.post("/properties/{property_id}/visit-requests", response_model=VisitRequestRead, status_code=201)
def request_visit(property_id: str, payload: VisitRequestCreate, current_user: User = Depends(require_roles(["cliente"]))):
    with Session(engine) as session:
        prop = session.get(Property, property_id)
        if not prop or prop.deleted:
            raise HTTPException(status_code=404, detail="Property not found")
        preferred_date = payload.preferred_date or None
        preferred_time = payload.preferred_time or None
        phone_val = payload.phone or None

        if preferred_date and preferred_time:
            # 0) Client can only book ONE visit per property per day
            client_property_day = session.exec(
                select(VisitRequest).where(
                    VisitRequest.user_id == current_user.id,
                    VisitRequest.property_id == property_id,
                    VisitRequest.preferred_date == preferred_date,
                    VisitRequest.status.in_(["pending", "approved"]),
                )
            ).first()
            if client_property_day:
                raise HTTPException(
                    status_code=409,
                    detail=f"Só pode fazer 1 agendamento por imóvel por dia. Já tem uma visita para este imóvel em {preferred_date}.",
                )

            # 1) Client cannot book the same date+time across ANY property
            client_conflict = session.exec(
                select(VisitRequest).where(
                    VisitRequest.user_id == current_user.id,
                    VisitRequest.preferred_date == preferred_date,
                    VisitRequest.preferred_time == preferred_time,
                    VisitRequest.status.in_(["pending", "approved"]),
                )
            ).first()
            if client_conflict:
                raise HTTPException(
                    status_code=409,
                    detail=f"Já tem um agendamento para {preferred_date} às {preferred_time}. Escolha outro horário.",
                )

            # 2) Property-level conflict (same property, same date+time)
            property_conflict = session.exec(
                select(VisitRequest).where(
                    VisitRequest.property_id == property_id,
                    VisitRequest.preferred_date == preferred_date,
                    VisitRequest.preferred_time == preferred_time,
                    VisitRequest.status.in_(["pending", "approved"]),
                )
            ).first()
            if property_conflict:
                raise HTTPException(
                    status_code=409,
                    detail=f"Já existe uma visita agendada para este imóvel em {preferred_date} às {preferred_time}. Escolha outro horário.",
                )

            # 3) Vendor cannot have more than 3 visits in a single day
            vendor_day_count = len(session.exec(
                select(VisitRequest).where(
                    VisitRequest.property_id.in_(
                        select(Property.id).where(Property.vendedorId == prop.vendedorId)
                    ),
                    VisitRequest.preferred_date == preferred_date,
                    VisitRequest.status.in_(["pending", "approved"]),
                )
            ).all())
            if vendor_day_count >= 3:
                raise HTTPException(
                    status_code=409,
                    detail=f"O vendedor já atingiu o limite de 3 visitas para o dia {preferred_date}. Escolha outra data.",
                )

            # 4) Admin cannot have more than 10 visits in a day, nor at the same time
            admin_ids = [a.id for a in session.exec(select(User).where(User.role == "admin")).all()]
            if admin_ids:
                admin_day_visits = session.exec(
                    select(VisitRequest).where(
                        VisitRequest.preferred_date == preferred_date,
                        VisitRequest.status.in_(["pending", "approved"]),
                    )
                ).all()
                admin_day_count = len(admin_day_visits)
                if admin_day_count >= 10:
                    raise HTTPException(
                        status_code=409,
                        detail=f"A plataforma já atingiu o limite de 10 agendamentos para o dia {preferred_date}. Escolha outra data.",
                    )
                admin_time_conflict = any(
                    v.preferred_time == preferred_time for v in admin_day_visits
                )
                if admin_time_conflict:
                    raise HTTPException(
                        status_code=409,
                        detail=f"A administração já tem um agendamento às {preferred_time} no dia {preferred_date}. Escolha outro horário.",
                    )

        new_req = VisitRequest(
            id=str(uuid4()),
            property_id=property_id,
            user_id=current_user.id,
            requested_at=date.today().isoformat(),
            preferred_date=preferred_date,
            preferred_time=preferred_time,
            phone=phone_val,
            status="pending",
        )
        session.add(new_req)

        # Notify admins
        admins = session.exec(select(User).where(User.role == "admin")).all()
        for admin in admins:
            session.add(Notification(
                id=str(uuid4()),
                user_id=admin.id,
                title="Nova visita agendada",
                message=f"{current_user.nome} agendou visita ao imóvel '{prop.titulo}'",
                type="info",
                created_at=datetime.now(timezone.utc).isoformat(),
            ))

        # Notify vendor
        if prop.vendedorId != current_user.id:
            session.add(Notification(
                id=str(uuid4()),
                user_id=prop.vendedorId,
                title="Nova visita ao seu imóvel",
                message=f"{current_user.nome} agendou visita ao imóvel '{prop.titulo}'",
                type="info",
                created_at=datetime.now(timezone.utc).isoformat(),
            ))

        # Auto-create in-platform chat message to admin about the visit
        first_admin = session.exec(select(User).where(User.role == "admin")).first()
        if first_admin:
            date_info = f" para {preferred_date}" if preferred_date else ""
            time_info = f" às {preferred_time}" if preferred_time else ""
            chat_msg = ChatMessage(
                id=str(uuid4()),
                sender_id=current_user.id,
                receiver_id=first_admin.id,
                property_id=property_id,
                message=(
                    f"Olá! Gostaria de agendar uma visita ao imóvel '{prop.titulo}'"
                    f"{date_info}{time_info}. "
                    f"Por favor, confirme a disponibilidade. Obrigado!"
                ),
                created_at=datetime.now(timezone.utc).isoformat(),
            )
            session.add(chat_msg)

        session.commit()
        session.refresh(new_req)
        return build_visit_request_read(new_req, prop, current_user)


@app.get("/visit-requests", response_model=List[VisitRequestRead])
def list_visit_requests(
    page: Optional[int] = None,
    per_page: Optional[int] = None,
    current_user: User = Depends(require_roles(["admin"])),
):
    """List all visit requests (admin). Supports pagination."""
    with Session(engine) as session:
        q = select(VisitRequest)
        if page and per_page:
            q = q.offset((page - 1) * per_page).limit(per_page)
        results = session.exec(q).all()
        out: List[VisitRequestRead] = []
        for req in results:
            prop = session.get(Property, req.property_id)
            user = session.get(User, req.user_id)
            out.append(build_visit_request_read(req, prop, user))
        return out


@app.patch("/visit-requests/{request_id}")
def update_visit_request(request_id: str, action: VisitRequestAction, current_user: User = Depends(require_roles(["admin"]))):
    with Session(engine) as session:
        req = session.get(VisitRequest, request_id)
        if not req:
            raise HTTPException(status_code=404, detail="Visit request not found")
        if action.status not in ("approved", "rejected", "concluded"):
            raise HTTPException(status_code=400, detail="Invalid status")
        req.status = action.status
        req.admin_note = action.admin_note
        req.admin_id = current_user.id
        req.decided_at = date.today().isoformat()
        session.add(req)

        prop = session.get(Property, req.property_id)
        status_label = {"approved": "aprovada", "rejected": "rejeitada", "concluded": "concluída"}.get(action.status, action.status)
        session.add(Notification(
            id=str(uuid4()),
            user_id=req.user_id,
            title=f"Visita {status_label}",
            message=f"A sua visita ao imóvel '{prop.titulo if prop else ''}' foi {status_label}.",
            type=f"visit_{action.status}",
            created_at=datetime.now(timezone.utc).isoformat(),
        ))

        session.commit()
        session.refresh(req)
        user = session.get(User, req.user_id)
        return build_visit_request_read(req, prop, user)


@app.get("/users")
def list_users(current_user: User = Depends(require_roles(["admin"]))):
    with Session(engine) as session:
        users = session.exec(select(User)).all()
        return [user_to_dict(u) for u in users]


@app.get("/clientes")
def list_clientes(current_user: User = Depends(require_roles(["admin"]))):
    """List all registered clients from the independent Cliente table."""
    with Session(engine) as session:
        clientes = session.exec(select(Cliente)).all()
        return [
            {
                "id": c.id,
                "user_id": c.user_id,
                "nome": c.nome,
                "email": c.email,
                "phone": c.phone,
                "created_at": c.created_at,
            }
            for c in clientes
        ]


@app.get("/vendedores")
def list_vendedores(current_user: User = Depends(require_roles(["admin"]))):
    """List all registered vendors from the independent Vendedor table."""
    with Session(engine) as session:
        vendedores = session.exec(select(Vendedor)).all()
        return [
            {
                "id": v.id,
                "user_id": v.user_id,
                "nome": v.nome,
                "email": v.email,
                "phone": v.phone,
                "empresa": v.empresa,
                "licenca": v.licenca,
                "created_at": v.created_at,
            }
            for v in vendedores
        ]


# ---- Client-facing visit request endpoints ----

@app.get("/my/visit-requests", response_model=List[VisitRequestRead])
def my_visit_requests(current_user: User = Depends(require_roles(["cliente"]))):
    with Session(engine) as session:
        q = select(VisitRequest).where(VisitRequest.user_id == current_user.id)
        results = session.exec(q).all()
        out: List[VisitRequestRead] = []
        for req in results:
            prop = session.get(Property, req.property_id)
            out.append(build_visit_request_read(req, prop, current_user))
        return out


@app.delete("/my/visit-requests/{request_id}", status_code=204)
def cancel_my_visit_request(request_id: str, current_user: User = Depends(require_roles(["cliente"]))):
    with Session(engine) as session:
        req = session.get(VisitRequest, request_id)
        if not req:
            raise HTTPException(status_code=404, detail="Visit request not found")
        if req.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not your request")
        if req.status != "pending":
            raise HTTPException(status_code=400, detail="Only pending requests can be cancelled")
        session.delete(req)
        session.commit()
        return


@app.patch("/my/visit-requests/{request_id}")
def update_my_visit_request(request_id: str, payload: VisitRequestUpdate, current_user: User = Depends(require_roles(["cliente"]))):
    with Session(engine) as session:
        req = session.get(VisitRequest, request_id)
        if not req:
            raise HTTPException(status_code=404, detail="Visit request not found")
        if req.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not your request")
        if req.status != "pending":
            raise HTTPException(status_code=400, detail="Only pending requests can be edited")
        new_date = payload.preferred_date if payload.preferred_date is not None else req.preferred_date
        new_time = payload.preferred_time if payload.preferred_time is not None else req.preferred_time

        # Conflict check on updated date/time
        if new_date and new_time:
            conflict = session.exec(
                select(VisitRequest).where(
                    VisitRequest.property_id == req.property_id,
                    VisitRequest.preferred_date == new_date,
                    VisitRequest.preferred_time == new_time,
                    VisitRequest.status.in_(["pending", "approved"]),
                    VisitRequest.id != req.id,
                )
            ).first()
            if conflict:
                raise HTTPException(
                    status_code=409,
                    detail=f"Já existe uma visita agendada para {new_date} às {new_time}. Escolha outro horário.",
                )

        if payload.preferred_date is not None:
            req.preferred_date = payload.preferred_date
        if payload.preferred_time is not None:
            req.preferred_time = payload.preferred_time
        session.add(req)
        session.commit()
        session.refresh(req)
        prop = session.get(Property, req.property_id)
        return build_visit_request_read(req, prop, current_user)


# =====================================================================
# FAVORITES
# =====================================================================

@app.get("/my/favorites")
def my_favorites(current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        favs = session.exec(select(Favorite).where(Favorite.user_id == current_user.id)).all()
        property_ids = [f.property_id for f in favs]
        if not property_ids:
            return []
        props = session.exec(select(Property).where(Property.id.in_(property_ids), Property.deleted == False)).all()
        return [p.model_dump() for p in props]


@app.post("/my/favorites/{property_id}", status_code=201)
def add_favorite(property_id: str, current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        existing = session.exec(
            select(Favorite).where(Favorite.user_id == current_user.id, Favorite.property_id == property_id)
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Already favorited")
        fav = Favorite(
            id=str(uuid4()),
            user_id=current_user.id,
            property_id=property_id,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        session.add(fav)
        session.commit()
        return {"id": fav.id, "property_id": fav.property_id}


@app.delete("/my/favorites/{property_id}", status_code=204)
def remove_favorite(property_id: str, current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        fav = session.exec(
            select(Favorite).where(Favorite.user_id == current_user.id, Favorite.property_id == property_id)
        ).first()
        if not fav:
            raise HTTPException(status_code=404, detail="Not favorited")
        session.delete(fav)
        session.commit()
        return


# =====================================================================
# NOTIFICATIONS (with pagination)
# =====================================================================

@app.get("/my/notifications")
def my_notifications(
    page: Optional[int] = None,
    per_page: Optional[int] = None,
    current_user: User = Depends(get_current_user),
):
    with Session(engine) as session:
        q = select(Notification).where(Notification.user_id == current_user.id).order_by(Notification.created_at.desc())
        if page and per_page:
            q = q.offset((page - 1) * per_page).limit(per_page)
        notifs = session.exec(q).all()
        return [
            NotificationRead(
                id=n.id, user_id=n.user_id, title=n.title, message=n.message,
                type=n.type, read=n.read, created_at=n.created_at, link=n.link,
            )
            for n in notifs
        ]


@app.patch("/my/notifications/{notification_id}/read")
def mark_notification_read(notification_id: str, current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        notif = session.get(Notification, notification_id)
        if not notif or notif.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Not found")
        notif.read = True
        session.add(notif)
        session.commit()
        return {"ok": True}


@app.patch("/my/notifications/read-all")
def mark_all_notifications_read(current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        notifs = session.exec(
            select(Notification).where(Notification.user_id == current_user.id, Notification.read == False)
        ).all()
        for n in notifs:
            n.read = True
            session.add(n)
        session.commit()
        return {"ok": True}


# =====================================================================
# CHAT (with pagination)
# =====================================================================

@app.get("/chat/conversations")
def chat_conversations(current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        sent = session.exec(select(ChatMessage).where(ChatMessage.sender_id == current_user.id)).all()
        received = session.exec(select(ChatMessage).where(ChatMessage.receiver_id == current_user.id)).all()
        partner_ids = set()
        for m in sent:
            partner_ids.add(m.receiver_id)
        for m in received:
            partner_ids.add(m.sender_id)
        conversations = []
        for pid in partner_ids:
            partner = session.get(User, pid)
            if partner:
                all_msgs = [m for m in sent + received if m.sender_id == pid or m.receiver_id == pid]
                all_msgs.sort(key=lambda m: m.created_at, reverse=True)
                last = all_msgs[0] if all_msgs else None
                unread = len([m for m in received if m.sender_id == pid and not m.read])
                conversations.append({
                    "partner_id": pid,
                    "partner_name": partner.nome,
                    "partner_role": partner.role,
                    "last_message": last.message if last else "",
                    "last_message_at": last.created_at if last else "",
                    "unread_count": unread,
                })
        conversations.sort(key=lambda c: c["last_message_at"], reverse=True)
        return conversations


@app.get("/chat/{partner_id}")
def chat_messages(
    partner_id: str,
    page: Optional[int] = None,
    per_page: Optional[int] = None,
    current_user: User = Depends(get_current_user),
):
    with Session(engine) as session:
        q = select(ChatMessage).where(
            ((ChatMessage.sender_id == current_user.id) & (ChatMessage.receiver_id == partner_id))
            | ((ChatMessage.sender_id == partner_id) & (ChatMessage.receiver_id == current_user.id))
        ).order_by(ChatMessage.created_at)
        if page and per_page:
            q = q.offset((page - 1) * per_page).limit(per_page)
        msgs = session.exec(q).all()

        # mark received messages as read
        for m in msgs:
            if m.receiver_id == current_user.id and not m.read:
                m.read = True
                session.add(m)
        session.commit()

        result = []
        for m in msgs:
            sender = session.get(User, m.sender_id)
            receiver = session.get(User, m.receiver_id)
            result.append(ChatMessageRead(
                id=m.id, sender_id=m.sender_id,
                sender_name=sender.nome if sender else "",
                receiver_id=m.receiver_id,
                receiver_name=receiver.nome if receiver else "",
                property_id=m.property_id,
                message=m.message, created_at=m.created_at, read=m.read,
            ))
        return result


@app.post("/chat/{partner_id}", status_code=201)
def send_chat_message(partner_id: str, payload: ChatMessageCreate, current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        partner = session.get(User, partner_id)
        if not partner:
            raise HTTPException(status_code=404, detail="User not found")
        msg = ChatMessage(
            id=str(uuid4()),
            sender_id=current_user.id,
            receiver_id=partner_id,
            property_id=payload.property_id,
            message=payload.message,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        session.add(msg)
        session.add(Notification(
            id=str(uuid4()),
            user_id=partner_id,
            title="Nova mensagem",
            message=f"{current_user.nome}: {payload.message[:80]}",
            type="chat",
            created_at=datetime.now(timezone.utc).isoformat(),
        ))
        session.commit()
        session.refresh(msg)
        return ChatMessageRead(
            id=msg.id, sender_id=msg.sender_id,
            sender_name=current_user.nome,
            receiver_id=msg.receiver_id,
            receiver_name=partner.nome,
            property_id=msg.property_id,
            message=msg.message, created_at=msg.created_at, read=msg.read,
        )


# =====================================================================
# REVIEWS
# =====================================================================

@app.get("/properties/{property_id}/reviews")
def get_reviews(property_id: str):
    with Session(engine) as session:
        reviews = session.exec(select(Review).where(Review.property_id == property_id)).all()
        reviews_sorted = sorted(reviews, key=lambda r: r.created_at, reverse=True)
        return [
            ReviewRead(
                id=r.id, property_id=r.property_id, user_id=r.user_id,
                user_name=r.user_name, rating=r.rating, comment=r.comment, created_at=r.created_at,
            )
            for r in reviews_sorted
        ]


@app.get("/properties/{property_id}/reviews/check")
def check_my_review(property_id: str, current_user: User = Depends(get_current_user)):
    """Check if current user already reviewed this property. Returns {has_reviewed, review}."""
    with Session(engine) as session:
        existing = session.exec(
            select(Review).where(Review.property_id == property_id, Review.user_id == current_user.id)
        ).first()
        if existing:
            return {
                "has_reviewed": True,
                "review": ReviewRead(
                    id=existing.id, property_id=existing.property_id, user_id=existing.user_id,
                    user_name=existing.user_name, rating=existing.rating, comment=existing.comment,
                    created_at=existing.created_at,
                ),
            }
        return {"has_reviewed": False, "review": None}


@app.post("/properties/{property_id}/reviews", status_code=201)
def create_review(property_id: str, payload: ReviewCreate, current_user: User = Depends(get_current_user)):
    # rating already validated by pydantic field_validator
    with Session(engine) as session:
        prop = session.get(Property, property_id)
        if not prop or prop.deleted:
            raise HTTPException(status_code=404, detail="Property not found")
        existing = session.exec(
            select(Review).where(Review.property_id == property_id, Review.user_id == current_user.id)
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Já avaliou este imóvel")
        review = Review(
            id=str(uuid4()),
            property_id=property_id,
            user_id=current_user.id,
            user_name=current_user.nome,
            rating=payload.rating,
            comment=payload.comment,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        session.add(review)
        session.add(Notification(
            id=str(uuid4()),
            user_id=prop.vendedorId,
            title="Nova avaliação",
            message=f"{current_user.nome} avaliou o imóvel '{prop.titulo}' com {payload.rating} estrelas.",
            type="review",
            created_at=datetime.now(timezone.utc).isoformat(),
        ))
        session.commit()
        return ReviewRead(
            id=review.id, property_id=review.property_id, user_id=review.user_id,
            user_name=review.user_name, rating=review.rating, comment=review.comment,
            created_at=review.created_at,
        )


# =====================================================================
# ADMIN
# =====================================================================

@app.get("/admin/stats")
def admin_stats(current_user: User = Depends(require_roles(["admin"]))):
    with Session(engine) as session:
        total_props = session.exec(select(func.count(Property.id)).where(Property.deleted == False)).one()
        props_venda = session.exec(
            select(func.count(Property.id)).where(Property.tipo == "venda", Property.deleted == False)
        ).one()
        props_arrend = session.exec(
            select(func.count(Property.id)).where(Property.tipo == "arrendamento", Property.deleted == False)
        ).one()

        total_users = session.exec(select(func.count(User.id))).one()
        clientes = session.exec(select(func.count(User.id)).where(User.role == "cliente")).one()
        vendedores = session.exec(select(func.count(User.id)).where(User.role == "vendedor")).one()

        total_visits = session.exec(select(func.count(VisitRequest.id))).one()
        pending_visits = session.exec(select(func.count(VisitRequest.id)).where(VisitRequest.status == "pending")).one()
        approved_visits = session.exec(select(func.count(VisitRequest.id)).where(VisitRequest.status == "approved")).one()
        rejected_visits = session.exec(select(func.count(VisitRequest.id)).where(VisitRequest.status == "rejected")).one()

        total_reviews = session.exec(select(func.count(Review.id))).one()

        # properties by city (COUNT + GROUP BY)
        city_rows = session.exec(
            select(Property.cidade, func.count(Property.id)).where(Property.deleted == False).group_by(Property.cidade)
        ).all()
        cities = {row[0]: row[1] for row in city_rows}

        # properties by tipologia
        tipo_rows = session.exec(
            select(Property.tipologia, func.count(Property.id)).where(Property.deleted == False).group_by(Property.tipologia)
        ).all()
        tipologias = {row[0]: row[1] for row in tipo_rows}

        return {
            "properties": {"total": total_props, "venda": props_venda, "arrendamento": props_arrend},
            "users": {"total": total_users, "clientes": clientes, "vendedores": vendedores},
            "visits": {"total": total_visits, "pending": pending_visits, "approved": approved_visits, "rejected": rejected_visits},
            "reviews": {"total": total_reviews},
            "by_city": cities,
            "by_tipologia": tipologias,
        }


@app.patch("/admin/users/{user_id}")
def admin_update_user(user_id: str, payload: AdminUserUpdate, current_user: User = Depends(require_roles(["admin"]))):
    """Admin can change a user's role or deactivate/reactivate them."""
    with Session(engine) as session:
        user = session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user.id == current_user.id:
            raise HTTPException(status_code=400, detail="Não pode alterar a sua própria conta por esta via")
        if payload.role is not None:
            if payload.role not in ("cliente", "vendedor", "admin"):
                raise HTTPException(status_code=400, detail="Role inválido")
            user.role = payload.role
        if payload.is_active is not None:
            user.is_active = payload.is_active
        session.add(user)
        session.commit()
        session.refresh(user)
        logger.info(f"Admin updated user {user.email}: role={user.role}, is_active={user.is_active}")
        return user_to_dict(user)


@app.get("/admin/deleted-properties")
def admin_deleted_properties(current_user: User = Depends(require_roles(["admin"]))):
    """List soft-deleted properties (admin only)."""
    with Session(engine) as session:
        props = session.exec(select(Property).where(Property.deleted == True)).all()
        return [p.model_dump() for p in props]


# =====================================================================
# VENDOR ENDPOINTS
# =====================================================================

@app.get("/vendor/visit-requests", response_model=List[VisitRequestRead])
def vendor_visit_requests(current_user: User = Depends(require_roles(["vendedor"]))):
    """Return visit requests for vendor's properties."""
    with Session(engine) as session:
        my_props = session.exec(select(Property).where(Property.vendedorId == current_user.id)).all()
        prop_ids = [p.id for p in my_props]
        if not prop_ids:
            return []
        results = session.exec(select(VisitRequest).where(VisitRequest.property_id.in_(prop_ids))).all()
        out: List[VisitRequestRead] = []
        for req in results:
            prop = session.get(Property, req.property_id)
            user = session.get(User, req.user_id)
            out.append(build_visit_request_read(req, prop, user))
        return out


@app.patch("/vendor/visit-requests/{request_id}")
def vendor_update_visit(request_id: str, action: VisitRequestAction, current_user: User = Depends(require_roles(["vendedor"]))):
    """Vendor can approve/reject/conclude visits on their own properties."""
    with Session(engine) as session:
        req = session.get(VisitRequest, request_id)
        if not req:
            raise HTTPException(status_code=404, detail="Visit request not found")
        # verify ownership
        prop = session.get(Property, req.property_id)
        if not prop or prop.vendedorId != current_user.id:
            raise HTTPException(status_code=403, detail="Esta visita não pertence aos seus imóveis")
        if action.status not in ("approved", "rejected", "concluded"):
            raise HTTPException(status_code=400, detail="Invalid status")

        req.status = action.status
        req.admin_note = action.admin_note
        req.admin_id = current_user.id
        req.decided_at = date.today().isoformat()
        session.add(req)

        status_label = {"approved": "aprovada", "rejected": "rejeitada", "concluded": "concluída"}.get(action.status, action.status)
        session.add(Notification(
            id=str(uuid4()),
            user_id=req.user_id,
            title=f"Visita {status_label}",
            message=f"A sua visita ao imóvel '{prop.titulo}' foi {status_label} pelo vendedor.",
            type=f"visit_{action.status}",
            created_at=datetime.now(timezone.utc).isoformat(),
        ))

        session.commit()
        session.refresh(req)
        user = session.get(User, req.user_id)
        return build_visit_request_read(req, prop, user)


@app.get("/vendor/stats")
def vendor_stats(current_user: User = Depends(require_roles(["vendedor"]))):
    """Stats specific to the current vendor."""
    with Session(engine) as session:
        my_props = session.exec(
            select(Property).where(Property.vendedorId == current_user.id, Property.deleted == False)
        ).all()
        prop_ids = [p.id for p in my_props]

        total_props = len(my_props)
        props_venda = sum(1 for p in my_props if p.tipo == "venda")
        props_arrend = sum(1 for p in my_props if p.tipo == "arrendamento")

        total_visits = 0
        pending_visits = 0
        approved_visits = 0
        if prop_ids:
            total_visits = session.exec(
                select(func.count(VisitRequest.id)).where(VisitRequest.property_id.in_(prop_ids))
            ).one()
            pending_visits = session.exec(
                select(func.count(VisitRequest.id)).where(
                    VisitRequest.property_id.in_(prop_ids), VisitRequest.status == "pending"
                )
            ).one()
            approved_visits = session.exec(
                select(func.count(VisitRequest.id)).where(
                    VisitRequest.property_id.in_(prop_ids), VisitRequest.status == "approved"
                )
            ).one()

        total_reviews = 0
        avg_rating = 0.0
        if prop_ids:
            total_reviews = session.exec(
                select(func.count(Review.id)).where(Review.property_id.in_(prop_ids))
            ).one()
            avg_row = session.exec(
                select(func.avg(Review.rating)).where(Review.property_id.in_(prop_ids))
            ).one()
            avg_rating = round(float(avg_row), 2) if avg_row else 0.0

        total_favorites = 0
        if prop_ids:
            total_favorites = session.exec(
                select(func.count(Favorite.id)).where(Favorite.property_id.in_(prop_ids))
            ).one()

        return {
            "properties": {"total": total_props, "venda": props_venda, "arrendamento": props_arrend},
            "visits": {"total": total_visits, "pending": pending_visits, "approved": approved_visits},
            "reviews": {"total": total_reviews, "average_rating": avg_rating},
            "favorites": total_favorites,
        }


# =====================================================================
# ADMIN REPORT (using COUNT queries)
# =====================================================================

@app.get("/admin/report")
def admin_report(current_user: User = Depends(require_roles(["admin"]))):
    """Generate a monthly report summary."""
    with Session(engine) as session:
        today = date.today()
        month_start = today.replace(day=1).isoformat()

        total_props = session.exec(select(func.count(Property.id)).where(Property.deleted == False)).one()
        new_props = session.exec(
            select(func.count(Property.id)).where(Property.createdAt >= month_start, Property.deleted == False)
        ).one()

        total_visits = session.exec(select(func.count(VisitRequest.id))).one()
        month_visits = session.exec(
            select(func.count(VisitRequest.id)).where(VisitRequest.requested_at >= month_start)
        ).one()

        total_users = session.exec(select(func.count(User.id))).one()

        return {
            "period": f"{today.strftime('%B %Y')}",
            "new_properties": new_props,
            "total_properties": total_props,
            "visits_this_month": month_visits,
            "total_visits": total_visits,
            "total_users": total_users,
            "summary": f"No mês de {today.strftime('%B %Y')}, foram adicionados {new_props} novos imóveis e recebidos {month_visits} pedidos de visita.",
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
