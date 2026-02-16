from typing import List, Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON
from datetime import date

class User(SQLModel, table=True):
    id: str = Field(primary_key=True)
    nome: str
    email: str
    role: str
    # store hashed password for credential login (nullable for demo users)
    hashed_password: Optional[str] = None

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
