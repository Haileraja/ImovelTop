import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { User, UserRole } from '../types/property';
import api, { setToken, verifyEmail, resendVerificationCode } from '../api';
import { toast } from 'sonner';
import { useI18n } from '../i18n';
import { Eye, EyeOff, Mail, Lock, User as UserIcon, Phone, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Building2, ChevronDown } from 'lucide-react';

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
  onForgotPassword?: () => void;
}

// ---- Country prefixes ----
const COUNTRY_PREFIXES = [
  { code: '+258', label: '🇲🇿 Moçambique (+258)' },
  { code: '+244', label: '🇦🇴 Angola (+244)' },
  { code: '+55',  label: '🇧🇷 Brasil (+55)' },
  { code: '+351', label: '🇵🇹 Portugal (+351)' },
  { code: '+27',  label: '🇿🇦 África do Sul (+27)' },
  { code: '+255', label: '🇹🇿 Tanzânia (+255)' },
  { code: '+265', label: '🇲🇼 Malawi (+265)' },
  { code: '+263', label: '🇿🇼 Zimbabwe (+263)' },
  { code: '+260', label: '🇿🇲 Zâmbia (+260)' },
  { code: '+254', label: '🇰🇪 Quénia (+254)' },
  { code: '+234', label: '🇳🇬 Nigéria (+234)' },
  { code: '+1',   label: '🇺🇸 EUA (+1)' },
  { code: '+44',  label: '🇬🇧 Reino Unido (+44)' },
];

// ---- Stable sub-components (defined outside to avoid focus loss) ----
function Field({ label, error, errorTranslator, children }: { label: string; error?: string; errorTranslator?: (key: string) => string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
          <AlertCircle className="w-3 h-3 shrink-0" /> {errorTranslator ? errorTranslator(error) : error}
        </p>
      )}
    </div>
  );
}

function CountrySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative shrink-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 pl-2 pr-7 border rounded-l-md bg-muted/50 text-sm font-medium appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 border-r-0"
        style={{ minWidth: '95px' }}
      >
        {COUNTRY_PREFIXES.map((p) => (
          <option key={p.code} value={p.code}>{p.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
    </div>
  );
}

// ---- Validation helpers ----
function validatePassword(pw: string): string | null {
  if (!pw) return 'login.passwordRequired';
  if (pw.length < 5) return 'login.passwordMinLength';
  return null;
}
function validateNome(n: string): string | null {
  if (!n.trim()) return 'login.nameRequired';
  if (n.trim().length < 2) return 'login.nameTooShort';
  return null;
}
function validateEmail(email: string): string | null {
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'login.emailInvalid';
  return null;
}
function validateLoginIdentifier(id: string): string | null {
  if (!id.trim()) return 'login.identifierRequired';
  return null;
}

export function LoginDialog({ open, onClose, onLogin, onForgotPassword }: LoginDialogProps) {
  const { t } = useI18n();
  const [view, setView] = useState<'role' | 'login' | 'register' | 'verify'>('role');

  // ---- Login state ----
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  const [loginCountryCode, setLoginCountryCode] = useState('+258');
  const [loginMode, setLoginMode] = useState<'email' | 'phone'>('email');

  // ---- Register state (single page) ----
  const [regNome, setRegNome] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPw, setShowRegPw] = useState(false);
  const [regPhone, setRegPhone] = useState('');
  const [regCountryCode, setRegCountryCode] = useState('+258');
  const [regRole, setRegRole] = useState<UserRole>('cliente');
  const [regLoading, setRegLoading] = useState(false);
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  const [regTouched, setRegTouched] = useState<Record<string, boolean>>({});

  // ---- Verify state ----
  const [verifyEmail_, setVerifyEmail_] = useState('');
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

  // Live validation for register fields
  useEffect(() => {
    const errs: Record<string, string> = {};
    if (regTouched.nome) { const e = validateNome(regNome); if (e) errs.nome = e; }
    if (regTouched.email) { const e = validateEmail(regEmail); if (e) errs.email = e; }
    if (regTouched.password) { const e = validatePassword(regPassword); if (e) errs.password = e; }
    setRegErrors(errs);
  }, [regNome, regEmail, regPassword, regTouched]);

  const resetAll = () => {
    setLoginIdentifier(''); setLoginPassword(''); setLoginErrors({});
    setLoginMode('email'); setLoginCountryCode('+258');
    setRegNome(''); setRegEmail(''); setRegPassword(''); setRegPhone(''); setRegRole('cliente');
    setRegCountryCode('+258');
    setRegErrors({}); setRegTouched({});
    setVerifyEmail_(''); setVerifyCode(['', '', '', '', '', '']);
    setView('role');
  };

  // ---- Login handler ----
  const handleLogin = async () => {
    const errs: Record<string, string> = {};
    const e1 = validateLoginIdentifier(loginIdentifier); if (e1) errs.identifier = e1;
    if (!loginPassword) errs.password = 'login.passwordRequired';
    setLoginErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoginLoading(true);
    try {
      const identifier = loginMode === 'phone'
        ? `${loginCountryCode}${loginIdentifier.replace(/[\s-]/g, '').replace(/^0+/, '')}`
        : loginIdentifier;
      const res = await api.loginWithCredentials(identifier, loginPassword);
      setToken(res.access_token);
      onLogin(res.user);
      resetAll();
      onClose();
    } catch (err: any) {
      const detail = err?.message || '';
      if (detail.includes('não verificado') || detail.includes('verificado')) {
        setVerifyEmail_(loginIdentifier);
        setView('verify');
        toast.info(t('login.verificationRequired'));
      } else {
        setLoginErrors({ general: 'login.incorrectCredentials' });
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // ---- Register submit (single page) ----
  const handleRegister = async () => {
    setRegTouched({ nome: true, email: true, password: true });
    const errs: Record<string, string> = {};
    const e1 = validateNome(regNome); if (e1) errs.nome = e1;
    const e2 = validateEmail(regEmail); if (e2) errs.email = e2;
    const e3 = validatePassword(regPassword); if (e3) errs.password = e3;
    setRegErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setRegLoading(true);
    try {
      const fullPhone = regPhone.trim()
        ? `${regCountryCode}${regPhone.replace(/[\s-]/g, '').replace(/^0+/, '')}`
        : undefined;
      const res = await api.registerUser(
        regNome.trim(), regPassword, regRole,
        regEmail.trim() || undefined, fullPhone
      );
      if (res.message === 'verification_required') {
        setVerifyEmail_(res.email || regEmail);
        setVerifyCode(['', '', '', '', '', '']);
        setView('verify');
        setResendCooldown(60);
        toast.success(t('login.accountCreated'));
      } else if (res.access_token) {
        setToken(res.access_token);
        onLogin(res.user);
        resetAll();
        onClose();
        toast.success(t('login.accountCreatedSuccess'));
      }
    } catch (err: any) {
      const msg = err?.message || '';
      try {
        const parsed = JSON.parse(msg);
        if (Array.isArray(parsed.detail)) {
          const firstErr = parsed.detail[0];
          const fieldMsg = firstErr?.msg?.replace(/^Value error, /i, '') || t('login.validationError');
          toast.error(fieldMsg);
        } else {
          toast.error(parsed.detail || t('login.failRegister'));
        }
      } catch {
        toast.error(msg || t('login.failRegister'));
      }
    } finally {
      setRegLoading(false);
    }
  };

  // ---- Verify ----
  const handleVerifyCode = useCallback(async () => {
    const code = verifyCode.join('');
    if (code.length !== 6) { toast.error(t('login.enterFullCode')); return; }
    setVerifying(true);
    try {
      const res = await verifyEmail(verifyEmail_, code);
      if (res.access_token) {
        setToken(res.access_token);
        onLogin(res.user);
        resetAll();
        onClose();
        toast.success(t('login.emailVerified'));
      }
    } catch (err: any) {
      const msg = err?.message || '';
      try { const p = JSON.parse(msg); toast.error(p.detail || t('login.codeInvalid')); } catch { toast.error(msg || t('login.codeInvalid')); }
    } finally { setVerifying(false); }
  }, [verifyCode, verifyEmail_, onLogin, onClose]);

  const handleResendCode = async () => {
    try {
      await resendVerificationCode(verifyEmail_);
      setResendCooldown(60);
      setVerifyCode(['', '', '', '', '', '']);
      toast.success(t('login.newCodeSent'));
    } catch { toast.error(t('login.failResend')); }
  };

  const handleCodeInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...verifyCode];
    newCode[index] = value.slice(-1);
    setVerifyCode(newCode);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verifyCode[index] && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'Enter' && verifyCode.every((d) => d)) handleVerifyCode();
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newCode = [...verifyCode];
      for (let i = 0; i < pasted.length; i++) newCode[i] = pasted[i];
      setVerifyCode(newCode);
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) { resetAll(); onClose(); } }}>
      <DialogContent className="p-0 gap-0 overflow-hidden max-w-md sm:max-w-lg border-0 shadow-2xl [&>button]:text-primary-foreground [&>button]:hover:text-white [&>button]:top-4 [&>button]:right-4">
        <DialogHeader className="sr-only">
          <DialogTitle>{view === 'role' ? t('login.chooseProfile') : view === 'login' ? t('login.welcomeBack') : view === 'register' ? t('login.createAccountIntro') : t('login.verifyIntro')}</DialogTitle>
          <DialogDescription>ImovelTop</DialogDescription>
        </DialogHeader>
        {/* Decorative header band */}
        <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-5 text-primary-foreground">
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            <span className="font-bold text-lg">ImovelTop</span>
          </div>
          <p className="text-sm opacity-90 mt-1">
            {view === 'role' && t('login.chooseProfileDesc')}
            {view === 'login' && t('login.welcomeBack')}
            {view === 'register' && t('login.createAccountIntro')}
            {view === 'verify' && t('login.verifyIntro')}
          </p>
        </div>

        {/* ====== ROLE SELECTION VIEW ====== */}
        {view === 'role' && (
          <div className="p-6 space-y-5">
            <p className="text-sm font-medium text-center text-foreground">{t('login.chooseProfile')}</p>

            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                className="flex items-start gap-4 p-5 rounded-xl border-2 border-muted hover:border-primary hover:bg-primary/5 transition-all text-left group"
                onClick={() => { setRegRole('cliente'); setView('login'); }}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <UserIcon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-base">{t('login.enterAsClient')}</div>
                  <p className="text-sm text-muted-foreground mt-0.5">{t('login.roleClientDesc')}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary mt-1 transition-colors" />
              </button>

              <button
                type="button"
                className="flex items-start gap-4 p-5 rounded-xl border-2 border-muted hover:border-primary hover:bg-primary/5 transition-all text-left group"
                onClick={() => { setRegRole('vendedor'); setView('login'); }}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-base">{t('login.enterAsVendor')}</div>
                  <p className="text-sm text-muted-foreground mt-0.5">{t('login.roleVendorDesc')}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary mt-1 transition-colors" />
              </button>
            </div>
          </div>
        )}

        {/* ====== LOGIN VIEW ====== */}
        {view === 'login' && (
          <div className="p-6 space-y-5">
            {loginErrors.general && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm animate-in fade-in slide-in-from-top-2 duration-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {t(loginErrors.general)}
              </div>
            )}

            {/* Toggle email/phone login */}
            <div className="flex gap-1 p-1 rounded-lg bg-muted/50">
              <button
                type="button"
                className={`flex-1 text-sm py-2 rounded-md font-medium transition-all ${loginMode === 'email' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => { setLoginMode('email'); setLoginIdentifier(''); setLoginErrors({}); }}
              >
                <Mail className="w-4 h-4 inline mr-1.5" />{t('login.withEmail')}
              </button>
              <button
                type="button"
                className={`flex-1 text-sm py-2 rounded-md font-medium transition-all ${loginMode === 'phone' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => { setLoginMode('phone'); setLoginIdentifier(''); setLoginErrors({}); }}
              >
                <Phone className="w-4 h-4 inline mr-1.5" />{t('login.withPhone')}
              </button>
            </div>

            {loginMode === 'email' ? (
              <Field label={t('login.emailLabel')} error={loginErrors.identifier} errorTranslator={t}>
                <label className="relative block cursor-text">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    className="pl-10 h-11"
                    type="email"
                    placeholder={t('login.emailPlaceholder')}
                    autoComplete="email"
                    value={loginIdentifier}
                    onChange={(e) => { setLoginIdentifier(e.target.value); setLoginErrors((p) => ({ ...p, identifier: '', general: '' })); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
                  />
                </label>
              </Field>
            ) : (
              <Field label={t('login.phoneLabel')} error={loginErrors.identifier} errorTranslator={t}>
                <div className="flex">
                  <CountrySelect value={loginCountryCode} onChange={setLoginCountryCode} />
                  <label className="relative block cursor-text flex-1">
                    <Input
                      className="h-11 rounded-l-none"
                      type="tel"
                      placeholder="84 000 0000"
                      autoComplete="tel"
                      value={loginIdentifier}
                      onChange={(e) => { setLoginIdentifier(e.target.value.replace(/[^\d\s-]/g, '')); setLoginErrors((p) => ({ ...p, identifier: '', general: '' })); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
                    />
                  </label>
                </div>
              </Field>
            )}

            <Field label={t('login.passwordLabel')} error={loginErrors.password} errorTranslator={t}>
              <label className="relative block cursor-text">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  className="pl-10 pr-10 h-11"
                  type={showLoginPw ? 'text' : 'password'}
                  placeholder={t('login.passwordPlaceholder')}
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => { setLoginPassword(e.target.value); setLoginErrors((p) => ({ ...p, password: '', general: '' })); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowLoginPw(!showLoginPw)}>
                  {showLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </label>
            </Field>

            <Button className="w-full h-11 font-semibold text-base" disabled={loginLoading} onClick={handleLogin}>
              {loginLoading ? (
                <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> {t('login.loggingIn')}</span>
              ) : (
                <span className="flex items-center gap-2">{t('login.loginButton')} <ArrowRight className="w-4 h-4" /></span>
              )}
            </Button>

            {onForgotPassword && (
              <button
                type="button"
                className="w-full text-xs text-primary hover:underline transition-colors text-center"
                onClick={() => { resetAll(); onClose(); onForgotPassword(); }}
              >
                {t('login.forgotPassword')}
              </button>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-background px-3 text-muted-foreground">{t('login.or')}</span></div>
            </div>

            <Button variant="outline" className="w-full h-10" onClick={() => setView('register')}>
              {t('login.createAccount')}
            </Button>

            <button type="button" className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1 pt-1" onClick={() => setView('role')}>
              <ArrowLeft className="w-3 h-3" /> {t('login.changeProfile')}
            </button>

            {/* Admin quick-access */}
            <div className="pt-3 border-t mt-3">
              <button
                type="button"
                className="w-full text-xs text-muted-foreground/60 hover:text-primary transition-colors flex items-center justify-center gap-1.5"
                onClick={async () => {
                  setLoginLoading(true);
                  try {
                    const res = await api.loginWithCredentials('ImovelTop', 'Haile123');
                    setToken(res.access_token);
                    onLogin(res.user);
                    resetAll();
                    onClose();
                  } catch {
                    setLoginErrors({ general: 'login.incorrectCredentials' });
                  } finally {
                    setLoginLoading(false);
                  }
                }}
              >
                <Lock className="w-3 h-3" /> {t('login.enterAsAdmin')}
              </button>
            </div>
          </div>
        )}

        {/* ====== REGISTER VIEW (single page) ====== */}
        {view === 'register' && (
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <Field label={t('login.fullName')} error={regErrors.nome} errorTranslator={t}>
              <label className="relative block cursor-text">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  className="pl-10 h-11"
                  placeholder={t('login.fullNamePlaceholder')}
                  autoComplete="name"
                  value={regNome}
                  onChange={(e) => setRegNome(e.target.value)}
                  onBlur={() => setRegTouched((t) => ({ ...t, nome: true }))}
                  autoFocus
                />
              </label>
            </Field>

            <Field label={`${t('login.emailLabel')} (${t('login.optional')})`} error={regErrors.email} errorTranslator={t}>
              <label className="relative block cursor-text">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  className="pl-10 h-11"
                  type="email"
                  placeholder="joao@email.com"
                  autoComplete="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  onBlur={() => setRegTouched((t) => ({ ...t, email: true }))}
                />
              </label>
            </Field>

            <Field label={`${t('login.phoneLabel')} (${t('login.optional')})`}>
              <div className="flex">
                <CountrySelect value={regCountryCode} onChange={setRegCountryCode} />
                <label className="relative block cursor-text flex-1">
                  <Input
                    className="h-11 rounded-l-none"
                    type="tel"
                    placeholder="84 000 0000"
                    autoComplete="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value.replace(/[^\d\s-]/g, ''))}
                  />
                </label>
              </div>
            </Field>

            <Field label={t('login.passwordLabel')} error={regErrors.password} errorTranslator={t}>
              <label className="relative block cursor-text">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  className="pl-10 pr-10 h-11"
                  type={showRegPw ? 'text' : 'password'}
                  placeholder={t('login.passwordMinPlaceholder')}
                  autoComplete="new-password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  onBlur={() => setRegTouched((t) => ({ ...t, password: true }))}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowRegPw(!showRegPw)}>
                  {showRegPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </label>
              <p className="text-xs text-muted-foreground">{t('login.passwordHint')}</p>
            </Field>

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => setView('login')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> {t('login.back')}
              </Button>
              <Button className="flex-1 h-11" disabled={regLoading} onClick={handleRegister}>
                {regLoading ? (
                  <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> {t('login.creatingAccount')}</span>
                ) : (
                  <span className="flex items-center gap-2">{t('login.createAccountButton')} <CheckCircle2 className="w-4 h-4" /></span>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ====== VERIFY VIEW ====== */}
        {view === 'verify' && (
          <div className="p-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">{t('login.verifyEmail')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('login.verifyCodeSent')}<br />
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

            <Button className="w-full h-11" onClick={handleVerifyCode} disabled={verifying || verifyCode.some((d) => !d)}>
              {verifying ? t('login.verifying') : t('login.verifyButton')}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              {t('login.didntReceiveCode')}{' '}
              {resendCooldown > 0 ? (
                <span>{t('login.resendIn', { seconds: String(resendCooldown) })}</span>
              ) : (
                <button onClick={handleResendCode} className="text-primary hover:underline font-medium">{t('login.resendCode')}</button>
              )}
            </div>

            <button onClick={() => setView('register')} className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('login.backToRegister')}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
