import { useState } from 'react';
import { Property } from '../types/property';
import { formatMozCurrency } from '../utils/format';
import { resolveImageUrl } from '../api';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { MapPin, Home, Maximize, Car, Heart, Share2, BedDouble, Bath, Copy, MessageSquare, Facebook, ExternalLink, ShieldCheck, GitCompareArrows } from 'lucide-react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { useI18n } from '../i18n';

interface PropertyCardProps {
  property: Property;
  onViewDetails: (property: Property) => void;
  isFavorited?: boolean;
  onToggleFavorite?: (propertyId: string) => void;
  isComparing?: boolean;
  onToggleCompare?: (propertyId: string) => void;
  showFavorite?: boolean;
  showCompare?: boolean;
}

export function PropertyCard({
  property, onViewDetails,
  isFavorited, onToggleFavorite,
  isComparing, onToggleCompare,
  showFavorite = false, showCompare = false,
}: PropertyCardProps) {

  const [showShareMenu, setShowShareMenu] = useState(false);
  const { t } = useI18n();

  const getShareUrl = () => `${window.location.origin}?property=${property.id}`;

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowShareMenu((prev) => !prev);
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(getShareUrl());
    toast.success(t('share.linkCopied'));
    setShowShareMenu(false);
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `🏠 ${property.titulo}\n💰 ${formatMozCurrency(property.preco)}\n📍 ${property.localizacao}, ${property.cidade}\n\n${t('share.seeMore')}: ${getShareUrl()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    setShowShareMenu(false);
  };

  const handleFacebook = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  };

  const handleTwitter = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `🏠 ${property.titulo} — ${formatMozCurrency(property.preco)} em ${property.cidade}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(getShareUrl())}`, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  };

  return (
    <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer relative border-0 shadow-sm hover:-translate-y-1" onClick={() => onViewDetails(property)}>
      <div className="aspect-[4/3] overflow-hidden relative">
        <img 
          src={resolveImageUrl(property.imagem)} 
          alt={property.titulo}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'; }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Price on image */}
        <div className="absolute bottom-3 left-3">
          <div className="text-white font-bold text-xl drop-shadow-lg">
            {formatMozCurrency(property.preco)}
            {property.tipo === 'arrendamento' && <span className="text-sm font-normal opacity-90">{t('property.perMonth')}</span>}
          </div>
        </div>

        {/* Overlay buttons */}
        <div className="absolute top-3 right-3 flex gap-1.5">
          {showFavorite && onToggleFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(property.id); }}
              className={`p-2 rounded-full backdrop-blur-md transition-all duration-200 ${
                isFavorited
                  ? 'bg-red-500 text-white scale-110 shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/40'
              }`}
              title={isFavorited ? t('property.removeFavorite') : t('property.addFavorite')}
            >
              <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
            </button>
          )}
          <div className="relative">
            <button
              onClick={handleShare}
              className="p-2 rounded-full bg-white/20 text-white hover:bg-white/40 backdrop-blur-md transition-all duration-200"
              title={t('property.share')}
            >
              <Share2 className="w-4 h-4" />
            </button>
            {showShareMenu && (
              <div className="absolute top-full right-0 mt-1 w-44 bg-white dark:bg-card rounded-lg shadow-xl border p-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150" onClick={(e) => e.stopPropagation()}>
                <button onClick={handleWhatsApp} className="flex items-center gap-2 w-full px-2.5 py-2 text-xs rounded-md hover:bg-muted transition-colors text-left">
                  <MessageSquare className="w-3.5 h-3.5 text-green-500" />
                  <span className="font-medium text-foreground">{t('share.whatsapp')}</span>
                </button>
                <button onClick={handleFacebook} className="flex items-center gap-2 w-full px-2.5 py-2 text-xs rounded-md hover:bg-muted transition-colors text-left">
                  <Facebook className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-medium text-foreground">{t('share.facebook')}</span>
                </button>
                <button onClick={handleTwitter} className="flex items-center gap-2 w-full px-2.5 py-2 text-xs rounded-md hover:bg-muted transition-colors text-left">
                  <ExternalLink className="w-3.5 h-3.5 text-sky-500" />
                  <span className="font-medium text-foreground">{t('share.twitter')}</span>
                </button>
                <Separator className="my-1" />
                <button onClick={handleCopyLink} className="flex items-center gap-2 w-full px-2.5 py-2 text-xs rounded-md hover:bg-muted transition-colors text-left">
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-medium text-foreground">{t('share.copyLink')}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Badge + verified */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          <Badge className={`text-xs font-semibold shadow-sm ${property.tipo === 'venda' ? 'bg-primary text-primary-foreground' : 'bg-amber-500 text-white'}`}>
            {property.tipo === 'venda' ? t('property.sale') : t('property.rent')}
          </Badge>
          {property.verificadoAdmin && (
            <Badge className="bg-green-600 text-white text-[10px] gap-0.5 px-1.5 py-0.5">
              <ShieldCheck className="w-3 h-3" />
              {t('property.verified') || 'Verificado'}
            </Badge>
          )}
        </div>

        {showCompare && onToggleCompare && (
          <div className="absolute bottom-3 right-3" onClick={(e) => e.stopPropagation()}>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md text-xs font-medium transition-all ${
              isComparing ? 'bg-primary text-primary-foreground' : 'bg-white/20 text-white'
            }`}>
              <Checkbox
                checked={isComparing}
                onCheckedChange={() => onToggleCompare(property.id)}
                className="border-white data-[state=checked]:bg-white data-[state=checked]:text-primary h-3.5 w-3.5"
              />
              <span className="cursor-pointer" onClick={() => onToggleCompare(property.id)}>{t('property.compare')}</span>
            </div>
          </div>
        )}
      </div>
      <CardContent className="p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-base line-clamp-1 group-hover:text-primary transition-colors flex-1">{property.titulo}</h3>
          {property.tipoImovel && (
            <Badge variant="outline" className="text-[10px] shrink-0">{property.tipoImovel}</Badge>
          )}
        </div>
        
        <div className="flex items-center text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 mr-1 text-primary/60" />
          <span className="text-sm truncate">{property.localizacao}, {property.cidade}</span>
        </div>
        
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {property.descricao}
        </p>
        
        <div className="flex items-center gap-3 text-sm text-muted-foreground pt-1 border-t">
          <div className="flex items-center gap-1.5" title={t('property.rooms')}>
            <BedDouble className="w-4 h-4 text-primary/60" />
            <span>{property.quartos}</span>
          </div>
          <div className="flex items-center gap-1.5" title={t('property.bathrooms')}>
            <Bath className="w-4 h-4 text-primary/60" />
            <span>{property.casasBanho}</span>
          </div>
          <div className="flex items-center gap-1.5" title={t('property.area')}>
            <Maximize className="w-4 h-4 text-primary/60" />
            <span>{property.area}m²</span>
          </div>
          {property.garagem && (
            <div className="flex items-center gap-1.5" title={t('property.garage')}>
              <Car className="w-4 h-4 text-primary/60" />
            </div>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{property.anoConstructao}</span>
        </div>

        {/* Action button: Compare */}
        {showCompare && onToggleCompare && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant={isComparing ? 'secondary' : 'outline'}
              className={`flex-1 h-8 text-xs gap-1.5 ${isComparing ? 'bg-primary/10 text-primary border-primary/30' : ''}`}
              onClick={(e) => { e.stopPropagation(); onToggleCompare(property.id); }}
            >
              <GitCompareArrows className="w-3.5 h-3.5" />
              {isComparing ? t('property.comparing') : t('property.compare')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
