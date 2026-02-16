import { useState, useEffect } from 'react';
import { Property, PropertyType, User } from './types/property';
import api, { setToken } from './api';
import { Header } from './components/Header';
import { PropertyFilters } from './components/PropertyFilters';
import { PropertyCard } from './components/PropertyCard';
import { PropertyDetails } from './components/PropertyDetails';
import { LoginDialog } from './components/LoginDialog';
import { AddPropertyForm } from './components/AddPropertyForm';
import { AdminPanel } from './components/AdminPanel';
import { VendedorPage } from './components/VendedorPage';
import { ClientePage } from './components/ClientePage';
import { Toaster } from './components/ui/sonner';

function App() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [currentView, setCurrentView] = useState<'home' | 'add-property' | 'admin'>('home');

  // load properties from backend
  useEffect(() => {
    api.fetchProperties()
      .then((data) => setProperties(data || []))
      .catch((err) => console.error('Failed to load properties', err));
  }, []);

  // restore logged user from token (calls /auth/me)
  useEffect(() => {
    const token = api.getToken();
    if (!token) return;
    api.getCurrentUser()
      .then((user) => setCurrentUser(user))
      .catch((err) => {
        console.warn('Token invalid or expired — clearing token', err);
        setToken(null);
      });
  }, []);
  
  // Filtros
  const [tipo, setTipo] = useState<PropertyType | 'todos'>('todos');
  const [cidade, setCidade] = useState('');
  const [precoMax, setPrecoMax] = useState('');
  const [tipologia, setTipologia] = useState('todos');

  // Filtrar propriedades
  const filteredProperties = properties.filter(property => {
    if (tipo !== 'todos' && property.tipo !== tipo) return false;
    if (cidade && !property.cidade.toLowerCase().includes(cidade.toLowerCase())) return false;
    if (precoMax && property.preco > parseFloat(precoMax)) return false;
    if (tipologia !== 'todos' && property.tipologia !== tipologia) return false;
    return true;
  });

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    setCurrentView('home');
  };

  const handleAddProperty = (propertyData: Omit<Property, 'id' | 'vendedorId' | 'vendedorNome' | 'createdAt'>) => {
    if (!currentUser) return;

    const tempId = `${Date.now()}`;
    const optimistic: Property = {
      ...propertyData,
      id: tempId,
      vendedorId: currentUser.id,
      vendedorNome: currentUser.nome,
      createdAt: new Date().toISOString().split('T')[0]
    };

    // optimistic UI update
    setProperties([optimistic, ...properties]);
    setCurrentView('home');

    // persist to backend (background). API will return canonical object (with server id)
    api.createProperty(propertyData).then((created: Property) => {
      setProperties((prev) => prev.map(p => p.id === tempId ? created : p));
    }).catch((err) => {
      console.error('Failed to persist property', err);
    });
  };

  const handleDeleteProperty = (id: string) => {
    // optimistic remove
    setProperties(properties.filter(p => p.id !== id));
    api.deleteProperty(id).catch(err => {
      console.error('Failed to delete property', err);
    });
  };

  const handleClearFilters = () => {
    setTipo('todos');
    setCidade('');
    setPrecoMax('');
    setTipologia('todos');
  };

  const handleNavigate = (view: string) => {
    if (view === 'home') {
      setCurrentView('home');
    } else if (view === 'add-property' && currentUser?.role === 'vendedor') {
      setCurrentView('add-property');
    } else if (view === 'vendedor' && currentUser?.role === 'vendedor') {
      setCurrentView('vendedor');
    } else if (view === 'cliente' && currentUser?.role === 'cliente') {
      setCurrentView('cliente');
    } else if (view === 'admin' && currentUser?.role === 'admin') {
      setCurrentView('admin');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        currentUser={currentUser}
        onLogin={() => setLoginOpen(true)}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        currentView={currentView}
      />
      
      {currentView === 'home' && (
        <main className="container mx-auto px-4 py-8">
          <PropertyFilters 
            tipo={tipo}
            onTipoChange={setTipo}
            cidade={cidade}
            onCidadeChange={setCidade}
            precoMax={precoMax}
            onPrecoMaxChange={setPrecoMax}
            tipologia={tipologia}
            onTipologiaChange={setTipologia}
            onClearFilters={handleClearFilters}
          />
          
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">
                {filteredProperties.length} {filteredProperties.length === 1 ? 'Imóvel Encontrado' : 'Imóveis Encontrados'}
              </h2>
            </div>
            
            {filteredProperties.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProperties.map((property) => (
                  <PropertyCard 
                    key={property.id}
                    property={property}
                    onViewDetails={setSelectedProperty}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-lg">
                  Nenhum imóvel encontrado com os filtros selecionados.
                </p>
                <button 
                  onClick={handleClearFilters}
                  className="mt-4 text-primary hover:underline"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        </main>
      )}
      
      {currentView === 'add-property' && currentUser?.role === 'vendedor' && (
        <AddPropertyForm 
          onAdd={handleAddProperty}
          onCancel={() => setCurrentView('home')}
          vendedorNome={currentUser.nome}
        />
      )}
      
      {currentView === 'vendedor' && currentUser?.role === 'vendedor' && (
        <VendedorPage
          currentUser={currentUser}
          properties={properties}
          onViewDetails={setSelectedProperty}
          onNavigate={setCurrentView}
          onDelete={handleDeleteProperty}
        />
      )}

      {currentView === 'cliente' && currentUser?.role === 'cliente' && (
        <ClientePage
          currentUser={currentUser}
          properties={properties}
          onViewDetails={setSelectedProperty}
        />
      )}
      
      {currentView === 'admin' && currentUser?.role === 'admin' && (
        <AdminPanel 
          properties={properties}
          onDelete={handleDeleteProperty}
          onViewProperty={setSelectedProperty}
          onBack={() => setCurrentView('home')}
        />
      )}
      
      <LoginDialog 
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLogin={handleLogin}
      />
      
      <PropertyDetails 
        property={selectedProperty}
        open={!!selectedProperty}
        onClose={() => setSelectedProperty(null)}
      />
      
      <Toaster />
    </div>
  );
}

export default App;
