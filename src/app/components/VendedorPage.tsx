import { useState, useEffect, useCallback } from 'react';
import { Property, User, VisitRequest } from '../types/property';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { PropertyCard } from './PropertyCard';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { fetchVendorVisitRequests, vendorUpdateVisit, fetchVendorStats } from '../api';
import { toast } from 'sonner';
import { CalendarDays, Home, BarChart3, Clock, CheckCircle2, XCircle, ArrowLeft, Loader2, Star, Heart } from 'lucide-react';

interface VendedorPageProps {
  currentUser: User;
  properties: Property[];
  onViewDetails: (p: Property) => void;
  onNavigate: (view: string) => void;
  onDelete: (id: string) => void;
  onLogout?: () => void;
}

type VendorTab = 'properties' | 'visits' | 'stats';

export function VendedorPage({ currentUser, properties, onViewDetails, onNavigate, onDelete, onLogout }: VendedorPageProps & { onLogout: () => void }) {
  const myProps = properties.filter(p => p.vendedorId === currentUser.id);
  const [tab, setTab] = useState<VendorTab>('properties');
  const [visitRequests, setVisitRequests] = useState<VisitRequest[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [vendorStatsData, setVendorStatsData] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const loadVisits = useCallback(async () => {
    setLoadingVisits(true);
    try {
      const data = await fetchVendorVisitRequests();
      setVisitRequests(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVisits(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'visits') loadVisits();
    if (tab === 'stats') {
      setLoadingStats(true);
      fetchVendorStats().then(setVendorStatsData).catch(console.error).finally(() => setLoadingStats(false));
    }
  }, [tab, loadVisits]);

  const pendingVisits = visitRequests.filter(v => v.status === 'pending');
  const approvedVisits = visitRequests.filter(v => v.status === 'approved');
  const rejectedVisits = visitRequests.filter(v => v.status === 'rejected');

  const tabs: { key: VendorTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'properties', label: 'Meus Imóveis', icon: <Home className="w-4 h-4" />, badge: myProps.length },
    { key: 'visits', label: 'Pedidos de Visita', icon: <CalendarDays className="w-4 h-4" />, badge: pendingVisits.length },
    { key: 'stats', label: 'Estatísticas', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Card className="mb-4">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <div className="font-semibold text-lg">{currentUser.nome}</div>
              <div className="text-sm text-muted-foreground">{currentUser.email}</div>
              <div className="text-xs capitalize text-muted-foreground mt-0.5">{currentUser.role}</div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => onNavigate('add-property')}>Adicionar Imóvel</Button>
              <Button variant="outline" onClick={onLogout}>Sair</Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold">Painel do Vendedor</h2>
            <p className="text-sm text-muted-foreground">Gerencie seus anúncios, veja pedidos de visita e estatísticas.</p>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-2 border-b pb-2">
          {tabs.map((t) => (
            <Button
              key={t.key}
              variant={tab === t.key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTab(t.key)}
              className="gap-2"
            >
              {t.icon}
              {t.label}
              {t.badge != null && t.badge > 0 && (
                <span className="ml-1 bg-primary/20 text-primary text-xs font-bold rounded-full px-1.5 py-0.5">{t.badge}</span>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Tab: Meus Imóveis */}
      {tab === 'properties' && (
        <>
          {myProps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myProps.map(p => (
                <div key={p.id}>
                  <PropertyCard property={p} onViewDetails={onViewDetails} />
                  <div className="flex gap-2 mt-2">
                    <Button variant="destructive" size="sm" onClick={() => {
                      if (confirm(`Tem certeza que deseja eliminar "${p.titulo}"?`)) onDelete(p.id);
                    }}>Eliminar</Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Nenhum imóvel</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Você ainda não tem imóveis anunciados. Clique em "Adicionar Imóvel" para criar um anúncio.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Tab: Pedidos de Visita */}
      {tab === 'visits' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pedidos de Visita aos Meus Imóveis</CardTitle>
            <Button variant="outline" size="sm" onClick={loadVisits} disabled={loadingVisits}>
              {loadingVisits ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Atualizar'}
            </Button>
          </CardHeader>
          <CardContent>
            {loadingVisits && visitRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                Carregando...
              </div>
            ) : visitRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-lg font-medium">Nenhum pedido de visita</p>
                <p className="text-sm mt-1">Quando clientes agendarem visitas aos seus imóveis, aparecerão aqui.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visitRequests.map((v) => (
                  <div
                    key={v.id}
                    className={`p-4 border rounded-lg ${
                      v.status === 'approved' ? 'border-green-300 bg-green-50 dark:bg-green-950/20' :
                      v.status === 'rejected' ? 'border-red-200 bg-red-50 dark:bg-red-950/20' :
                      'border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{v.property_title}</span>
                          <Badge
                            variant={v.status === 'approved' ? 'default' : v.status === 'rejected' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {v.status === 'approved' ? 'Aprovado' : v.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Cliente:</span> {v.user_name}
                          {v.phone && <span className="ml-3">Tel: {v.phone}</span>}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-4">
                          {v.preferred_date && (
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3.5 h-3.5" />
                              {new Date(v.preferred_date).toLocaleDateString('pt-MZ')}
                            </span>
                          )}
                          {v.preferred_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {v.preferred_time}
                            </span>
                          )}
                        </div>
                        {v.admin_note && (
                          <div className="text-sm italic text-muted-foreground">Nota: {v.admin_note}</div>
                        )}
                      </div>
                      {v.status === 'pending' && (
                        <div className="flex gap-2 ml-4 shrink-0">
                          <Button size="sm" variant="default" onClick={async () => {
                            try {
                              await vendorUpdateVisit(v.id, { status: 'approved' });
                              toast.success('Visita aprovada');
                              loadVisits();
                            } catch (err: any) { toast.error('Falha: ' + (err.message || 'Erro')); }
                          }}>
                            <CheckCircle2 className="w-4 h-4 mr-1" />Aprovar
                          </Button>
                          <Button size="sm" variant="destructive" onClick={async () => {
                            try {
                              await vendorUpdateVisit(v.id, { status: 'rejected' });
                              toast.success('Visita rejeitada');
                              loadVisits();
                            } catch (err: any) { toast.error('Falha: ' + (err.message || 'Erro')); }
                          }}>
                            <XCircle className="w-4 h-4 mr-1" />Rejeitar
                          </Button>
                        </div>
                      )}
                      {v.status === 'approved' && (
                        <div className="flex gap-2 ml-4 shrink-0">
                          <Button size="sm" variant="outline" onClick={async () => {
                            try {
                              await vendorUpdateVisit(v.id, { status: 'concluded' });
                              toast.success('Visita concluída');
                              loadVisits();
                            } catch (err: any) { toast.error('Falha: ' + (err.message || 'Erro')); }
                          }}>Concluir</Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Estatísticas */}
      {tab === 'stats' && (
        <>
          {loadingStats ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : vendorStatsData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Total Imóveis</div>
                  <div className="text-3xl font-bold mt-1">{vendorStatsData.properties.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Para Venda</div>
                  <div className="text-3xl font-bold mt-1 text-primary">{vendorStatsData.properties.venda}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Para Arrendamento</div>
                  <div className="text-3xl font-bold mt-1">{vendorStatsData.properties.arrendamento}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Visitas Pendentes</div>
                  <div className="text-3xl font-bold mt-1 text-yellow-600">{vendorStatsData.visits.pending}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Visitas Aprovadas</div>
                  <div className="text-3xl font-bold mt-1 text-green-600">{vendorStatsData.visits.approved}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Total Visitas</div>
                  <div className="text-3xl font-bold mt-1">{vendorStatsData.visits.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Star className="w-4 h-4" />Avaliações</div>
                  <div className="text-3xl font-bold mt-1">{vendorStatsData.reviews.total}</div>
                  {vendorStatsData.reviews.average_rating > 0 && (
                    <div className="text-sm text-muted-foreground mt-1">Média: {vendorStatsData.reviews.average_rating} estrelas</div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Heart className="w-4 h-4" />Favoritos</div>
                  <div className="text-3xl font-bold mt-1">{vendorStatsData.favorites}</div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Total Imóveis</div>
                  <div className="text-3xl font-bold mt-1">{myProps.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Visitas Pendentes</div>
                  <div className="text-3xl font-bold mt-1 text-yellow-600">{pendingVisits.length}</div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </main>
  );
}
