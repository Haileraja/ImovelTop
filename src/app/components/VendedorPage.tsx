import { Property, User } from '../types/property';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { PropertyCard } from './PropertyCard';

interface VendedorPageProps {
  currentUser: User;
  properties: Property[];
  onViewDetails: (p: Property) => void;
  onNavigate: (view: string) => void;
  onDelete: (id: string) => void;
}

export function VendedorPage({ currentUser, properties, onViewDetails, onNavigate, onDelete }: VendedorPageProps) {
  const myProps = properties.filter(p => p.vendedorId === currentUser.id);

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Painel do Vendedor</h2>
          <p className="text-sm text-muted-foreground">Gerencie seus anúncios e adicione novos imóveis.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => onNavigate('add-property')}>Adicionar Imóvel</Button>
        </div>
      </div>

      {myProps.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myProps.map(p => (
            <div key={p.id}>
              <PropertyCard property={p} onViewDetails={onViewDetails} />
              <div className="flex gap-2 mt-2">
                <Button variant="destructive" onClick={() => onDelete(p.id)}>Eliminar</Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Nenhum imóvel</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Você ainda não tem imóveis anunciados. Clique em "Adicionar Imóvel" para criar um anúncio.</p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
