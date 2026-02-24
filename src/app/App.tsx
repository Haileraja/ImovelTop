import { useState, useEffect } from 'react';
import { Property, PropertyType, User, NotificationType } from './types/property';
import api, { setToken, requestVisit, fetchVisitRequests, fetchMyFavorites, addFavorite, removeFavorite, fetchMyNotifications, markAllNotificationsRead, markNotificationRead } from './api';
import { Header } from './components/Header';
import { PropertyFilters } from './components/PropertyFilters';
import { PropertyCard } from './components/PropertyCard';
import { PropertyDetails } from './components/PropertyDetails';
import { LoginDialog } from './components/LoginDialog';
import { AddPropertyForm } from './components/AddPropertyForm';
import { AdminPanel } from './components/AdminPanel';
import { VendedorPage } from './components/VendedorPage';
import { ClientePage } from './components/ClientePage';
import { CompareDrawer } from './components/CompareDrawer';
import { PasswordResetDialog } from './components/PasswordResetDialog';
import { ThemeProvider } from './ThemeContext';
import { I18nProvider } from './i18n';
import { Toaster } from './components/ui/sonner';
import { Button } from './components/ui/button';
import { GitCompareArrows } from 'lucide-react';

function App() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [visitRequests, setVisitRequests] = useState<any[]>([]); // will hold server-provided info
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [currentView, setCurrentView] = useState<'home' | 'add-property' | 'admin' | 'vendedor' | 'cliente'>('home');

  // Favorites
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  // Compare
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);
  // Notifications
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  // Password reset
  const [passwordResetOpen, setPasswordResetOpen] = useState(false);

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

  // when admin logs in, fetch visit requests
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchVisitRequests()
        .then((data) => setVisitRequests(data || []))
        .catch((err) => console.error('failed to load visit requests', err));
      // fetch users for admin
      api.fetchUsers().then((data) => setUsers(data || [])).catch((err) => console.error('failed to load users', err));
    }
    // Load favorites and notifications for any logged-in user
    if (currentUser) {
      fetchMyFavorites().then((favs: Property[]) => {
        setFavoriteIds(new Set(favs.map(f => f.id)));
      }).catch(console.error);
      fetchMyNotifications().then((n: NotificationType[]) => setNotifications(n || [])).catch(console.error);
    } else {
      setFavoriteIds(new Set());
      setNotifications([]);
    }
  }, [currentUser]);

  const refreshVisitRequests = async () => {
    try {
      const data = await fetchVisitRequests();
      setVisitRequests(data || []);
    } catch (err) {
      console.error('failed to refresh visit requests', err);
    }
  };
  
  // Filtros
  const [tipo, setTipo] = useState<PropertyType | 'todos'>('todos');
  const [cidade, setCidade] = useState('');
  const [precoMax, setPrecoMax] = useState('');
  const [precoMin, setPrecoMin] = useState('');
  const [tipologia, setTipologia] = useState('todos');
  const [search, setSearch] = useState('');
  const [areaMin, setAreaMin] = useState('');
  const [areaMax, setAreaMax] = useState('');
  const [quartos, setQuartos] = useState('');
  const [garagem, setGaragem] = useState(false);
  const [piscina, setPiscina] = useState(false);
  const [jardim, setJardim] = useState(false);

  // Filtrar propriedades
  const filteredProperties = properties.filter(property => {
    if (tipo !== 'todos' && property.tipo !== tipo) return false;
    if (cidade && !property.cidade.toLowerCase().includes(cidade.toLowerCase())) return false;
    if (precoMax && property.preco > parseFloat(precoMax)) return false;
    if (precoMin && property.preco < parseFloat(precoMin)) return false;
    if (tipologia !== 'todos' && property.tipologia !== tipologia) return false;
    if (search && !property.titulo.toLowerCase().includes(search.toLowerCase()) && !property.descricao.toLowerCase().includes(search.toLowerCase()) && !property.localizacao.toLowerCase().includes(search.toLowerCase())) return false;
    if (areaMin && property.area < parseFloat(areaMin)) return false;
    if (areaMax && property.area > parseFloat(areaMax)) return false;
    if (quartos && property.quartos < parseInt(quartos)) return false;
    if (garagem && !property.garagem) return false;
    if (piscina && !property.piscina) return false;
    if (jardim && !property.jardim) return false;
    return true;
  });

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    // auto-navigate to role dashboard
    if (user.role === 'cliente') setCurrentView('cliente');
    else if (user.role === 'vendedor') setCurrentView('vendedor');
    else if (user.role === 'admin') setCurrentView('admin');
  };

  const handleRequestVisit = async (propertyId: string, payload: { preferred_date?: string; preferred_time?: string }) => {
    try {
      await requestVisit(propertyId, payload);
      // refresh visit requests when admin is viewing
      if (currentUser?.role === 'admin') {
        const data = await fetchVisitRequests();
        setVisitRequests(data || []);
      }
    } catch (err) {
      console.error('failed to request visit', err);
      throw err;
    }
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    setCurrentView('home');
  };

  const handleAddProperty = (propertyData: Omit<Property, 'id' | 'vendedorId' | 'vendedorNome' | 'createdAt'>) => {
    if (!currentUser) return;
    // if caller passed a full created property (server response), insert directly
    if ((propertyData as any).id) {
      setProperties([propertyData as unknown as Property, ...properties]);
      setCurrentView('home');
      return;
    }

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
    setPrecoMin('');
    setTipologia('todos');
    setSearch('');
    setAreaMin('');
    setAreaMax('');
    setQuartos('');
    setGaragem(false);
    setPiscina(false);
    setJardim(false);
  };

  const handleToggleFavorite = async (propertyId: string) => {
    if (!currentUser) return;
    const isFav = favoriteIds.has(propertyId);
    // Optimistic
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(propertyId); else next.add(propertyId);
      return next;
    });
    try {
      if (isFav) await removeFavorite(propertyId);
      else await addFavorite(propertyId);
    } catch (err) {
      // Revert
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFav) next.add(propertyId); else next.delete(propertyId);
        return next;
      });
    }
  };

  const handleToggleCompare = (propertyId: string) => {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(propertyId)) next.delete(propertyId);
      else if (next.size < 4) next.add(propertyId);
      return next;
    });
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (n: NotificationType) => {
    if (!n.read) {
      try {
        await markNotificationRead(n.id);
        setNotifications((prev) => prev.map((nn) => nn.id === n.id ? { ...nn, read: true } : nn));
      } catch (err) {
        console.error(err);
      }
    }
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
    <ThemeProvider>
    <I18nProvider>
    <div className="min-h-screen bg-background">
      <Header 
        currentUser={currentUser}
        onLogin={() => setLoginOpen(true)}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        currentView={currentView}
        notifications={notifications}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onNotificationClick={handleNotificationClick}
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
            precoMin={precoMin}
            onPrecoMinChange={setPrecoMin}
            tipologia={tipologia}
            onTipologiaChange={setTipologia}
            onClearFilters={handleClearFilters}
            search={search}
            onSearchChange={setSearch}
            areaMin={areaMin}
            onAreaMinChange={setAreaMin}
            areaMax={areaMax}
            onAreaMaxChange={setAreaMax}
            quartos={quartos}
            onQuartosChange={setQuartos}
            garagem={garagem}
            onGaragemChange={setGaragem}
            piscina={piscina}
            onPiscinaChange={setPiscina}
            jardim={jardim}
            onJardimChange={setJardim}
          />
          
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">
                {filteredProperties.length} {filteredProperties.length === 1 ? 'Imóvel Encontrado' : 'Imóveis Encontrados'}
              </h2>
              {compareIds.size > 0 && (
                <Button variant="outline" onClick={() => setCompareOpen(true)} className="gap-2">
                  <GitCompareArrows className="w-4 h-4" />
                  Comparar ({compareIds.size})
                </Button>
              )}
            </div>
            
            {filteredProperties.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProperties.map((property) => (
                  <PropertyCard 
                    key={property.id}
                    property={property}
                    onViewDetails={setSelectedProperty}
                    isFavorited={favoriteIds.has(property.id)}
                    onToggleFavorite={currentUser ? handleToggleFavorite : undefined}
                    isComparing={compareIds.has(property.id)}
                    onToggleCompare={handleToggleCompare}
                    showFavorite={!!currentUser}
                    showCompare={true}
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

          {/* Password reset link for non-logged users */}
          {!currentUser && (
            <div className="text-center mt-8">
              <button onClick={() => setPasswordResetOpen(true)} className="text-sm text-primary hover:underline">
                Esqueceu a senha?
              </button>
            </div>
          )}
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
          onLogout={handleLogout}
        />
      )}

      {currentView === 'cliente' && currentUser?.role === 'cliente' && (
        <ClientePage
          currentUser={currentUser}
          properties={properties}
          onViewDetails={setSelectedProperty}
          onLogout={handleLogout}
          onUserUpdate={(u) => setCurrentUser(u)}
        />
      )}
      
      {currentView === 'admin' && currentUser?.role === 'admin' && (
        <AdminPanel 
            properties={properties}
            visitRequests={visitRequests}
            users={users}
            onRefreshVisitRequests={refreshVisitRequests}
            onRefreshUsers={() => api.fetchUsers().then((data) => setUsers(data || [])).catch(console.error)}
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

      <PasswordResetDialog
        open={passwordResetOpen}
        onClose={() => setPasswordResetOpen(false)}
      />

      <CompareDrawer
        properties={properties.filter(p => compareIds.has(p.id))}
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        onRemove={(id) => {
          setCompareIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }}
      />
      
      <PropertyDetails 
        property={selectedProperty}
        open={!!selectedProperty}
        onClose={() => setSelectedProperty(null)}
        currentUser={currentUser}
        onRequestVisit={handleRequestVisit}
      />
      
      <Toaster />
    </div>
    </I18nProvider>
    </ThemeProvider>
  );
}

export default App;
