import { useState, useEffect } from 'react';
import type { Property, User, ReviewType } from '../types/property';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { formatMozCurrency } from '../utils/format';
import { resolveImageUrl, fetchReviews, createReview } from '../api';
import { Badge } from './ui/badge';
import { MapPin, Home, Maximize, Car, BedDouble, Bath, Calendar, Trees, Waves, Leaf, ChevronLeft, ChevronRight, Star, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { toast } from 'sonner';

interface PropertyDetailsProps {
  property: Property | null;
  open: boolean;
  onClose: () => void;
  currentUser?: User | null;
  onRequestVisit?: (propertyId: string, payload: { preferred_date?: string; preferred_time?: string }) => Promise<void>;
}

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '14:00', '14:30', '15:00',
  '15:30', '16:00', '16:30', '17:00',
];

export function PropertyDetails({ property, open, onClose, currentUser, onRequestVisit }: PropertyDetailsProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<ReviewType[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Load reviews when property changes
  useEffect(() => {
    if (property && open) {
      setLoadingReviews(true);
      fetchReviews(property.id).then(setReviews).catch(console.error).finally(() => setLoadingReviews(false));
    }
  }, [property?.id, open]);

  const handleSubmitReview = async () => {
    if (!property) return;
    setSubmittingReview(true);
    try {
      const review = await createReview(property.id, { rating: reviewRating, comment: reviewComment });
      setReviews((prev) => [review, ...prev]);
      setShowReviewForm(false);
      setReviewComment('');
      setReviewRating(5);
      toast.success('Avaliação enviada!');
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao enviar avaliação');
    } finally {
      setSubmittingReview(false);
    }
  };

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

  if (!property) return null;

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === property.galeria.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? property.galeria.length - 1 : prev - 1
    );
  };

  // min date = tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setCurrentImageIndex(0);
        setShowRequestForm(false);
      }
      onClose();
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{property.titulo}</DialogTitle>
          <DialogDescription className="sr-only">Detalhes do imóvel {property.titulo}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Galeria de Imagens */}
          <div className="space-y-3">
            <div className="relative aspect-video overflow-hidden rounded-lg group">
              <img 
                src={resolveImageUrl(property.galeria[currentImageIndex])} 
                alt={`${property.titulo} - Foto ${currentImageIndex + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'; }}
              />
              
              {property.galeria.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                    {currentImageIndex + 1} / {property.galeria.length}
                  </div>
                </>
              )}
            </div>
            
            {/* Miniaturas */}
            {property.galeria.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {property.galeria.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`aspect-video overflow-hidden rounded-md border-2 transition-all ${
                      index === currentImageIndex 
                        ? 'border-primary' 
                        : 'border-transparent hover:border-muted-foreground'
                    }`}
                  >
                    <img 
                      src={resolveImageUrl(img)} 
                      alt={`Miniatura ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold text-primary">
              {formatMozCurrency(property.preco)}
              {property.tipo === 'arrendamento' && <span className="text-lg font-normal">/mês</span>}
            </div>
            <Badge variant={property.tipo === 'venda' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
              {property.tipo === 'venda' ? 'Venda' : 'Arrendamento'}
            </Badge>
          </div>

          {/* Visit Request — only for logged-in clients */}
          {currentUser?.role === 'cliente' && (
            <div className="mt-4">
              {!showRequestForm ? (
                <Button onClick={() => setShowRequestForm(true)} className="w-full" size="lg">
                  <Calendar className="w-5 h-5 mr-2" />
                  Agendar Visita
                </Button>
              ) : (
                <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                  <h4 className="font-semibold text-lg">Agendar Visita</h4>

                  {/* Date picker */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Escolha a data</label>
                    <input
                      type="date"
                      min={minDate}
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>

                  {/* Time slots */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Escolha o horário</label>
                    <div className="grid grid-cols-4 gap-2">
                      {TIME_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setPreferredTime(slot)}
                          className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                            preferredTime === slot
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background border-input hover:bg-muted'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      className="flex-1"
                      disabled={!preferredDate || !preferredTime || submitting}
                      onClick={async () => {
                        if (!onRequestVisit || !property) return;
                        setSubmitting(true);
                        try {
                          await onRequestVisit(property.id, { preferred_date: preferredDate, preferred_time: preferredTime });
                          toast.success('Visita agendada com sucesso!');
                          setShowRequestForm(false);
                          setPreferredDate('');
                          setPreferredTime('');
                        } catch {
                          toast.error('Falha ao agendar visita');
                        } finally {
                          setSubmitting(false);
                        }
                      }}
                    >
                      {submitting ? 'Enviando...' : 'Confirmar Agendamento'}
                    </Button>
                    <Button variant="outline" onClick={() => setShowRequestForm(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="flex items-center text-muted-foreground">
            <MapPin className="w-5 h-5 mr-2" />
            <span>{property.localizacao}, {property.cidade}</span>
          </div>
          
          <Separator />
          
          {/* Informações Principais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Home className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Tipologia</div>
                <div className="font-semibold">{property.tipologia}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Maximize className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Área</div>
                <div className="font-semibold">{property.area}m²</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Quartos</div>
                <div className="font-semibold">{property.quartos}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Bath className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Casas de Banho</div>
                <div className="font-semibold">{property.casasBanho}</div>
              </div>
            </div>
          </div>
          
          {/* Características Especiais */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {property.garagem && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Car className="w-5 h-5 text-primary" />
                <span className="text-sm">Garagem</span>
              </div>
            )}
            {property.piscina && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Waves className="w-5 h-5 text-primary" />
                <span className="text-sm">Piscina</span>
              </div>
            )}
            {property.jardim && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Trees className="w-5 h-5 text-primary" />
                <span className="text-sm">Jardim</span>
              </div>
            )}
          </div>
          
          <Separator />
          
          {/* Descrição */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Descrição</h3>
            <p className="text-muted-foreground leading-relaxed">{property.descricao}</p>
          </div>
          
          {/* Características Adicionais */}
          {property.caracteristicas && property.caracteristicas.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-3">Características</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {property.caracteristicas.map((caracteristica, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Leaf className="w-4 h-4 text-primary" />
                      <span className="text-sm">{caracteristica}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          
          {/* Informações Adicionais */}
          <Separator />
          
          <div className="text-sm">
            <span className="text-muted-foreground">Ano de Construção:</span>
            <span className="ml-2 font-semibold">{property.anoConstructao}</span>
          </div>
          
          <Separator />
          
          {/* Avaliações */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Avaliações
                {avgRating && <span className="text-sm font-normal text-muted-foreground">({avgRating} média · {reviews.length})</span>}
              </h3>
              {currentUser?.role === 'cliente' && !showReviewForm && (
                <Button size="sm" variant="outline" onClick={() => setShowReviewForm(true)}>Avaliar</Button>
              )}
            </div>

            {showReviewForm && (
              <div className="border rounded-lg p-4 space-y-3 mb-4 bg-muted/30">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Nota</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => setReviewRating(n)} className="focus:outline-none">
                        <Star className={`w-6 h-6 ${n <= reviewRating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Comentário</label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Escreva a sua avaliação..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" disabled={submittingReview} onClick={handleSubmitReview}>
                    {submittingReview ? 'Enviando...' : 'Enviar'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowReviewForm(false)}>Cancelar</Button>
                </div>
              </div>
            )}

            {loadingReviews ? (
              <div className="py-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
            ) : reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma avaliação ainda.</p>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div key={r.id} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{r.user_name}</span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className={`w-3.5 h-3.5 ${n <= r.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString('pt-MZ')}</span>
                    </div>
                    {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />
          
          <div className="flex items-center justify-end text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Publicado: {new Date(property.createdAt).toLocaleDateString('pt-MZ')}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
