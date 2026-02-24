from typing import List, Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON
from datetime import date

class User(SQLModel, table=True):
    id: str = Field(primary_key=True)
    nome: str
    email: str
    role: str
    phone: Optional[str] = None
    # store hashed password for credential login (nullable for demo users)
    hashed_password: Optional[str] = None
    email_verified: bool = True  # True for demo/seed users; False for new registrations until verified
    is_active: bool = True  # admin can deactivate accounts

class Property(SQLModel, table=True):
    id: str = Field(primary_key=True)
    titulo: str
    descricao: str
    tipo: str
    preco: float
    localizacao: str
    cidade: str
    tipologia: str
    area: float
    imagem: str
    galeria: List[str] = Field(sa_column=Column(JSON))
    vendedorId: str
    vendedorNome: str
    createdAt: str
    quartos: int
    casasBanho: int
    garagem: bool = False
    piscina: bool = False
    jardim: bool = False
    anoConstructao: int
    certificadoEnergetico: str
    caracteristicas: List[str] = Field(sa_column=Column(JSON))
    deleted: bool = False
    deleted_at: Optional[str] = None


class VisitRequest(SQLModel, table=True):
    id: str = Field(primary_key=True)
    property_id: str
    user_id: str
    requested_at: str  # ISO date/time
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None
    phone: Optional[str] = None
    # admin workflow
    status: str = "pending"  # pending | approved | rejected | concluded
    admin_id: Optional[str] = None
    admin_note: Optional[str] = None
    decided_at: Optional[str] = None


class Favorite(SQLModel, table=True):
    id: str = Field(primary_key=True)
    user_id: str
    property_id: str
    created_at: str


class Notification(SQLModel, table=True):
    id: str = Field(primary_key=True)
    user_id: str
    title: str
    message: str
    type: str = "info"  # info | visit_approved | visit_rejected | chat | review
    read: bool = False
    created_at: str
    link: Optional[str] = None  # optional link to navigate to


class ChatMessage(SQLModel, table=True):
    id: str = Field(primary_key=True)
    sender_id: str
    receiver_id: str
    property_id: Optional[str] = None  # optional context
    message: str
    created_at: str
    read: bool = False


class Review(SQLModel, table=True):
    id: str = Field(primary_key=True)
    property_id: str
    user_id: str
    user_name: str
    rating: int  # 1-5
    comment: Optional[str] = None
    created_at: str


class PasswordResetToken(SQLModel, table=True):
    id: str = Field(primary_key=True)
    user_id: str
    token: str
    created_at: str
    used: bool = False


class EmailVerification(SQLModel, table=True):
    id: str = Field(primary_key=True)
    user_id: str
    code: str  # 6-digit code
    email: str
    created_at: str
    verified: bool = False
    attempts: int = 0  # track failed attempts
