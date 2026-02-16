import { Property, User } from '../types/property';

export const mockUsers: User[] = [
  {
    id: '1',
    nome: 'Ana Silva',
    email: 'ana@example.com',
    role: 'cliente'
  },
  {
    id: '2',
    nome: 'João Santos',
    email: 'joao@example.com',
    role: 'vendedor'
  },
  {
    id: '3',
    nome: 'Admin',
    email: 'admin@example.com',
    role: 'admin'
  }
];

export const mockProperties: Property[] = [
  {
    id: '1',
    titulo: 'Moradia Moderna T4',
    descricao: 'Moradia moderna com acabamentos de luxo, jardim amplo e piscina. Localizada numa zona tranquila com excelentes acessos.',
    tipo: 'venda',
    preco: 450000,
    localizacao: 'Cascais',
    cidade: 'Lisboa',
    tipologia: 'T4',
    area: 250,
    imagem: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBob3VzZSUyMGV4dGVyaW9yfGVufDF8fHx8MTc3MTE4MjI5OXww&ixlib=rb-4.1.0&q=80&w=1080',
    galeria: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBob3VzZSUyMGV4dGVyaW9yfGVufDF8fHx8MTc3MTE4MjI5OXww&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1706043890009-9aae000532cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBob3VzZSUyMHBvb2x8ZW58MXx8fHwxNzcxMjY2ODAzfDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1677959098115-1aafeb9313c0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob3VzZSUyMGJlZHJvb20lMjBpbnRlcmlvcnxlbnwxfHx8fDE3NzEyNjY4MDN8MA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1610177534644-34d881503b83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBraXRjaGVuJTIwaW50ZXJpb3J8ZW58MXx8fHwxNzcxMTg2MjMzfDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1712254293792-1013ae15fafd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob3VzZSUyMGdhcmRlbiUyMGJhY2t5YXJkfGVufDF8fHx8MTc3MTI2NjgwM3ww&ixlib=rb-4.1.0&q=80&w=1080'
    ],
    vendedorId: '2',
    vendedorNome: 'João Santos',
    createdAt: '2026-02-10',
    quartos: 4,
    casasBanho: 3,
    garagem: true,
    piscina: true,
    jardim: true,
    anoConstructao: 2022,
    certificadoEnergetico: 'A+',
    caracteristicas: ['Ar Condicionado', 'Aquecimento Central', 'Painéis Solares', 'Sistema Domótico', 'Alarme']
  },
  {
    id: '2',
    titulo: 'Apartamento de Luxo T3',
    descricao: 'Apartamento luxuoso no centro da cidade, com vista para o rio. Condomínio com piscina, ginásio e segurança 24h.',
    tipo: 'arrendamento',
    preco: 1800,
    localizacao: 'Parque das Nações',
    cidade: 'Lisboa',
    tipologia: 'T3',
    area: 150,
    imagem: 'https://images.unsplash.com/photo-1638454668466-e8dbd5462f20?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBhcGFydG1lbnQlMjBpbnRlcmlvcnxlbnwxfHx8fDE3NzExODIyOTl8MA&ixlib=rb-4.1.0&q=80&w=1080',
    galeria: [
      'https://images.unsplash.com/photo-1638454668466-e8dbd5462f20?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBhcGFydG1lbnQlMjBpbnRlcmlvcnxlbnwxfHx8fDE3NzExODIyOTl8MA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1677959098115-1aafeb9313c0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob3VzZSUyMGJlZHJvb20lMjBpbnRlcmlvcnxlbnwxfHx8fDE3NzEyNjY4MDN8MA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1625578324458-a106197ff141?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBiYXRocm9vbSUyMGludGVyaW9yfGVufDF8fHx8MTc3MTE4MDEzNHww&ixlib=rb-4.1.0&q=80&w=1080'
    ],
    vendedorId: '2',
    vendedorNome: 'João Santos',
    createdAt: '2026-02-12',
    quartos: 3,
    casasBanho: 2,
    garagem: true,
    piscina: false,
    jardim: false,
    anoConstructao: 2020,
    certificadoEnergetico: 'A',
    caracteristicas: ['Ar Condicionado', 'Vista Rio', 'Ginásio', 'Segurança 24h', 'Elevador']
  },
  {
    id: '3',
    titulo: 'Casa Aconchegante T2',
    descricao: 'Casa familiar num bairro calmo, perfeita para quem procura conforto e tranquilidade. Totalmente renovada.',
    tipo: 'venda',
    preco: 280000,
    localizacao: 'Sintra',
    cidade: 'Lisboa',
    tipologia: 'T2',
    area: 120,
    imagem: 'https://images.unsplash.com/photo-1639059851892-95c80412298c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3p5JTIwaG91c2UlMjBsaXZpbmclMjByb29tfGVufDF8fHx8MTc3MTI2NTc5MXww&ixlib=rb-4.1.0&q=80&w=1080',
    galeria: [
      'https://images.unsplash.com/photo-1639059851892-95c80412298c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3p5JTIwaG91c2UlMjBsaXZpbmclMjByb29tfGVufDF8fHx8MTc3MTI2NTc5MXww&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1610177534644-34d881503b83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBraXRjaGVuJTIwaW50ZXJpb3J8ZW58MXx8fHwxNzcxMTg2MjMzfDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1677959098115-1aafeb9313c0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob3VzZSUyMGJlZHJvb20lMjBpbnRlcmlvcnxlbnwxfHx8fDE3NzEyNjY4MDN8MA&ixlib=rb-4.1.0&q=80&w=1080'
    ],
    vendedorId: '2',
    vendedorNome: 'João Santos',
    createdAt: '2026-02-08',
    quartos: 2,
    casasBanho: 1,
    garagem: false,
    piscina: false,
    jardim: true,
    anoConstructao: 1995,
    certificadoEnergetico: 'B',
    caracteristicas: ['Renovada', 'Aquecimento', 'Churrasqueira']
  },
  {
    id: '4',
    titulo: 'Villa Contemporânea T5',
    descricao: 'Villa de design contemporâneo com arquitetura arrojada, sistema domótico e painéis solares. Vista panorâmica.',
    tipo: 'venda',
    preco: 950000,
    localizacao: 'Estoril',
    cidade: 'Lisboa',
    tipologia: 'T5',
    area: 380,
    imagem: 'https://images.unsplash.com/photo-1707648496492-38255a8f1877?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb250ZW1wb3JhcnklMjB2aWxsYSUyMGV4dGVyaW9yfGVufDF8fHx8MTc3MTIzMTY4M3ww&ixlib=rb-4.1.0&q=80&w=1080',
    galeria: [
      'https://images.unsplash.com/photo-1707648496492-38255a8f1877?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb250ZW1wb3JhcnklMjB2aWxsYSUyMGV4dGVyaW9yfGVufDF8fHx8MTc3MTIzMTY4M3ww&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1706043890009-9aae000532cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBob3VzZSUyMHBvb2x8ZW58MXx8fHwxNzcxMjY2ODAzfDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1610177534644-34d881503b83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBraXRjaGVuJTIwaW50ZXJpb3J8ZW58MXx8fHwxNzcxMTg2MjMzfDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1677959098115-1aafeb9313c0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob3VzZSUyMGJlZHJvb20lMjBpbnRlcmlvcnxlbnwxfHx8fDE3NzEyNjY4MDN8MA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1625578324458-a106197ff141?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBiYXRocm9vbSUyMGludGVyaW9yfGVufDF8fHx8MTc3MTE4MDEzNHww&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1712254293792-1013ae15fafd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob3VzZSUyMGdhcmRlbiUyMGJhY2t5YXJkfGVufDF8fHx8MTc3MTI2NjgwM3ww&ixlib=rb-4.1.0&q=80&w=1080'
    ],
    vendedorId: '2',
    vendedorNome: 'João Santos',
    createdAt: '2026-02-05',
    quartos: 5,
    casasBanho: 4,
    garagem: true,
    piscina: true,
    jardim: true,
    anoConstructao: 2024,
    certificadoEnergetico: 'A+',
    caracteristicas: ['Sistema Domótico', 'Painéis Solares', 'Ar Condicionado', 'Aquecimento Central', 'Vista Panorâmica', 'Jacuzzi']
  },
  {
    id: '5',
    titulo: 'Apartamento Moderno T2',
    descricao: 'Apartamento novo em edifício moderno no coração da cidade. Próximo de transportes, comércio e serviços.',
    tipo: 'arrendamento',
    preco: 1200,
    localizacao: 'Avenidas Novas',
    cidade: 'Lisboa',
    tipologia: 'T2',
    area: 85,
    imagem: 'https://images.unsplash.com/photo-1736007917095-88dd6bc641e5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1cmJhbiUyMGFwYXJ0bWVudCUyMGJ1aWxkaW5nfGVufDF8fHx8MTc3MTI1NjA3MHww&ixlib=rb-4.1.0&q=80&w=1080',
    galeria: [
      'https://images.unsplash.com/photo-1736007917095-88dd6bc641e5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1cmJhbiUyMGFwYXJ0bWVudCUyMGJ1aWxkaW5nfGVufDF8fHx8MTc3MTI1NjA3MHww&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1638454668466-e8dbd5462f20?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBhcGFydG1lbnQlMjBpbnRlcmlvcnxlbnwxfHx8fDE3NzExODIyOTl8MA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1610177534644-34d881503b83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBraXRjaGVuJTIwaW50ZXJpb3J8ZW58MXx8fHwxNzcxMTg2MjMzfDA&ixlib=rb-4.1.0&q=80&w=1080'
    ],
    vendedorId: '2',
    vendedorNome: 'João Santos',
    createdAt: '2026-02-14',
    quartos: 2,
    casasBanho: 1,
    garagem: false,
    piscina: false,
    jardim: false,
    anoConstructao: 2023,
    certificadoEnergetico: 'A',
    caracteristicas: ['Ar Condicionado', 'Elevador', 'Varanda']
  },
  {
    id: '6',
    titulo: 'Casa Familiar T3',
    descricao: 'Casa espaçosa ideal para famílias, com quintal amplo e churrasqueira. Zona residencial tranquila.',
    tipo: 'venda',
    preco: 320000,
    localizacao: 'Odivelas',
    cidade: 'Lisboa',
    tipologia: 'T3',
    area: 180,
    imagem: 'https://images.unsplash.com/photo-1765765234094-bc009a3bba62?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdWJ1cmJhbiUyMGZhbWlseSUyMGhvbWV8ZW58MXx8fHwxNzcxMjMxNzU3fDA&ixlib=rb-4.1.0&q=80&w=1080',
    galeria: [
      'https://images.unsplash.com/photo-1765765234094-bc009a3bba62?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdWJ1cmJhbiUyMGZhbWlseSUyMGhvbWV8ZW58MXx8fHwxNzcxMjMxNzU3fDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1639059851892-95c80412298c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3p5JTIwaG91c2UlMjBsaXZpbmclMjByb29tfGVufDF8fHx8MTc3MTI2NTc5MXww&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1712254293792-1013ae15fafd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob3VzZSUyMGdhcmRlbiUyMGJhY2t5YXJkfGVufDF8fHx8MTc3MTI2NjgwM3ww&ixlib=rb-4.1.0&q=80&w=1080'
    ],
    vendedorId: '2',
    vendedorNome: 'João Santos',
    createdAt: '2026-02-11',
    quartos: 3,
    casasBanho: 2,
    garagem: true,
    piscina: false,
    jardim: true,
    anoConstructao: 2010,
    certificadoEnergetico: 'B',
    caracteristicas: ['Churrasqueira', 'Quintal', 'Aquecimento']
  }
];
