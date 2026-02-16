import { Property } from '../types/property';
import { Card, CardContent, CardFooter } from './ui/card';
import { Badge } from './ui/badge';
import { MapPin, Home, Maximize, Car } from 'lucide-react';
import { Button } from './ui/button';

interface PropertyCardProps {
  property: Property;
  onViewDetails: (property: Property) => void;
}

export function PropertyCard({ property, onViewDetails }: PropertyCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onViewDetails(property)}>
      <div className="aspect-[4/3] overflow-hidden">
        <img 
          src={property.imagem} 
          alt={property.titulo}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />
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
          €{property.preco.toLocaleString('pt-PT')}
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
