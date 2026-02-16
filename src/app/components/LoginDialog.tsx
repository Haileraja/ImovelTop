import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { User, UserRole } from '../types/property';
import api, { setToken } from '../api';
import { toast } from 'sonner';

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
}

export function LoginDialog({ open, onClose, onLogin }: LoginDialogProps) {
  const [mode, setMode] = useState<'demo' | 'credentials'>('demo');
  const [selectedRole, setSelectedRole] = useState<UserRole>('cliente');

  // credentials form
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [credRole, setCredRole] = useState<UserRole>('cliente');

  const handleLogin = async () => {
    try {
      const res = await api.loginByRole(selectedRole);
      setToken(res.access_token);
      onLogin(res.user);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Falha no login');
    }
  };

  const handleCredentialLogin = async () => {
    try {
      const res = await api.loginWithCredentials(email, password);
      setToken(res.access_token);
      onLogin(res.user);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Credenciais inválidas');
    }
  };

  const handleRegister = async () => {
    try {
      const res = await api.registerUser(nome || email.split('@')[0], email, password, credRole);
      setToken(res.access_token);
      onLogin(res.user);
      onClose();
      toast.success('Conta criada com sucesso');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Falha ao registar');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Entrar na Plataforma</DialogTitle>
          <DialogDescription>
            Escolha o modo de acesso — demonstração rápida ou conta por email
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 px-4">
          <Button variant={mode === 'demo' ? 'default' : 'outline'} onClick={() => setMode('demo')}>Demo</Button>
          <Button variant={mode === 'credentials' ? 'default' : 'outline'} onClick={() => setMode('credentials')}>Email / Registo</Button>
        </div>

        {mode === 'demo' ? (
          <div className="space-y-6 py-4 px-4">
            <RadioGroup value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
              <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="cliente" id="cliente" />
                <Label htmlFor="cliente" className="flex-1 cursor-pointer">
                  <div className="font-semibold">Cliente</div>
                  <div className="text-sm text-muted-foreground">Procurar e visualizar imóveis</div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="vendedor" id="vendedor" />
                <Label htmlFor="vendedor" className="flex-1 cursor-pointer">
                  <div className="font-semibold">Vendedor</div>
                  <div className="text-sm text-muted-foreground">Adicionar e gerir imóveis</div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="admin" id="admin" />
                <Label htmlFor="admin" className="flex-1 cursor-pointer">
                  <div className="font-semibold">Administrador</div>
                  <div className="text-sm text-muted-foreground">Gerir todos os imóveis e utilizadores</div>
                </Label>
              </div>
            </RadioGroup>

            <Button className="w-full" onClick={handleLogin}>
              Entrar como {selectedRole}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4 px-4">
            <div className="space-y-2">
              <Label>Nome (apenas para registo)</Label>
              <input className="input w-full" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <input className="input w-full" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>

            <div className="space-y-2">
              <Label>Senha</Label>
              <input type="password" className="input w-full" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Conta</Label>
              <div className="flex gap-2">
                <Button variant={credRole === 'cliente' ? 'default' : 'outline'} onClick={() => setCredRole('cliente')}>Cliente</Button>
                <Button variant={credRole === 'vendedor' ? 'default' : 'outline'} onClick={() => setCredRole('vendedor')}>Vendedor</Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleCredentialLogin}>Entrar</Button>
              <Button variant="outline" className="flex-1" onClick={handleRegister}>Registar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
