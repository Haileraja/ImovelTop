import { useState, useEffect } from 'react';
import { Property, PropertyType, User, NotificationType } from './types/property';
import api, { setToken, requestVisit, fetchVisitRequests, fetchMyFavorites, addFavorite, removeFavorite, fetchMyNotifications, markAllNotificationsRead, markNotificationRead } from './api';
import { Header } from './components/Header';
import { PropertyFilters } from './components/PropertyFilters';
import { PropertyCard } from './components/PropertyCard';
import { PropertyDetails } from './components/PropertyDetails';
import { LoginDialog } from './components/LoginDialog';
import { AddPropertyForm } from './components/AddPropertyFormNew';
import { AdminPanel } from './components/AdminPanel';
import { VendedorPage } from './components/VendedorPage';
import { ClientePage } from './components/ClientePage';
import { CompareDrawer } from './components/CompareDrawer';
import { PasswordResetDialog } from './components/PasswordResetDialog';
import { ThemeProvider } from './ThemeContext';
import { I18nProvider, useI18n } from './i18n';
import { Toaster } from './components/ui/sonner';
import { Button } from './components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './components/ui/sheet';
import { GitCompareArrows, Search, MapPin, Building2, TrendingUp, Shield, ArrowRight, Heart, User as UserIcon } from 'lucide-react';

function App() {
  return (
    <ThemeProvider>
    <I18nProvider>
      <AppInner />
    </I18nProvider>
    </ThemeProvider>
  );
}

