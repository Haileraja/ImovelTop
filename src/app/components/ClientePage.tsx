import { useState, useEffect, useCallback, useMemo } from 'react';
import { Property, User, ChatConversation, ChatMessageType, NotificationType } from '../types/property';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { formatMozCurrency } from '../utils/format';
import {
  resolveImageUrl, fetchMyVisitRequests, cancelVisitRequest, updateMyVisitRequest,
  updateProfile, fetchMyFavorites, removeFavorite,
  fetchChatConversations, fetchChatMessages, sendChatMessage,
  fetchMyNotifications, markNotificationRead, requestVisit,
  fetchKYC, updateKYC,
} from '../api';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { useI18n } from '../i18n';
import {
  CalendarDays, User as UserIcon, Home, Trash2, Clock, CheckCircle2, XCircle,
  Loader2, Pencil, X, Heart, MessageCircle, Send, ArrowLeft, Bell,
  Sparkles, Eye, History, Star, MapPin, ArrowRight, AlertCircle, Plus, Search, Calendar, ShieldCheck, AlertTriangle,
  GitCompareArrows,
} from 'lucide-react';
import { Checkbox } from './ui/checkbox';

// =====================================================================
// Types & helpers
// =====================================================================

interface ClientePageProps {
  currentUser: User;
  properties: Property[];
  onViewDetails: (p: Property) => void;
  onLogout: () => void;
  onUserUpdate?: (user: User) => void;
  // Comparison props
  compareIds?: Set<string>;
  onToggleCompare?: (propertyId: string) => void;
  onOpenCompare?: () => void;
  // When true, component is rendered inside a drawer (skip container margins, hide user header card)
  inDrawerMode?: boolean;
}

type Tab = 'inicio' | 'agendamentos' | 'favoritos' | 'mensagens' | 'perfil';

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '14:00', '14:30', '15:00',
  '15:30', '16:00', '16:30', '17:00',
];

function statusLabel(status: string, t: (key: string) => string) {
  switch (status) {
    case 'pending': return t('visit.pending');
    case 'approved': return t('visit.approved');
    case 'rejected': return t('visit.rejected');
    case 'concluded': return t('visit.concluded');
    default: return status;
  }
}
function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'approved': return 'default';
    case 'rejected': return 'destructive';
    case 'concluded': return 'outline';
    default: return 'secondary';
  }
}
function statusIcon(status: string) {
  switch (status) {
    case 'approved': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />;
    case 'concluded': return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
    default: return <Clock className="w-4 h-4 text-yellow-600" />;
  }
}

// Recently viewed - persisted in localStorage
const RV_KEY = 'imoveltop_recently_viewed';
function getRecentlyViewed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RV_KEY) || '[]');
  } catch { return []; }
}
function addRecentlyViewed(id: string) {
  const ids = getRecentlyViewed().filter((x) => x !== id);
  ids.unshift(id);
  localStorage.setItem(RV_KEY, JSON.stringify(ids.slice(0, 20)));
}

// =====================================================================
// Component
// =====================================================================

