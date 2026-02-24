import { PropertyType } from '../types/property';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';

interface PropertyFiltersProps {
  tipo: PropertyType | 'todos';
  onTipoChange: (tipo: PropertyType | 'todos') => void;
  cidade: string;
  onCidadeChange: (cidade: string) => void;
  precoMax: string;
  onPrecoMaxChange: (preco: string) => void;
  precoMin?: string;
  onPrecoMinChange?: (preco: string) => void;
  tipologia: string;
  onTipologiaChange: (tipologia: string) => void;
  onClearFilters: () => void;
  search?: string;
  onSearchChange?: (search: string) => void;
  areaMin?: string;
  onAreaMinChange?: (area: string) => void;
  areaMax?: string;
  onAreaMaxChange?: (area: string) => void;
  quartos?: string;
  onQuartosChange?: (quartos: string) => void;
  garagem?: boolean;
  onGaragemChange?: (v: boolean) => void;
  piscina?: boolean;
  onPiscinaChange?: (v: boolean) => void;
  jardim?: boolean;
  onJardimChange?: (v: boolean) => void;
}

export function PropertyFilters({
  tipo, onTipoChange,
  cidade, onCidadeChange,
  precoMax, onPrecoMaxChange,
  precoMin, onPrecoMinChange,
  tipologia, onTipologiaChange,
  onClearFilters,
  search, onSearchChange,
  areaMin, onAreaMinChange,
  areaMax, onAreaMaxChange,
  quartos, onQuartosChange,
  garagem, onGaragemChange,
  piscina, onPiscinaChange,
  jardim, onJardimChange,
}: PropertyFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="bg-card rounded-lg p-6 shadow-sm border">
      {/* Search bar */}
      {onSearchChange && (
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar imóveis por título, descrição, localização..."
              value={search || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5" />
          Filtros de Pesquisa
        </h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowAdvanced(!showAdvanced)}>
            {showAdvanced ? 'Menos filtros' : 'Mais filtros'}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="w-4 h-4 mr-1" />
            Limpar
          </Button>
        </div>
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
            placeholder="Ex: Maputo" 
            value={cidade}
            onChange={(e) => onCidadeChange(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Preço Máximo (MT)</Label>
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

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {onPrecoMinChange && (
              <div className="space-y-2">
                <Label>Preço Mínimo (MT)</Label>
                <Input
                  type="number"
                  placeholder="Ex: 100000"
                  value={precoMin || ''}
                  onChange={(e) => onPrecoMinChange(e.target.value)}
                />
              </div>
            )}

            {onAreaMinChange && (
              <div className="space-y-2">
                <Label>Área Mín (m²)</Label>
                <Input
                  type="number"
                  placeholder="Ex: 50"
                  value={areaMin || ''}
                  onChange={(e) => onAreaMinChange(e.target.value)}
                />
              </div>
            )}

            {onAreaMaxChange && (
              <div className="space-y-2">
                <Label>Área Máx (m²)</Label>
                <Input
                  type="number"
                  placeholder="Ex: 500"
                  value={areaMax || ''}
                  onChange={(e) => onAreaMaxChange(e.target.value)}
                />
              </div>
            )}

            {onQuartosChange && (
              <div className="space-y-2">
                <Label>Quartos (mín)</Label>
                <Select value={quartos || 'any'} onValueChange={(v) => onQuartosChange(v === 'any' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Qualquer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Qualquer</SelectItem>
                    <SelectItem value="1">1+</SelectItem>
                    <SelectItem value="2">2+</SelectItem>
                    <SelectItem value="3">3+</SelectItem>
                    <SelectItem value="4">4+</SelectItem>
                    <SelectItem value="5">5+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Feature checkboxes */}
          <div className="flex flex-wrap gap-6">
            {onGaragemChange && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="filter-garagem"
                  checked={garagem || false}
                  onCheckedChange={(v) => onGaragemChange(!!v)}
                />
                <Label htmlFor="filter-garagem" className="cursor-pointer">Garagem</Label>
              </div>
            )}
            {onPiscinaChange && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="filter-piscina"
                  checked={piscina || false}
                  onCheckedChange={(v) => onPiscinaChange(!!v)}
                />
                <Label htmlFor="filter-piscina" className="cursor-pointer">Piscina</Label>
              </div>
            )}
            {onJardimChange && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="filter-jardim"
                  checked={jardim || false}
                  onCheckedChange={(v) => onJardimChange(!!v)}
                />
                <Label htmlFor="filter-jardim" className="cursor-pointer">Jardim</Label>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
