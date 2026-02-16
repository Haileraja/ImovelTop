import { useState } from 'react';
import { Property } from '../types/property';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { MapPin, Home, Maximize, Car, BedDouble, Bath, User, Calendar, Trees, Waves, Leaf, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

interface PropertyDetailsProps {
  property: Property | null;
  open: boolean;
  onClose: () => void;
}

export function PropertyDetails({ property, open, onClose }: PropertyDetailsProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setCurrentImageIndex(0);
      }
      onClose();
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{property.titulo}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Galeria de Imagens */}
          <div className="space-y-3">
            <div className="relative aspect-video overflow-hidden rounded-lg group">
              <img 
                src={property.galeria[currentImageIndex]} 
                alt={`${property.titulo} - Foto ${currentImageIndex + 1}`}
                className="w-full h-full object-cover"
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
                      src={img} 
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
              €{property.preco.toLocaleString('pt-PT')}
              {property.tipo === 'arrendamento' && <span className="text-lg font-normal">/mês</span>}
            </div>
            <Badge variant={property.tipo === 'venda' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
              {property.tipo === 'venda' ? 'Venda' : 'Arrendamento'}
            </Badge>
          </div>
          
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Zap className="w-5 h-5 text-primary" />
              <span className="text-sm">Cert. {property.certificadoEnergetico}</span>
            </div>
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
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Ano de Construção:</span>
              <span className="ml-2 font-semibold">{property.anoConstructao}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Certificado Energético:</span>
              <span className="ml-2 font-semibold">{property.certificadoEnergetico}</span>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>Vendedor: {property.vendedorNome}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Publicado: {new Date(property.createdAt).toLocaleDateString('pt-PT')}</span>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button className="flex-1">Contactar Vendedor</Button>
            <Button variant="outline" className="flex-1">Agendar Visita</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
