import { useState, useEffect } from 'react';
import { Property, PropertyType } from '../types/property';
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

interface AddPropertyFormProps {
  onAdd: (property: Omit<Property, 'id' | 'vendedorId' | 'vendedorNome' | 'createdAt'>) => void;
  onCancel: () => void;
  vendedorNome: string;
}

export function AddPropertyForm({ onAdd, onCancel, vendedorNome }: AddPropertyFormProps) {
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    tipo: 'venda' as PropertyType,
    preco: '',
    localizacao: '',
    cidade: '',
    tipologia: 'T2',
    area: '',
    imagem: '',
    quartos: '',
    casasBanho: '',
    garagem: false,
    piscina: false,
    jardim: false,
    anoConstructao: '',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo || !formData.descricao || !formData.preco || !formData.localizacao || !formData.cidade || !formData.area || !formData.quartos || !formData.casasBanho || !formData.anoConstructao) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

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
      tipologia: formData.tipologia,
      area: parseFloat(formData.area),
      imagem: mainImage,
      galeria: gallery.length > 0 ? gallery : [mainImage],
      quartos: parseInt(formData.quartos),
      casasBanho: parseInt(formData.casasBanho),
      garagem: formData.garagem,
      piscina: formData.piscina,
      jardim: formData.jardim,
      anoConstructao: parseInt(formData.anoConstructao),
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
    toast.success('Imóvel adicionado com sucesso!');
  };

  function createFormData(property: any) {
    const fd = new FormData();
    fd.append('titulo', property.titulo);
    fd.append('descricao', property.descricao);
    fd.append('tipo', property.tipo);
    fd.append('preco', String(property.preco));
    fd.append('localizacao', property.localizacao);
    fd.append('cidade', property.cidade);
    fd.append('tipologia', property.tipologia);
    fd.append('area', String(property.area));
    fd.append('quartos', String(property.quartos));
    fd.append('casasBanho', String(property.casasBanho));
    fd.append('garagem', JSON.stringify(property.garagem));
    fd.append('piscina', JSON.stringify(property.piscina));
    fd.append('jardim', JSON.stringify(property.jardim));
    fd.append('anoConstructao', String(property.anoConstructao));
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
        toast.success('Imóvel adicionado com sucesso!');
      } else {
        toast.error('Falha ao adicionar imóvel');
      }
    } catch (err) {
      console.error(err);
      toast.error('Falha ao adicionar imóvel');
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
        Voltar
      </Button>
      
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="w-6 h-6" />
            Adicionar Novo Imóvel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input 
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ex: Moradia Moderna T4"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição *</Label>
              <Textarea 
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descreva o imóvel..."
                rows={4}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value as PropertyType })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="venda">Venda</SelectItem>
                    <SelectItem value="arrendamento">Arrendamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="preco">Preço (MT) *</Label>
                <Input 
                  id="preco"
                  type="number"
                  value={formData.preco}
                  onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                  placeholder="Ex: 450000"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="localizacao">Localização *</Label>
                <Input 
                  id="localizacao"
                  value={formData.localizacao}
                  onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                  placeholder="Ex: Polana Cimento"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade *</Label>
                <Input 
                  id="cidade"
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  placeholder="Ex: Maputo"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipologia">Tipologia *</Label>
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
                <Label htmlFor="area">Área (m²) *</Label>
                <Input 
                  id="area"
                  type="number"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  placeholder="Ex: 250"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="quartos">Quartos *</Label>
                <Input 
                  id="quartos"
                  type="number"
                  value={formData.quartos}
                  onChange={(e) => setFormData({ ...formData, quartos: e.target.value })}
                  placeholder="Ex: 4"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="casasBanho">Casas de Banho *</Label>
                <Input 
                  id="casasBanho"
                  type="number"
                  value={formData.casasBanho}
                  onChange={(e) => setFormData({ ...formData, casasBanho: e.target.value })}
                  placeholder="Ex: 3"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="anoConstructao">Ano de Construção *</Label>
                <Input 
                  id="anoConstructao"
                  type="number"
                  value={formData.anoConstructao}
                  onChange={(e) => setFormData({ ...formData, anoConstructao: e.target.value })}
                  placeholder="Ex: 2022"
                />
              </div>
              

            </div>
            
            <div className="space-y-2">
              <Label htmlFor="imagem">URL da Imagem Principal</Label>
              <Input 
                id="imagem"
                value={formData.imagem}
                onChange={(e) => setFormData({ ...formData, imagem: e.target.value })}
                placeholder="Opcional - URL da imagem principal"
              />
                <div className="text-sm text-muted-foreground mt-1">ou faça upload</div>
                <input type="file" accept="image/*" onChange={(e) => setMainImageFile(e.target.files?.[0] || null)} />
            </div>
            
            {/* Galeria de Imagens */}
            <div className="space-y-2">
              <Label>Galeria de Imagens</Label>
              <div className="flex gap-2">
                <Input 
                  value={formData.newImageUrl}
                  onChange={(e) => setFormData({ ...formData, newImageUrl: e.target.value })}
                  placeholder="URL da imagem"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addImageToGallery();
                    }
                  }}
                />
                <Button type="button" onClick={addImageToGallery}>
                  <PlusCircle className="w-4 h-4" />
                </Button>
              </div>
                <div className="text-sm text-muted-foreground mt-1">ou fazer upload múltiplo</div>
                <input type="file" accept="image/*" multiple onChange={(e) => setGalleryFiles(Array.from(e.target.files || []))} />

                {/* Previews for selected gallery files and main image */}
                <div className="flex gap-2 mt-3">
                  {mainPreview ? (
                    <div className="relative">
                      <img src={mainPreview} alt="Preview principal" className="w-28 h-20 object-cover rounded border" />
                      <button type="button" onClick={removeMainImageFile} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : null}

                  {galleryPreviews.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img src={url} alt={`Preview ${idx + 1}`} className="w-20 h-20 object-cover rounded border" />
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
              {formData.galeria.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.galeria.map((url, index) => (
                    <div key={index} className="relative group">
                      <img src={url} alt={`Galeria ${index + 1}`} className="w-20 h-20 object-cover rounded border" />
                      <button
                        type="button"
                        onClick={() => removeImageFromGallery(index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Características */}
            <div className="space-y-2">
              <Label>Características</Label>
              <div className="flex gap-2">
                <Input 
                  value={formData.newCaracteristica}
                  onChange={(e) => setFormData({ ...formData, newCaracteristica: e.target.value })}
                  placeholder="Ex: Ar Condicionado"
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
            
            {/* Switches */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label htmlFor="garagem">Garagem</Label>
                </div>
                <Switch 
                  id="garagem"
                  checked={formData.garagem}
                  onCheckedChange={(checked) => setFormData({ ...formData, garagem: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label htmlFor="piscina">Piscina</Label>
                </div>
                <Switch 
                  id="piscina"
                  checked={formData.piscina}
                  onCheckedChange={(checked) => setFormData({ ...formData, piscina: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label htmlFor="jardim">Jardim</Label>
                </div>
                <Switch 
                  id="jardim"
                  checked={formData.jardim}
                  onCheckedChange={(checked) => setFormData({ ...formData, jardim: checked })}
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                Cancelar
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
                    tipologia: formData.tipologia,
                    area: parseFloat(formData.area || '0'),
                    imagem: mainImage,
                    galeria: gallery,
                    quartos: parseInt(formData.quartos || '0'),
                    casasBanho: parseInt(formData.casasBanho || '0'),
                    garagem: formData.garagem,
                    piscina: formData.piscina,
                    jardim: formData.jardim,
                    anoConstructao: parseInt(formData.anoConstructao || '0'),
                    caracteristicas: formData.caracteristicas
                  };
                  const fd = createFormData(property);
                  performUpload(fd, property);
                }} disabled={uploading}>
                  {uploading ? `Enviando (${uploadProgress || 0}%)` : 'Enviar e Adicionar'}
                </Button>
              ) : (
                <Button type="submit" className="flex-1">
                  Adicionar Imóvel
                </Button>
              )}
            </div>
            {uploadProgress !== null && (
              <div className="mt-3">
                <div className="w-full bg-muted h-2 rounded overflow-hidden">
                  <div className="h-2 bg-primary" style={{ width: `${uploadProgress}%` }} />
                </div>
                <div className="text-sm mt-1">Progresso: {uploadProgress}%</div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
