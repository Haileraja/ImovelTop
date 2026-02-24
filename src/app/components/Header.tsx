import { User } from '../types/property';
import type { NotificationType } from '../types/property';
import { Button } from './ui/button';
import { Home, LogOut, Settings, PlusCircle, Bell, Sun, Moon, Monitor, Globe } from 'lucide-react';
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
}

export function Header({ currentUser, onLogin, onLogout, onNavigate, currentView, notifications = [], onMarkAllRead, onNotificationClick }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { lang, setLang, t } = useI18n();
  const unreadCount = notifications.filter(n => !n.read).length;

  const themeIcon = theme === 'dark' ? <Moon className="w-4 h-4" /> : theme === 'light' ? <Sun className="w-4 h-4" /> : <Monitor className="w-4 h-4" />;

  return (
    <header className="border-b bg-card shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onNavigate('home')}
          >
            <Home className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{t('app.name')}</h1>
              <p className="text-xs text-muted-foreground">{t('app.tagline')}</p>
            </div>
          </div>
          
          <nav className="flex items-center gap-2">
            {/* Language toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" title="Idioma">
                  <Globe className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLang('pt')}>
                  <span className={lang === 'pt' ? 'font-bold' : ''}>🇵🇹 Português</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang('en')}>
                  <span className={lang === 'en' ? 'font-bold' : ''}>🇬🇧 English</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" title="Tema">
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
                    <Button variant="ghost" size="icon" className="relative">
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
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
                      <div className="py-4 text-center text-sm text-muted-foreground">{t('notifications.noNotifications')}</div>
                    ) : (
                      notifications.slice(0, 20).map(n => (
                        <DropdownMenuItem
                          key={n.id}
                          className={`flex flex-col items-start gap-0.5 py-2 ${!n.read ? 'bg-primary/5' : ''}`}
                          onClick={() => onNotificationClick?.(n)}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <span className="font-medium text-sm flex-1">{n.title}</span>
                            {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                          </div>
                          <span className="text-xs text-muted-foreground">{n.message}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString('pt-MZ')}</span>
                        </DropdownMenuItem>
                      ))
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {currentUser.nome.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium hidden md:inline">{t('header.hello')}, {currentUser.nome}</span>
                </div>

                <div className="flex items-center gap-2">
                  {(currentUser.role === 'vendedor' || currentUser.role === 'admin') && (
                    <>
                      <Button onClick={() => onNavigate('vendedor')} variant={currentView === 'vendedor' ? 'default' : 'ghost'} className="hidden md:flex">{t('header.myProperties')}</Button>
                      <Button 
                        variant={currentView === 'add-property' ? 'default' : 'outline'}
                        onClick={() => onNavigate('add-property')}
                        className="hidden md:flex"
                      >
                        <PlusCircle className="w-4 h-4 mr-2" />
                        {t('header.addProperty')}
                      </Button>
                    </>
                  )}

                  {currentUser.role === 'cliente' && (
                    <Button onClick={() => onNavigate('cliente')} variant={currentView === 'cliente' ? 'default' : 'ghost'} className="hidden md:flex">{t('header.myAccount')}</Button>
                  )}
                  
                  {currentUser.role === 'admin' && (
                    <Button 
                      variant={currentView === 'admin' ? 'default' : 'outline'}
                      onClick={() => onNavigate('admin')}
                      className="hidden md:flex"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      {t('header.adminPanel')}
                    </Button>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar>
                        <AvatarFallback>
                          {currentUser.nome.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>
                      <div>
                        <div className="font-semibold">{currentUser.nome}</div>
                        <div className="text-xs text-muted-foreground">{currentUser.email}</div>
                        <div className="text-xs text-muted-foreground capitalize">{currentUser.role}</div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onNavigate(currentUser.role === 'cliente' ? 'cliente' : currentUser.role === 'vendedor' ? 'vendedor' : 'admin')}>
                      <Home className="w-4 h-4 mr-2" />
                      {t('header.myAccount')}
                    </DropdownMenuItem>
                    {/* Mobile nav items */}
                    {(currentUser.role === 'vendedor' || currentUser.role === 'admin') && (
                      <>
                        <DropdownMenuItem className="md:hidden" onClick={() => onNavigate('vendedor')}>
                          {t('header.myProperties')}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="md:hidden" onClick={() => onNavigate('add-property')}>
                          {t('header.addProperty')}
                        </DropdownMenuItem>
                      </>
                    )}
                    {currentUser.role === 'admin' && (
                      <DropdownMenuItem className="md:hidden" onClick={() => onNavigate('admin')}>
                        {t('header.adminPanel')}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onLogout}>
                      <LogOut className="w-4 h-4 mr-2" />
                      {t('header.logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button onClick={onLogin}>{t('header.login')}</Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
