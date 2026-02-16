import { Property } from '../types/property';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Settings, Trash2, Eye, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface AdminPanelProps {
  properties: Property[];
  onDelete: (id: string) => void;
  onViewProperty: (property: Property) => void;
  onBack: () => void;
}

export function AdminPanel({ properties, onDelete, onViewProperty, onBack }: AdminPanelProps) {
  const handleDelete = (id: string, titulo: string) => {
    if (confirm(`Tem certeza que deseja eliminar "${titulo}"?`)) {
      onDelete(id);
      toast.success('Imóvel eliminado com sucesso');
    }
  };

  const stats = {
    total: properties.length,
    venda: properties.filter(p => p.tipo === 'venda').length,
    arrendamento: properties.filter(p => p.tipo === 'arrendamento').length
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Painel de Administração
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Total de Imóveis</div>
              <div className="text-3xl font-bold mt-1">{stats.total}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Para Venda</div>
              <div className="text-3xl font-bold mt-1 text-primary">{stats.venda}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Para Arrendamento</div>
              <div className="text-3xl font-bold mt-1 text-secondary-foreground">{stats.arrendamento}</div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Gestão de Imóveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {properties.map((property) => (
                  <TableRow key={property.id}>
                    <TableCell className="font-medium">{property.titulo}</TableCell>
                    <TableCell>
                      <Badge variant={property.tipo === 'venda' ? 'default' : 'secondary'}>
                        {property.tipo === 'venda' ? 'Venda' : 'Arrendamento'}
                      </Badge>
                    </TableCell>
                    <TableCell>{property.localizacao}</TableCell>
                    <TableCell>
                      €{property.preco.toLocaleString('pt-PT')}
                      {property.tipo === 'arrendamento' && '/mês'}
                    </TableCell>
                    <TableCell>{property.vendedorNome}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => onViewProperty(property)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDelete(property.id, property.titulo)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
