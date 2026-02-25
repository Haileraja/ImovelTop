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
  tipoImovel?: string; // Vivenda, Flat, Escritório, Loja, Armazém, Terreno, Bar, Outro
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
  garagemNumCarros: number;
  garagemFechada: boolean;
  arCondicionado: boolean;
  piscina: boolean; // Tem piscina
  ginasio: boolean;
  escritorio: boolean;
  salaJogos: boolean;
  salaTV: boolean;
  jardim: boolean; // Tem jardim
  areaLazer: boolean;
  mobilada: boolean;
  sistemaSeguranca: boolean;
  elevador: boolean;
  anoConstructao: number; // Ano de construção
  certificadoEnergetico: string; // A+, A, B, C, etc.
  verificadoAdmin?: boolean; // Admin verified
  verificadoNota?: string; // Admin verification note
  caracteristicas: string[]; // Ar condicionado, aquecimento, etc.
  // New fields for dynamic form
  negociavel?: string; // "sim" or "nao"
  tipoAnunciante?: string; // "particular", "agente", "empresa"
  contacto?: string; // Contact phone/email
  disponibilidade?: string; // "meio_semana", "fim_semana", "meio_dia", "todo_dia", "dias_especificos"
  diasEspecificos?: string; // Specific days description
  latitude?: number; // GPS latitude
  longitude?: number; // GPS longitude
  dadosEspecificos?: string; // JSON string with type-specific data
}

export interface User {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  phone?: string;
}

export interface VisitRequest {
  id: string;
  property_id: string;
  property_title: string;
  user_id: string;
  user_name: string;
  requested_at: string;
  preferred_date?: string;
  preferred_time?: string;
  phone?: string;
  status: string;
  admin_id?: string;
  admin_note?: string;
  decided_at?: string;
}

export interface NotificationType {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  link?: string;
}

export interface ChatMessageType {
  id: string;
  sender_id: string;
  sender_name: string;
  receiver_id: string;
  receiver_name: string;
  property_id?: string;
  message: string;
  created_at: string;
  read: boolean;
}

export interface ChatConversation {
  partner_id: string;
  partner_name: string;
  partner_role: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export interface ReviewType {
  id: string;
  property_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface AdminStats {
  properties: { total: number; venda: number; arrendamento: number };
  users: { total: number; clientes: number; vendedores: number };
  visits: { total: number; pending: number; approved: number; rejected: number };
  reviews: { total: number };
  by_city: Record<string, number>;
  by_tipologia: Record<string, number>;
}

export interface PriceHistoryEntry {
  id: string;
  old_price: number;
  new_price: number;
  changed_at: string;
}