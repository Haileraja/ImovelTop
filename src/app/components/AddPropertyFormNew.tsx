import { useState, useEffect, useMemo } from 'react';
import { Property, PropertyType } from '../types/property';
import { useI18n } from '../i18n';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  PlusCircle, ArrowLeft, X, Upload, MapPin, Building2, 
  DollarSign, User, Clock, AlertCircle, CheckCircle2, Pencil
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../api';
import { MOZAMBIQUE_LOCATIONS, getAllCities, getBairrosForCity, getAvenidasForBairro } from '../data/mozambiqueLocations';
import { 
  PropertyCategory, 
  PROPERTY_TYPES_CONFIG, 
  COMMON_FIELDS,
  getAllFieldsForType, 
  validateRequiredFields,
  FieldConfig
} from '../data/propertyFieldsConfig';

interface AddPropertyFormProps {
  onAdd: (property: Omit<Property, 'id' | 'vendedorId' | 'vendedorNome' | 'createdAt'>) => void;
  onUpdate?: (propertyId: string, data: Record<string, any>) => Promise<void>;
  onCancel: () => void;
  vendedorNome: string;
  editingProperty?: Property | null;
}

export function AddPropertyForm({ onAdd, onUpdate, onCancel, vendedorNome, editingProperty }: AddPropertyFormProps) {
  const { t } = useI18n();
  const isEditMode = !!editingProperty;
  
  // Initialize form data - either from editing property or empty
  const getInitialFormData = () => {
    if (editingProperty) {
      return {
        tipoImovel: editingProperty.tipoImovel || '',
        titulo: editingProperty.titulo || '',
        finalidade: editingProperty.tipo || 'venda',
        preco: editingProperty.preco ? String(editingProperty.preco) : '',
        negociavel: editingProperty.negociavel || 'sim',
        provincia: '',
        cidade: editingProperty.cidade || '',
        bairro: '',
        avenida: '',
        localizacao: editingProperty.localizacao || '',
        latitude: editingProperty.latitude ? String(editingProperty.latitude) : '',
        longitude: editingProperty.longitude ? String(editingProperty.longitude) : '',
        areaTotal: editingProperty.area ? String(editingProperty.area) : '',
        descricao: editingProperty.descricao || '',
        tipoAnunciante: editingProperty.tipoAnunciante || 'particular',
        disponibilidade: editingProperty.disponibilidade || 'todo_dia',
        diasEspecificos: editingProperty.diasEspecificos || '',
        tipologia: editingProperty.tipologia || 'T2',
        imagem: editingProperty.imagem || '',
        galeria: editingProperty.galeria || [],
        caracteristicas: editingProperty.caracteristicas || [],
        newCaracteristica: '',
        provinciaOutro: '',
        cidadeOutro: '',
        bairroOutro: '',
        avenidaOutro: '',
        // Type-specific fields from dadosEspecificos
        ...(editingProperty.dadosEspecificos ? JSON.parse(editingProperty.dadosEspecificos) : {}),
        // Also map common Property fields
        quartos: editingProperty.quartos ? String(editingProperty.quartos) : '',
        casasBanho: editingProperty.casasBanho ? String(editingProperty.casasBanho) : '',
        garagem: editingProperty.garagem ? 'sim' : 'nao',
        garagemNumCarros: editingProperty.garagemNumCarros ? String(editingProperty.garagemNumCarros) : '',
        garagemFechada: editingProperty.garagemFechada ? 'sim' : 'nao',
        piscina: editingProperty.piscina ? 'sim' : 'nao',
        jardim: editingProperty.jardim ? 'sim' : 'nao',
        arCondicionado: editingProperty.arCondicionado ? 'sim' : 'nao',
        mobilada: editingProperty.mobilada ? 'sim' : 'nao',
        sistemaSeguranca: editingProperty.sistemaSeguranca ? 'sim' : 'nao',
        elevador: editingProperty.elevador ? 'sim' : 'nao',
        anoConstructao: editingProperty.anoConstructao ? String(editingProperty.anoConstructao) : '',
        certificadoEnergetico: editingProperty.certificadoEnergetico || '',
      };
    }
    return {
      tipoImovel: '',
      titulo: '',
      finalidade: 'venda',
      preco: '',
      negociavel: 'sim',
      provincia: '',
      cidade: '',
      bairro: '',
      avenida: '',
      localizacao: '',
      latitude: '',
      longitude: '',
      areaTotal: '',
      descricao: '',
      tipoAnunciante: 'particular',
      disponibilidade: 'todo_dia',
      diasEspecificos: '',
      tipologia: 'T2',
      imagem: '',
      galeria: [] as string[],
      caracteristicas: [] as string[],
      newCaracteristica: '',
      provinciaOutro: '',
      cidadeOutro: '',
      bairroOutro: '',
      avenidaOutro: ''
    };
  };
  
  // Form data state
  const [formData, setFormData] = useState<Record<string, any>>(getInitialFormData);

  // File uploads
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [mainPreview, setMainPreview] = useState<string | null>(null);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  
  // Form state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Price formatting helper
  const formatPrice = (value: string): string => {
    const numericValue = value.replace(/[^\d]/g, '');
    if (!numericValue) return '';
    return parseInt(numericValue, 10).toLocaleString('pt-MZ');
  };
  
  const unformatPrice = (value: string): string => {
    return value.replace(/[^\d]/g, '');
  };

  // Derived states
  const selectedCategory = formData.tipoImovel as PropertyCategory;
  const typeConfig = useMemo(() => 
    PROPERTY_TYPES_CONFIG.find(c => c.category === selectedCategory),
    [selectedCategory]
  );
  const specificFields = useMemo(() => 
    typeConfig?.fields || [],
    [typeConfig]
  );

  // Cascading location helpers
  const availableCities = useMemo(() => {
    if (!formData.provincia) return getAllCities();
    const prov = MOZAMBIQUE_LOCATIONS.find(p => p.nome === formData.provincia);
    return prov ? prov.cidades.map(c => c.nome) : getAllCities();
  }, [formData.provincia]);
  
  const availableBairros = useMemo(() => getBairrosForCity(formData.cidade), [formData.cidade]);
  const availableAvenidas = useMemo(() => getAvenidasForBairro(formData.cidade, formData.bairro), [formData.cidade, formData.bairro]);

  // Update field value
  const updateField = (name: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Handle cascading location resets
      if (name === 'provincia') {
        newData.cidade = '';
        newData.bairro = '';
        newData.avenida = '';
        newData.localizacao = '';
      } else if (name === 'cidade') {
        newData.bairro = '';
        newData.avenida = '';
        newData.localizacao = value;
      } else if (name === 'bairro') {
        newData.avenida = '';
        newData.localizacao = `${value}, ${prev.cidade}`;
      } else if (name === 'avenida') {
        newData.localizacao = `${value}, ${prev.bairro}, ${prev.cidade}`;
      }
      
      // Handle tipoImovel change - reset specific fields and force venda for Terreno
      if (name === 'tipoImovel') {
        if (value === 'Terreno') {
          newData.finalidade = 'venda';
        }
      }
      
      return newData;
    });
    
    // Clear validation error for this field
    setValidationErrors(prev => prev.filter(f => f !== name));
  };

  // Generate previews for uploaded files
  useEffect(() => {
    if (mainImageFile) {
      const url = URL.createObjectURL(mainImageFile);
      setMainPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setMainPreview(null);
    }
  }, [mainImageFile]);

  useEffect(() => {
    const urls = galleryFiles.map(f => URL.createObjectURL(f));
    setGalleryPreviews(urls);
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [galleryFiles]);

  // Validate and submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCategory) {
      toast.error(t('addProperty.selectPropertyTypeFirst') || 'Seleccione o tipo de imóvel primeiro');
      return;
    }
    
    // Validate required fields
    const validation = validateRequiredFields(selectedCategory, formData);
    if (!validation.valid) {
      setValidationErrors(validation.missingFields);
      toast.error(t('addProperty.fillRequiredFields') || 'Preencha todos os campos obrigatórios');
      return;
    }

    // Check for images (only required for new properties)
    if (!isEditMode && !mainImageFile && !formData.imagem) {
      toast.error(t('addProperty.imageRequired') || 'Adicione pelo menos uma foto do imóvel');
      return;
    }

    const mainImage = formData.imagem || '';
    const gallery = [...formData.galeria];
    if (mainImage && !gallery.includes(mainImage)) {
      gallery.unshift(mainImage);
    }

    // Build property object
    const property = buildPropertyObject(mainImage, gallery);

    // Handle edit mode
    if (isEditMode && onUpdate && editingProperty) {
      setUploading(true);
      try {
        // If there are new files, we need to handle them differently
        const hasFiles = !!mainImageFile || galleryFiles.length > 0;
        if (hasFiles) {
          const fd = createFormData(property);
          await performUploadForEdit(fd, editingProperty.id);
        } else {
          await onUpdate(editingProperty.id, property);
          toast.success(t('addProperty.updateSuccess') || 'Imóvel actualizado com sucesso');
        }
      } catch (err) {
        console.error(err);
        toast.error(t('addProperty.updateFail') || 'Erro ao actualizar imóvel');
      } finally {
        setUploading(false);
      }
      return;
    }

    // Upload with files or submit directly (create mode)
    const hasFiles = !!mainImageFile || galleryFiles.length > 0;
    if (hasFiles) {
      const fd = createFormData(property);
      await performUpload(fd, property);
    } else {
      onAdd(property);
      toast.success(t('addProperty.success'));
    }
  };

  const performUploadForEdit = async (fd: FormData, propertyId: string) => {
    setUploadProgress(0);
    try {
      // For edit with new images, we need a special endpoint or handle differently
      // For now, we'll update without the new files and show a message
      const property = buildPropertyObject(formData.imagem || '', formData.galeria || []);
      if (onUpdate) {
        await onUpdate(propertyId, property);
        toast.success(t('addProperty.updateSuccess') || 'Imóvel actualizado com sucesso');
      }
    } catch (err) {
      console.error(err);
      toast.error(t('addProperty.updateFail') || 'Erro ao actualizar imóvel');
    } finally {
      setUploadProgress(null);
    }
  };

  const buildPropertyObject = (mainImage: string, gallery: string[]) => {
    // Map form data to property structure
    const property: any = {
      titulo: formData.titulo || `${selectedCategory} em ${formData.cidade}`,
      descricao: formData.descricao,
      tipo: formData.finalidade as PropertyType,
      preco: parseFloat(formData.preco) || 0,
      localizacao: formData.localizacao,
      cidade: formData.cidade,
      tipoImovel: selectedCategory,
      tipologia: formData.tipologia || 'T2',
      area: parseFloat(formData.areaTotal) || 0,
      imagem: mainImage,
      galeria: gallery.length > 0 ? gallery : [mainImage],
      quartos: parseInt(formData.quartos) || 0,
      casasBanho: parseInt(formData.casasBanho) || 0,
      garagem: !!formData.capacidadeGaragem || false,
      garagemNumCarros: parseInt(formData.capacidadeGaragem) || 0,
      garagemFechada: false,
      arCondicionado: false,
      piscina: formData.piscina || false,
      ginasio: false,
      escritorio: false,
      salaJogos: false,
      salaTV: false,
      jardim: formData.jardim || false,
      areaLazer: false,
      mobilada: formData.mobilada || false,
      sistemaSeguranca: formData.sistemaSeguranca || formData.seguranca || formData.seguranca24h || false,
      elevador: formData.elevador || false,
      anoConstructao: parseInt(formData.anoConstrucao) || new Date().getFullYear(),
      certificadoEnergetico: 'B',
      caracteristicas: formData.caracteristicas || [],
      // Extended fields stored in caracteristicas as JSON for now
      negociavel: formData.negociavel,
      tipoAnunciante: formData.tipoAnunciante,
      disponibilidade: formData.disponibilidade,
      diasEspecificos: formData.diasEspecificos,
      latitude: parseFloat(formData.latitude) || null,
      longitude: parseFloat(formData.longitude) || null,
      // Type-specific extra data
      dadosEspecificos: JSON.stringify(extractTypeSpecificData())
    };
    
    return property;
  };

  const extractTypeSpecificData = () => {
    const data: Record<string, any> = {};
    specificFields.forEach(field => {
      if (formData[field.name] !== undefined) {
        data[field.name] = formData[field.name];
      }
    });
    return data;
  };

  const createFormData = (property: any) => {
    const fd = new FormData();
    Object.entries(property).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (typeof value === 'object') {
          fd.append(key, JSON.stringify(value));
        } else {
          fd.append(key, String(value));
        }
      }
    });
    if (mainImageFile) fd.append('imagem_file', mainImageFile);
    galleryFiles.forEach(f => fd.append('galeria_files', f));
    return fd;
  };

  const performUpload = async (fd: FormData, property: any) => {
    setUploading(true);
    setUploadProgress(0);
    try {
      const created = await (api as any).uploadPropertyWithProgress(fd, (p: number) => {
        setUploadProgress(Math.round(p * 100));
      });
      if (created) {
        onAdd(created as any);
        toast.success(t('addProperty.success'));
      } else {
        toast.error(t('addProperty.fail'));
      }
    } catch (err) {
      console.error(err);
      toast.error(t('addProperty.fail'));
    } finally {
      setUploading(false);
      setUploadProgress(null);
      setMainImageFile(null);
      setGalleryFiles([]);
    }
  };

  // Render a single field based on its config
  const renderField = (field: FieldConfig) => {
    const value = formData[field.name];
    const hasError = validationErrors.includes(field.name);
    
    // Check dependsOn condition
    if (field.dependsOn) {
      const dependentValue = formData[field.dependsOn.field];
      if (dependentValue !== field.dependsOn.value) {
        return null;
      }
    }

    const fieldLabel = (
      <Label htmlFor={field.name} className={hasError ? 'text-destructive' : ''}>
        {t(field.labelKey) || field.labelKey}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
    );

    switch (field.type) {
      case 'text':
        return (
          <div key={field.name} className="space-y-1.5">
            {fieldLabel}
            <Input
              id={field.name}
              value={value || ''}
              onChange={(e) => updateField(field.name, e.target.value)}
              placeholder={field.placeholder ? t(field.placeholder) : ''}
              className={hasError ? 'border-destructive' : ''}
            />
          </div>
        );
      
      case 'number':
        // Special handling for price field with formatting
        if (field.name === 'preco') {
          return (
            <div key={field.name} className="space-y-1.5">
              {fieldLabel}
              <div className="relative">
                <Input
                  id={field.name}
                  type="text"
                  inputMode="numeric"
                  value={formatPrice(value || '')}
                  onChange={(e) => updateField(field.name, unformatPrice(e.target.value))}
                  placeholder={field.placeholder ? t(field.placeholder) : '0'}
                  className={`${hasError ? 'border-destructive' : ''} pr-16`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  MZN
                </span>
              </div>
            </div>
          );
        }
        
        return (
          <div key={field.name} className="space-y-1.5">
            {fieldLabel}
            <div className="relative">
              <Input
                id={field.name}
                type="number"
                value={value || ''}
                onChange={(e) => updateField(field.name, e.target.value)}
                placeholder={field.placeholder ? t(field.placeholder) : ''}
                min={field.min}
                max={field.max}
                className={`${hasError ? 'border-destructive' : ''} ${field.suffix ? 'pr-12' : ''}`}
              />
              {field.suffix && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {field.suffix}
                </span>
              )}
            </div>
          </div>
        );
      
      case 'textarea':
        return (
          <div key={field.name} className="space-y-1.5">
            {fieldLabel}
            <Textarea
              id={field.name}
              value={value || ''}
              onChange={(e) => updateField(field.name, e.target.value)}
              placeholder={field.placeholder ? t(field.placeholder) : ''}
              rows={3}
              className={hasError ? 'border-destructive' : ''}
            />
          </div>
        );
      
      case 'select':
        // Special handling for location selects
        if (field.name === 'provincia') {
          return (
            <div key={field.name} className="space-y-1.5">
              {fieldLabel}
              <Select value={value || ''} onValueChange={(v) => updateField(field.name, v)}>
                <SelectTrigger className={`${!value ? 'text-muted-foreground' : ''} ${hasError ? 'border-destructive' : ''}`}>
                  <SelectValue placeholder={t('addProperty.selectProvince')} />
                </SelectTrigger>
                <SelectContent>
                  {MOZAMBIQUE_LOCATIONS.map(p => (
                    <SelectItem key={p.nome} value={p.nome}>{p.nome}</SelectItem>
                  ))}
                  <SelectItem value="__outro__">{t('addProperty.other') || 'Outro'}</SelectItem>
                </SelectContent>
              </Select>
              {value === '__outro__' && (
                <Input
                  value={formData.provinciaOutro || ''}
                  onChange={(e) => updateField('provinciaOutro', e.target.value)}
                  placeholder={t('addProperty.specifyProvince') || 'Especifique a província'}
                  className="mt-2"
                />
              )}
            </div>
          );
        }
        
        if (field.name === 'cidade') {
          return (
            <div key={field.name} className="space-y-1.5">
              {fieldLabel}
              <Select value={value || ''} onValueChange={(v) => updateField(field.name, v)}>
                <SelectTrigger className={`${!value ? 'text-muted-foreground' : ''} ${hasError ? 'border-destructive' : ''}`}>
                  <SelectValue placeholder={t('addProperty.cityPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {availableCities.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                  <SelectItem value="__outro__">{t('addProperty.other') || 'Outro'}</SelectItem>
                </SelectContent>
              </Select>
              {value === '__outro__' && (
                <Input
                  value={formData.cidadeOutro || ''}
                  onChange={(e) => updateField('cidadeOutro', e.target.value)}
                  placeholder={t('addProperty.specifyCity') || 'Especifique a cidade'}
                  className="mt-2"
                />
              )}
            </div>
          );
        }
        
        if (field.name === 'bairro') {
          return (
            <div key={field.name} className="space-y-1.5">
              {fieldLabel}
              <Select 
                value={value || ''} 
                onValueChange={(v) => updateField(field.name, v)}
                disabled={!formData.cidade || formData.cidade === '__outro__'}
              >
                <SelectTrigger className={`${!value ? 'text-muted-foreground' : ''} ${hasError ? 'border-destructive' : ''}`}>
                  <SelectValue placeholder={t('addProperty.selectBairro')} />
                </SelectTrigger>
                <SelectContent>
                  {availableBairros.map(b => (
                    <SelectItem key={b.nome} value={b.nome}>{b.nome}</SelectItem>
                  ))}
                  <SelectItem value="__outro__">{t('addProperty.other') || 'Outro'}</SelectItem>
                </SelectContent>
              </Select>
              {(value === '__outro__' || formData.cidade === '__outro__') && (
                <Input
                  value={formData.bairroOutro || ''}
                  onChange={(e) => updateField('bairroOutro', e.target.value)}
                  placeholder={t('addProperty.specifyBairro') || 'Especifique o bairro'}
                  className="mt-2"
                />
              )}
            </div>
          );
        }

        // Handle finalidade for Terreno (only venda)
        if (field.name === 'finalidade' && selectedCategory === 'Terreno') {
          return (
            <div key={field.name} className="space-y-1.5">
              {fieldLabel}
              <Select value="venda" disabled>
                <SelectTrigger>
                  <SelectValue>{t('addProperty.sale')}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="venda">{t('addProperty.sale')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('addProperty.landOnlySale') || 'Terrenos apenas podem ser vendidos'}</p>
            </div>
          );
        }

        // Generic select
        return (
          <div key={field.name} className="space-y-1.5">
            {fieldLabel}
            <Select value={value || ''} onValueChange={(v) => updateField(field.name, v)}>
              <SelectTrigger className={`${!value ? 'text-muted-foreground' : ''} ${hasError ? 'border-destructive' : ''}`}>
                <SelectValue placeholder={t('general.select')} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {t(opt.labelKey) || opt.labelKey}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      
      case 'boolean':
        return (
          <div key={field.name} className="flex items-center justify-between p-3 border rounded-lg">
            <Label htmlFor={field.name} className="cursor-pointer">
              {t(field.labelKey) || field.labelKey}
            </Label>
            <Switch
              id={field.name}
              checked={value || false}
              onCheckedChange={(checked) => updateField(field.name, checked)}
            />
          </div>
        );
      
      case 'multi-select':
        const selectedValues = (value as string[]) || [];
        return (
          <div key={field.name} className="space-y-2">
            {fieldLabel}
            <div className="flex flex-wrap gap-2">
              {field.options?.map(opt => {
                const isSelected = selectedValues.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      const newValues = isSelected
                        ? selectedValues.filter(v => v !== opt.value)
                        : [...selectedValues, opt.value];
                      updateField(field.name, newValues);
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                      isSelected 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-background border-input hover:bg-muted'
                    }`}
                  >
                    {t(opt.labelKey) || opt.labelKey}
                  </button>
                );
              })}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  // Group common fields by section
  const commonFieldsSection = COMMON_FIELDS.filter(f => 
    !['provincia', 'cidade', 'bairro', 'latitude', 'longitude', 'descricao'].includes(f.name)
  );
  const locationFields = COMMON_FIELDS.filter(f => 
    ['provincia', 'cidade', 'bairro', 'latitude', 'longitude'].includes(f.name)
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" onClick={onCancel} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('addProperty.back')}
      </Button>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isEditMode ? <Pencil className="w-6 h-6" /> : <PlusCircle className="w-6 h-6" />}
            {isEditMode ? (t('addProperty.editTitle') || 'Editar Imóvel') : t('addProperty.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* ===== STEP 1: Property Type Selection ===== */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Building2 className="w-5 h-5 text-primary" />
                {t('addProperty.propertyCategory')}
                <span className="text-destructive">*</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PROPERTY_TYPES_CONFIG.map(config => (
                  <button
                    key={config.category}
                    type="button"
                    onClick={() => updateField('tipoImovel', config.category)}
                    className={`p-4 rounded-xl border-2 transition-all text-center ${
                      selectedCategory === config.category
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-muted hover:border-primary/30 hover:bg-muted/30'
                    }`}
                  >
                    <div className="text-sm font-medium">{t(config.labelKey)}</div>
                    {!config.allowsRent && (
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        {t('addProperty.saleOnly') || 'Só venda'}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
              {selectedCategory === 'Outro' && (
                <div className="mt-3">
                  {renderField({
                    name: 'outroTipoDescricao',
                    labelKey: 'addProperty.otherTypeDescription',
                    type: 'textarea',
                    required: true,
                    placeholder: 'addProperty.describeOtherType'
                  })}
                </div>
              )}
            </div>

            {selectedCategory && (
              <>
                <Separator />

                {/* ===== Title ===== */}
                <div className="space-y-2">
                  <Label htmlFor="titulo">{t('addProperty.titleField')}</Label>
                  <Input
                    id="titulo"
                    value={formData.titulo}
                    onChange={(e) => updateField('titulo', e.target.value)}
                    placeholder={t('addProperty.titlePlaceholder') || `${selectedCategory} em...`}
                  />
                </div>

                {/* ===== Description ===== */}
                <div className="space-y-2">
                  <Label htmlFor="descricao">
                    {t('addProperty.description')}
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => updateField('descricao', e.target.value)}
                    placeholder={t('addProperty.descriptionPlaceholder')}
                    rows={4}
                    className={validationErrors.includes('descricao') ? 'border-destructive' : ''}
                  />
                </div>

                {/* ===== Purpose, Price & Negotiable ===== */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <DollarSign className="w-5 h-5 text-primary" />
                    {t('addProperty.priceSection') || 'Preço e Finalidade'}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {renderField(COMMON_FIELDS.find(f => f.name === 'finalidade')!)}
                    {renderField(COMMON_FIELDS.find(f => f.name === 'preco')!)}
                    {renderField(COMMON_FIELDS.find(f => f.name === 'negociavel')!)}
                  </div>
                </div>

                <Separator />

                {/* ===== Location ===== */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <MapPin className="w-5 h-5 text-primary" />
                    {t('addProperty.locationSection') || 'Localização'}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {locationFields.slice(0, 3).map(f => renderField(f))}
                  </div>
                  {(availableAvenidas.length > 0 || formData.bairro === '__outro__') && (
                    <div className="space-y-1.5">
                      <Label>{t('addProperty.avenue')}</Label>
                      {availableAvenidas.length > 0 && formData.bairro !== '__outro__' ? (
                        <>
                          <Select 
                            value={formData.avenida || ''} 
                            onValueChange={(v) => updateField('avenida', v)}
                          >
                            <SelectTrigger className={!formData.avenida ? 'text-muted-foreground' : ''}>
                              <SelectValue placeholder={t('addProperty.selectAvenue')} />
                            </SelectTrigger>
                            <SelectContent>
                              {availableAvenidas.map(a => (
                                <SelectItem key={a} value={a}>{a}</SelectItem>
                              ))}
                              <SelectItem value="__outro__">{t('addProperty.other') || 'Outro'}</SelectItem>
                            </SelectContent>
                          </Select>
                          {formData.avenida === '__outro__' && (
                            <Input
                              value={formData.avenidaOutro || ''}
                              onChange={(e) => updateField('avenidaOutro', e.target.value)}
                              placeholder={t('addProperty.specifyAvenue') || 'Especifique a avenida/rua'}
                              className="mt-2"
                            />
                          )}
                        </>
                      ) : (
                        <Input
                          value={formData.avenidaOutro || ''}
                          onChange={(e) => updateField('avenidaOutro', e.target.value)}
                          placeholder={t('addProperty.specifyAvenue') || 'Especifique a avenida/rua'}
                        />
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {locationFields.slice(3).map(f => renderField(f))}
                  </div>
                </div>

                <Separator />

                {/* ===== Area ===== */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderField(COMMON_FIELDS.find(f => f.name === 'areaTotal')!)}
                </div>

                <Separator />

                {/* ===== Type-Specific Fields ===== */}
                {specificFields.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-lg font-semibold">
                      <Building2 className="w-5 h-5 text-primary" />
                      {t('addProperty.specificDetails') || `Detalhes do ${selectedCategory}`}
                    </div>
                    
                    {/* Numeric and Select fields */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {specificFields
                        .filter(f => f.type === 'number' || f.type === 'select' || f.type === 'text')
                        .map(f => renderField(f))}
                    </div>
                    
                    {/* Boolean fields */}
                    {specificFields.filter(f => f.type === 'boolean').length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                        {specificFields
                          .filter(f => f.type === 'boolean')
                          .map(f => renderField(f))}
                      </div>
                    )}

                    {/* Multi-select fields */}
                    {specificFields
                      .filter(f => f.type === 'multi-select')
                      .map(f => renderField(f))}
                    
                    {/* Textarea fields */}
                    {specificFields
                      .filter(f => f.type === 'textarea')
                      .map(f => renderField(f))}
                  </div>
                )}

                <Separator />

                {/* ===== Images ===== */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Upload className="w-5 h-5 text-primary" />
                    {t('addProperty.photos') || 'Fotos'}
                    <span className="text-destructive">*</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>{t('addProperty.mainImage')}</Label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setMainImageFile(e.target.files?.[0] || null)}
                        className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>{t('addProperty.gallery')}</Label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => setGalleryFiles(Array.from(e.target.files || []))}
                        className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                      />
                    </div>

                    {/* Previews */}
                    {(mainPreview || galleryPreviews.length > 0) && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {mainPreview && (
                          <div className="relative">
                            <img src={mainPreview} alt="Principal" className="w-28 h-20 object-cover rounded-lg border" />
                            <Badge className="absolute -top-2 -left-2 text-[10px]">Principal</Badge>
                            <button
                              type="button"
                              onClick={() => setMainImageFile(null)}
                              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        {galleryPreviews.map((url, idx) => (
                          <div key={idx} className="relative">
                            <img src={url} alt={`Foto ${idx + 1}`} className="w-20 h-20 object-cover rounded-lg border" />
                            <button
                              type="button"
                              onClick={() => setGalleryFiles(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* ===== Advertiser & Availability ===== */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <User className="w-5 h-5 text-primary" />
                    {t('addProperty.advertiserSection') || 'Anunciante'}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderField(COMMON_FIELDS.find(f => f.name === 'tipoAnunciante')!)}
                  </div>
                  
                  <div className="flex items-center gap-2 text-lg font-semibold mt-6">
                    <Clock className="w-5 h-5 text-primary" />
                    {t('addProperty.availabilitySection') || 'Disponibilidade para Visitas'}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderField(COMMON_FIELDS.find(f => f.name === 'disponibilidade')!)}
                    {renderField(COMMON_FIELDS.find(f => f.name === 'diasEspecificos')!)}
                  </div>
                </div>

                {/* ===== Validation Errors Summary ===== */}
                {validationErrors.length > 0 && (
                  <div className="flex items-start gap-2 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                    <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <div className="text-sm text-destructive">
                      <p className="font-medium">{t('addProperty.fillRequiredFields')}</p>
                      <ul className="list-disc list-inside mt-1">
                        {validationErrors.slice(0, 5).map(field => (
                          <li key={field}>{field}</li>
                        ))}
                        {validationErrors.length > 5 && (
                          <li>+{validationErrors.length - 5} mais...</li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}

                <Separator />

                {/* ===== Submit ===== */}
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                    {t('general.cancel')}
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 gap-2" 
                    disabled={uploading || !selectedCategory}
                  >
                    {uploading ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        {uploadProgress !== null ? `${uploadProgress}%` : t('addProperty.uploading')}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        {isEditMode ? (t('addProperty.update') || 'Actualizar') : t('addProperty.submit')}
                      </>
                    )}
                  </Button>
                </div>

                {uploadProgress !== null && (
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-2 bg-primary transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }} 
                    />
                  </div>
                )}
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
