import { useState, useEffect, useCallback } from 'react';
import { Property, User, ChatConversation, ChatMessageType } from '../types/property';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { formatMozCurrency } from '../utils/format';
import { resolveImageUrl, fetchMyVisitRequests, cancelVisitRequest, updateMyVisitRequest, updateProfile, fetchMyFavorites, removeFavorite, fetchChatConversations, fetchChatMessages, sendChatMessage } from '../api';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { CalendarDays, User as UserIcon, Home, Trash2, Clock, CheckCircle2, XCircle, Loader2, Pencil, X, Heart, MessageCircle, Send, ArrowLeft } from 'lucide-react';

interface ClientePageProps {
  currentUser: User;
  properties: Property[];
  onViewDetails: (p: Property) => void;
  onLogout?: () => void;
  onUserUpdate?: (user: User) => void;
}

type Tab = 'imoveis' | 'agendamentos' | 'favoritos' | 'mensagens' | 'perfil';

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '14:00', '14:30', '15:00',
  '15:30', '16:00', '16:30', '17:00',
];

function statusLabel(status: string) {
  switch (status) {
    case 'pending': return 'Pendente';
    case 'approved': return 'Aprovado';
    case 'rejected': return 'Rejeitado';
    default: return status;
  }
}
function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'approved': return 'default';
    case 'rejected': return 'destructive';
    default: return 'secondary';
  }
}
function statusIcon(status: string) {
  switch (status) {
    case 'approved': return <CheckCircle2 className="w-4 h-4" />;
    case 'rejected': return <XCircle className="w-4 h-4" />;
    default: return <Clock className="w-4 h-4" />;
  }
}

