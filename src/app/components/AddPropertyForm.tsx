import { useState, useEffect } from 'react';
import { Property, PropertyType } from '../types/property';
import { useI18n } from '../i18n';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { PlusCircle, ArrowLeft, X } from 'lucide-react';
import { toast } from 'sonner';
import api from '../api';
import { MOZAMBIQUE_LOCATIONS, getAllCities, getBairrosForCity, getAvenidasForBairro } from '../data/mozambiqueLocations';

interface AddPropertyFormProps {
  onAdd: (property: Omit<Property, 'id' | 'vendedorId' | 'vendedorNome' | 'createdAt'>) => void;
  onCancel: () => void;
  vendedorNome: string;
}

export function AddPropertyForm({ onAdd, onCancel, vendedorNome }: AddPropertyFormProps) {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    tipo: 'venda' as PropertyType,
    preco: '',
    localizacao: '',
    cidade: '',
    tipoImovel: '',
    tipologia: 'T2',
    area: '',
    imagem: '',
    quartos: '',
    casasBanho: '',
    garagem: false,
    garagemNumCarros: '',
    garagemFechada: false,
    arCondicionado: false,
    piscina: false,
    ginasio: false,
    escritorio: false,
    salaJogos: false,
    salaTV: false,
    jardim: false,
    areaLazer: false,
    mobilada: false,
    sistemaSeguranca: false,
    elevador: false,
    anoConstructao: '',
    certificadoEnergetico: 'B',
    provincia: '',
    bairro: '',
    avenida: '',
    caracteristicas: [] as string[],
    newCaracteristica: '',
    galeria: [] as string[],
    newImageUrl: ''
  });
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [mainPreview, setMainPreview] = useState<string | null>(null);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Cascading location helpers
  const availableCities = (() => {
    if (!formData.provincia) return getAllCities();
    const prov = MOZAMBIQUE_LOCATIONS.find(p => p.nome === formData.provincia);
    return prov ? prov.cidades.map(c => c.nome) : getAllCities();
  })();
  const availableBairros = getBairrosForCity(formData.cidade);
  const availableAvenidas = getAvenidasForBairro(formData.cidade, formData.bairro);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const mainImage = formData.imagem || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBob3VzZSUyMGV4dGVyaW9yfGVufDF8fHx8MTc3MTE4MjI5OXww&ixlib=rb-4.1.0&q=80&w=1080';
    // ensure gallery includes the main image (avoid duplicates)
    const gallery = [...formData.galeria];
    if (mainImage && !gallery.includes(mainImage)) {
      gallery.unshift(mainImage);
    }

    const property = {
      titulo: formData.titulo,
      descricao: formData.descricao,
      tipo: formData.tipo,
      preco: parseFloat(formData.preco),
      localizacao: formData.localizacao,
      cidade: formData.cidade,
      tipoImovel: formData.tipoImovel,
      tipologia: formData.tipologia,
      area: parseFloat(formData.area),
      imagem: mainImage,
      galeria: gallery.length > 0 ? gallery : [mainImage],
      quartos: parseInt(formData.quartos),
      casasBanho: parseInt(formData.casasBanho),
      garagem: formData.garagem,
      garagemNumCarros: parseInt(formData.garagemNumCarros || '0'),
      garagemFechada: formData.garagemFechada,
      arCondicionado: formData.arCondicionado,
      piscina: formData.piscina,
      ginasio: formData.ginasio,
      escritorio: formData.escritorio,
      salaJogos: formData.salaJogos,
      salaTV: formData.salaTV,
      jardim: formData.jardim,
      areaLazer: formData.areaLazer,
      mobilada: formData.mobilada,
      sistemaSeguranca: formData.sistemaSeguranca,
      elevador: formData.elevador,
      anoConstructao: parseInt(formData.anoConstructao),
      certificadoEnergetico: formData.certificadoEnergetico,
      caracteristicas: formData.caracteristicas
    };


    // if files present, upload using FormData (will also be triggered by visible Upload button)
    const hasFiles = !!mainImageFile || (galleryFiles && galleryFiles.length > 0);
    if (hasFiles) {
      // build FormData and delegate to upload handler
      const fd = createFormData(property);
      performUpload(fd, property);
      return;
    }

    // no files: fallback to existing flow
    onAdd(property);
    toast.success(t('addProperty.success'));
  };

  function createFormData(property: any) {
    const fd = new FormData();
    fd.append('titulo', property.titulo);
    fd.append('descricao', property.descricao);
    fd.append('tipo', property.tipo);
    fd.append('preco', String(property.preco));
    fd.append('localizacao', property.localizacao);
    fd.append('cidade', property.cidade);
    fd.append('tipoImovel', property.tipoImovel || '');
    fd.append('tipologia', property.tipologia);
    fd.append('area', String(property.area));
    fd.append('quartos', String(property.quartos));
    fd.append('casasBanho', String(property.casasBanho));
    fd.append('garagem', JSON.stringify(property.garagem));
    fd.append('garagemNumCarros', String(property.garagemNumCarros || 0));
    fd.append('garagemFechada', JSON.stringify(property.garagemFechada));
    fd.append('arCondicionado', JSON.stringify(property.arCondicionado));
    fd.append('piscina', JSON.stringify(property.piscina));
    fd.append('ginasio', JSON.stringify(property.ginasio));
    fd.append('escritorio', JSON.stringify(property.escritorio));
    fd.append('salaJogos', JSON.stringify(property.salaJogos));
    fd.append('salaTV', JSON.stringify(property.salaTV));
    fd.append('jardim', JSON.stringify(property.jardim));
    fd.append('areaLazer', JSON.stringify(property.areaLazer));
    fd.append('mobilada', JSON.stringify(property.mobilada));
    fd.append('sistemaSeguranca', JSON.stringify(property.sistemaSeguranca));
    fd.append('elevador', JSON.stringify(property.elevador));
    fd.append('anoConstructao', String(property.anoConstructao));
    fd.append('certificadoEnergetico', property.certificadoEnergetico || 'B');
    fd.append('caracteristicas', JSON.stringify(property.caracteristicas || []));
    if (formData.imagem) fd.append('imagem_url', formData.imagem);
    if (formData.galeria && formData.galeria.length > 0) fd.append('galeria_urls', JSON.stringify(formData.galeria));
    if (mainImageFile) fd.append('imagem_file', mainImageFile);
    galleryFiles.forEach((f) => fd.append('galeria_files', f));
    return fd;
  }

  async function performUpload(fd: FormData, property: any) {
    setUploading(true);
    setUploadProgress(0);
    try {
      // use XHR progress helper
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
      // clear selected files
      setMainImageFile(null);
      setGalleryFiles([]);
    }
  }

  const addCaracteristica = () => {
    if (formData.newCaracteristica.trim()) {
      setFormData({
        ...formData,
        caracteristicas: [...formData.caracteristicas, formData.newCaracteristica.trim()],
        newCaracteristica: ''
      });
    }
  };

  const removeCaracteristica = (index: number) => {
    setFormData({
      ...formData,
      caracteristicas: formData.caracteristicas.filter((_, i) => i !== index)
    });
  };

  const addImageToGallery = () => {
    if (formData.newImageUrl.trim()) {
      setFormData({
        ...formData,
        galeria: [...formData.galeria, formData.newImageUrl.trim()],
        newImageUrl: ''
      });
    }
  };

  const removeGalleryFile = (index: number) => {
    setGalleryFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeMainImageFile = () => {
    setMainImageFile(null);
  };

  // generate previews when files change; clean up object URLs
  useEffect(() => {
    // main image preview
    if (mainImageFile) {
      const url = URL.createObjectURL(mainImageFile);
      setMainPreview(url);
      return () => {
        URL.revokeObjectURL(url);
        setMainPreview(null);
      };
    } else {
      setMainPreview(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainImageFile]);

  useEffect(() => {
    const urls: string[] = galleryFiles.map(f => URL.createObjectURL(f));
    setGalleryPreviews(urls);
    return () => {
      urls.forEach(u => URL.revokeObjectURL(u));
      setGalleryPreviews([]);
    };
  }, [galleryFiles]);

  const removeImageFromGallery = (index: number) => {
    setFormData({
      ...formData,
      galeria: formData.galeria.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" onClick={onCancel} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('addProperty.back')}
      </Button>
      
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="w-6 h-6" />
            {t('addProperty.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tipo de Imóvel — obrigatório no início */}
            <div className="space-y-2">
              <Label htmlFor="tipoImovel">{t('addProperty.propertyCategory')}</Label>
              <Select value={formData.tipoImovel} onValueChange={(value) => setFormData({ ...formData, tipoImovel: value })}>
                <SelectTrigger className={!formData.tipoImovel ? 'text-muted-foreground' : ''}>
                  <SelectValue placeholder={t('addProperty.selectPropertyType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vivenda">{t('addProperty.categoryVivenda')}</SelectItem>
                  <SelectItem value="Flat">{t('addProperty.categoryFlat')}</SelectItem>
                  <SelectItem value="Escritório">{t('addProperty.categoryEscritorio')}</SelectItem>
                  <SelectItem value="Loja">{t('addProperty.categoryLoja')}</SelectItem>
                  <SelectItem value="Armazém">{t('addProperty.categoryArmazem')}</SelectItem>
                  <SelectItem value="Terreno">{t('addProperty.categoryTerreno')}</SelectItem>
                  <SelectItem value="Outro">{t('addProperty.categoryOutro')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="titulo">{t('addProperty.titleField')}</Label>
              <Input 
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder={t('addProperty.titlePlaceholder')}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="descricao">{t('addProperty.description')}</Label>
              <Textarea 
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder={t('addProperty.descriptionPlaceholder')}
                rows={4}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">{t('addProperty.type')}</Label>
                <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value as PropertyType })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="venda">{t('addProperty.sale')}</SelectItem>
                    <SelectItem value="arrendamento">{t('addProperty.rent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="preco">{t('addProperty.price')}</Label>
                <Input 
                  id="preco"
                  type="number"
                  value={formData.preco}
                  onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                  placeholder={t('addProperty.pricePlaceholder')}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="provincia">{t('addProperty.province')}</Label>
                <Select value={formData.provincia} onValueChange={(value) => setFormData({ ...formData, provincia: value, cidade: '', bairro: '', avenida: '', localizacao: '' })}>
                  <SelectTrigger className={!formData.provincia ? 'text-muted-foreground' : ''}>
                    <SelectValue placeholder={t('addProperty.selectProvince')} />
                  </SelectTrigger>
                  <SelectContent>
                    {MOZAMBIQUE_LOCATIONS.map(p => (
                      <SelectItem key={p.nome} value={p.nome}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cidade">{t('addProperty.city')}</Label>
                <Select value={formData.cidade} onValueChange={(value) => setFormData({ ...formData, cidade: value, bairro: '', avenida: '', localizacao: value })}>
                  <SelectTrigger className={!formData.cidade ? 'text-muted-foreground' : ''}>
                    <SelectValue placeholder={t('addProperty.cityPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCities.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bairro">{t('addProperty.bairro')}</Label>
                <Select value={formData.bairro} onValueChange={(value) => setFormData({ ...formData, bairro: value, avenida: '', localizacao: `${value}, ${formData.cidade}` })} disabled={!formData.cidade}>
                  <SelectTrigger className={!formData.bairro ? 'text-muted-foreground' : ''}>
                    <SelectValue placeholder={t('addProperty.selectBairro')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBairros.map(b => (
                      <SelectItem key={b.nome} value={b.nome}>{b.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {availableAvenidas.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="avenida">{t('addProperty.avenue')}</Label>
                  <Select value={formData.avenida} onValueChange={(value) => setFormData({ ...formData, avenida: value, localizacao: `${value}, ${formData.bairro}, ${formData.cidade}` })}>
                    <SelectTrigger className={!formData.avenida ? 'text-muted-foreground' : ''}>
                      <SelectValue placeholder={t('addProperty.selectAvenue')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAvenidas.map(a => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipologia">{t('addProperty.typology')}</Label>
                <Select value={formData.tipologia} onValueChange={(value) => setFormData({ ...formData, tipologia: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="T1">T1</SelectItem>
                    <SelectItem value="T2">T2</SelectItem>
                    <SelectItem value="T3">T3</SelectItem>
                    <SelectItem value="T4">T4</SelectItem>
                    <SelectItem value="T5">T5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="area">{t('addProperty.area')}</Label>
                <Input 
                  id="area"
                  type="number"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  placeholder={t('addProperty.areaPlaceholder')}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="quartos">{t('addProperty.salas')}</Label>
                <Input 
                  id="quartos"
                  type="number"
                  value={formData.quartos}
                  onChange={(e) => setFormData({ ...formData, quartos: e.target.value })}
                  placeholder={t('addProperty.salasPlaceholder')}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="casasBanho">{t('addProperty.bathrooms')}</Label>
                <Input 
                  id="casasBanho"
                  type="number"
                  value={formData.casasBanho}
                  onChange={(e) => setFormData({ ...formData, casasBanho: e.target.value })}
                  placeholder={t('addProperty.bathroomsPlaceholder')}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="anoConstructao">{t('addProperty.yearBuilt')}</Label>
                <Input 
                  id="anoConstructao"
                  type="number"
                  value={formData.anoConstructao}
                  onChange={(e) => setFormData({ ...formData, anoConstructao: e.target.value })}
                  placeholder={t('addProperty.yearBuiltPlaceholder')}
                />
              </div>

            </div>
            
            <div className="space-y-2">
              <Label>{t('addProperty.mainImage')}</Label>
              <input type="file" accept="image/*" onChange={(e) => setMainImageFile(e.target.files?.[0] || null)} className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer" />
            </div>
            
            {/* Galeria de Imagens */}
            <div className="space-y-2">
              <Label>{t('addProperty.gallery')}</Label>
              <input type="file" accept="image/*" multiple onChange={(e) => setGalleryFiles(Array.from(e.target.files || []))} className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer" />

                {/* Previews for selected gallery files and main image */}
                <div className="flex gap-2 mt-3">
                  {mainPreview ? (
                    <div className="relative">
                      <img src={mainPreview} alt={t('addProperty.previewMain')} className="w-28 h-20 object-cover rounded border" />
                      <button type="button" onClick={removeMainImageFile} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : null}

                  {galleryPreviews.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img src={url} alt={t('addProperty.preview', { index: String(idx + 1) })} className="w-20 h-20 object-cover rounded border" />
                      <button
                        type="button"
                        onClick={() => removeGalleryFile(idx)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
            </div>
            
            {/* Características */}
            <div className="space-y-2">
              <Label>{t('addProperty.characteristics')}</Label>
              <div className="flex gap-2">
                <Input 
                  value={formData.newCaracteristica}
                  onChange={(e) => setFormData({ ...formData, newCaracteristica: e.target.value })}
                  placeholder={t('addProperty.characteristicsPlaceholder')}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCaracteristica();
                    }
                  }}
                />
                <Button type="button" onClick={addCaracteristica}>
                  <PlusCircle className="w-4 h-4" />
                </Button>
              </div>
              {formData.caracteristicas.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.caracteristicas.map((caract, index) => (
                    <div key={index} className="flex items-center gap-1 bg-muted px-3 py-1 rounded-full">
                      <span className="text-sm">{caract}</span>
                      <button
                        type="button"
                        onClick={() => removeCaracteristica(index)}
                        className="hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Características Estáticas do Imóvel */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">{t('addProperty.staticFeatures')}</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label htmlFor="garagem">{t('addProperty.garage')}</Label>
                  <Switch id="garagem" checked={formData.garagem} onCheckedChange={(checked) => setFormData({ ...formData, garagem: checked, garagemNumCarros: checked ? formData.garagemNumCarros : '', garagemFechada: checked ? formData.garagemFechada : false })} />
                </div>
                {formData.garagem && (
                  <>
                    <div className="space-y-1 p-3 border rounded-lg">
                      <Label htmlFor="garagemNumCarros">{t('addProperty.garageCars')}</Label>
                      <Input id="garagemNumCarros" type="number" min="0" value={formData.garagemNumCarros} onChange={(e) => setFormData({ ...formData, garagemNumCarros: e.target.value })} placeholder="Ex: 2" />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <Label htmlFor="garagemFechada">{t('addProperty.garageClosed')}</Label>
                      <Switch id="garagemFechada" checked={formData.garagemFechada} onCheckedChange={(checked) => setFormData({ ...formData, garagemFechada: checked })} />
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label htmlFor="arCondicionado">{t('addProperty.airConditioning')}</Label>
                  <Switch id="arCondicionado" checked={formData.arCondicionado} onCheckedChange={(checked) => setFormData({ ...formData, arCondicionado: checked })} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label htmlFor="piscina">{t('addProperty.pool')}</Label>
                  <Switch id="piscina" checked={formData.piscina} onCheckedChange={(checked) => setFormData({ ...formData, piscina: checked })} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label htmlFor="ginasio">{t('addProperty.gym')}</Label>
                  <Switch id="ginasio" checked={formData.ginasio} onCheckedChange={(checked) => setFormData({ ...formData, ginasio: checked })} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label htmlFor="escritorio">{t('addProperty.office')}</Label>
                  <Switch id="escritorio" checked={formData.escritorio} onCheckedChange={(checked) => setFormData({ ...formData, escritorio: checked })} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label htmlFor="salaJogos">{t('addProperty.gameRoom')}</Label>
                  <Switch id="salaJogos" checked={formData.salaJogos} onCheckedChange={(checked) => setFormData({ ...formData, salaJogos: checked })} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label htmlFor="salaTV">{t('addProperty.tvRoom')}</Label>
                  <Switch id="salaTV" checked={formData.salaTV} onCheckedChange={(checked) => setFormData({ ...formData, salaTV: checked })} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label htmlFor="jardim">{t('addProperty.gardenField')}</Label>
                  <Switch id="jardim" checked={formData.jardim} onCheckedChange={(checked) => setFormData({ ...formData, jardim: checked })} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label htmlFor="areaLazer">{t('addProperty.leisureArea')}</Label>
                  <Switch id="areaLazer" checked={formData.areaLazer} onCheckedChange={(checked) => setFormData({ ...formData, areaLazer: checked })} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label htmlFor="mobilada">{t('addProperty.furnished')}</Label>
                  <Switch id="mobilada" checked={formData.mobilada} onCheckedChange={(checked) => setFormData({ ...formData, mobilada: checked })} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label htmlFor="sistemaSeguranca">{t('addProperty.securitySystem')}</Label>
                  <Switch id="sistemaSeguranca" checked={formData.sistemaSeguranca} onCheckedChange={(checked) => setFormData({ ...formData, sistemaSeguranca: checked })} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label htmlFor="elevador">{t('addProperty.elevator')}</Label>
                  <Switch id="elevador" checked={formData.elevador} onCheckedChange={(checked) => setFormData({ ...formData, elevador: checked })} />
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                {t('general.cancel')}
              </Button>
              {/* visible upload button when files are selected, otherwise submit behaves as before */}
              { (mainImageFile || (galleryFiles && galleryFiles.length > 0)) ? (
                <Button type="button" className="flex-1" onClick={() => {
                  const mainImage = formData.imagem || '';
                  const gallery = [...formData.galeria];
                  if (mainImage && !gallery.includes(mainImage)) gallery.unshift(mainImage);
                  const property = {
                    titulo: formData.titulo,
                    descricao: formData.descricao,
                    tipo: formData.tipo,
                    preco: parseFloat(formData.preco || '0'),
                    localizacao: formData.localizacao,
                    cidade: formData.cidade,
                    tipoImovel: formData.tipoImovel,
                    tipologia: formData.tipologia,
                    area: parseFloat(formData.area || '0'),
                    imagem: mainImage,
                    galeria: gallery,
                    quartos: parseInt(formData.quartos || '0'),
                    casasBanho: parseInt(formData.casasBanho || '0'),
                    garagem: formData.garagem,
                    garagemNumCarros: parseInt(formData.garagemNumCarros || '0'),
                    garagemFechada: formData.garagemFechada,
                    arCondicionado: formData.arCondicionado,
                    piscina: formData.piscina,
                    ginasio: formData.ginasio,
                    escritorio: formData.escritorio,
                    salaJogos: formData.salaJogos,
                    salaTV: formData.salaTV,
                    jardim: formData.jardim,
                    areaLazer: formData.areaLazer,
                    mobilada: formData.mobilada,
                    sistemaSeguranca: formData.sistemaSeguranca,
                    elevador: formData.elevador,
                    anoConstructao: parseInt(formData.anoConstructao || '0'),
                    certificadoEnergetico: formData.certificadoEnergetico,
                    caracteristicas: formData.caracteristicas
                  };
                  const fd = createFormData(property);
                  performUpload(fd, property);
                }} disabled={uploading}>
                  {uploading ? t('addProperty.uploadingProgress', { progress: String(uploadProgress || 0) }) : t('addProperty.sendAndAdd')}
                </Button>
              ) : (
                <Button type="submit" className="flex-1">
                  {t('addProperty.submit')}
                </Button>
              )}
            </div>
            {uploadProgress !== null && (
              <div className="mt-3">
                <div className="w-full bg-muted h-2 rounded overflow-hidden">
                  <div className="h-2 bg-primary" style={{ width: `${uploadProgress}%` }} />
                </div>
                <div className="text-sm mt-1">{t('addProperty.progress', { percent: String(uploadProgress) })}</div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
