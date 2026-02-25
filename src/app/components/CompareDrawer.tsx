import { Property } from '../types/property';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { formatMozCurrency } from '../utils/format';
import { resolveImageUrl } from '../api';
import { X, Check, Minus } from 'lucide-react';
import { useI18n } from '../i18n';

interface CompareDrawerProps {
  properties: Property[];
  open: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
}

export function CompareDrawer({ properties, open, onClose, onRemove }: CompareDrawerProps) {
  const { t } = useI18n();
  if (properties.length === 0) return null;

  const fields: { label: string; render: (p: Property) => React.ReactNode }[] = [
    { label: t('compare.image'), render: (p) => (
      <img src={resolveImageUrl(p.imagem)} alt={p.titulo} className="w-full h-24 object-cover rounded"
        onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400'; }} />
    )},
    { label: t('compare.price'), render: (p) => (
      <span className="font-bold text-primary">{formatMozCurrency(p.preco)}{p.tipo === 'arrendamento' ? t('property.perMonth') : ''}</span>
    )},
    { label: t('compare.type'), render: (p) => (
      <Badge variant={p.tipo === 'venda' ? 'default' : 'secondary'}>{p.tipo === 'venda' ? t('property.sale') : t('property.rent')}</Badge>
    )},
    { label: t('compare.typology'), render: (p) => <span>{p.tipologia}</span> },
    { label: t('compare.area'), render: (p) => <span>{p.area}m²</span> },
    { label: t('compare.rooms'), render: (p) => <span>{p.quartos}</span> },
    { label: t('compare.bathrooms'), render: (p) => <span>{p.casasBanho}</span> },
    { label: t('compare.garage'), render: (p) => p.garagem ? <Check className="w-5 h-5 text-green-500" /> : <Minus className="w-5 h-5 text-muted-foreground" /> },
    { label: t('compare.pool'), render: (p) => p.piscina ? <Check className="w-5 h-5 text-green-500" /> : <Minus className="w-5 h-5 text-muted-foreground" /> },
    { label: t('compare.garden'), render: (p) => p.jardim ? <Check className="w-5 h-5 text-green-500" /> : <Minus className="w-5 h-5 text-muted-foreground" /> },
    { label: t('compare.city'), render: (p) => <span>{p.cidade}</span> },
    { label: t('compare.year'), render: (p) => <span>{p.anoConstructao}</span> },
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('compare.title')} ({properties.length})</DialogTitle>
          <DialogDescription>{t('compare.subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-2 px-3 font-medium text-muted-foreground min-w-[120px]"></th>
                {properties.map((p) => (
                  <th key={p.id} className="py-2 px-3 min-w-[180px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm truncate">{p.titulo}</span>
                      <Button variant="ghost" size="icon" className="shrink-0 h-6 w-6" onClick={() => onRemove(p.id)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => (
                <tr key={field.label} className="border-t">
                  <td className="py-3 px-3 font-medium text-muted-foreground">{field.label}</td>
                  {properties.map((p) => (
                    <td key={p.id} className="py-3 px-3 text-center">{field.render(p)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
