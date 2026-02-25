import { User } from '../types/property';
import type { NotificationType } from '../types/property';
import { Button } from './ui/button';
import { Home, LogOut, Settings, PlusCircle, Bell, Sun, Moon, Monitor, Globe, Menu, Building2 } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useTheme, Theme } from '../ThemeContext';
import { useI18n, Lang } from '../i18n';
import { Badge } from './ui/badge';

interface HeaderProps {
  currentUser: User | null;
  onLogin: () => void;
  onLogout: () => void;
  onNavigate: (view: string) => void;
  currentView: string;
  notifications?: NotificationType[];
  onMarkAllRead?: () => void;
  onNotificationClick?: (n: NotificationType) => void;
  onOpenAccountDrawer?: () => void;
  onOpenVendorDrawer?: () => void;
}

export function Header({ currentUser, onLogin, onLogout, onNavigate, currentView, notifications = [], onMarkAllRead, onNotificationClick, onOpenAccountDrawer, onOpenVendorDrawer }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { lang, setLang, t } = useI18n();
  const unreadCount = notifications.filter(n => !n.read).length;

  const themeIcon = theme === 'dark' ? <Moon className="w-4 h-4" /> : theme === 'light' ? <Sun className="w-4 h-4" /> : <Monitor className="w-4 h-4" />;

  return (
    <header className="border-b bg-card/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div 
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onNavigate('home')}
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-teal-600 bg-clip-text text-transparent">{t('app.name')}</h1>
              <p className="text-[10px] text-muted-foreground leading-none -mt-0.5">{t('app.tagline')}</p>
            </div>
          </div>

          <nav className="flex items-center gap-1.5">
            {/* Language toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9" title="Idioma">
                  <Globe className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLang('pt')}>
                  <span className={lang === 'pt' ? 'font-bold' : ''}>🇲🇿 Português</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang('en')}>
                  <span className={lang === 'en' ? 'font-bold' : ''}>🇬🇧 English</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9" title="Tema">
                  {themeIcon}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme('light')}>
                  <Sun className="w-4 h-4 mr-2" /> {t('theme.light')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>
                  <Moon className="w-4 h-4 mr-2" /> {t('theme.dark')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')}>
                  <Monitor className="w-4 h-4 mr-2" /> {t('theme.system')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {currentUser ? (
              <>
                {/* Notification bell */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-9 w-9">
                      <Bell className="w-[18px] h-[18px]" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center animate-pulse">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                    <div className="flex items-center justify-between px-2 py-1.5">
                      <DropdownMenuLabel className="p-0">{t('notifications.title')}</DropdownMenuLabel>
                      {unreadCount > 0 && onMarkAllRead && (
                        <Button variant="ghost" size="sm" className="text-xs h-6" onClick={(e) => { e.preventDefault(); onMarkAllRead(); }}>
                          {t('notifications.markAllRead')}
                        </Button>
                      )}
                    </div>
                    <DropdownMenuSeparator />
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        {t('notifications.noNotifications')}
                      </div>
                    ) : (
                      notifications.slice(0, 20).map(n => (
                        <DropdownMenuItem
                          key={n.id}
                          className={`flex flex-col items-start gap-0.5 py-2.5 ${!n.read ? 'bg-primary/5' : ''}`}
                          onClick={() => onNotificationClick?.(n)}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <span className="font-medium text-sm flex-1">{n.title}</span>
                            {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />}
                          </div>
                          <span className="text-xs text-muted-foreground">{n.message}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString('pt-MZ')}</span>
                        </DropdownMenuItem>
                      ))
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Desktop nav buttons */}
                <div className="hidden md:flex items-center gap-1.5">
                  {currentUser.role === 'cliente' && onOpenAccountDrawer && (
                    <Button onClick={onOpenAccountDrawer} variant="ghost" size="sm" className="gap-1.5">
                      <Home className="w-3.5 h-3.5" />
                      {t('header.myAccount')}
                    </Button>
                  )}
                  {(currentUser.role === 'vendedor' || currentUser.role === 'admin') && (
                    <>
                      <Button onClick={onOpenVendorDrawer || (() => onNavigate('vendedor'))} variant="ghost" size="sm" className="gap-1.5">
                        {t('header.myProperties')}
                      </Button>
                      <Button
                        variant={currentView === 'add-property' ? 'default' : 'outline'}
                        onClick={() => onNavigate('add-property')}
                        size="sm"
                        className="gap-1.5"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        {t('header.addProperty')}
                      </Button>
                    </>
                  )}
                  {currentUser.role === 'admin' && (
                    <Button
                      variant={currentView === 'admin' ? 'default' : 'outline'}
                      onClick={() => onNavigate('admin')}
                      size="sm"
                      className="gap-1.5"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      {t('header.adminPanel')}
                    </Button>
                  )}
                </div>

                {/* User menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                          {currentUser.nome.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div>
                        <div className="font-semibold">{currentUser.nome}</div>
                        <div className="text-xs text-muted-foreground">{currentUser.email}</div>
                        <Badge variant="secondary" className="mt-1 text-[10px] capitalize">{currentUser.role}</Badge>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => {
                      if (currentUser.role === 'cliente' && onOpenAccountDrawer) {
                        onOpenAccountDrawer();
                      } else if (currentUser.role === 'vendedor' && onOpenVendorDrawer) {
                        onOpenVendorDrawer();
                      } else {
                        onNavigate('admin');
                      }
                    }}>
                      <Home className="w-4 h-4 mr-2" />
                      {t('header.myAccount')}
                    </DropdownMenuItem>
                    {/* Mobile nav items */}
                    {(currentUser.role === 'vendedor' || currentUser.role === 'admin') && (
                      <>
                        <DropdownMenuItem className="md:hidden" onClick={onOpenVendorDrawer || (() => onNavigate('vendedor'))}>
                          <Building2 className="w-4 h-4 mr-2" />
                          {t('header.myProperties')}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="md:hidden" onClick={() => onNavigate('add-property')}>
                          <PlusCircle className="w-4 h-4 mr-2" />
                          {t('header.addProperty')}
                        </DropdownMenuItem>
                      </>
                    )}
                    {currentUser.role === 'admin' && (
                      <DropdownMenuItem className="md:hidden" onClick={() => onNavigate('admin')}>
                        <Settings className="w-4 h-4 mr-2" />
                        {t('header.adminPanel')}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      {t('header.logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button onClick={onLogin} size="sm" className="gap-1.5 shadow-sm">
                {t('header.login')}
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
