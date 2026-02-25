import { useState, useEffect, useCallback, useRef } from 'react';
import type { Property, User, ReviewType, PriceHistoryEntry, ChatMessageType } from '../types/property';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { formatMozCurrency } from '../utils/format';
import { resolveImageUrl, fetchReviews, createReview, checkMyReview, fetchPriceHistory, fetchChatMessages, sendChatMessage, fetchVisitAvailability } from '../api';
import { Badge } from './ui/badge';
import {
  MapPin, Home, Maximize, Car, BedDouble, Bath, Calendar, Trees, Waves, Leaf,
  ChevronLeft, ChevronRight, Star, Loader2, Share2, Heart, Copy, MessageSquare,
  Facebook, ExternalLink, Eye, ShieldCheck, AlertTriangle,
  Snowflake, Dumbbell, Briefcase, Gamepad2, Tv, TreePine, PartyPopper,
  Sofa, Lock, ArrowUpFromLine, QrCode, TrendingDown, TrendingUp, Phone,
  Expand, Send, Clock, CalendarDays, X,
} from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { useI18n } from '../i18n';
import { QRCodeSVG } from 'qrcode.react';
import Lightbox from 'yet-another-react-lightbox';

interface PropertyDetailsProps {
  property: Property | null;
  open: boolean;
  onClose: () => void;
  currentUser?: User | null;
  onRequestVisit?: (propertyId: string, payload: { preferred_date?: string; preferred_time?: string }) => Promise<void>;
  isFavorited?: boolean;
  onToggleFavorite?: (propertyId: string) => void;
}

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
];

// View history in localStorage
const VH_KEY = 'imoveltop_view_history';
interface ViewEntry { propertyId: string; viewedAt: string }
function getViewHistory(): ViewEntry[] {
  try { return JSON.parse(localStorage.getItem(VH_KEY) || '[]'); } catch { return []; }
}
function trackView(propertyId: string) {
  const history = getViewHistory();
  history.unshift({ propertyId, viewedAt: new Date().toISOString() });
  localStorage.setItem(VH_KEY, JSON.stringify(history.slice(0, 100)));
}
function getViewCount(propertyId: string): number {
  return getViewHistory().filter(e => e.propertyId === propertyId).length;
}

