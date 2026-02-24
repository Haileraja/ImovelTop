import { Property } from '../types/property';
import { formatMozCurrency } from '../utils/format';
import { resolveImageUrl } from '../api';
import { Card, CardContent, CardFooter } from './ui/card';
import { Badge } from './ui/badge';
import { MapPin, Home, Maximize, Car, Heart, Share2, GitCompareArrows } from 'lucide-react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';

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

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}?property=${property.id}`;
    if (navigator.share) {
      navigator.share({ title: property.titulo, text: property.descricao, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copiado!');
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer relative" onClick={() => onViewDetails(property)}>
      <div className="aspect-[4/3] overflow-hidden relative">
        <img 
          src={resolveImageUrl(property.imagem)} 
          alt={property.titulo}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'; }}
        />
        {/* Overlay buttons */}
        <div className="absolute top-2 right-2 flex gap-1">
          {showFavorite && onToggleFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(property.id); }}
              className={`p-2 rounded-full backdrop-blur-sm transition-colors ${
                isFavorited
                  ? 'bg-red-500 text-white'
                  : 'bg-black/40 text-white hover:bg-black/60'
              }`}
              title={isFavorited ? 'Remover favorito' : 'Favoritar'}
            >
              <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
            </button>
          )}
          <button
            onClick={handleShare}
            className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm transition-colors"
            title="Partilhar"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
        {showCompare && onToggleCompare && (
          <div className="absolute top-2 left-2" onClick={(e) => e.stopPropagation()}>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-sm text-xs font-medium transition-colors ${
              isComparing ? 'bg-primary text-primary-foreground' : 'bg-black/40 text-white'
            }`}>
              <Checkbox
                checked={isComparing}
                onCheckedChange={() => onToggleCompare(property.id)}
                className="border-white data-[state=checked]:bg-white data-[state=checked]:text-primary"
              />
              <span className="cursor-pointer" onClick={() => onToggleCompare(property.id)}>Comparar</span>
            </div>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold line-clamp-1">{property.titulo}</h3>
          <Badge variant={property.tipo === 'venda' ? 'default' : 'secondary'}>
            {property.tipo === 'venda' ? 'Venda' : 'Arrendamento'}
          </Badge>
        </div>
        
        <div className="flex items-center text-muted-foreground mb-2">
          <MapPin className="w-4 h-4 mr-1" />
          <span className="text-sm">{property.localizacao}, {property.cidade}</span>
        </div>
        
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {property.descricao}
        </p>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Home className="w-4 h-4" />
            <span>{property.tipologia}</span>
          </div>
          <div className="flex items-center gap-1">
            <Maximize className="w-4 h-4" />
            <span>{property.area}m²</span>
          </div>
          {property.garagem && (
            <div className="flex items-center gap-1">
              <Car className="w-4 h-4" />
            </div>
          )}
        </div>
        
        <div className="text-2xl font-bold text-primary">
          {formatMozCurrency(property.preco)}
          {property.tipo === 'arrendamento' && <span className="text-sm font-normal">/mês</span>}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button 
          className="w-full" 
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails(property);
          }}
        >
          Ver Detalhes
        </Button>
      </CardFooter>
    </Card>
  );
}
