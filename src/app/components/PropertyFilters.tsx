import { PropertyType } from '../types/property';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Search, X } from 'lucide-react';

interface PropertyFiltersProps {
  tipo: PropertyType | 'todos';
  onTipoChange: (tipo: PropertyType | 'todos') => void;
  cidade: string;
  onCidadeChange: (cidade: string) => void;
  precoMax: string;
  onPrecoMaxChange: (preco: string) => void;
  tipologia: string;
  onTipologiaChange: (tipologia: string) => void;
  onClearFilters: () => void;
}

export function PropertyFilters({
  tipo,
  onTipoChange,
  cidade,
  onCidadeChange,
  precoMax,
  onPrecoMaxChange,
  tipologia,
  onTipologiaChange,
  onClearFilters
}: PropertyFiltersProps) {
  return (
    <div className="bg-card rounded-lg p-6 shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Search className="w-5 h-5" />
          Filtros de Pesquisa
        </h2>
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          <X className="w-4 h-4 mr-1" />
          Limpar
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={(value) => onTipoChange(value as PropertyType | 'todos')}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="venda">Venda</SelectItem>
              <SelectItem value="arrendamento">Arrendamento</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Cidade</Label>
          <Input 
            placeholder="Ex: Lisboa" 
            value={cidade}
            onChange={(e) => onCidadeChange(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Preço Máximo (€)</Label>
          <Input 
            type="number" 
            placeholder="Ex: 500000" 
            value={precoMax}
            onChange={(e) => onPrecoMaxChange(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Tipologia</Label>
          <Select value={tipologia} onValueChange={onTipologiaChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="T1">T1</SelectItem>
              <SelectItem value="T2">T2</SelectItem>
              <SelectItem value="T3">T3</SelectItem>
              <SelectItem value="T4">T4</SelectItem>
              <SelectItem value="T5">T5</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