export function PropertyDetails({
  property, open, onClose, currentUser, onRequestVisit,
  isFavorited, onToggleFavorite,
}: PropertyDetailsProps) {
  const { t, lang } = useI18n();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Visit availability
  const [blockedSlots, setBlockedSlots] = useState<Record<string, string>>({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [vendorDayInfo, setVendorDayInfo] = useState({ count: 0, limit: 3 });
  const [adminDayInfo, setAdminDayInfo] = useState({ count: 0, limit: 10 });
  const [clientAlreadyBooked, setClientAlreadyBooked] = useState(false);

  // Active tab: 'schedule' | 'chat'
  const [activeTab, setActiveTab] = useState<'schedule' | 'chat'>('schedule');

  // Reviews state
  const [reviews, setReviews] = useState<ReviewType[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [myReview, setMyReview] = useState<ReviewType | null>(null);

  // Share popover
  const [showShareMenu, setShowShareMenu] = useState(false);

  // View count
  const [viewCount, setViewCount] = useState(0);

  // Hover star for review form
  const [hoverStar, setHoverStar] = useState(0);

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // QR Code
  const [showQR, setShowQR] = useState(false);

  // Price History
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [showPriceHistory, setShowPriceHistory] = useState(false);

  // Chat with Admin
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessageType[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const ADMIN_ID = '4';

  // Load reviews + check own review
  useEffect(() => {
    if (property && open) {
      setLoadingReviews(true);
      fetchReviews(property.id).then(setReviews).catch(console.error).finally(() => setLoadingReviews(false));

      // Track view
      trackView(property.id);
      setViewCount(getViewCount(property.id));

      // Check if user already reviewed
      if (currentUser) {
        checkMyReview(property.id)
          .then((res) => {
            setHasReviewed(res.has_reviewed);
            setMyReview(res.review);
          })
          .catch(() => { setHasReviewed(false); setMyReview(null); });
      }

      // Fetch price history
      fetchPriceHistory(property.id)
        .then(setPriceHistory)
        .catch(() => setPriceHistory([]));
    }
  }, [property?.id, open, currentUser?.id]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setShowReviewForm(false);
      setShowShareMenu(false);
      setHasReviewed(false);
      setMyReview(null);
      setCurrentImageIndex(0);
      setShowRequestForm(false);
      setShowQR(false);
      setShowPriceHistory(false);
      setLightboxOpen(false);
      setShowChat(false);
      setChatMessages([]);
      setChatInput('');
      setBlockedSlots({});
      setLoadingAvailability(false);
      setClientAlreadyBooked(false);
      setActiveTab('schedule');
    }
  }, [open]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const openAdminChat = async () => {
    setShowChat(true);
    setLoadingChat(true);
    try {
      const msgs = await fetchChatMessages(ADMIN_ID);
      setChatMessages(msgs || []);
    } catch { setChatMessages([]); }
    finally { setLoadingChat(false); }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    setSendingChat(true);
    try {
      const msg = await sendChatMessage(ADMIN_ID, chatInput.trim(), property?.id);
      setChatMessages((prev) => [...prev, msg]);
      setChatInput('');
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao enviar mensagem');
    } finally { setSendingChat(false); }
  };

  // Fetch visit availability when date changes
  const handleDateChange = async (newDate: string) => {
    setPreferredDate(newDate);
    setPreferredTime(''); // reset time selection
    if (!newDate || !property) {
      setBlockedSlots({});
      return;
    }
    setLoadingAvailability(true);
    try {
      const data = await fetchVisitAvailability(property.id, newDate);
      setBlockedSlots(data.blocked || {});
      setVendorDayInfo({ count: data.vendor_day_count ?? 0, limit: data.vendor_day_limit ?? 3 });
      setAdminDayInfo({ count: data.admin_day_count ?? 0, limit: data.admin_day_limit ?? 10 });
      setClientAlreadyBooked(data.client_already_booked ?? false);
    } catch {
      setBlockedSlots({});
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!property) return;
    setSubmittingReview(true);
    try {
      const review = await createReview(property.id, { rating: reviewRating, comment: reviewComment || undefined });
      setReviews((prev) => [review, ...prev]);
      setHasReviewed(true);
      setMyReview(review);
      setShowReviewForm(false);
      setReviewComment('');
      setReviewRating(5);
      toast.success(t('reviews.success'));
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('Já avaliou')) {
        setHasReviewed(true);
        toast.error(t('reviews.alreadyReviewed'));
      } else {
        toast.error(msg || t('reviews.failSubmit'));
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  const getShareUrl = useCallback(() => {
    if (!property) return '';
    return `${window.location.origin}?property=${property.id}`;
  }, [property]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareUrl());
    toast.success(t('share.linkCopiedClipboard'));
    setShowShareMenu(false);
  };

  const handleWhatsAppShare = () => {
    if (!property) return;
    const text = `🏠 ${property.titulo}\n💰 ${formatMozCurrency(property.preco)}\n📍 ${property.localizacao}, ${property.cidade}\n\n${t('share.seeMore')}: ${getShareUrl()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    setShowShareMenu(false);
  };

  const handleFacebookShare = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  };

  const handleTwitterShare = () => {
    if (!property) return;
    const text = `🏠 ${property.titulo} — ${formatMozCurrency(property.preco)} em ${property.cidade}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(getShareUrl())}`, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  };

  const handleNativeShare = () => {
    if (!property) return;
    if (navigator.share) {
      navigator.share({ title: property.titulo, text: property.descricao, url: getShareUrl() });
    } else {
      handleCopyLink();
    }
    setShowShareMenu(false);
  };

  // Average rating + star breakdown
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const starCounts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length > 0 ? (reviews.filter(r => r.rating === star).length / reviews.length) * 100 : 0,
  }));

  if (!property) return null;

  const nextImage = () => setCurrentImageIndex((prev) => prev === property.galeria.length - 1 ? 0 : prev + 1);
  const prevImage = () => setCurrentImageIndex((prev) => prev === 0 ? property.galeria.length - 1 : prev - 1);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-0 shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{property.titulo}</DialogTitle>
          <DialogDescription>{t('property.details')} {property.titulo}</DialogDescription>
        </DialogHeader>

        {/* Two-column layout for desktop */}
        <div className="md:grid md:grid-cols-[1fr,380px]">
          {/* Left Column - Image Gallery */}
          <div className="relative">
            {/* Main Image */}
            <div className="relative aspect-[4/3] md:aspect-[16/10] overflow-hidden group bg-muted">
              <img
                src={resolveImageUrl(property.galeria[currentImageIndex])}
                alt={`${property.titulo} - ${t('property.photo')} ${currentImageIndex + 1}`}
                className="w-full h-full object-cover transition-transform duration-500 cursor-zoom-in hover:scale-105"
                onClick={() => { setLightboxIndex(currentImageIndex); setLightboxOpen(true); }}
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

              {property.galeria.length > 1 && (
                <>
                  <button onClick={prevImage} className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/50 backdrop-blur-md text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={nextImage} className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/50 backdrop-blur-md text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Top right: fullscreen + favorite + share */}
              <div className="absolute top-3 right-3 flex gap-2">
                <button
                  onClick={() => { setLightboxIndex(currentImageIndex); setLightboxOpen(true); }}
                  className="p-2.5 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-md text-white transition-all"
                  title={t('property.fullscreen') || 'Ecrã inteiro'}
                >
                  <Expand className="w-5 h-5" />
                </button>
                {onToggleFavorite && currentUser && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(property.id); }}
                    className={`p-2.5 rounded-full backdrop-blur-md transition-all duration-200 ${
                      isFavorited
                        ? 'bg-red-500 text-white shadow-lg scale-110'
                        : 'bg-black/30 text-white hover:bg-black/50'
                    }`}
                    title={isFavorited ? t('property.removeFromFavorites') : t('property.addToFavorites')}
                  >
                    <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
                  </button>
                )}
                <div className="relative">
                  <button
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    className="p-2.5 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-md text-white transition-all"
                    title={t('property.share')}
                  >
                    <Share2 className="w-5 h-5" />
                  </button>

                  {/* Share dropdown */}
                  {showShareMenu && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-card rounded-xl shadow-2xl border p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <button onClick={handleWhatsAppShare} className="flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors text-left">
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shrink-0">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-foreground">{t('share.whatsapp')}</span>
                      </button>
                      <button onClick={handleFacebookShare} className="flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors text-left">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
                          <Facebook className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-foreground">{t('share.facebook')}</span>
                      </button>
                      <button onClick={handleTwitterShare} className="flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors text-left">
                        <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white shrink-0">
                          <ExternalLink className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-foreground">{t('share.twitter')}</span>
                      </button>
                      <Separator className="my-1" />
                      <button onClick={handleCopyLink} className="flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors text-left">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground shrink-0">
                          <Copy className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-foreground">{t('share.copyLink')}</span>
                      </button>
                      {typeof navigator.share === 'function' && (
                        <button onClick={handleNativeShare} className="flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors text-left">
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shrink-0">
                            <Share2 className="w-4 h-4" />
                          </div>
                          <span className="font-medium text-foreground">{t('property.moreOptions')}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Badge + verified */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                <Badge className={`mb-0 ${property.tipo === 'venda' ? 'bg-primary text-primary-foreground' : 'bg-amber-500 text-white'}`}>
                  {property.tipo === 'venda' ? t('property.sale') : t('property.rent')}
                </Badge>
                {property.verificadoAdmin && (
                  <Badge className="bg-green-600 text-white gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    {t('property.verified') || 'Verificado'}
                  </Badge>
                )}
              </div>

              {/* Bottom overlay - Price & views */}
              <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
                <div>
                  <div className="text-white text-2xl md:text-3xl font-bold drop-shadow-lg">
                    {formatMozCurrency(property.preco)}
                    {property.tipo === 'arrendamento' && <span className="text-base font-normal opacity-90">{t('property.perMonth')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {viewCount > 0 && (
                    <div className="bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      {viewCount}
                    </div>
                  )}
                  {property.galeria.length > 1 && (
                    <div className="bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm font-medium">
                      {currentImageIndex + 1} / {property.galeria.length}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Thumbnails */}
            {property.galeria.length > 1 && (
              <div className="flex gap-1.5 p-3 overflow-x-auto bg-muted/30">
                {property.galeria.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`aspect-video w-16 md:w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                      index === currentImageIndex
                        ? 'border-primary ring-2 ring-primary/20 scale-105'
                        : 'border-transparent opacity-60 hover:opacity-100 hover:border-muted-foreground/30'
                    }`}
                  >
                    <img src={resolveImageUrl(img)} alt={`${t('property.thumbnail')} ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Info & Actions (Desktop sidebar) */}
          <div className="border-l md:max-h-[90vh] md:overflow-y-auto bg-card">
            {/* Title & Location */}
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold mb-1">{property.titulo}</h2>
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary/60" />
                <span className="text-sm">{property.localizacao}, {property.cidade}</span>
              </div>
              {/* Quick rating badge */}
              {reviews.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg w-fit border border-yellow-200 dark:border-yellow-500/20">
                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                  <span className="font-bold text-sm">{avgRating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({reviews.length})</span>
                </div>
              )}
            </div>

            {/* Quick Specs */}
            <div className="grid grid-cols-2 gap-2 p-4 border-b">
              {[
                { icon: <Home className="w-4 h-4" />, label: t('property.typology'), value: property.tipologia },
                { icon: <Maximize className="w-4 h-4" />, label: t('property.area'), value: `${property.area}m²` },
                { icon: <BedDouble className="w-4 h-4" />, label: t('property.rooms'), value: String(property.quartos) },
                { icon: <Bath className="w-4 h-4" />, label: t('property.bathrooms'), value: String(property.casasBanho) },
              ].map((spec, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
                  <div className="text-primary/70">{spec.icon}</div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{spec.label}</div>
                    <div className="font-semibold text-sm">{spec.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* ===== Schedule Visit & Chat Admin — Sidebar Actions ===== */}
            {currentUser?.role === 'cliente' && (
              <div className="p-4 space-y-3 border-b">
                {/* Tab buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setActiveTab('schedule')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                      activeTab === 'schedule'
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-primary/30'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      activeTab === 'schedule' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium">{t('visit.schedule')}</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('chat'); if (!showChat) openAdminChat(); }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                      activeTab === 'chat'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                        : 'border-muted hover:border-blue-300'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      activeTab === 'chat' ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium">{t('property.chatAdmin') || 'Chat'}</span>
                  </button>
                </div>

                {/* Schedule content */}
                {activeTab === 'schedule' && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-primary" />
                        {t('visit.chooseDate')}
                      </label>
                      <input
                        type="date"
                        min={minDate}
                        value={preferredDate}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        {t('visit.chooseTime')}
                      </label>
                      {!preferredDate ? (
                        <div className="text-center py-3 text-xs text-muted-foreground bg-muted/30 rounded-lg">
                          {t('visit.selectDateFirst') || 'Seleccione uma data'}
                        </div>
                      ) : loadingAvailability ? (
                        <div className="flex items-center justify-center py-4 gap-2 bg-muted/30 rounded-lg">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <span className="text-xs text-muted-foreground">{t('visit.checkingAvailability') || 'A verificar...'}</span>
                        </div>
                      ) : clientAlreadyBooked ? (
                        <div className="flex items-start gap-2 p-2.5 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-200 dark:border-amber-500/20">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-700 dark:text-amber-400">{t('visit.alreadyBookedDesc') || 'Limite atingido para esta data.'}</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-1">
                          {TIME_SLOTS.map((slot) => {
                            const isBlocked = !!blockedSlots[slot];
                            return (
                              <button
                                key={slot}
                                type="button"
                                disabled={isBlocked}
                                onClick={() => setPreferredTime(slot)}
                                title={isBlocked ? blockedSlots[slot] : undefined}
                                className={`py-1.5 text-[11px] rounded-md border transition-all font-medium ${
                                  isBlocked
                                    ? 'bg-muted/40 text-muted-foreground/40 border-transparent line-through cursor-not-allowed'
                                    : preferredTime === slot
                                      ? 'bg-primary text-primary-foreground border-primary'
                                      : 'bg-background border-input hover:bg-muted'
                                }`}
                              >
                                {slot}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <Button
                      className="w-full h-10 text-sm font-semibold gap-2"
                      disabled={!preferredDate || !preferredTime || submitting || clientAlreadyBooked}
                      onClick={async () => {
                        if (!onRequestVisit || !property) return;
                        setSubmitting(true);
                        try {
                          await onRequestVisit(property.id, { preferred_date: preferredDate, preferred_time: preferredTime });
                          toast.success(t('visit.success'));
                          setPreferredDate('');
                          setPreferredTime('');
                          setBlockedSlots({});
                          setClientAlreadyBooked(false);
                        } catch (err: any) {
                          toast.error(err?.message || t('visit.fail'));
                        } finally { setSubmitting(false); }
                      }}
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
                      {t('visit.confirm')}
                    </Button>
                  </div>
                )}

                {/* Chat content */}
                {activeTab === 'chat' && (
                  <div className="rounded-xl border overflow-hidden animate-in fade-in duration-200">
                    <div className="px-3 py-2 border-b bg-blue-50/50 dark:bg-blue-500/5 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">A</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">ImovelTop Admin</p>
                      </div>
                    </div>
                    <div className="h-40 overflow-y-auto p-2.5 space-y-2 bg-muted/10">
                      {loadingChat ? (
                        <div className="flex items-center justify-center h-full"><Loader2 className="w-4 h-4 animate-spin text-blue-500" /></div>
                      ) : chatMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <MessageSquare className="w-8 h-8 text-blue-300 mb-1" />
                          <p className="text-xs text-muted-foreground">{t('admin.noMessagesYet') || 'Sem mensagens'}</p>
                        </div>
                      ) : (
                        chatMessages.map((m) => (
                          <div key={m.id} className={`flex ${String(m.sender_id) === String(currentUser.id) ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] px-3 py-1.5 rounded-xl text-xs ${
                              String(m.sender_id) === String(currentUser.id)
                                ? 'bg-blue-500 text-white rounded-br-sm'
                                : 'bg-white dark:bg-card border rounded-bl-sm'
                            }`}>
                              <p className="leading-relaxed">{m.message}</p>
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="p-2 border-t flex gap-1.5">
                      <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder={t('admin.typeMessage') || 'Mensagem...'}
                        className="flex-1 h-8 rounded-full bg-muted/50 border-0 text-xs focus-visible:ring-blue-500"
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                      />
                      <Button
                        size="icon"
                        disabled={!chatInput.trim() || sendingChat}
                        onClick={handleSendChat}
                        className="rounded-full bg-blue-500 hover:bg-blue-600 h-8 w-8 shrink-0"
                      >
                        {sendingChat ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Contact Seller (mobile only, shown below for non-clients) */}
            {(!currentUser || currentUser.role !== 'cliente') && (
              <div className="p-4 border-b">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t('property.contactSeller') || 'Contactar Vendedor'}</p>
                    <p className="text-xs text-muted-foreground">{t('property.loginToContact') || 'Faça login como cliente'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rest of content - Full width below */}
        <div className="px-6 py-5 space-y-6">
          {/* Features */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            {property.garagem && (
              <div className="flex items-center gap-2.5 p-3 bg-muted/50 rounded-xl border">
                <Car className="w-5 h-5 text-primary" />
                <div>
                  <span className="text-sm font-medium">{t('property.garage')}</span>
                  {(property.garagemNumCarros > 0 || property.garagemFechada) && (
                    <div className="text-xs text-muted-foreground">
                      {property.garagemNumCarros > 0 && `${property.garagemNumCarros} ${t('property.cars')}`}
                      {property.garagemNumCarros > 0 && property.garagemFechada && ' · '}
                      {property.garagemFechada && t('property.closedGarage')}
                    </div>
                  )}
                </div>
              </div>
            )}
            {property.arCondicionado && (
              <div className="flex items-center gap-2.5 p-3 bg-muted/50 rounded-xl border">
                <Snowflake className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">{t('property.airConditioning')}</span>
              </div>
            )}
            {property.piscina && (
              <div className="flex items-center gap-2.5 p-3 bg-muted/50 rounded-xl border">
                <Waves className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">{t('property.pool')}</span>
              </div>
            )}
            {property.ginasio && (
              <div className="flex items-center gap-2.5 p-3 bg-muted/50 rounded-xl border">
                <Dumbbell className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">{t('property.gym')}</span>
              </div>
            )}
            {property.escritorio && (
              <div className="flex items-center gap-2.5 p-3 bg-muted/50 rounded-xl border">
                <Briefcase className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">{t('property.office')}</span>
              </div>
            )}
            {property.salaJogos && (
              <div className="flex items-center gap-2.5 p-3 bg-muted/50 rounded-xl border">
                <Gamepad2 className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">{t('property.gameRoom')}</span>
              </div>
            )}
            {property.salaTV && (
              <div className="flex items-center gap-2.5 p-3 bg-muted/50 rounded-xl border">
                <Tv className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">{t('property.tvRoom')}</span>
              </div>
            )}
            {property.jardim && (
              <div className="flex items-center gap-2.5 p-3 bg-muted/50 rounded-xl border">
                <Trees className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">{t('property.garden')}</span>
              </div>
            )}
            {property.areaLazer && (
              <div className="flex items-center gap-2.5 p-3 bg-muted/50 rounded-xl border">
                <PartyPopper className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">{t('property.leisureArea')}</span>
              </div>
            )}
            {property.mobilada && (
              <div className="flex items-center gap-2.5 p-3 bg-muted/50 rounded-xl border">
                <Sofa className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">{t('property.furnished')}</span>
              </div>
            )}
            {property.sistemaSeguranca && (
              <div className="flex items-center gap-2.5 p-3 bg-muted/50 rounded-xl border">
                <Lock className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">{t('property.securitySystem')}</span>
              </div>
            )}
            {property.elevador && (
              <div className="flex items-center gap-2.5 p-3 bg-muted/50 rounded-xl border">
                <ArrowUpFromLine className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">{t('property.elevator')}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold mb-2">{t('property.description')}</h3>
            <p className="text-muted-foreground leading-relaxed">{property.descricao}</p>
          </div>

          {/* Extra features */}
          {property.caracteristicas && property.caracteristicas.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-3">{t('property.features')}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {property.caracteristicas.map((c, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Leaf className="w-4 h-4 text-primary" />
                      <span className="text-sm">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Year */}
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">{t('property.yearBuilt')}:</span>
              <span className="ml-2 font-semibold">{property.anoConstructao}</span>
            </div>
            {property.verificadoAdmin && (
              <div className="flex items-center gap-1 text-green-600">
                <ShieldCheck className="w-4 h-4" />
                <span className="font-medium">{t('property.verified') || 'Verificado pelo Admin'}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Action buttons: WhatsApp, QR, Price History */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {/* WhatsApp Contact */}
            <Button
              variant="outline"
              className="gap-2 text-green-600 border-green-200 hover:bg-green-50"
              onClick={() => {
                const text = `Olá! Tenho interesse no imóvel "${property.titulo}" (${formatMozCurrency(property.preco)}) em ${property.cidade}. Link: ${getShareUrl()}`;
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
              }}
            >
              <Phone className="w-4 h-4" />
              WhatsApp
            </Button>

            {/* QR Code */}
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setShowQR(!showQR)}
            >
              <QrCode className="w-4 h-4" />
              QR Code
            </Button>

            {/* Price History */}
            {priceHistory.length > 0 && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setShowPriceHistory(!showPriceHistory)}
              >
                <TrendingUp className="w-4 h-4" />
                {t('property.priceHistory') || 'Histórico Preço'}
              </Button>
            )}
          </div>

          {/* QR Code Panel */}
          {showQR && (
            <div className="flex flex-col items-center gap-3 p-4 border rounded-xl bg-white dark:bg-card">
              <QRCodeSVG value={getShareUrl()} size={180} level="M" />
              <p className="text-xs text-muted-foreground text-center">{t('property.scanQR') || 'Digitalize para ver este imóvel'}</p>
            </div>
          )}

          {/* Price History Panel */}
          {showPriceHistory && priceHistory.length > 0 && (
            <div className="border rounded-xl p-4 space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                {t('property.priceHistory') || 'Histórico de Preços'}
              </h4>
              <div className="space-y-1.5">
                {priceHistory.map((ph) => (
                  <div key={ph.id} className="flex items-center gap-3 text-sm p-2 bg-muted/30 rounded-lg">
                    {ph.new_price > ph.old_price ? (
                      <TrendingUp className="w-4 h-4 text-red-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-green-500" />
                    )}
                    <span className="line-through text-muted-foreground">{formatMozCurrency(ph.old_price)}</span>
                    <span>→</span>
                    <span className="font-semibold">{formatMozCurrency(ph.new_price)}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(ph.changed_at).toLocaleDateString(lang === 'pt' ? 'pt-MZ' : 'en-US')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* ============================================================
              REVIEWS SECTION
              ============================================================ */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                {t('reviews.title')}
              </h3>
              {/* Show review button only for cliente who hasn't already reviewed */}
              {currentUser?.role === 'cliente' && !hasReviewed && !showReviewForm && (
                <Button size="sm" variant="outline" onClick={() => setShowReviewForm(true)}>
                  <Star className="w-3.5 h-3.5 mr-1.5" />
                  {t('reviews.rate')}
                </Button>
              )}
            </div>

            {/* Average rating summary with star breakdown */}
            {reviews.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-6 p-4 bg-muted/30 rounded-xl border mb-4">
                <div className="flex flex-col items-center justify-center min-w-[100px]">
                  <div className="text-4xl font-bold">{avgRating.toFixed(1)}</div>
                  <div className="flex mt-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`w-4 h-4 ${n <= Math.round(avgRating) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{reviews.length} {reviews.length !== 1 ? t('reviews.reviewPlural') : t('reviews.review')}</div>
                </div>
                <div className="flex-1 space-y-1.5">
                  {starCounts.map(({ star, count, pct }) => (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-xs w-3 text-right font-medium">{star}</span>
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-6">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Already reviewed notice */}
            {hasReviewed && myReview && (
              <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-500/10 rounded-xl border border-green-200 dark:border-green-500/20 mb-4">
                <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 dark:text-green-300 mb-1">{t('reviews.yourReview')}</p>
                  <div className="flex items-center gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`w-4 h-4 ${n <= myReview.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                    ))}
                    <span className="text-xs text-muted-foreground ml-1">{new Date(myReview.created_at).toLocaleDateString(lang === 'pt' ? 'pt-MZ' : 'en-US')}</span>
                  </div>
                  {myReview.comment && <p className="text-sm text-muted-foreground">{myReview.comment}</p>}
                </div>
              </div>
            )}

            {/* Review form */}
            {showReviewForm && !hasReviewed && (
              <div className="border-2 border-primary/20 rounded-xl p-4 space-y-4 mb-4 bg-primary/5">
                <h4 className="font-medium text-sm">{t('reviews.rateThis')}</h4>
                <div className="space-y-1">
                  <label className="text-sm font-medium">{t('reviews.rating')}</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setReviewRating(n)}
                        onMouseEnter={() => setHoverStar(n)}
                        onMouseLeave={() => setHoverStar(0)}
                        className="focus:outline-none transition-transform hover:scale-125 active:scale-95"
                      >
                        <Star className={`w-8 h-8 ${n <= (hoverStar || reviewRating) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                      </button>
                    ))}
                    <span className="text-sm text-muted-foreground ml-2 self-center">
                      {(hoverStar || reviewRating) === 1 && t('reviews.star1')}
                      {(hoverStar || reviewRating) === 2 && t('reviews.star2')}
                      {(hoverStar || reviewRating) === 3 && t('reviews.star3')}
                      {(hoverStar || reviewRating) === 4 && t('reviews.star4')}
                      {(hoverStar || reviewRating) === 5 && t('reviews.star5')}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">{t('reviews.comment')} <span className="text-muted-foreground font-normal">{t('reviews.commentOptional')}</span></label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    rows={3}
                    maxLength={500}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder={t('reviews.commentPlaceholder')}
                  />
                  <div className="text-[11px] text-muted-foreground text-right">{reviewComment.length}/500</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" disabled={submittingReview} onClick={handleSubmitReview}>
                    {submittingReview ? (
                      <span className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> {t('visit.sending')}</span>
                    ) : (
                      <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5" /> {t('reviews.submit')}</span>
                    )}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowReviewForm(false); setHoverStar(0); }}>{t('reviews.cancel')}</Button>
                </div>
                <p className="text-[11px] text-muted-foreground">{t('reviews.onePerPerson')}</p>
              </div>
            )}

            {/* Reviews list */}
            {loadingReviews ? (
              <div className="py-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
            ) : reviews.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Star className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm font-medium">{t('reviews.noReviews')}</p>
                <p className="text-xs mt-1">{t('reviews.beFirst')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">{t('reviews.userComments')} ({reviews.length})</h4>
                {reviews.map((r) => (
                  <div key={r.id} className={`border rounded-xl p-4 space-y-1.5 ${r.user_id === currentUser?.id ? 'border-primary/30 bg-primary/5' : ''}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                        {r.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{r.user_name}</span>
                          {r.user_id === currentUser?.id && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{t('reviews.you')}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star key={n} className={`w-3.5 h-3.5 ${n <= r.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                            ))}
                          </div>
                          <span className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString(lang === 'pt' ? 'pt-MZ' : 'en-US')}</span>
                        </div>
                      </div>
                    </div>
                    {r.comment && <p className="text-sm text-muted-foreground pl-10">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <div className="flex items-center justify-between text-sm text-muted-foreground pb-2">
            <span>{t('property.vendor')}: <span className="font-medium text-foreground">{property.vendedorNome}</span></span>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{t('property.published')}: {new Date(property.createdAt).toLocaleDateString(lang === 'pt' ? 'pt-MZ' : 'en-US')}</span>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Fullscreen Lightbox */}
      {property && (
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          index={lightboxIndex}
          slides={property.galeria.map((img) => ({ src: resolveImageUrl(img) }))}
        />
      )}
    </Dialog>
  );
}
