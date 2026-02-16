import { Property, User } from '../types/property';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

interface ClientePageProps {
  currentUser: User;
  properties: Property[];
  onViewDetails: (p: Property) => void;
}

export function ClientePage({ currentUser, properties, onViewDetails }: ClientePageProps) {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Bem‑vindo, {currentUser.nome}</h2>
          <p className="text-sm text-muted-foreground">Explore imóveis recomendados e salve seus favoritos.</p>
        </div>
        <div>
          <Button onClick={() => window.scrollTo({ top: 400, behavior: 'smooth' })}>Explorar Imóveis</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Imóveis Recomendados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.slice(0, 6).map((p) => (
              <div key={p.id} onClick={() => onViewDetails(p)} className="cursor-pointer">
                <div className="mb-2">
                  <img src={p.imagem} alt={p.titulo} className="w-full h-40 object-cover rounded" />
                </div>
                <div className="font-semibold">{p.titulo}</div>
                <div className="text-sm text-muted-foreground">€{p.preco.toLocaleString('pt-PT')}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
