import { PropertyType } from '../types/property';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Search, X, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../i18n';

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
  const { t } = useI18n();

  // Count active filters
  const activeCount = [
    tipo !== 'todos',
    !!cidade,
    !!precoMax,
    !!precoMin,
    tipologia !== 'todos',
    !!areaMin,
    !!areaMax,
    !!quartos,
    garagem,
    piscina,
    jardim,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Main search bar */}
      {onSearchChange && (
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder={t('filters.searchPlaceholder')}
            value={search || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-12 h-12 text-base rounded-xl border-2 focus:border-primary bg-card shadow-sm"
          />
          {search && (
            <button onClick={() => onSearchChange('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-card rounded-xl p-5 shadow-sm border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">{t('filters.title')}</span>
            {activeCount > 0 && (
              <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeCount}</span>
            )}
          </div>
          <div className="flex gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs gap-1 h-8">
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showAdvanced ? t('filters.less') : t('filters.more')}
            </Button>
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onClearFilters} className="text-xs gap-1 h-8 text-destructive hover:text-destructive">
                <X className="w-3.5 h-3.5" />
                {t('filters.clear')}
              </Button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t('filters.type')}</Label>
            <Select value={tipo} onValueChange={(value) => onTipoChange(value as PropertyType | 'todos')}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder={t('filters.select')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">{t('filters.all')}</SelectItem>
                <SelectItem value="venda">{t('filters.sale')}</SelectItem>
                <SelectItem value="arrendamento">{t('filters.rent')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t('filters.city')}</Label>
            <Input 
              placeholder={t('filters.cityPlaceholder')} 
              value={cidade}
              onChange={(e) => onCidadeChange(e.target.value)}
              className="h-9"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t('filters.maxPrice')}</Label>
            <Input 
              type="number" 
              placeholder={t('filters.maxPricePlaceholder')} 
              value={precoMax}
              onChange={(e) => onPrecoMaxChange(e.target.value)}
              className="h-9"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t('filters.typology')}</Label>
            <Select value={tipologia} onValueChange={onTipologiaChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder={t('filters.select')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">{t('filters.allFeminine')}</SelectItem>
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
          <div className="pt-3 border-t space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {onPrecoMinChange && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{t('filters.minPrice')}</Label>
                  <Input
                    type="number"
                    placeholder={t('filters.minPricePlaceholder')}
                    value={precoMin || ''}
                    onChange={(e) => onPrecoMinChange(e.target.value)}
                    className="h-9"
                  />
                </div>
              )}

              {onAreaMinChange && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{t('filters.minArea')}</Label>
                  <Input
                    type="number"
                    placeholder={t('filters.minAreaPlaceholder')}
                    value={areaMin || ''}
                    onChange={(e) => onAreaMinChange(e.target.value)}
                    className="h-9"
                  />
                </div>
              )}

              {onAreaMaxChange && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{t('filters.maxArea')}</Label>
                  <Input
                    type="number"
                    placeholder={t('filters.maxAreaPlaceholder')}
                    value={areaMax || ''}
                    onChange={(e) => onAreaMaxChange(e.target.value)}
                    className="h-9"
                  />
                </div>
              )}

              {onQuartosChange && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{t('filters.rooms')}</Label>
                  <Select value={quartos || 'any'} onValueChange={(v) => onQuartosChange(v === 'any' ? '' : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t('filters.anyRooms')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">{t('filters.anyRooms')}</SelectItem>
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
            <div className="flex flex-wrap gap-4">
              {onGaragemChange && (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox
                    id="filter-garagem"
                    checked={garagem || false}
                    onCheckedChange={(v) => onGaragemChange(!!v)}
                  />
                  <span className="text-sm">{t('filters.garage')}</span>
                </label>
              )}
              {onPiscinaChange && (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox
                    id="filter-piscina"
                    checked={piscina || false}
                    onCheckedChange={(v) => onPiscinaChange(!!v)}
                  />
                  <span className="text-sm">{t('filters.pool')}</span>
                </label>
              )}
              {onJardimChange && (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox
                    id="filter-jardim"
                    checked={jardim || false}
                    onCheckedChange={(v) => onJardimChange(!!v)}
                  />
                  <span className="text-sm">{t('filters.garden')}</span>
                </label>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
