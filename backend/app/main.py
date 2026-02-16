from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Any
from datetime import date
from pydantic import BaseModel
from uuid import uuid4

from sqlmodel import Session, select

from database import create_db_and_tables, engine
from models import Property, User
from initial_data import seed
from security import create_access_token, get_current_user, require_roles


def user_to_dict(user: User) -> Dict[str, Any]:
    return {"id": user.id, "nome": user.nome, "email": user.email, "role": user.role}

app = FastAPI(title="Imobiliaria API")

# Allow Vite dev server origin and localhost
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    role: str


class RegisterRequest(BaseModel):
    nome: str
    email: str
    password: str
    role: str


class TokenLoginRequest(BaseModel):
    email: str
    password: str


class PropertyCreate(BaseModel):
    titulo: str
    descricao: str
    tipo: str
    preco: float
    localizacao: str
    cidade: str
    tipologia: str
    area: float
    imagem: Optional[str] = None
    galeria: Optional[List[str]] = []
    quartos: int
    casasBanho: int
    garagem: bool = False
    piscina: bool = False
    jardim: bool = False
    anoConstructao: int
    certificadoEnergetico: str
    caracteristicas: Optional[List[str]] = []


@app.on_event("startup")
def on_startup():
    # create tables and apply a simple schema-fix for the new `hashed_password` column
    create_db_and_tables()

    # if the `user` table exists but lacks the `hashed_password` column, add it (sqlite)
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            cols = conn.execute(text("PRAGMA table_info('user')")).fetchall()
            col_names = [c[1] for c in cols]
            if 'hashed_password' not in col_names:
                conn.execute(text("ALTER TABLE user ADD COLUMN hashed_password TEXT"))
    except Exception:
        # non-blocking — migrations should be handled properly in production
        pass

    with Session(engine) as session:
        seed(session)


@app.post("/auth/login")
def login(req: LoginRequest):
    with Session(engine) as session:
        user = session.exec(select(User).where(User.role == req.role)).first()
        if not user:
            raise HTTPException(status_code=400, detail="User with that role not found")
        token = create_access_token({"sub": user.id, "role": user.role})
        return {"access_token": token, "token_type": "bearer", "user": user_to_dict(user)}


@app.post("/auth/token")
def token_login(payload: TokenLoginRequest):
    """Login using email + password (returns JWT)."""
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == payload.email)).first()
        if not user or not user.hashed_password:
            raise HTTPException(status_code=400, detail="Incorrect email or password")
        from .security import verify_password
        if not verify_password(payload.password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Incorrect email or password")
        token = create_access_token({"sub": user.id, "role": user.role})
        return {"access_token": token, "token_type": "bearer", "user": user_to_dict(user)}


@app.post("/auth/register")
def register(req: RegisterRequest):
    """Create a new user (role must be 'vendedor' or 'cliente'). Returns JWT + user."""
    if req.role not in ("vendedor", "cliente"):
        raise HTTPException(status_code=400, detail="Invalid role")
    with Session(engine) as session:
        exists = session.exec(select(User).where(User.email == req.email)).first()
        if exists:
            raise HTTPException(status_code=400, detail="Email already registered")
        from .security import get_password_hash
        new_user = User(
            id=str(uuid4()),
            nome=req.nome,
            email=req.email,
            role=req.role,
            hashed_password=get_password_hash(req.password)
        )
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        token = create_access_token({"sub": new_user.id, "role": new_user.role})
        return {"access_token": token, "token_type": "bearer", "user": user_to_dict(new_user)}


@app.get("/auth/me")
def me(current_user: User = Depends(get_current_user)):
    """Return the current user from the Bearer token (useful for frontend auto-login)."""
    return user_to_dict(current_user)


@app.get("/properties", response_model=List[Property])
def list_properties(tipo: Optional[str] = None, cidade: Optional[str] = None, preco_max: Optional[float] = None, tipologia: Optional[str] = None):
    with Session(engine) as session:
        q = select(Property)
        if tipo and tipo != "todos":
            q = q.where(Property.tipo == tipo)
        if cidade:
            q = q.where(Property.cidade.ilike(f"%{cidade}%"))
        if preco_max is not None:
            q = q.where(Property.preco <= preco_max)
        if tipologia and tipologia != "todos":
            q = q.where(Property.tipologia == tipologia)
        results = session.exec(q).all()
        return results


@app.get("/properties/{property_id}", response_model=Property)
def get_property(property_id: str):
    with Session(engine) as session:
        property_obj = session.get(Property, property_id)
        if not property_obj:
            raise HTTPException(status_code=404, detail="Property not found")
        return property_obj


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
            piscina=payload.piscina,
            jardim=payload.jardim,
            anoConstructao=payload.anoConstructao,
            certificadoEnergetico=payload.certificadoEnergetico,
            caracteristicas=payload.caracteristicas or []
        )
        session.add(prop)
        session.commit()
        session.refresh(prop)
        return prop


@app.delete("/properties/{property_id}", status_code=204)
def delete_property(property_id: str, current_user: User = Depends(require_roles(["admin"]))):
    with Session(engine) as session:
        prop = session.get(Property, property_id)
        if not prop:
            raise HTTPException(status_code=404, detail="Property not found")
        session.delete(prop)
        session.commit()
        return
