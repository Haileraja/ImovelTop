import { User, UserRole } from '../types/property';
import { Button } from './ui/button';
import { Home, LogOut, Settings, PlusCircle } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface HeaderProps {
  currentUser: User | null;
  onLogin: () => void;
  onLogout: () => void;
  onNavigate: (view: string) => void;
  currentView: string;
}

export function Header({ currentUser, onLogin, onLogout, onNavigate, currentView }: HeaderProps) {
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
              <h1 className="text-2xl font-bold">ImovelTop</h1>
              <p className="text-xs text-muted-foreground">Encontre a casa dos seus sonhos</p>
            </div>
          </div>
          
          <nav className="flex items-center gap-4">
            {currentUser ? (
              <>
                {currentUser.role === 'vendedor' && (
                  <>
                    <Button onClick={() => onNavigate('vendedor')} variant={currentView === 'vendedor' ? 'default' : 'ghost'}>Meus Imóveis</Button>
                    <Button 
                      variant={currentView === 'add-property' ? 'default' : 'outline'}
                      onClick={() => onNavigate('add-property')}
                    >
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Adicionar Imóvel
                    </Button>
                  </>
                )}

                {currentUser.role === 'cliente' && (
                  <Button onClick={() => onNavigate('cliente')} variant={currentView === 'cliente' ? 'default' : 'ghost'}>Minha Conta</Button>
                )}
                
                {currentUser.role === 'admin' && (
                  <Button 
                    variant={currentView === 'admin' ? 'default' : 'outline'}
                    onClick={() => onNavigate('admin')}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Painel Admin
                  </Button>
                )}
                
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
                        <div className="text-xs text-muted-foreground capitalize">{currentUser.role}</div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onLogout}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button onClick={onLogin}>Entrar</Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
