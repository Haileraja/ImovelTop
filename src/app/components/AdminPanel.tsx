import { Property, AdminStats } from '../types/property';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { formatMozCurrency } from '../utils/format';
import api, { updateVisitRequest, fetchAdminStats, fetchAdminReport, adminUpdateUser, fetchDeletedProperties, restoreProperty } from '../api';
import { Settings, Trash2, Eye, ArrowLeft, BarChart3, Users, Home, CalendarDays, Star, FileText, Loader2, RotateCcw, ShieldCheck, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';

interface AdminPanelProps {
  properties: Property[];
  visitRequests?: Array<{
    id: string;
    property_id: string;
    property_title: string;
    user_id: string;
    user_name: string;
    requested_at: string;
    preferred_date?: string;
    preferred_time?: string;
    phone?: string;
    status?: string;
    admin_note?: string;
    admin_id?: string;
    decided_at?: string;
  }>;
  onRefreshVisitRequests?: () => void;
  users?: Array<{ id: string; nome: string; email: string; role: string; is_active?: boolean }>;
  onDelete: (id: string) => void;
  onViewProperty: (property: Property) => void;
  onBack: () => void;
  onRefreshUsers?: () => void;
}

type AdminTab = 'dashboard' | 'properties' | 'visits' | 'users' | 'deleted' | 'report';

export function AdminPanel({ properties, visitRequests = [], users = [], onRefreshVisitRequests, onRefreshUsers, onDelete, onViewProperty, onBack }: AdminPanelProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [deletedProps, setDeletedProps] = useState<any[]>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);

  useEffect(() => {
    if (tab === 'dashboard') {
      setLoadingStats(true);
      fetchAdminStats().then(setStats).catch(console.error).finally(() => setLoadingStats(false));
    }
    if (tab === 'report') {
      setLoadingReport(true);
      fetchAdminReport().then(setReport).catch(console.error).finally(() => setLoadingReport(false));
    }
    if (tab === 'deleted') {
      setLoadingDeleted(true);
      fetchDeletedProperties().then(setDeletedProps).catch(console.error).finally(() => setLoadingDeleted(false));
    }
  }, [tab]);

  const handleDelete = (id: string, titulo: string) => {
    if (confirm(`Tem certeza que deseja eliminar "${titulo}"?`)) {
      onDelete(id);
      toast.success('Imóvel eliminado com sucesso');
    }
  };

  const filtered = properties.filter(p =>
    p.titulo.toLowerCase().includes(search.toLowerCase()) ||
    p.vendedorNome.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const gotoPrev = () => setPage(p => Math.max(1, p - 1));
  const gotoNext = () => setPage(p => Math.min(totalPages, p + 1));

  const tabs: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'properties', label: 'Imóveis', icon: <Home className="w-4 h-4" /> },
    { key: 'visits', label: 'Visitas', icon: <CalendarDays className="w-4 h-4" /> },
    { key: 'users', label: 'Utilizadores', icon: <Users className="w-4 h-4" /> },
    { key: 'deleted', label: 'Lixeira', icon: <RotateCcw className="w-4 h-4" /> },
    { key: 'report', label: 'Relatório', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Painel de Administração
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {tabs.map(t => (
              <Button key={t.key} variant={tab === t.key ? 'default' : 'ghost'} size="sm" onClick={() => setTab(t.key)} className="gap-2">
                {t.icon} {t.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Tab */}
      {tab === 'dashboard' && (
        <>
          {loadingStats ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : stats ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2"><Home className="w-5 h-5 text-primary" /><span className="text-sm text-muted-foreground">Total Imóveis</span></div>
                    <div className="text-3xl font-bold">{stats.properties.total}</div>
                    <div className="text-xs text-muted-foreground mt-1">{stats.properties.venda} venda · {stats.properties.arrendamento} arrendamento</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2"><Users className="w-5 h-5 text-blue-500" /><span className="text-sm text-muted-foreground">Utilizadores</span></div>
                    <div className="text-3xl font-bold">{stats.users.total}</div>
                    <div className="text-xs text-muted-foreground mt-1">{stats.users.clientes} clientes · {stats.users.vendedores} vendedores</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2"><CalendarDays className="w-5 h-5 text-green-500" /><span className="text-sm text-muted-foreground">Visitas</span></div>
                    <div className="text-3xl font-bold">{stats.visits.total}</div>
                    <div className="text-xs text-muted-foreground mt-1">{stats.visits.pending} pendentes · {stats.visits.approved} aprovadas</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2"><Star className="w-5 h-5 text-yellow-500" /><span className="text-sm text-muted-foreground">Avaliações</span></div>
                    <div className="text-3xl font-bold">{stats.reviews.total}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-lg">Imóveis por Cidade</CardTitle></CardHeader>
                  <CardContent>
                    {Object.entries(stats.by_city).length === 0 ? (
                      <p className="text-muted-foreground text-sm">Sem dados</p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(stats.by_city).sort((a, b) => b[1] - a[1]).map(([city, count]) => (
                          <div key={city} className="flex items-center justify-between">
                            <span className="text-sm">{city}</span>
                            <div className="flex items-center gap-2">
                              <div className="h-2 bg-primary rounded-full" style={{ width: `${Math.max(20, (count / stats.properties.total) * 200)}px` }} />
                              <span className="text-sm font-semibold">{count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-lg">Imóveis por Tipologia</CardTitle></CardHeader>
                  <CardContent>
                    {Object.entries(stats.by_tipologia).length === 0 ? (
                      <p className="text-muted-foreground text-sm">Sem dados</p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(stats.by_tipologia).sort((a, b) => b[1] - a[1]).map(([tipo, count]) => (
                          <div key={tipo} className="flex items-center justify-between">
                            <span className="text-sm">{tipo}</span>
                            <div className="flex items-center gap-2">
                              <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${Math.max(20, (count / stats.properties.total) * 200)}px` }} />
                              <span className="text-sm font-semibold">{count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-lg">Estado das Visitas</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span className="text-sm">Pendentes: <strong>{stats.visits.pending}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm">Aprovadas: <strong>{stats.visits.approved}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-sm">Rejeitadas: <strong>{stats.visits.rejected}</strong></span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </>
      )}

      {/* Properties Tab */}
      {tab === 'properties' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Gestão de Imóveis</CardTitle>
            <input
              type="text"
              placeholder="Buscar título ou vendedor"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            />
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((property) => (
                    <TableRow key={property.id}>
                      <TableCell className="font-medium">{property.titulo}</TableCell>
                      <TableCell>
                        <Badge variant={property.tipo === 'venda' ? 'default' : 'secondary'}>
                          {property.tipo === 'venda' ? 'Venda' : 'Arrendamento'}
                        </Badge>
                      </TableCell>
                      <TableCell>{property.localizacao}</TableCell>
                      <TableCell>
                        {formatMozCurrency(property.preco)}
                        {property.tipo === 'arrendamento' && '/mês'}
                      </TableCell>
                      <TableCell>{property.vendedorNome}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => onViewProperty(property)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(property.id, property.titulo)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-4">
                <Button size="sm" disabled={page === 1} onClick={gotoPrev}>Anterior</Button>
                <span>{page} / {totalPages}</span>
                <Button size="sm" disabled={page === totalPages} onClick={gotoNext}>Próximo</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Visits Tab */}
      {tab === 'visits' && (
        <Card>
          <CardHeader><CardTitle>Pedidos de Visita</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Imóvel</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Data Preferida</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Solicitado Em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                    <TableHead>Decidido Por</TableHead>
                    <TableHead>Decidido Em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visitRequests.map(req => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{req.property_title}</TableCell>
                      <TableCell>{req.user_name}</TableCell>
                      <TableCell>
                        {req.status ? (
                          <Badge variant={req.status === 'approved' ? 'default' : req.status === 'rejected' ? 'destructive' : 'secondary'}>
                            {req.status === 'approved' ? 'Aprovado' : req.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{req.phone || '-'}</TableCell>
                      <TableCell>{req.preferred_date || '-'}</TableCell>
                      <TableCell>{req.preferred_time || '-'}</TableCell>
                      <TableCell>{req.requested_at}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {req.status === 'pending' && (
                            <>
                              <Button size="sm" variant="default" onClick={async () => {
                                try {
                                  await updateVisitRequest(req.id, { status: 'approved' });
                                  toast.success('Pedido aprovado');
                                  if (onRefreshVisitRequests) onRefreshVisitRequests();
                                } catch (err) { console.error(err); toast.error('Falha ao aprovar'); }
                              }}>Aprovar</Button>
                              <Button size="sm" variant="destructive" onClick={async () => {
                                try {
                                  await updateVisitRequest(req.id, { status: 'rejected' });
                                  toast.success('Pedido rejeitado');
                                  if (onRefreshVisitRequests) onRefreshVisitRequests();
                                } catch (err) { console.error(err); toast.error('Falha ao rejeitar'); }
                              }}>Rejeitar</Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {req.admin_id ? (users.find(u => u.id === req.admin_id)?.nome || req.admin_id) : '-'}
                      </TableCell>
                      <TableCell className="text-sm">{req.decided_at || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <Card>
          <CardHeader><CardTitle>Utilizadores ({users.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.nome}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">{u.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.is_active !== false ? 'default' : 'destructive'}>
                          {u.is_active !== false ? 'Activo' : 'Desactivado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 flex-wrap">
                          {u.is_active !== false ? (
                            <Button size="sm" variant="outline" title="Desactivar" onClick={async () => {
                              try {
                                await adminUpdateUser(u.id, { is_active: false });
                                toast.success(`${u.nome} desactivado`);
                                onRefreshUsers?.();
                              } catch (err: any) { toast.error('Falha: ' + (err.message || 'Erro')); }
                            }}>
                              <ShieldOff className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" title="Reactivar" onClick={async () => {
                              try {
                                await adminUpdateUser(u.id, { is_active: true });
                                toast.success(`${u.nome} reactivado`);
                                onRefreshUsers?.();
                              } catch (err: any) { toast.error('Falha: ' + (err.message || 'Erro')); }
                            }}>
                              <ShieldCheck className="w-4 h-4" />
                            </Button>
                          )}
                          {u.role !== 'admin' && (
                            <select
                              className="text-xs border rounded px-1 py-0.5"
                              value={u.role}
                              onChange={async (e) => {
                                try {
                                  await adminUpdateUser(u.id, { role: e.target.value });
                                  toast.success(`Role de ${u.nome} alterado para ${e.target.value}`);
                                  onRefreshUsers?.();
                                } catch (err: any) { toast.error('Falha: ' + (err.message || 'Erro')); }
                              }}
                            >
                              <option value="cliente">Cliente</option>
                              <option value="vendedor">Vendedor</option>
                              <option value="admin">Admin</option>
                            </select>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deleted Properties Tab */}
      {tab === 'deleted' && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><RotateCcw className="w-5 h-5" /> Imóveis Eliminados</CardTitle></CardHeader>
          <CardContent>
            {loadingDeleted ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : deletedProps.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">Nenhum imóvel na lixeira.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Eliminado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deletedProps.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.titulo}</TableCell>
                        <TableCell>{p.vendedorNome}</TableCell>
                        <TableCell>{p.deleted_at || '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={async () => {
                            try {
                              await restoreProperty(p.id);
                              toast.success(`"${p.titulo}" restaurado`);
                              setDeletedProps(prev => prev.filter(x => x.id !== p.id));
                            } catch (err: any) { toast.error('Falha: ' + (err.message || 'Erro')); }
                          }}>
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Restaurar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Report Tab */}
      {tab === 'report' && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Relatório Mensal</CardTitle></CardHeader>
          <CardContent>
            {loadingReport ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : report ? (
              <div className="space-y-4">
                <div className="text-lg font-semibold">{report.period}</div>
                <p className="text-muted-foreground">{report.summary}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Novos Imóveis</div>
                    <div className="text-2xl font-bold">{report.new_properties}</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Total Imóveis</div>
                    <div className="text-2xl font-bold">{report.total_properties}</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Visitas este mês</div>
                    <div className="text-2xl font-bold">{report.visits_this_month}</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Total Utilizadores</div>
                    <div className="text-2xl font-bold">{report.total_users}</div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Erro ao carregar relatório</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
