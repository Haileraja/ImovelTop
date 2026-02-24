import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { forgotPassword, resetPassword } from '../api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface PasswordResetDialogProps {
  open: boolean;
  onClose: () => void;
}

export function PasswordResetDialog({ open, onClose }: PasswordResetDialogProps) {
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      // In demo mode, the token is returned in the response
      if (res.token) {
        setToken(res.token);
      }
      toast.success('Token de redefinição gerado. Verifique o console ou use o token abaixo.');
      setStep('reset');
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao solicitar redefinição');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!token || !newPassword) return;
    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      toast.success('Senha redefinida com sucesso!');
      onClose();
      setStep('email');
      setEmail('');
      setToken('');
      setNewPassword('');
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao redefinir senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Redefinir Senha</DialogTitle>
          <DialogDescription>
            {step === 'email' ? 'Insira seu email para receber um token de redefinição.' : 'Insira o token e a nova senha.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'email' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resetEmail">Email</Label>
              <Input id="resetEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
            <Button className="w-full" disabled={!email || loading} onClick={handleRequestReset}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Solicitar Redefinição
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resetToken">Token</Label>
              <Input id="resetToken" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Cole o token aqui" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPass">Nova Senha</Label>
              <Input id="newPass" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 4 caracteres" />
            </div>
            <Button className="w-full" disabled={!token || !newPassword || loading} onClick={handleReset}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Redefinir Senha
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setStep('email')}>Voltar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
