from datetime import date, datetime, timedelta, timezone
from models import User, Property, VisitRequest, Cliente, Vendedor
from passlib.context import CryptContext
from sqlmodel import select

# use pbkdf2_sha256 in dev to avoid native bcrypt dependency
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

mock_users = [
  {"id": "1", "nome": "Ana Silva", "email": "ana@example.com", "role": "cliente", "phone": "+258841234567"},
  {"id": "2", "nome": "João Santos", "email": "joao@example.com", "role": "vendedor", "phone": "+258842345678"},
  {"id": "3", "nome": "Admin", "email": "admin@example.com", "role": "admin", "phone": "+258843456789"},
  {"id": "4", "nome": "ImovelTop", "email": "admin@imoveltop.co.mz", "role": "admin", "phone": "+258840000000"},
]

mock_properties = [
  {
    "id": "1",
    "titulo": "Moradia Moderna T4",
    "descricao": "Moradia moderna com acabamentos de luxo, jardim amplo e piscina. Localizada na Polana Cimento em Maputo.",
    "tipo": "venda",
    "preco": 4500000,
    "localizacao": "Polana Cimento",
    "cidade": "Maputo",
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
    "preco": 18000,
    "localizacao": "Praia",
    "cidade": "Maputo",
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



mock_requests = [
    {
    "id": "r1",
    "property_id": "1",
    "user_id": "1",
    "requested_at": date.today().isoformat(),
    "preferred_date": (date.today() + timedelta(days=3)).isoformat(),
    "preferred_time": "10:00",
    "phone": "+258841234567",
    "status": "pending"
    },
    {
    "id": "r2",
    "property_id": "2",
    "user_id": "1",
    "requested_at": date.today().isoformat(),
    "preferred_date": (date.today() + timedelta(days=5)).isoformat(),
    "preferred_time": "14:30",
    "phone": "+258841234567",
    "status": "pending"
    },
    {
    "id": "r3",
    "property_id": "2",
    "user_id": "1",
    "requested_at": (date.today() - timedelta(days=2)).isoformat(),
    "preferred_date": (date.today() + timedelta(days=1)).isoformat(),
    "preferred_time": "09:00",
    "phone": "+258841234567",
    "status": "approved",
    "admin_id": "3",
    "decided_at": (date.today() - timedelta(days=1)).isoformat()
    },
]

def seed(session):
    # seed users if none — set default password `password` (hashed) for demo users
    if not session.exec(select(User)).first():
        for u in mock_users:
            pw = "Haile123" if u["nome"] == "ImovelTop" else "password"
            user_data = {**u, "hashed_password": pwd_context.hash(pw), "email_verified": True}
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

    # seed visit requests if none
    if not session.exec(select(VisitRequest)).first():
        for r in mock_requests:
            session.add(VisitRequest(**r))

    # seed role-specific tables
    now = datetime.now(timezone.utc).isoformat()
    if not session.exec(select(Cliente)).first():
        for u in mock_users:
            if u["role"] == "cliente":
                session.add(Cliente(id=f"cli-{u['id']}", user_id=u["id"], nome=u["nome"], email=u["email"], phone=u.get("phone"), created_at=now))
    if not session.exec(select(Vendedor)).first():
        for u in mock_users:
            if u["role"] == "vendedor":
                session.add(Vendedor(id=f"ven-{u['id']}", user_id=u["id"], nome=u["nome"], email=u["email"], phone=u.get("phone"), created_at=now))

    session.commit()
