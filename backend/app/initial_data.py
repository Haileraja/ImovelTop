from models import User, Property
from passlib.context import CryptContext
from sqlmodel import select

# use pbkdf2_sha256 in dev to avoid native bcrypt dependency
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

mock_users = [
  {"id": "1", "nome": "Ana Silva", "email": "ana@example.com", "role": "cliente"},
  {"id": "2", "nome": "João Santos", "email": "joao@example.com", "role": "vendedor"},
  {"id": "3", "nome": "Admin", "email": "admin@example.com", "role": "admin"}
]

mock_properties = [
  {
    "id": "1",
    "titulo": "Moradia Moderna T4",
    "descricao": "Moradia moderna com acabamentos de luxo, jardim amplo e piscina. Localizada numa zona tranquila com excelentes acessos.",
    "tipo": "venda",
    "preco": 450000,
    "localizacao": "Cascais",
    "cidade": "Lisboa",
    "tipologia": "T4",
    "area": 250,
    "imagem": "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    "galeria": [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
    ],
    "vendedorId": "2",
    "vendedorNome": "João Santos",
    "createdAt": "2026-02-10",
    "quartos": 4,
    "casasBanho": 3,
    "garagem": True,
    "piscina": True,
    "jardim": True,
    "anoConstructao": 2022,
    "certificadoEnergetico": "A+",
    "caracteristicas": ["Ar Condicionado", "Aquecimento Central"]
  },
  {
    "id": "2",
    "titulo": "Apartamento de Luxo T3",
    "descricao": "Apartamento luxuoso no centro da cidade, com vista para o rio.",
    "tipo": "arrendamento",
    "preco": 1800,
    "localizacao": "Parque das Nações",
    "cidade": "Lisboa",
    "tipologia": "T3",
    "area": 150,
    "imagem": "https://images.unsplash.com/photo-1638454668466-e8dbd5462f20?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    "galeria": ["https://images.unsplash.com/photo-1638454668466-e8dbd5462f20?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"],
    "vendedorId": "2",
    "vendedorNome": "João Santos",
    "createdAt": "2026-02-12",
    "quartos": 3,
    "casasBanho": 2,
    "garagem": True,
    "piscina": False,
    "jardim": False,
    "anoConstructao": 2020,
    "certificadoEnergetico": "A",
    "caracteristicas": ["Ar Condicionado", "Vista Rio"]
  }
]


def seed(session):
    # seed users if none — set default password `password` (hashed) for demo users
    if not session.exec(select(User)).first():
        for u in mock_users:
            user_data = {**u, "hashed_password": pwd_context.hash("password")}
            session.add(User(**user_data))
    else:
        # ensure existing users have a hashed_password set
        users = session.exec(select(User)).all()
        for usr in users:
            if not getattr(usr, "hashed_password", None):
                usr.hashed_password = pwd_context.hash("password")
                session.add(usr)

    # seed properties if none
    if not session.exec(select(Property)).first():
        for p in mock_properties:
            session.add(Property(**p))
    session.commit()
