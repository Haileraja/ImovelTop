import { Property, AdminStats, ChatConversation, ChatMessageType } from '../types/property';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useI18n } from '../i18n';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { formatMozCurrency } from '../utils/format';
import api, { updateVisitRequest, fetchAdminStats, fetchAdminReport, adminUpdateUser, fetchDeletedProperties, restoreProperty, fetchClientes, fetchVendedores, adminVerifyProperty, watermarkProperty, fetchChatConversations, fetchChatMessages, sendChatMessage } from '../api';
import { Settings, Trash2, Eye, ArrowLeft, BarChart3, Users, Home, CalendarDays, Star, FileText, Loader2, RotateCcw, ShieldCheck, ShieldOff, UserCheck, Briefcase, Plus, CheckCircle, XCircle, Droplets, MessageCircle, Send } from 'lucide-react';
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
  onNavigate?: (view: string) => void;
}

type AdminTab = 'dashboard' | 'properties' | 'visits' | 'calendar' | 'users' | 'clientes' | 'vendedores' | 'messages' | 'deleted' | 'report';

export function AdminPanel({ properties, visitRequests = [], users = [], onRefreshVisitRequests, onRefreshUsers, onDelete, onViewProperty, onBack, onNavigate }: AdminPanelProps) {
  const { t } = useI18n();
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
  const [clientes, setClientes] = useState<any[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [loadingVendedores, setLoadingVendedores] = useState(false);

  // Chat/Messages state
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [selectedConvName, setSelectedConvName] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessageType[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [newMsg, setNewMsg] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // PDF/Excel export
  const handleExportPDF = useCallback(async () => {
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    const doc = new jsPDF() as any;
    doc.setFontSize(18);
    doc.text('ImovelTop - Relatório de Imóveis', 14, 22);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-MZ')}`, 14, 30);
    const tableData = properties.map(p => [
      p.titulo, p.tipo, p.cidade, formatMozCurrency(p.preco), p.vendedorNome, p.tipologia, `${p.area}m²`,
    ]);
    doc.autoTable({
      head: [['Título', 'Tipo', 'Cidade', 'Preço', 'Vendedor', 'Tipologia', 'Área']],
      body: tableData,
      startY: 36,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });
    doc.save('imoveltop-imoveis.pdf');
    toast.success(t('admin.exportPDFSuccess') || 'PDF exportado!');
  }, [properties, t]);

  const handleExportExcel = useCallback(async () => {
    const XLSX = await import('xlsx');
    const data = properties.map(p => ({
      Título: p.titulo, Tipo: p.tipo, Cidade: p.cidade,
      Preço: p.preco, Vendedor: p.vendedorNome,
      Tipologia: p.tipologia, Área: p.area,
      Quartos: p.quartos, 'Casas Banho': p.casasBanho,
      Garagem: p.garagem ? 'Sim' : 'Não', Piscina: p.piscina ? 'Sim' : 'Não',
      Verificado: p.verificadoAdmin ? 'Sim' : 'Não',
      'Ano Construção': p.anoConstructao,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Imóveis');
    XLSX.writeFile(wb, 'imoveltop-imoveis.xlsx');
    toast.success(t('admin.exportExcelSuccess') || 'Excel exportado!');
  }, [properties, t]);

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
    if (tab === 'clientes') {
      setLoadingClientes(true);
      fetchClientes().then(setClientes).catch(console.error).finally(() => setLoadingClientes(false));
    }
    if (tab === 'vendedores') {
      setLoadingVendedores(true);
      fetchVendedores().then(setVendedores).catch(console.error).finally(() => setLoadingVendedores(false));
    }
    if (tab === 'messages') {
      setLoadingConvs(true);
      fetchChatConversations().then((d) => setConversations(d || [])).catch(console.error).finally(() => setLoadingConvs(false));
    }
  }, [tab]);

  const handleDelete = (id: string, titulo: string) => {
    if (confirm(t('admin.confirmDelete', { title: titulo }))) {
      onDelete(id);
      toast.success(t('admin.propertyDeleted'));
    }
  };

  // Chat handlers
  const openConversation = async (partnerId: string, partnerName: string) => {
    setSelectedConv(partnerId);
    setSelectedConvName(partnerName);
    setLoadingMsgs(true);
    try {
      const msgs = await fetchChatMessages(partnerId);
      setChatMessages(msgs || []);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) { console.error(err); }
    finally { setLoadingMsgs(false); }
  };

  const handleSendMessage = async () => {
    if (!newMsg.trim() || !selectedConv) return;
    setSendingMsg(true);
    try {
      const msg = await sendChatMessage(selectedConv, newMsg.trim());
      setChatMessages((prev) => [...prev, msg]);
      setNewMsg('');
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) { console.error(err); toast.error(t('admin.failSendMessage') || 'Falha ao enviar mensagem'); }
    finally { setSendingMsg(false); }
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
    { key: 'dashboard', label: t('admin.dashboard'), icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'properties', label: t('admin.properties'), icon: <Home className="w-4 h-4" /> },
    { key: 'visits', label: t('admin.visits'), icon: <CalendarDays className="w-4 h-4" /> },
    { key: 'calendar', label: t('admin.calendar') || 'Agenda', icon: <CalendarDays className="w-4 h-4" /> },
    { key: 'users', label: t('admin.users'), icon: <Users className="w-4 h-4" /> },
    { key: 'clientes', label: t('admin.clientesTab'), icon: <UserCheck className="w-4 h-4" /> },
    { key: 'vendedores', label: t('admin.vendedoresTab'), icon: <Briefcase className="w-4 h-4" /> },
    { key: 'messages', label: t('admin.messagesTab') || 'Mensagens', icon: <MessageCircle className="w-4 h-4" /> },
    { key: 'deleted', label: t('admin.trash'), icon: <RotateCcw className="w-4 h-4" /> },
    { key: 'report', label: t('admin.report'), icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('admin.back')}
      </Button>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-6 h-6" />
            {t('admin.panel')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {tabs.map(tb => (
              <Button key={tb.key} variant={tab === tb.key ? 'default' : 'ghost'} size="sm" onClick={() => setTab(tb.key)} className="gap-2">
                {tb.icon} {tb.label}
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
                    <div className="flex items-center gap-2 mb-2"><Home className="w-5 h-5 text-primary" /><span className="text-sm text-muted-foreground">{t('admin.totalProperties')}</span></div>
                    <div className="text-3xl font-bold">{stats.properties.total}</div>
                    <div className="text-xs text-muted-foreground mt-1">{t('admin.saleRentBreakdown', { sale: String(stats.properties.venda), rent: String(stats.properties.arrendamento) })}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2"><Users className="w-5 h-5 text-blue-500" /><span className="text-sm text-muted-foreground">{t('admin.totalUsers')}</span></div>
                    <div className="text-3xl font-bold">{stats.users.total}</div>
                    <div className="text-xs text-muted-foreground mt-1">{t('admin.userBreakdown', { clients: String(stats.users.clientes), vendors: String(stats.users.vendedores) })}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2"><CalendarDays className="w-5 h-5 text-green-500" /><span className="text-sm text-muted-foreground">{t('admin.totalVisits')}</span></div>
                    <div className="text-3xl font-bold">{stats.visits.total}</div>
                    <div className="text-xs text-muted-foreground mt-1">{t('admin.visitBreakdown', { pending: String(stats.visits.pending), approved: String(stats.visits.approved) })}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2"><Star className="w-5 h-5 text-yellow-500" /><span className="text-sm text-muted-foreground">{t('admin.totalReviews')}</span></div>
                    <div className="text-3xl font-bold">{stats.reviews.total}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-lg">{t('admin.byCity')}</CardTitle></CardHeader>
                  <CardContent>
                    {Object.entries(stats.by_city).length === 0 ? (
                      <p className="text-muted-foreground text-sm">{t('admin.noData')}</p>
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
                  <CardHeader><CardTitle className="text-lg">{t('admin.byTypology')}</CardTitle></CardHeader>
                  <CardContent>
                    {Object.entries(stats.by_tipologia).length === 0 ? (
                      <p className="text-muted-foreground text-sm">{t('admin.noData')}</p>
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
                <CardHeader><CardTitle className="text-lg">{t('admin.visitStatus')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span className="text-sm">{t('admin.pendingLabel')}: <strong>{stats.visits.pending}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm">{t('admin.approvedLabel')}: <strong>{stats.visits.approved}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-sm">{t('admin.rejectedLabel')}: <strong>{stats.visits.rejected}</strong></span>
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
            <div className="flex items-center gap-3">
              <CardTitle>{t('admin.propertyManagement')}</CardTitle>
              {onNavigate && (
                <Button size="sm" onClick={() => onNavigate('add-property')} className="gap-1">
                  <Plus className="w-4 h-4" /> {t('admin.addProperty')}
                </Button>
              )}
            </div>
            <input
              type="text"
              placeholder={t('admin.searchTitleVendor')}
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
                    <TableHead>{t('admin.tableTitle')}</TableHead>
                    <TableHead>{t('admin.tableType')}</TableHead>
                    <TableHead>{t('admin.tableLocation')}</TableHead>
                    <TableHead>{t('admin.tablePrice')}</TableHead>
                    <TableHead>{t('admin.tableVendor')}</TableHead>
                    <TableHead>{t('admin.tableStatus') || 'Estado'}</TableHead>
                    <TableHead className="text-right">{t('admin.tableActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((property) => (
                    <TableRow key={property.id}>
                      <TableCell className="font-medium">{property.titulo}</TableCell>
                      <TableCell>
                        <Badge variant={property.tipo === 'venda' ? 'default' : 'secondary'}>
                          {property.tipo === 'venda' ? t('property.sale') : t('property.rent')}
                        </Badge>
                      </TableCell>
                      <TableCell>{property.localizacao}</TableCell>
                      <TableCell>
                        {formatMozCurrency(property.preco)}
                        {property.tipo === 'arrendamento' && t('property.perMonth')}
                      </TableCell>
                      <TableCell>{property.vendedorNome}</TableCell>
                      <TableCell>
                        {property.verificadoAdmin ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 gap-1 text-xs">
                            <ShieldCheck className="w-3 h-3" /> {t('property.verified') || 'Verificado'}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">{t('admin.statusPending') || 'Pendente'}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => onViewProperty(property)} title={t('admin.tableActions')}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {property.verificadoAdmin ? (
                            <Button size="sm" variant="outline" className="text-red-500" title={t('admin.unverify') || 'Remover verificação'} onClick={async () => {
                              try {
                                await adminVerifyProperty(property.id, false);
                                toast.success(t('admin.unverified') || 'Verificação removida');
                              } catch (err: any) { toast.error(err.message || 'Erro'); }
                            }}>
                              <XCircle className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="text-green-600" title={t('admin.verify') || 'Verificar'} onClick={async () => {
                              try {
                                await adminVerifyProperty(property.id, true, 'Verificado pelo admin');
                                toast.success(t('admin.verified') || 'Imóvel verificado');
                              } catch (err: any) { toast.error(err.message || 'Erro'); }
                            }}>
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="text-blue-500" title={t('admin.watermark') || 'Marca d\'água'} onClick={async () => {
                            try {
                              await watermarkProperty(property.id);
                              toast.success(t('admin.watermarked') || 'Marca d\'água aplicada');
                            } catch (err: any) { toast.error(err.message || 'Erro'); }
                          }}>
                            <Droplets className="w-4 h-4" />
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
                <Button size="sm" disabled={page === 1} onClick={gotoPrev}>{t('admin.previous')}</Button>
                <span>{page} / {totalPages}</span>
                <Button size="sm" disabled={page === totalPages} onClick={gotoNext}>{t('admin.next')}</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Visits Tab */}
      {tab === 'visits' && (
        <Card>
          <CardHeader><CardTitle>{t('admin.visitRequestsTitle')}</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.tableProperty')}</TableHead>
                    <TableHead>{t('admin.tableClient')}</TableHead>
                    <TableHead>{t('admin.tableStatus')}</TableHead>
                    <TableHead>{t('admin.tablePhone')}</TableHead>
                    <TableHead>{t('admin.tablePreferredDate')}</TableHead>
                    <TableHead>{t('admin.tableTime')}</TableHead>
                    <TableHead>{t('admin.tableRequestedAt')}</TableHead>
                    <TableHead className="text-right">{t('admin.tableActions')}</TableHead>
                    <TableHead>{t('admin.tableDecidedBy')}</TableHead>
                    <TableHead>{t('admin.tableDecidedAt')}</TableHead>
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
                            {req.status === 'approved' ? t('admin.statusApproved') : req.status === 'rejected' ? t('admin.statusRejected') : t('admin.statusPending')}
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
                                  toast.success(t('admin.requestApproved'));
                                  if (onRefreshVisitRequests) onRefreshVisitRequests();
                                } catch (err) { console.error(err); toast.error(t('admin.failApprove')); }
                              }}>{t('admin.approve')}</Button>
                              <Button size="sm" variant="destructive" onClick={async () => {
                                try {
                                  await updateVisitRequest(req.id, { status: 'rejected' });
                                  toast.success(t('admin.requestRejected'));
                                  if (onRefreshVisitRequests) onRefreshVisitRequests();
                                } catch (err) { console.error(err); toast.error(t('admin.failReject')); }
                              }}>{t('admin.reject')}</Button>
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

      {/* Calendar Tab */}
      {tab === 'calendar' && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="w-5 h-5" /> {t('admin.calendar') || 'Agenda de Visitas'}</CardTitle></CardHeader>
          <CardContent>
            {(() => {
              const events = visitRequests
                .filter(r => r.preferred_date && r.status !== 'rejected')
                .map(r => {
                  const [y, m, d] = (r.preferred_date || '2024-01-01').split('-').map(Number);
                  const [hh, mm] = (r.preferred_time || '09:00').split(':').map(Number);
                  const start = new Date(y, m - 1, d, hh, mm);
                  const end = new Date(start.getTime() + 60 * 60 * 1000);
                  return {
                    title: `${r.property_title} — ${r.user_name}`,
                    start,
                    end,
                    status: r.status,
                  };
                });

              const today = new Date();
              const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
              const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
              const days: Date[] = [];
              for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
                days.push(new Date(d));
              }

              return (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">{today.toLocaleDateString('pt-MZ', { month: 'long', year: 'numeric' })}</h3>
                  <div className="grid grid-cols-7 gap-1">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                      <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                    ))}
                    {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {days.map(day => {
                      const dayEvents = events.filter(e =>
                        e.start.getDate() === day.getDate() &&
                        e.start.getMonth() === day.getMonth()
                      );
                      const isToday = day.toDateString() === today.toDateString();
                      return (
                        <div
                          key={day.toISOString()}
                          className={`min-h-[60px] border rounded-lg p-1 text-xs ${isToday ? 'border-primary bg-primary/5' : 'border-border'}`}
                        >
                          <div className={`font-semibold text-right ${isToday ? 'text-primary' : ''}`}>{day.getDate()}</div>
                          {dayEvents.slice(0, 2).map((ev, i) => (
                            <div key={i} className={`truncate px-1 py-0.5 rounded text-[10px] mt-0.5 ${
                              ev.status === 'approved' ? 'bg-green-100 text-green-700' :
                              ev.status === 'concluded' ? 'bg-blue-100 text-blue-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {ev.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 2}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {events.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-4">{t('admin.noVisitRequests') || 'Nenhuma visita agendada'}</p>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <Card>
          <CardHeader><CardTitle>{t('admin.usersTitle')} ({users.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.tableName')}</TableHead>
                    <TableHead>{t('admin.tableEmail')}</TableHead>
                    <TableHead>{t('admin.tableRole')}</TableHead>
                    <TableHead>{t('admin.tableState')}</TableHead>
                    <TableHead className="text-right">{t('admin.tableActions')}</TableHead>
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
                          {u.is_active !== false ? t('admin.active') : t('admin.deactivated')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 flex-wrap">
                          {u.is_active !== false ? (
                            <Button size="sm" variant="outline" title={t('admin.deactivate')} onClick={async () => {
                              try {
                                await adminUpdateUser(u.id, { is_active: false });
                                toast.success(t('admin.userDeactivated', { name: u.nome }));
                                onRefreshUsers?.();
                              } catch (err: any) { toast.error(t('admin.failGeneric', { error: err.message || 'Erro' })); }
                            }}>
                              <ShieldOff className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" title={t('admin.reactivate')} onClick={async () => {
                              try {
                                await adminUpdateUser(u.id, { is_active: true });
                                toast.success(t('admin.userReactivated', { name: u.nome }));
                                onRefreshUsers?.();
                              } catch (err: any) { toast.error(t('admin.failGeneric', { error: err.message || 'Erro' })); }
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
                                  toast.success(t('admin.roleChanged', { name: u.nome, role: e.target.value }));
                                  onRefreshUsers?.();
                                } catch (err: any) { toast.error(t('admin.failGeneric', { error: err.message || 'Erro' })); }
                              }}
                            >
                              <option value="cliente">{t('admin.roleClient')}</option>
                              <option value="vendedor">{t('admin.roleVendor')}</option>
                              <option value="admin">{t('admin.roleAdmin')}</option>
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

      {/* Clientes Tab */}
      {tab === 'clientes' && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><UserCheck className="w-5 h-5" /> {t('admin.clientesTitle')} ({clientes.length})</CardTitle></CardHeader>
          <CardContent>
            {loadingClientes ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : clientes.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">{t('admin.noClientes')}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin.tableName')}</TableHead>
                      <TableHead>{t('admin.tableEmail')}</TableHead>
                      <TableHead>{t('admin.tablePhone')}</TableHead>
                      <TableHead>{t('admin.tableCreatedAt')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientes.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.nome}</TableCell>
                        <TableCell>{c.email || '-'}</TableCell>
                        <TableCell>{c.phone || '-'}</TableCell>
                        <TableCell>{c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vendedores Tab */}
      {tab === 'vendedores' && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5" /> {t('admin.vendedoresTitle')} ({vendedores.length})</CardTitle></CardHeader>
          <CardContent>
            {loadingVendedores ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : vendedores.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">{t('admin.noVendedores')}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin.tableName')}</TableHead>
                      <TableHead>{t('admin.tableEmail')}</TableHead>
                      <TableHead>{t('admin.tablePhone')}</TableHead>
                      <TableHead>{t('admin.tableCompany')}</TableHead>
                      <TableHead>{t('admin.tableLicense')}</TableHead>
                      <TableHead>{t('admin.tableCreatedAt')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendedores.map((v: any) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.nome}</TableCell>
                        <TableCell>{v.email || '-'}</TableCell>
                        <TableCell>{v.phone || '-'}</TableCell>
                        <TableCell>{v.empresa || '-'}</TableCell>
                        <TableCell>{v.licenca || '-'}</TableCell>
                        <TableCell>{v.created_at ? new Date(v.created_at).toLocaleDateString() : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Messages Tab */}
      {tab === 'messages' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              {t('admin.messagesTitle') || 'Mensagens'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedConv ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b">
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedConv(null); setChatMessages([]); setSelectedConvName(''); }}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> {t('admin.backToConversations') || 'Voltar'}
                  </Button>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                      {selectedConvName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-sm">{selectedConvName}</span>
                  </div>
                </div>
                <div className="border rounded-lg p-4 h-96 overflow-y-auto space-y-3 bg-muted/20">
                  {loadingMsgs ? (
                    <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin" /></div>
                  ) : chatMessages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">{t('admin.noMessagesYet') || 'Nenhuma mensagem ainda'}</p>
                    </div>
                  ) : (
                    <>
                      {chatMessages.map((m) => {
                        const isMe = String(m.sender_id) !== String(selectedConv);
                        return (
                          <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                              isMe
                                ? 'bg-primary text-primary-foreground rounded-br-sm'
                                : 'bg-white dark:bg-card border rounded-bl-sm shadow-sm'
                            }`}>
                              <p>{m.message}</p>
                              <div className={`text-[10px] mt-1 ${isMe ? 'opacity-70' : 'text-muted-foreground'}`}>
                                {new Date(m.created_at).toLocaleString('pt-MZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={chatEndRef} />
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    placeholder={t('admin.typeMessage') || 'Escrever mensagem...'}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                    className="flex-1"
                  />
                  <Button disabled={!newMsg.trim() || sendingMsg} onClick={handleSendMessage} className="gap-2">
                    {sendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {t('admin.send') || 'Enviar'}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {loadingConvs ? (
                  <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">{t('admin.noConversations') || 'Nenhuma conversa'}</p>
                    <p className="text-sm mt-1">{t('admin.noConversationsDesc') || 'As mensagens dos clientes aparecerão aqui.'}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conversations.map((c) => (
                      <div
                        key={c.partner_id}
                        className="flex items-center justify-between p-4 border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors group"
                        onClick={() => openConversation(c.partner_id, c.partner_name)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0">
                            {c.partner_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm">{c.partner_name}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-[320px]">{c.last_message}</div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <div className="text-xs text-muted-foreground">
                            {new Date(c.last_message_at).toLocaleDateString('pt-MZ')}
                          </div>
                          {c.unread_count > 0 && (
                            <Badge variant="destructive" className="mt-1 text-[10px]">{c.unread_count}</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Deleted Properties Tab */}
      {tab === 'deleted' && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><RotateCcw className="w-5 h-5" /> {t('admin.deletedProperties')}</CardTitle></CardHeader>
          <CardContent>
            {loadingDeleted ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : deletedProps.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">{t('admin.noDeletedProperties')}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin.tableTitle')}</TableHead>
                      <TableHead>{t('admin.tableVendor')}</TableHead>
                      <TableHead>{t('admin.tableDeletedAt')}</TableHead>
                      <TableHead className="text-right">{t('admin.tableActions')}</TableHead>
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
                              toast.success(t('admin.restored', { title: p.titulo }));
                              setDeletedProps(prev => prev.filter(x => x.id !== p.id));
                            } catch (err: any) { toast.error(t('admin.failGeneric', { error: err.message || 'Erro' })); }
                          }}>
                            <RotateCcw className="w-4 h-4 mr-1" />
                            {t('admin.restore')}
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
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> {t('admin.monthlyReport')}</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleExportPDF} className="gap-1">
                  <FileText className="w-4 h-4" /> PDF
                </Button>
                <Button size="sm" variant="outline" onClick={handleExportExcel} className="gap-1">
                  <FileText className="w-4 h-4" /> Excel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingReport ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : report ? (
              <div className="space-y-4">
                <div className="text-lg font-semibold">{report.period}</div>
                <p className="text-muted-foreground">{report.summary}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">{t('admin.newProperties')}</div>
                    <div className="text-2xl font-bold">{report.new_properties}</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">{t('admin.totalPropertiesReport')}</div>
                    <div className="text-2xl font-bold">{report.total_properties}</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">{t('admin.visitsThisMonth')}</div>
                    <div className="text-2xl font-bold">{report.visits_this_month}</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">{t('admin.totalUsersReport')}</div>
                    <div className="text-2xl font-bold">{report.total_users}</div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">{t('admin.failLoadReport')}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