function AppInner() {
  const { t } = useI18n();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
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
  // Editing property
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  // Account drawer (for clients to access profile, visits, etc. from main page)
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  // Vendor drawer (for vendors to access properties, visits, stats from main page)
  const [vendorDrawerOpen, setVendorDrawerOpen] = useState(false);
  // Notifications
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  // Password reset
  const [passwordResetOpen, setPasswordResetOpen] = useState(false);

  // Filtros (must be declared before useEffects that reference them)
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

  // load properties from backend — initial load + debounced reload on filter change
  useEffect(() => {
    setLoadingProperties(true);
    api.fetchProperties()
      .then((data) => setProperties(data || []))
      .catch((err) => console.error('Failed to load properties', err))
      .finally(() => setLoadingProperties(false));
  }, []);

  // server-side filtering (debounced)
  useEffect(() => {
    // skip the initial render (handled above)
    const hasAnyFilter = tipo !== 'todos' || cidade || precoMin || precoMax || tipologia !== 'todos' || search || areaMin || areaMax || quartos || garagem || piscina || jardim;
    if (!hasAnyFilter) return;

    const timer = setTimeout(() => {
      const params: Record<string, any> = {};
      if (tipo !== 'todos') params.tipo = tipo;
      if (cidade) params.cidade = cidade;
      if (precoMin) params.preco_min = precoMin;
      if (precoMax) params.preco_max = precoMax;
      if (tipologia !== 'todos') params.tipologia = tipologia;
      if (search) params.search = search;
      if (areaMin) params.area_min = areaMin;
      if (areaMax) params.area_max = areaMax;
      if (quartos) params.quartos_min = quartos;
      if (garagem) params.garagem = true;
      if (piscina) params.piscina = true;
      if (jardim) params.jardim = true;

      api.fetchProperties(params)
        .then((data) => setProperties(data || []))
        .catch((err) => console.error('Failed to load filtered properties', err));
    }, 400);

    return () => clearTimeout(timer);
  }, [tipo, cidade, precoMin, precoMax, tipologia, search, areaMin, areaMax, quartos, garagem, piscina, jardim]);

  // reload all when filters are cleared
  const reloadAllProperties = () => {
    api.fetchProperties()
      .then((data) => setProperties(data || []))
      .catch((err) => console.error('Failed to reload properties', err));
  };

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

      // Request push notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } else {
      setFavoriteIds(new Set());
      setNotifications([]);
    }
  }, [currentUser]);

  // Poll notifications every 30s and show browser push for new ones
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(async () => {
      try {
        const fresh: NotificationType[] = await fetchMyNotifications();
        if (fresh && fresh.length > notifications.length) {
          const newOnes = fresh.filter(n => !n.read);
          if (newOnes.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
            const latest = newOnes[0];
            new Notification(latest.title, { body: latest.message, icon: '/favicon.ico' });
          }
        }
        setNotifications(fresh || []);
      } catch { /* silent */ }
    }, 30000);
    return () => clearInterval(interval);
  }, [currentUser, notifications.length]);

  const refreshVisitRequests = async () => {
    try {
      const data = await fetchVisitRequests();
      setVisitRequests(data || []);
    } catch (err) {
      console.error('failed to refresh visit requests', err);
    }
  };
  
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
    // clients and vendors stay on home (account features accessible via drawer)
    // only admins go to their dashboard
    if (user.role === 'admin') setCurrentView('admin');
    // cliente and vendedor stay on 'home'
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

  const handleUpdateProperty = async (propertyId: string, data: Record<string, any>) => {
    try {
      const updated = await api.updateProperty(propertyId, data);
      if (updated) {
        setProperties((prev) => prev.map(p => p.id === propertyId ? { ...p, ...updated } : p));
      }
      setEditingProperty(null);
      setCurrentView('vendedor');
    } catch (err) {
      console.error('Failed to update property', err);
      throw err;
    }
  };

  const handleEditProperty = (property: Property) => {
    setEditingProperty(property);
    setCurrentView('add-property');
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
    reloadAllProperties();
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
    if (!currentUser) {
      setLoginOpen(true);
      return;
    }
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
    } else if (view === 'add-property' && (currentUser?.role === 'vendedor' || currentUser?.role === 'admin')) {
      setCurrentView('add-property');
    } else if (view === 'vendedor' && (currentUser?.role === 'vendedor' || currentUser?.role === 'admin')) {
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
        notifications={notifications}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onNotificationClick={handleNotificationClick}
        onOpenAccountDrawer={() => setAccountDrawerOpen(true)}
        onOpenVendorDrawer={() => setVendorDrawerOpen(true)}
      />
      
      {currentView === 'home' && (
        <>
          {/* Hero Section */}
          <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(15,118,110,0.15),transparent)]" />
            <div className="container mx-auto px-4 py-16 md:py-24 relative">
              <div className="max-w-3xl mx-auto text-center space-y-6">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium">
                  <Building2 className="w-4 h-4" />
                  {t('hero.badge')}
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
                  {t('hero.titleStart')}{' '}
                  <span className="bg-gradient-to-r from-primary to-teal-500 bg-clip-text text-transparent">{t('hero.titleHighlight')}</span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                  {t('hero.subtitle')}
                </p>

                {/* Quick stats */}
                <div className="flex items-center justify-center gap-8 pt-4">
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold text-primary">{properties.length}+</div>
                    <div className="text-xs text-muted-foreground">{t('hero.properties')}</div>
                  </div>
                  <div className="w-px h-10 bg-border" />
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold text-primary">
                      {new Set(properties.map(p => p.cidade)).size}+
                    </div>
                    <div className="text-xs text-muted-foreground">{t('hero.cities')}</div>
                  </div>
                  <div className="w-px h-10 bg-border" />
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold text-primary">24/7</div>
                    <div className="text-xs text-muted-foreground">{t('hero.available')}</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

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
                  {loadingProperties ? t('property.loading') : `${filteredProperties.length} ${filteredProperties.length === 1 ? t('property.found') : t('property.foundPlural')}`}
                </h2>
                {currentUser && compareIds.size > 0 && (
                  <Button variant="outline" onClick={() => setCompareOpen(true)} className="gap-2">
                    <GitCompareArrows className="w-4 h-4" />
                    {t('compare.button')} ({compareIds.size})
                  </Button>
                )}
              </div>
              
              {loadingProperties ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="rounded-xl border bg-card overflow-hidden animate-pulse">
                      <div className="aspect-[4/3] bg-muted" />
                      <div className="p-4 space-y-3">
                        <div className="h-5 bg-muted rounded w-3/4" />
                        <div className="h-4 bg-muted rounded w-1/2" />
                        <div className="h-4 bg-muted rounded w-full" />
                        <div className="h-8 bg-muted rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredProperties.length > 0 ? (
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
                      showCompare={!!currentUser}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-lg">
                    {t('property.noResults')}
                  </p>
                  <Button variant="outline" onClick={handleClearFilters}>
                    {t('property.clearFilters')}
                  </Button>
                </div>
              )}
            </div>

            {/* Features section - shown only when not filtering */}
            {!search && tipo === 'todos' && !cidade && (
              <section className="mt-20 mb-8">
                <div className="text-center mb-10">
                  <h2 className="text-2xl md:text-3xl font-bold mb-3">{t('features.title')}</h2>
                  <p className="text-muted-foreground max-w-lg mx-auto">{t('features.subtitle')}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 rounded-2xl bg-card border hover:shadow-md transition-shadow space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
                      <Search className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">{t('features.searchTitle')}</h3>
                    <p className="text-sm text-muted-foreground">{t('features.searchDesc')}</p>
                  </div>
                  <div className="text-center p-6 rounded-2xl bg-card border hover:shadow-md transition-shadow space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">{t('features.trustTitle')}</h3>
                    <p className="text-sm text-muted-foreground">{t('features.trustDesc')}</p>
                  </div>
                  <div className="text-center p-6 rounded-2xl bg-card border hover:shadow-md transition-shadow space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">{t('features.scheduleTitle')}</h3>
                    <p className="text-sm text-muted-foreground">{t('features.scheduleDesc')}</p>
                  </div>
                </div>
              </section>
            )}
          </main>

          {/* Footer */}
          <footer className="border-t bg-card mt-8">
            <div className="container mx-auto px-4 py-10">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <span className="font-bold text-lg">ImovelTop</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{t('footer.description')}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 text-sm">{t('footer.properties')}</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="hover:text-foreground cursor-pointer transition-colors">{t('footer.sale')}</li>
                    <li className="hover:text-foreground cursor-pointer transition-colors">{t('footer.rent')}</li>
                    <li className="hover:text-foreground cursor-pointer transition-colors">{t('footer.land')}</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 text-sm">{t('footer.cities')}</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="hover:text-foreground cursor-pointer transition-colors">Maputo</li>
                    <li className="hover:text-foreground cursor-pointer transition-colors">Matola</li>
                    <li className="hover:text-foreground cursor-pointer transition-colors">Beira</li>
                    <li className="hover:text-foreground cursor-pointer transition-colors">Nampula</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 text-sm">{t('footer.contact')}</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>info@imoveltop.co.mz</li>
                    <li>+258 84 000 0000</li>
                    <li>Maputo, Moçambique</li>
                  </ul>
                </div>
              </div>
              <div className="border-t mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} ImovelTop. {t('footer.rights')}</p>
                <div className="flex gap-6">
                  <span className="hover:text-foreground cursor-pointer transition-colors">{t('footer.terms')}</span>
                  <span className="hover:text-foreground cursor-pointer transition-colors">{t('footer.privacy')}</span>
                </div>
              </div>
            </div>
          </footer>
        </>
      )}
      
      {currentView === 'add-property' && (currentUser?.role === 'vendedor' || currentUser?.role === 'admin') && (
        <AddPropertyForm 
          onAdd={handleAddProperty}
          onUpdate={handleUpdateProperty}
          onCancel={() => {
            setEditingProperty(null);
            setCurrentView(currentUser?.role === 'vendedor' ? 'vendedor' : 'home');
          }}
          vendedorNome={currentUser.nome}
          editingProperty={editingProperty}
        />
      )}
      
      {currentView === 'vendedor' && (currentUser?.role === 'vendedor' || currentUser?.role === 'admin') && (
        <VendedorPage
          currentUser={currentUser}
          properties={properties}
          onViewDetails={setSelectedProperty}
          onNavigate={handleNavigate}
          onDelete={handleDeleteProperty}
          onEdit={handleEditProperty}
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
          compareIds={compareIds}
          onToggleCompare={handleToggleCompare}
          onOpenCompare={() => setCompareOpen(true)}
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
            onNavigate={handleNavigate}
          />
      )}
      
      <LoginDialog 
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLogin={handleLogin}
        onForgotPassword={() => setPasswordResetOpen(true)}
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
        isFavorited={selectedProperty ? favoriteIds.has(selectedProperty.id) : false}
        onToggleFavorite={currentUser ? handleToggleFavorite : undefined}
      />
      
      {/* Account Drawer for clients - accessible from main page */}
      <Sheet open={accountDrawerOpen} onOpenChange={setAccountDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl overflow-y-auto p-0">
          <SheetHeader className="p-4 border-b sticky top-0 bg-background z-10">
            <SheetTitle className="flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              {t('header.myAccount')}
            </SheetTitle>
          </SheetHeader>
          {currentUser?.role === 'cliente' && (
            <div className="p-4">
              <ClientePage
                currentUser={currentUser}
                properties={properties}
                onViewDetails={(p) => {
                  setAccountDrawerOpen(false);
                  setSelectedProperty(p);
                }}
                onLogout={() => {
                  setAccountDrawerOpen(false);
                  handleLogout();
                }}
                onUserUpdate={(u) => setCurrentUser(u)}
                compareIds={compareIds}
                onToggleCompare={handleToggleCompare}
                onOpenCompare={() => {
                  setAccountDrawerOpen(false);
                  setCompareOpen(true);
                }}
                inDrawerMode={true}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
      
      {/* Vendor Drawer - accessible from main page */}
      <Sheet open={vendorDrawerOpen} onOpenChange={setVendorDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl overflow-y-auto p-0">
          <SheetHeader className="p-4 border-b sticky top-0 bg-background z-10">
            <SheetTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {t('header.myProperties')}
            </SheetTitle>
          </SheetHeader>
          {(currentUser?.role === 'vendedor' || currentUser?.role === 'admin') && (
            <div className="p-4">
              <VendedorPage
                currentUser={currentUser}
                properties={properties}
                onViewDetails={(p) => {
                  setVendorDrawerOpen(false);
                  setSelectedProperty(p);
                }}
                onNavigate={(view) => {
                  setVendorDrawerOpen(false);
                  handleNavigate(view);
                }}
                onDelete={handleDeleteProperty}
                onEdit={(p) => {
                  setVendorDrawerOpen(false);
                  handleEditProperty(p);
                }}
                onLogout={() => {
                  setVendorDrawerOpen(false);
                  handleLogout();
                }}
                inDrawerMode={true}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
      
      <Toaster />
    </div>
  );
}

export default App;