export function ClientePage({ currentUser, properties, onViewDetails, onLogout, onUserUpdate, compareIds, onToggleCompare, onOpenCompare, inDrawerMode = false }: ClientePageProps) {
  const { t, lang } = useI18n();
  // In drawer mode, start with 'agendamentos' since 'inicio' is skipped (user is already on main page)
  const [tab, setTab] = useState<Tab>(inDrawerMode ? 'agendamentos' : 'inicio');
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

  // KYC fields
  const [kycDocumentoId, setKycDocumentoId] = useState('');
  const [kycNuit, setKycNuit] = useState('');
  const [kycComprovativoResidencia, setKycComprovativoResidencia] = useState('');
  const [kycCapacidadeFinanceira, setKycCapacidadeFinanceira] = useState('');
  const [kycTipoInteresse, setKycTipoInteresse] = useState('');
  const [savingKyc, setSavingKyc] = useState(false);
  const [loadingKyc, setLoadingKyc] = useState(false);

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

  // notifications (alerts)
  const [alerts, setAlerts] = useState<NotificationType[]>([]);

  // agendamentos sub-tab
  const [agendaTab, setAgendaTab] = useState<'approved' | 'upcoming' | 'history' | 'new'>('upcoming');

  // new visit scheduling state
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [selectedScheduleProperty, setSelectedScheduleProperty] = useState<Property | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [submittingSchedule, setSubmittingSchedule] = useState(false);

  // min date = tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  // filtered properties for scheduling
  const scheduleFilteredProps = useMemo(() => {
    if (!scheduleSearch.trim()) return properties.slice(0, 9);
    const q = scheduleSearch.toLowerCase();
    return properties.filter((p) =>
      p.titulo.toLowerCase().includes(q) ||
      p.cidade.toLowerCase().includes(q) ||
      p.localizacao.toLowerCase().includes(q)
    ).slice(0, 9);
  }, [properties, scheduleSearch]);

  // ---- Data loaders ----
  const loadVisits = useCallback(async () => {
    setLoadingVisits(true);
    try {
      const data = await fetchMyVisitRequests();
      setVisitRequests(data || []);
    } catch (err) { console.error(err); }
    finally { setLoadingVisits(false); }
  }, []);

  const loadFavorites = useCallback(async () => {
    setLoadingFavorites(true);
    try {
      const data = await fetchMyFavorites();
      setFavorites(data || []);
    } catch (err) { console.error(err); }
    finally { setLoadingFavorites(false); }
  }, []);

  // Initial load
  useEffect(() => {
    loadVisits();
    loadFavorites();
    fetchMyNotifications().then((n) => setAlerts(n || [])).catch(console.error);
  }, [loadVisits, loadFavorites]);

  // Tab change loaders
  useEffect(() => {
    if (tab === 'agendamentos') loadVisits();
    if (tab === 'favoritos') loadFavorites();
    if (tab === 'mensagens') {
      setLoadingConvs(true);
      fetchChatConversations().then((d) => setConversations(d || [])).catch(console.error).finally(() => setLoadingConvs(false));
    }
    if (tab === 'perfil') {
      setLoadingKyc(true);
      fetchKYC().then((data) => {
        if (data) {
          setKycDocumentoId(data.documento_id || '');
          setKycNuit(data.nuit || '');
          setKycComprovativoResidencia(data.comprovativo_residencia || '');
          setKycCapacidadeFinanceira(data.capacidade_financeira || '');
          setKycTipoInteresse(data.tipo_interesse || '');
        }
      }).catch(console.error).finally(() => setLoadingKyc(false));
    }
  }, [tab, loadVisits, loadFavorites]);

  // ---- Computed agendamento groups ----
  const today = new Date().toISOString().split('T')[0];

  const approvedVisits = useMemo(() =>
    visitRequests.filter((v) => v.status === 'approved'), [visitRequests]);

  const upcomingVisits = useMemo(() =>
    visitRequests.filter((v) => v.status === 'pending'), [visitRequests]);

  const historyVisits = useMemo(() =>
    visitRequests.filter((v) => v.status === 'rejected' || v.status === 'concluded' || (v.status === 'approved' && v.preferred_date && v.preferred_date < today)),
    [visitRequests, today]);

  // ---- Recently viewed ----
  const recentlyViewedProps = useMemo(() => {
    const ids = getRecentlyViewed();
    return ids.map((id) => properties.find((p) => p.id === id)).filter(Boolean) as Property[];
  }, [properties]);

  // ---- Recommended (simple: random selection, excluding already viewed) ----
  const recommended = useMemo(() => {
    const viewedIds = new Set(getRecentlyViewed());
    const unseen = properties.filter((p) => !viewedIds.has(p.id));
    const pool = unseen.length >= 6 ? unseen : properties;
    // Simple shuffle + take 6
    return [...pool].sort(() => Math.random() - 0.5).slice(0, 6);
  }, [properties]);

  // ---- Unread alerts count ----
  const unreadAlerts = useMemo(() => alerts.filter((a) => !a.read).length, [alerts]);

  // ---- Handlers ----
  const handleViewDetails = (p: Property) => {
    addRecentlyViewed(p.id);
    onViewDetails(p);
  };

  const handleScheduleVisit = async () => {
    if (!selectedScheduleProperty || !scheduleDate || !scheduleTime) return;
    setSubmittingSchedule(true);
    try {
      await requestVisit(selectedScheduleProperty.id, { preferred_date: scheduleDate, preferred_time: scheduleTime });
      toast.success(t('visit.success'));
      // Reset form and go back to upcoming tab
      setSelectedScheduleProperty(null);
      setScheduleDate('');
      setScheduleTime('');
      setScheduleSearch('');
      setAgendaTab('upcoming');
      loadVisits();
    } catch (err: any) {
      toast.error(err?.message || t('visit.fail'));
    } finally {
      setSubmittingSchedule(false);
    }
  };

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      await cancelVisitRequest(id);
      toast.success(t('client.bookingCancelled'));
      setVisitRequests((prev) => prev.filter((v) => v.id !== id));
    } catch (err) { console.error(err); toast.error(t('client.failCancel')); }
    finally { setCancellingId(null); }
  };

  const startEdit = (v: any) => {
    setEditingId(String(v.id));
    setEditDate(v.preferred_date || '');
    setEditTime(v.preferred_time || '');
  };
  const cancelEdit = () => { setEditingId(null); setEditDate(''); setEditTime(''); };

  const saveEdit = async () => {
    if (!editingId) return;
    setSavingEdit(true);
    try {
      const updated = await updateMyVisitRequest(editingId, { preferred_date: editDate, preferred_time: editTime });
      toast.success(t('client.bookingUpdated'));
      setVisitRequests((prev) => prev.map((v) => String(v.id) === editingId ? { ...v, ...updated } : v));
      cancelEdit();
    } catch (err) { console.error(err); toast.error(t('client.failUpdate')); }
    finally { setSavingEdit(false); }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const updated = await updateProfile({ nome: profileNome, email: profileEmail, phone: profilePhone || undefined });
      toast.success(t('client.profileUpdated'));
      if (onUserUpdate && updated) onUserUpdate(updated as User);
    } catch (err) { console.error(err); toast.error(t('client.failUpdateProfile')); }
    finally { setSavingProfile(false); }
  };

  const handleSaveKyc = async () => {
    setSavingKyc(true);
    try {
      await updateKYC({
        documento_id: kycDocumentoId || undefined,
        nuit: kycNuit || undefined,
        comprovativo_residencia: kycComprovativoResidencia || undefined,
        capacidade_financeira: kycCapacidadeFinanceira || undefined,
        tipo_interesse: kycTipoInteresse || undefined,
      });
      toast.success(t('client.kycUpdated'));
    } catch (err) { console.error(err); toast.error(t('client.failUpdateKyc')); }
    finally { setSavingKyc(false); }
  };

  const handleRemoveFavorite = async (propertyId: string) => {
    try {
      await removeFavorite(propertyId);
      setFavorites((prev) => prev.filter((p) => p.id !== propertyId));
      toast.success(t('client.removedFavorite'));
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('Not favorited') || msg.includes('404')) {
        setFavorites((prev) => prev.filter((p) => p.id !== propertyId));
        toast.info(t('client.alreadyRemoved'));
      } else { console.error(err); toast.error(t('client.failRemoveFavorite')); }
    }
  };

  const openConversation = async (partnerId: string) => {
    setSelectedConv(partnerId);
    setLoadingMsgs(true);
    try {
      const msgs = await fetchChatMessages(partnerId);
      setChatMessages(msgs || []);
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
    } catch (err) { console.error(err); toast.error(t('client.failSendMessage')); }
    finally { setSendingMsg(false); }
  };

  const handleAlertClick = async (n: NotificationType) => {
    if (!n.read) {
      try {
        await markNotificationRead(n.id);
        setAlerts((prev) => prev.map((a) => a.id === n.id ? { ...a, read: true } : a));
      } catch (err) { console.error(err); }
    }
  };

  // ---- Tabs ----
  const tabs: { key: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'inicio', label: t('client.home'), icon: <Home className="w-4 h-4" /> },
    { key: 'agendamentos', label: t('client.bookings'), icon: <CalendarDays className="w-4 h-4" />, badge: visitRequests.length },
    { key: 'favoritos', label: t('client.favorites'), icon: <Heart className="w-4 h-4" />, badge: favorites.length },
    { key: 'mensagens', label: t('client.messages'), icon: <MessageCircle className="w-4 h-4" />, badge: conversations.length },
    { key: 'perfil', label: t('client.profile'), icon: <UserIcon className="w-4 h-4" /> },
  ];

  // ---- Property card mini ----
  const PropertyMini = ({ p, onRemoveFav }: { p: Property; onRemoveFav?: () => void }) => {
    const isComparing = compareIds?.has(p.id) || false;
    return (
      <div className="group border rounded-xl overflow-hidden hover:shadow-md transition-shadow bg-card">
        <div className="relative cursor-pointer" onClick={() => handleViewDetails(p)}>
          <img
            src={resolveImageUrl(p.imagem)}
            alt={p.titulo}
            className="w-full h-36 object-cover transition-transform group-hover:scale-105"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'; }}
          />
          <Badge variant={p.tipo === 'venda' ? 'default' : 'secondary'} className="absolute top-2 left-2 text-xs">
            {p.tipo === 'venda' ? t('property.sale') : t('property.rent')}
          </Badge>
          {/* Compare checkbox on image */}
          {onToggleCompare && (
            <div
              className={`absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-full text-xs cursor-pointer transition-colors ${
                isComparing ? 'bg-primary text-primary-foreground' : 'bg-white/80 text-foreground hover:bg-white'
              }`}
              onClick={(e) => { e.stopPropagation(); onToggleCompare(p.id); }}
            >
              <Checkbox checked={isComparing} className="w-3.5 h-3.5" />
              <span>{t('property.compare')}</span>
            </div>
          )}
        </div>
        <div className="p-3 space-y-1">
          <h4 className="font-semibold text-sm line-clamp-1">{p.titulo}</h4>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" /> {p.cidade}
          </div>
          <div className="font-bold text-primary text-sm">
            {formatMozCurrency(p.preco)}{p.tipo === 'arrendamento' ? t('property.perMonth') : ''}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
            <span>{p.quartos} {t('property.rooms').toLowerCase()}</span>
            <span>{p.area}m²</span>
          </div>
          {onRemoveFav && (
            <Button variant="ghost" size="sm" className="mt-1 text-red-500 hover:text-red-600 h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); onRemoveFav(); }}>
              <Trash2 className="w-3 h-3 mr-1" /> {t('client.remove')}
            </Button>
          )}
        </div>
      </div>
    );
  };

  // ---- Visit card renderer ----
  const renderVisitCard = (v: any) => {
    const isEditing = editingId === String(v.id);
    return (
      <div key={v.id} className={`p-4 border rounded-xl transition-all ${
        v.status === 'approved' ? 'border-green-200 bg-green-50/50 dark:bg-green-950/10 dark:border-green-900' :
        v.status === 'rejected' ? 'border-red-200 bg-red-50/50 dark:bg-red-950/10 dark:border-red-900' :
        v.status === 'concluded' ? 'border-blue-200 bg-blue-50/50 dark:bg-blue-950/10 dark:border-blue-900' :
        'border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/10 dark:border-yellow-900'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{v.property_title || `Imóvel #${v.property_id}`}</span>
              <Badge variant={statusVariant(v.status)} className="flex items-center gap-1 text-xs">
                {statusIcon(v.status)}
                {statusLabel(v.status, t)}
              </Badge>
            </div>
            {!isEditing ? (
              <div className="text-sm text-muted-foreground flex items-center gap-4 flex-wrap">
                {v.preferred_date && (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {new Date(v.preferred_date).toLocaleDateString(lang === 'pt' ? 'pt-MZ' : 'en-US')}
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
              <div className="mt-2 space-y-3 p-3 bg-background rounded-lg border">
                <div className="space-y-1">
                  <label className="text-xs font-medium">{t('client.newDate')}</label>
                  <input type="date" min={minDate} value={editDate} onChange={(e) => setEditDate(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">{t('client.newTime')}</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {TIME_SLOTS.map((slot) => (
                      <button key={slot} type="button" onClick={() => setEditTime(slot)}
                        className={`px-2 py-1 text-xs rounded border transition-colors ${editTime === slot ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input hover:bg-muted'}`}>
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" disabled={!editDate || !editTime || savingEdit} onClick={saveEdit}>
                    {savingEdit ? t('client.saving') : t('client.save')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit}>{t('client.cancelEdit')}</Button>
                </div>
              </div>
            )}
            {v.admin_note && (
              <div className="text-sm italic text-muted-foreground mt-1 flex items-start gap-1">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {v.admin_note}
              </div>
            )}
          </div>
          {v.status === 'pending' && !isEditing && (
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar" onClick={() => startEdit(v)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Cancelar"
                disabled={cancellingId === String(v.id)} onClick={() => handleCancel(String(v.id))}>
                {cancellingId === String(v.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ---- Empty state ----
  const EmptyState = ({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) => (
    <div className="text-center py-16 text-muted-foreground">
      <Icon className="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p className="text-lg font-medium">{title}</p>
      <p className="text-sm mt-1">{subtitle}</p>
    </div>
  );

  return (
    <main className={inDrawerMode ? "py-2" : "container mx-auto px-4 py-8"}>
      {/* Header - skip in drawer mode */}
      {!inDrawerMode && (
      <div className="mb-6">
        <Card className="mb-5 border-0 shadow-md bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 overflow-hidden">
          <CardContent className="flex items-center justify-between py-5 px-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center font-bold text-white text-lg shadow-md">
                {currentUser.nome.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-xl">{t('client.hello', { name: currentUser.nome })}</div>
                <div className="text-sm text-muted-foreground">{currentUser.email}</div>
              </div>
            </div>
            <Button variant="outline" onClick={onLogout} className="rounded-xl">{t('client.logout')}</Button>
          </CardContent>
        </Card>
      </div>
      )}

        {/* Tab navigation */}
        <div className="flex gap-1 bg-muted/50 p-1 rounded-xl overflow-x-auto mb-6">
          {tabs.filter(t => inDrawerMode ? t.key !== 'inicio' : true).map((t) => (
            <Button
              key={t.key}
              variant={tab === t.key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTab(t.key)}
              className={`gap-1.5 shrink-0 rounded-lg transition-all ${tab === t.key ? 'shadow-sm' : ''}`}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
              {t.badge != null && t.badge > 0 && (
                <span className={`ml-0.5 text-[10px] font-bold rounded-full min-w-[18px] text-center px-1 py-0.5 ${tab === t.key ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'}`}>{t.badge}</span>
              )}
            </Button>
          ))}
        </div>

      {/* ================================================================
          TAB: INÍCIO - Recomendados, Recentes, Favoritos rápidos, Alertas
          ================================================================ */}
      {tab === 'inicio' && (
        <div className="space-y-8">
          {/* Compare button */}
          {onOpenCompare && compareIds && compareIds.size > 0 && (
            <div className="flex justify-end">
              <Button variant="outline" onClick={onOpenCompare} className="gap-2">
                <GitCompareArrows className="w-4 h-4" />
                {t('compare.button')} ({compareIds.size})
              </Button>
            </div>
          )}
          
          {/* Personalized alerts */}
          {unreadAlerts > 0 && (
            <Card className="border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bell className="w-5 h-5 text-primary" />
                  {t('client.alerts')}
                  <Badge variant="destructive" className="text-xs">{unreadAlerts} {unreadAlerts > 1 ? t('client.newAlertsPlural') : t('client.newAlerts')}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {alerts.filter((a) => !a.read).slice(0, 5).map((a) => (
                  <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => handleAlertClick(a)}>
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{a.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{a.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(a.created_at).toLocaleString(lang === 'pt' ? 'pt-MZ' : 'en-US')}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recommended properties */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">{t('client.recommended')}</h3>
            </div>
            {recommended.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommended.map((p) => <PropertyMini key={p.id} p={p} />)}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('client.noRecommendations')}</p>
            )}
          </section>

          {/* Recently viewed */}
          {recentlyViewedProps.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-5 h-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">{t('client.recentlyViewed')}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentlyViewedProps.slice(0, 6).map((p) => <PropertyMini key={p.id} p={p} />)}
              </div>
            </section>
          )}

          {/* Quick favorites */}
          {favorites.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  <h3 className="text-lg font-semibold">{t('client.myFavorites')}</h3>
                </div>
                {favorites.length > 3 && (
                  <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setTab('favoritos')}>
                    {t('client.viewAll')} <ArrowRight className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {favorites.slice(0, 3).map((p) => <PropertyMini key={p.id} p={p} />)}
              </div>
            </section>
          )}

          {/* Stats summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                  <CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-2xl font-bold">{visitRequests.length}</div>
                <div className="text-xs text-muted-foreground">{t('client.statsBookings')}</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-2">
                  <Heart className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="text-2xl font-bold">{favorites.length}</div>
                <div className="text-xs text-muted-foreground">{t('client.statsFavorites')}</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                  <Eye className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-2xl font-bold">{recentlyViewedProps.length}</div>
                <div className="text-xs text-muted-foreground">{t('client.statsViewed')}</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center mx-auto mb-2">
                  <MessageCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-2xl font-bold">{conversations.length}</div>
                <div className="text-xs text-muted-foreground">{t('client.statsConversations')}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ================================================================
          TAB: AGENDAMENTOS - Nova Visita | Aprovados | Próximos | Histórico
          ================================================================ */}
      {tab === 'agendamentos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1.5 bg-muted p-1 rounded-lg overflow-x-auto">
              {[
                { key: 'new' as const, label: t('client.newVisit'), count: 0, icon: <Plus className="w-3.5 h-3.5" /> },
                { key: 'approved' as const, label: t('client.approvedVisits'), count: approvedVisits.length, icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
                { key: 'upcoming' as const, label: t('client.pendingVisits'), count: upcomingVisits.length, icon: <Clock className="w-3.5 h-3.5" /> },
                { key: 'history' as const, label: t('client.history'), count: historyVisits.length, icon: <History className="w-3.5 h-3.5" /> },
              ].map((st) => (
                <Button
                  key={st.key}
                  variant={agendaTab === st.key ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setAgendaTab(st.key)}
                  className={`gap-1.5 text-xs shrink-0 ${st.key === 'new' ? 'text-primary' : ''}`}
                >
                  {st.icon}
                  {st.label}
                  {st.count > 0 && <span className="text-[10px] opacity-70">({st.count})</span>}
                </Button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={loadVisits} disabled={loadingVisits}>
              {loadingVisits ? <Loader2 className="w-4 h-4 animate-spin" /> : t('client.refresh')}
            </Button>
          </div>

          {/* ---- NEW VISIT SUB-TAB ---- */}
          {agendaTab === 'new' && (
            <div className="space-y-5">
              {!selectedScheduleProperty ? (
                /* Step 1: Choose a property */
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <Calendar className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">{t('client.scheduleNewVisit')}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{t('client.choosePropertyToVisit')}</p>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      className="pl-10 h-11"
                      placeholder={t('client.searchProperties')}
                      value={scheduleSearch}
                      onChange={(e) => setScheduleSearch(e.target.value)}
                    />
                  </div>

                  {/* Property grid */}
                  {scheduleFilteredProps.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {scheduleFilteredProps.map((p) => (
                        <div
                          key={p.id}
                          className="group border rounded-xl overflow-hidden hover:shadow-md hover:border-primary/50 transition-all cursor-pointer bg-card"
                          onClick={() => setSelectedScheduleProperty(p)}
                        >
                          <div className="relative">
                            <img
                              src={resolveImageUrl(p.imagem)}
                              alt={p.titulo}
                              className="w-full h-32 object-cover transition-transform group-hover:scale-105"
                              onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'; }}
                            />
                            <Badge variant={p.tipo === 'venda' ? 'default' : 'secondary'} className="absolute top-2 left-2 text-xs">
                              {p.tipo === 'venda' ? t('property.sale') : t('property.rent')}
                            </Badge>
                          </div>
                          <div className="p-3 space-y-1">
                            <h4 className="font-semibold text-sm line-clamp-1">{p.titulo}</h4>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3" /> {p.localizacao}, {p.cidade}
                            </div>
                            <div className="font-bold text-primary text-sm">{formatMozCurrency(p.preco)}</div>
                            <Button variant="outline" size="sm" className="w-full mt-2 gap-1.5 text-xs">
                              <Calendar className="w-3.5 h-3.5" /> {t('client.selectToSchedule')}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">{t('client.noPropertiesFound')}</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Step 2: Choose date and time */
                <div className="max-w-lg mx-auto space-y-5">
                  {/* Selected property card */}
                  <Card className="overflow-hidden border-primary/30">
                    <div className="flex gap-4 p-4">
                      <img
                        src={resolveImageUrl(selectedScheduleProperty.imagem)}
                        alt={selectedScheduleProperty.titulo}
                        className="w-24 h-20 object-cover rounded-lg shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'; }}
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-sm line-clamp-1">{selectedScheduleProperty.titulo}</h4>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <MapPin className="w-3 h-3" /> {selectedScheduleProperty.localizacao}, {selectedScheduleProperty.cidade}
                        </div>
                        <div className="font-bold text-primary text-sm mt-1">{formatMozCurrency(selectedScheduleProperty.preco)}</div>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => setSelectedScheduleProperty(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>

                  {/* Secure notice */}
                  <div className="flex items-start gap-2.5 p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/20">
                    <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900 dark:text-blue-300">{t('visit.secureTitle')}</p>
                      <p className="text-blue-700 dark:text-blue-400 mt-0.5">{t('visit.secureMessage')}</p>
                    </div>
                  </div>

                  {/* Date picker */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-primary" /> {t('visit.chooseDate')}
                    </label>
                    <input
                      type="date"
                      min={minDate}
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
                    />
                  </div>

                  {/* Time picker */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" /> {t('visit.chooseTime')}
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {TIME_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setScheduleTime(slot)}
                          className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                            scheduleTime === slot
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                              : 'bg-background border-input hover:bg-muted'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notice */}
                  <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-200 dark:border-amber-500/20">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-300">{t('visit.autoMessageNotice')}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" className="flex-1" onClick={() => setSelectedScheduleProperty(null)}>
                      <ArrowLeft className="w-4 h-4 mr-2" /> {t('client.changeProperty')}
                    </Button>
                    <Button
                      className="flex-1 h-11"
                      disabled={!scheduleDate || !scheduleTime || submittingSchedule}
                      onClick={handleScheduleVisit}
                    >
                      {submittingSchedule ? (
                        <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {t('visit.sending')}</span>
                      ) : (
                        <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {t('visit.confirm')}</span>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {loadingVisits && visitRequests.length === 0 && agendaTab !== 'new' ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              {t('client.loadingBookings')}
            </div>
          ) : (
            <>
              {agendaTab === 'approved' && (
                approvedVisits.length === 0 ? (
                  <EmptyState icon={CheckCircle2} title={t('client.noApproved')} subtitle={t('client.noApprovedDesc')} />
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">{t('client.confirmedVisitsInfo')}</p>
                    {approvedVisits.map((v) => renderVisitCard(v))}
                  </div>
                )
              )}

              {agendaTab === 'upcoming' && (
                upcomingVisits.length === 0 ? (
                  <EmptyState icon={Clock} title={t('client.noPending')} subtitle={t('client.noPendingDesc')} />
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">{t('client.pendingApprovalInfo')}</p>
                    {upcomingVisits.map((v) => renderVisitCard(v))}
                  </div>
                )
              )}

              {agendaTab === 'history' && (
                historyVisits.length === 0 ? (
                  <EmptyState icon={History} title={t('client.noHistory')} subtitle={t('client.noHistoryDesc')} />
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">{t('client.pastVisitsInfo')}</p>
                    {historyVisits.map((v) => renderVisitCard(v))}
                  </div>
                )
              )}
            </>
          )}
        </div>
      )}

      {/* ================================================================
          TAB: FAVORITOS
          ================================================================ */}
      {tab === 'favoritos' && (
        <div>
          {loadingFavorites ? (
            <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>
          ) : favorites.length === 0 ? (
            <EmptyState icon={Heart} title={t('client.noFavorites')} subtitle={t('client.noFavoritesDesc')} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map((p) => (
                <PropertyMini key={p.id} p={p} onRemoveFav={() => handleRemoveFavorite(p.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================================================
          TAB: MENSAGENS
          ================================================================ */}
      {tab === 'mensagens' && (
        <Card>
          <CardContent className="p-4">
            {selectedConv ? (
              <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => { setSelectedConv(null); setChatMessages([]); }}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> {t('client.backToConversations')}
                </Button>
                <div className="border rounded-lg p-4 h-80 overflow-y-auto space-y-3">
                  {loadingMsgs ? (
                    <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin" /></div>
                  ) : chatMessages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">{t('client.noMessagesYet')}</div>
                  ) : (
                    chatMessages.map((m) => (
                      <div key={m.id} className={`flex ${String(m.sender_id) === String(currentUser.id) ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] px-3 py-2 rounded-xl text-sm ${String(m.sender_id) === String(currentUser.id) ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'}`}>
                          {m.message}
                          <div className="text-[10px] opacity-60 mt-1">{new Date(m.created_at).toLocaleString(lang === 'pt' ? 'pt-MZ' : 'en-US')}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <Input value={newMsg} onChange={(e) => setNewMsg(e.target.value)} placeholder={t('client.typeMessage')}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} />
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
                  <EmptyState icon={MessageCircle} title={t('client.noConversations')} subtitle={t('client.noConversationsDesc')} />
                ) : (
                  <div className="space-y-2">
                    {conversations.map((c) => (
                      <div key={c.partner_id}
                        className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => openConversation(c.partner_id)}>
                        <div className="min-w-0">
                          <div className="font-medium text-sm">{c.partner_name}</div>
                          <div className="text-sm text-muted-foreground truncate max-w-[280px]">{c.last_message}</div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <div className="text-xs text-muted-foreground">{new Date(c.last_message_at).toLocaleDateString(lang === 'pt' ? 'pt-MZ' : 'en-US')}</div>
                          {c.unread_count > 0 && <Badge variant="destructive" className="mt-1 text-[10px]">{c.unread_count}</Badge>}
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

      {/* ================================================================
          TAB: PERFIL
          ================================================================ */}
      {tab === 'perfil' && (
        <>
        <Card className="max-w-lg border-0 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-xl font-bold shadow-md">
                {currentUser.nome.charAt(0).toUpperCase()}
              </div>
              <div>
                <CardTitle>{t('client.editProfile')}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{t('client.editProfileDesc')}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profileNome">{t('client.name')}</Label>
              <Input id="profileNome" value={profileNome} onChange={(e) => setProfileNome(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profileEmail">{t('client.email')}</Label>
              <Input id="profileEmail" type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profilePhone">{t('client.phone')}</Label>
              <Input id="profilePhone" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} placeholder={t('client.phonePlaceholder')} />
            </div>
            <Button className="w-full h-11 text-base font-semibold shadow-sm" disabled={savingProfile} onClick={handleSaveProfile}>
              {savingProfile ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {t('client.savingProfile')}</span> : t('client.saveChanges')}
            </Button>
          </CardContent>
        </Card>

        {/* KYC / Documentação */}
        <Card className="max-w-lg border-0 shadow-md mt-6">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-amber-400 flex items-center justify-center text-white shadow-md">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <CardTitle>{t('client.kycTitle')}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{t('client.kycDesc')}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingKyc ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="kycDocumentoId">{t('client.kycDocumentoId')}</Label>
                  <Input id="kycDocumentoId" value={kycDocumentoId} onChange={(e) => setKycDocumentoId(e.target.value)} placeholder={t('client.kycDocumentoIdPlaceholder')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kycNuit">{t('client.kycNuit')}</Label>
                  <Input id="kycNuit" value={kycNuit} onChange={(e) => setKycNuit(e.target.value)} placeholder={t('client.kycNuitPlaceholder')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kycComprovativo">{t('client.kycComprovativoResidencia')}</Label>
                  <Input id="kycComprovativo" value={kycComprovativoResidencia} onChange={(e) => setKycComprovativoResidencia(e.target.value)} placeholder={t('client.kycComprovativoPlaceholder')} />
                </div>
                <div className="space-y-2">
                  <Label>{t('client.kycCapacidadeFinanceira')}</Label>
                  <Select value={kycCapacidadeFinanceira} onValueChange={setKycCapacidadeFinanceira}>
                    <SelectTrigger><SelectValue placeholder={t('client.kycSelectPlaceholder')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">{t('client.kycCapBaixa')}</SelectItem>
                      <SelectItem value="media">{t('client.kycCapMedia')}</SelectItem>
                      <SelectItem value="alta">{t('client.kycCapAlta')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('client.kycTipoInteresse')}</Label>
                  <Select value={kycTipoInteresse} onValueChange={setKycTipoInteresse}>
                    <SelectTrigger><SelectValue placeholder={t('client.kycSelectPlaceholder')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compra">{t('client.kycCompra')}</SelectItem>
                      <SelectItem value="arrendamento">{t('client.kycArrendamento')}</SelectItem>
                      <SelectItem value="ambos">{t('client.kycAmbos')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full h-11 text-base font-semibold shadow-sm" disabled={savingKyc} onClick={handleSaveKyc}>
                  {savingKyc ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {t('client.savingKyc')}</span> : t('client.saveKyc')}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
        </>
      )}
    </main>
  );
}