export function ClientePage({ currentUser, properties, onViewDetails, onLogout, onUserUpdate }: ClientePageProps & { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('imoveis');
  const [visitRequests, setVisitRequests] = useState<any[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // profile form
  const [profileNome, setProfileNome] = useState(currentUser.nome);
  const [profileEmail, setProfileEmail] = useState(currentUser.email);
  const [profilePhone, setProfilePhone] = useState(currentUser.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // favorites
  const [favorites, setFavorites] = useState<Property[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  // chat
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessageType[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [newMsg, setNewMsg] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // min date = tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const loadVisits = useCallback(async () => {
    setLoadingVisits(true);
    try {
      const data = await fetchMyVisitRequests();
      setVisitRequests(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVisits(false);
    }
  }, []);

  // load visits on mount (for the highlight section on imoveis tab)
  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  useEffect(() => {
    if (tab === 'agendamentos') loadVisits();
    if (tab === 'favoritos') {
      setLoadingFavorites(true);
      fetchMyFavorites().then((data) => {
        setFavorites(data || []);
      }).catch(console.error).finally(() => setLoadingFavorites(false));
    }
    if (tab === 'mensagens') {
      setLoadingConvs(true);
      fetchChatConversations().then((data) => setConversations(data || [])).catch(console.error).finally(() => setLoadingConvs(false));
    }
  }, [tab, loadVisits]);

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      await cancelVisitRequest(id);
      toast.success('Agendamento cancelado');
      setVisitRequests((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      console.error(err);
      toast.error('Falha ao cancelar agendamento');
    } finally {
      setCancellingId(null);
    }
  };

  const startEdit = (v: any) => {
    setEditingId(String(v.id));
    setEditDate(v.preferred_date || '');
    setEditTime(v.preferred_time || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDate('');
    setEditTime('');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSavingEdit(true);
    try {
      const updated = await updateMyVisitRequest(editingId, { preferred_date: editDate, preferred_time: editTime });
      toast.success('Agendamento atualizado');
      setVisitRequests((prev) => prev.map((v) => String(v.id) === editingId ? { ...v, ...updated } : v));
      cancelEdit();
    } catch (err) {
      console.error(err);
      toast.error('Falha ao atualizar agendamento');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const updated = await updateProfile({ nome: profileNome, email: profileEmail, phone: profilePhone || undefined });
      toast.success('Perfil atualizado');
      if (onUserUpdate && updated) {
        onUserUpdate(updated as User);
      }
    } catch (err) {
      console.error(err);
      toast.error('Falha ao atualizar perfil');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRemoveFavorite = async (propertyId: string) => {
    try {
      await removeFavorite(propertyId);
      setFavorites((prev) => prev.filter((p) => p.id !== propertyId));
      toast.success('Removido dos favoritos');
    } catch (err: any) {
      // If the favorite was already removed (404), just remove it from local state
      const msg = err?.message || '';
      if (msg.includes('Not favorited') || msg.includes('404')) {
        setFavorites((prev) => prev.filter((p) => p.id !== propertyId));
        toast.info('Já removido dos favoritos');
      } else {
        console.error(err);
        toast.error('Falha ao remover favorito');
      }
    }
  };

  const openConversation = async (partnerId: string) => {
    setSelectedConv(partnerId);
    setLoadingMsgs(true);
    try {
      const msgs = await fetchChatMessages(partnerId);
      setChatMessages(msgs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMsgs(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMsg.trim() || !selectedConv) return;
    setSendingMsg(true);
    try {
      const msg = await sendChatMessage(selectedConv, { message: newMsg.trim() });
      setChatMessages((prev) => [...prev, msg]);
      setNewMsg('');
    } catch (err) {
      console.error(err);
      toast.error('Falha ao enviar mensagem');
    } finally {
      setSendingMsg(false);
    }
  };

  const pendingVisits = visitRequests.filter((v) => v.status === 'pending');
  const approvedVisits = visitRequests.filter((v) => v.status === 'approved');

  const tabs: { key: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'imoveis', label: 'Início', icon: <Home className="w-4 h-4" /> },
    { key: 'agendamentos', label: 'Agendamentos', icon: <CalendarDays className="w-4 h-4" />, badge: visitRequests.length },
    { key: 'favoritos', label: 'Favoritos', icon: <Heart className="w-4 h-4" />, badge: favorites.length },
    { key: 'mensagens', label: 'Mensagens', icon: <MessageCircle className="w-4 h-4" />, badge: conversations.length },
    { key: 'perfil', label: 'Perfil', icon: <UserIcon className="w-4 h-4" /> },
  ];

  // Shared visit card renderer
  const renderVisitCard = (v: any, compact = false) => {
    const isEditing = editingId === String(v.id);

    return (
      <div key={v.id} className={`p-4 border rounded-lg transition-colors ${v.status === 'approved' ? 'border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-800' : v.status === 'rejected' ? 'border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800' : 'border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{v.property_title || `Imóvel #${v.property_id}`}</span>
              <Badge variant={statusVariant(v.status)} className="flex items-center gap-1 text-xs">
                {statusIcon(v.status)}
                {statusLabel(v.status)}
              </Badge>
            </div>

            {!isEditing ? (
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
            ) : (
              /* Inline edit form */
              <div className="mt-2 space-y-3 p-3 bg-background rounded-md border">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Nova data</label>
                  <input
                    type="date"
                    min={minDate}
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Novo horário</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {TIME_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setEditTime(slot)}
                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                          editTime === slot
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-input hover:bg-muted'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" disabled={!editDate || !editTime || savingEdit} onClick={saveEdit}>
                    {savingEdit ? 'Salvando...' : 'Salvar'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {v.admin_note && (
              <div className="text-sm italic text-muted-foreground mt-1">Nota: {v.admin_note}</div>
            )}
          </div>

          {/* Actions for pending visits */}
          {v.status === 'pending' && !isEditing && (
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                title="Editar horário"
                onClick={() => startEdit(v)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                title="Cancelar agendamento"
                disabled={cancellingId === String(v.id)}
                onClick={() => handleCancel(String(v.id))}
              >
                {cancellingId === String(v.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Header bar */}
      <div className="mb-6">
        <Card className="mb-4">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <div className="font-semibold text-lg">{currentUser.nome}</div>
              <div className="text-sm text-muted-foreground">{currentUser.email}</div>
            </div>
            <Button variant="outline" onClick={onLogout}>Sair</Button>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold">Bem‑vindo, {currentUser.nome}</h2>
            <p className="text-sm text-muted-foreground">Explore imóveis, gerencie agendamentos e atualize o seu perfil.</p>
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

      {/* Tab: Início (Imóveis + Highlight Agendamentos) */}
      {tab === 'imoveis' && (
        <div className="space-y-6">
          {/* Highlighted upcoming visits */}
          {(pendingVisits.length > 0 || approvedVisits.length > 0) && (
            <Card className="border-primary/50 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  Próximas Visitas
                  <Badge variant="secondary" className="ml-2">{pendingVisits.length + approvedVisits.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {approvedVisits.map((v) => renderVisitCard(v, true))}
                {pendingVisits.map((v) => renderVisitCard(v, true))}
                {visitRequests.length > pendingVisits.length + approvedVisits.length && (
                  <Button variant="link" className="px-0" onClick={() => setTab('agendamentos')}>
                    Ver todos os agendamentos ({visitRequests.length})
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recommended properties */}
          <Card>
            <CardHeader>
              <CardTitle>Imóveis Recomendados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.slice(0, 6).map((p) => (
                  <div key={p.id} onClick={() => onViewDetails(p)} className="cursor-pointer group">
                    <div className="mb-2 overflow-hidden rounded">
                      <img
                        src={resolveImageUrl(p.imagem)}
                        alt={p.titulo}
                        className="w-full h-40 object-cover rounded transition-transform group-hover:scale-105"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'; }}
                      />
                    </div>
                    <div className="font-semibold">{p.titulo}</div>
                    <div className="text-sm text-muted-foreground">{formatMozCurrency(p.preco)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Meus Agendamentos */}
      {tab === 'agendamentos' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Meus Agendamentos</CardTitle>
            <Button variant="outline" size="sm" onClick={loadVisits} disabled={loadingVisits}>
              {loadingVisits ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Atualizar'}
            </Button>
          </CardHeader>
          <CardContent>
            {loadingVisits && visitRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                Carregando agendamentos...
              </div>
            ) : visitRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-lg font-medium">Nenhum agendamento encontrado</p>
                <p className="text-sm mt-1">Explore imóveis e agende visitas para ver aqui.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visitRequests.map((v: any) => renderVisitCard(v))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Favoritos */}
      {tab === 'favoritos' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              Meus Favoritos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingFavorites ? (
              <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>
            ) : favorites.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Heart className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-lg font-medium">Nenhum favorito</p>
                <p className="text-sm mt-1">Clique no coração nos imóveis para adicionar aos favoritos.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favorites.map((p) => (
                  <div key={p.id} className="border rounded-lg overflow-hidden group">
                    <div className="relative cursor-pointer" onClick={() => onViewDetails(p)}>
                      <img
                        src={resolveImageUrl(p.imagem)}
                        alt={p.titulo}
                        className="w-full h-40 object-cover transition-transform group-hover:scale-105"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'; }}
                      />
                    </div>
                    <div className="p-3">
                      <div className="font-semibold">{p.titulo}</div>
                      <div className="text-sm text-muted-foreground">{formatMozCurrency(p.preco)}</div>
                      <Button variant="ghost" size="sm" className="mt-2 text-red-500 hover:text-red-600" onClick={() => handleRemoveFavorite(p.id)}>
                        <Trash2 className="w-4 h-4 mr-1" /> Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Mensagens */}
      {tab === 'mensagens' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Mensagens
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedConv ? (
              <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => { setSelectedConv(null); setChatMessages([]); }}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Voltar às conversas
                </Button>
                <div className="border rounded-lg p-4 h-80 overflow-y-auto space-y-3">
                  {loadingMsgs ? (
                    <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin" /></div>
                  ) : chatMessages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">Nenhuma mensagem ainda</div>
                  ) : (
                    chatMessages.map((m) => (
                      <div key={m.id} className={`flex ${String(m.sender_id) === String(currentUser.id) ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] px-3 py-2 rounded-lg text-sm ${String(m.sender_id) === String(currentUser.id) ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          {m.message}
                          <div className="text-[10px] opacity-60 mt-1">{new Date(m.created_at).toLocaleString('pt-MZ')}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  />
                  <Button disabled={!newMsg.trim() || sendingMsg} onClick={handleSendMessage}>
                    {sendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {loadingConvs ? (
                  <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="text-lg font-medium">Nenhuma conversa</p>
                    <p className="text-sm mt-1">As suas conversas com vendedores aparecerão aqui.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conversations.map((c) => (
                      <div
                        key={c.partner_id}
                        className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => openConversation(c.partner_id)}
                      >
                        <div>
                          <div className="font-medium">{c.partner_name}</div>
                          <div className="text-sm text-muted-foreground truncate max-w-[300px]">{c.last_message}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(c.last_message_at).toLocaleDateString('pt-MZ')}
                          {c.unread_count > 0 && (
                            <Badge variant="destructive" className="ml-2">{c.unread_count}</Badge>
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

      {/* Tab: Editar Perfil */}
      {tab === 'perfil' && (
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Editar Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profileNome">Nome</Label>
              <Input id="profileNome" value={profileNome} onChange={(e) => setProfileNome(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profileEmail">Email</Label>
              <Input id="profileEmail" type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profilePhone">Telefone</Label>
              <Input id="profilePhone" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} placeholder="+258 84 000 0000" />
            </div>
            <Button className="w-full" disabled={savingProfile} onClick={handleSaveProfile}>
              {savingProfile ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
