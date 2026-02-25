from typing import List, Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON
from datetime import date

class User(SQLModel, table=True):
    id: str = Field(primary_key=True)
    nome: str
    email: Optional[str] = None
    role: str
    phone: Optional[str] = None
    # store hashed password for credential login (nullable for demo users)
    hashed_password: Optional[str] = None
    email_verified: bool = True  # True for demo/seed users; False for new registrations until verified
    is_active: bool = True  # admin can deactivate accounts


class Cliente(SQLModel, table=True):
    """Independent client registration data."""
    id: str = Field(primary_key=True)
    user_id: str  # references User.id
    nome: str
    email: Optional[str] = None
    phone: Optional[str] = None
    documento_id: Optional[str] = None  # Documento de identificação
    nuit: Optional[str] = None  # NUIT
    comprovativo_residencia: Optional[str] = None  # Comprovativo de residência
    capacidade_financeira: Optional[str] = None  # Capacidade financeira estimada
    tipo_interesse: Optional[str] = None  # compra | arrendamento | ambos
    created_at: str


class Vendedor(SQLModel, table=True):
    """Independent vendor registration data."""
    id: str = Field(primary_key=True)
    user_id: str  # references User.id
    nome: str
    email: Optional[str] = None
    phone: Optional[str] = None
    empresa: Optional[str] = None  # company name
    licenca: Optional[str] = None  # license number
    created_at: str


class Property(SQLModel, table=True):
    id: str = Field(primary_key=True)
    titulo: str
    descricao: str
    tipo: str
    preco: float
    localizacao: str
    cidade: str
    tipoImovel: Optional[str] = None  # Vivenda, Flat, Escritório, Loja, Armazém, Terreno, Bar, Outro
    tipologia: str
    area: float
    imagem: str
    galeria: List[str] = Field(sa_column=Column(JSON))
    vendedorId: str
    vendedorNome: str
    createdAt: str
    quartos: int  # Now represents "Número de salas" (living rooms); bedrooms are defined by tipologia
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
    verificadoAdmin: bool = False   # Admin verification badge
    verificadoNota: Optional[str] = None  # Admin verification note
    caracteristicas: List[str] = Field(sa_column=Column(JSON))
    deleted: bool = False
    deleted_at: Optional[str] = None
    # ===== NEW FIELDS FOR DYNAMIC FORM =====
    negociavel: Optional[str] = None  # "sim" or "nao"
    tipoAnunciante: Optional[str] = None  # "particular", "agente", "empresa"
    contacto: Optional[str] = None  # Contact phone/email
    disponibilidade: Optional[str] = None  # "meio_semana", "fim_semana", "meio_dia", "todo_dia", "dias_especificos"
    diasEspecificos: Optional[str] = None  # Specific days description
    latitude: Optional[float] = None  # GPS latitude
    longitude: Optional[float] = None  # GPS longitude
    dadosEspecificos: Optional[str] = None  # JSON string with type-specific data


class PriceHistory(SQLModel, table=True):
    """Tracks price changes for properties."""
    id: str = Field(primary_key=True)
    property_id: str
    old_price: float
    new_price: float
    changed_at: str


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
