export type PropertyType = 'venda' | 'arrendamento';
export type UserRole = 'cliente' | 'vendedor' | 'admin';

export interface Property {
  id: string;
  titulo: string;
  descricao: string;
  tipo: PropertyType;
  preco: number;
  localizacao: string;
  cidade: string;
  tipologia: string;
  area: number;
  imagem: string;
  galeria: string[]; // Múltiplas fotos
  vendedorId: string;
  vendedorNome: string;
  createdAt: string;
  quartos: number;
  casasBanho: number;
  garagem: boolean;
  piscina: boolean; // Tem piscina
  jardim: boolean; // Tem jardim
  anoConstructao: number; // Ano de construção
  certificadoEnergetico: string; // A+, A, B, C, etc.
  caracteristicas: string[]; // Ar condicionado, aquecimento, etc.
}

export interface User {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
}