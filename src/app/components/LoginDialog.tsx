import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { User, UserRole } from '../types/property';
import api, { setToken, verifyEmail, resendVerificationCode } from '../api';
import { toast } from 'sonner';

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
}

export function LoginDialog({ open, onClose, onLogin }: LoginDialogProps) {
  const [mode, setMode] = useState<'demo' | 'credentials'>('demo');
  const [selectedRole, setSelectedRole] = useState<UserRole>('cliente');

  // credential sub-mode (login vs register vs verify)
  const [credMode, setCredMode] = useState<'login' | 'register' | 'verify'>('login');

  // credentials form data
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [credRole, setCredRole] = useState<UserRole>('cliente');

  // verification state
  const [verifyEmail_, setVerifyEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

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
      setEmail('');
      setPassword('');
      onClose();
    } catch (err: any) {
      const detail = err?.message || '';
      if (detail.includes('não verificado') || detail.includes('verificado')) {
        // User exists but email not verified — go to verify step
        setVerifyEmail(email);
        setCredMode('verify');
        setMode('credentials');
        toast.info('Email não verificado. Insira o código enviado ao seu email.');
      } else {
        toast.error('Credenciais inválidas');
      }
    }
  };

  const handleRegister = async () => {
    try {
      const res = await api.registerUser(nome || email.split('@')[0], email, password, credRole, phone || undefined);
      if (res.message === 'verification_required') {
        // Registration successful — go to verification step
        setVerifyEmail(res.email || email);
        setVerifyCode(['', '', '', '', '', '']);
        setCredMode('verify');
        setResendCooldown(60);
        toast.success('Conta criada! Verifique o código enviado ao seu email.');
      } else if (res.access_token) {
        // Direct login (shouldn't happen with email verification, but handle it)
        setToken(res.access_token);
        onLogin(res.user);
        resetForm();
        onClose();
        toast.success('Conta criada com sucesso');
      }
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || '';
      try {
        const parsed = JSON.parse(msg);
        if (Array.isArray(parsed.detail)) {
          const firstErr = parsed.detail[0];
          const fieldMsg = firstErr?.msg?.replace(/^Value error, /i, '') || 'Erro de validação';
          toast.error(fieldMsg);
        } else {
          toast.error(parsed.detail || 'Falha ao registar');
        }
      } catch {
        toast.error(msg || 'Falha ao registar');
      }
    }
  };

  const handleVerifyCode = useCallback(async () => {
    const code = verifyCode.join('');
    if (code.length !== 6) {
      toast.error('Insira o código completo de 6 dígitos');
      return;
    }
    setVerifying(true);
    try {
      const res = await verifyEmail(verifyEmail_, code);
      if (res.access_token) {
        setToken(res.access_token);
        onLogin(res.user);
        resetForm();
        onClose();
        toast.success('Email verificado com sucesso!');
      }
    } catch (err: any) {
      const msg = err?.message || '';
      try {
        const parsed = JSON.parse(msg);
        toast.error(parsed.detail || 'Código inválido');
      } catch {
        toast.error(msg || 'Código inválido');
      }
    } finally {
      setVerifying(false);
    }
  }, [verifyCode, verifyEmail_, onLogin, onClose]);

  const handleResendCode = async () => {
    try {
      await resendVerificationCode(verifyEmail_);
      setResendCooldown(60);
      setVerifyCode(['', '', '', '', '', '']);
      toast.success('Novo código enviado!');
    } catch {
      toast.error('Falha ao reenviar código');
    }
  };

  const handleCodeInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // only digits
    const newCode = [...verifyCode];
    newCode[index] = value.slice(-1); // only last digit
    setVerifyCode(newCode);
    // auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verifyCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter' && verifyCode.every((d) => d)) {
      handleVerifyCode();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newCode = [...verifyCode];
      for (let i = 0; i < pasted.length; i++) {
        newCode[i] = pasted[i];
      }
      setVerifyCode(newCode);
      const nextFocus = Math.min(pasted.length, 5);
      inputRefs.current[nextFocus]?.focus();
    }
  };

  const resetForm = () => {
    setNome('');
    setEmail('');
    setPassword('');
    setPhone('');
    setCredRole('cliente');
    setVerifyCode(['', '', '', '', '', '']);
    setVerifyEmail('');
    setCredMode('login');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Entrar na Plataforma</DialogTitle>
          <DialogDescription>
            Escolha o modo de acesso — demonstração rápida ou conta por email
          </DialogDescription>
        </DialogHeader>

        {credMode !== 'verify' && (
          <div className="flex gap-2 px-4">
            <Button variant={mode === 'demo' ? 'default' : 'outline'} onClick={() => setMode('demo')}>Acesso Rápido</Button>
            <Button variant={mode === 'credentials' ? 'default' : 'outline'} onClick={() => setMode('credentials')}>Login / Registo</Button>
          </div>
        )}

        {credMode === 'verify' ? (
          /* ---- Email Verification Step ---- */
          <div className="space-y-6 py-4 px-4">
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              </div>
              <h3 className="font-semibold text-lg">Verifique o seu email</h3>
              <p className="text-sm text-muted-foreground">
                Enviámos um código de 6 dígitos para<br/>
                <span className="font-medium text-foreground">{verifyEmail_}</span>
              </p>
            </div>

            <div className="flex justify-center gap-2" onPaste={handleCodePaste}>
              {verifyCode.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeInput(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-background"
                  autoFocus={i === 0}
                />
              ))}
            </div>

            <Button
              className="w-full"
              onClick={handleVerifyCode}
              disabled={verifying || verifyCode.some((d) => !d)}
            >
              {verifying ? 'A verificar…' : 'Verificar Email'}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Não recebeu o código?{' '}
              {resendCooldown > 0 ? (
                <span>Reenviar em {resendCooldown}s</span>
              ) : (
                <button
                  onClick={handleResendCode}
                  className="text-primary hover:underline font-medium"
                >
                  Reenviar código
                </button>
              )}
            </div>

            <button
              onClick={() => { setCredMode('register'); }}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              ← Voltar ao registo
            </button>
          </div>
        ) : mode === 'demo' ? (
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
            <div className="flex gap-2 mb-4">
              <Button variant={credMode === 'login' ? 'default' : 'outline'} onClick={() => setCredMode('login')}>Entrar</Button>
              <Button variant={credMode === 'register' ? 'default' : 'outline'} onClick={() => setCredMode('register')}>Registar</Button>
            </div>

            {credMode === 'login' ? (
              <>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <input className="input w-full" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
                </div>

                <div className="space-y-2">
                  <Label>Senha</Label>
                  <input type="password" className="input w-full" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </div>

                <Button className="w-full" onClick={handleCredentialLogin}>Entrar</Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <input className="input w-full" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <input className="input w-full" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
                </div>

                <div className="space-y-2">
                  <Label>Senha</Label>
                  <input type="password" className="input w-full" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                  <p className="text-xs text-muted-foreground">Mínimo 8 caracteres, com letras e números</p>
                </div>

                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <input className="input w-full" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+258 84 000 0000" />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Conta</Label>
                  <div className="flex gap-2">
                    <Button variant={credRole === 'cliente' ? 'default' : 'outline'} onClick={() => setCredRole('cliente')}>Cliente</Button>
                    <Button variant={credRole === 'vendedor' ? 'default' : 'outline'} onClick={() => setCredRole('vendedor')}>Vendedor</Button>
                  </div>
                </div>

                <Button className="w-full" onClick={handleRegister}>Registar</Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
