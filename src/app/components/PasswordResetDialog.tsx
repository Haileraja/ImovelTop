import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { forgotPassword, resetPassword } from '../api';
import { toast } from 'sonner';
import { Loader2, Mail, KeyRound, Lock, Eye, EyeOff, CheckCircle2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useI18n } from '../i18n';

interface PasswordResetDialogProps {
  open: boolean;
  onClose: () => void;
}

export function PasswordResetDialog({ open, onClose }: PasswordResetDialogProps) {
  const { t } = useI18n();
  const [step, setStep] = useState<'email' | 'reset' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const resetAll = () => {
    setStep('email');
    setEmail('');
    setToken('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  };

  const handleRequestReset = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      // In dev mode, the token is returned in the response for easy testing
      if (res.token) {
        setToken(res.token);
      }
      toast.success(t('passwordReset.tokenGenerated'));
      setStep('reset');
    } catch (err: any) {
      toast.error(err?.message || t('passwordReset.failRequest'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!token || !newPassword) return;
    if (newPassword.length < 5) {
      toast.error(t('passwordReset.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('passwordReset.passwordMismatch'));
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setStep('success');
    } catch (err: any) {
      toast.error(err?.message || t('passwordReset.fail'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="p-0 gap-0 overflow-hidden max-w-md border-0 shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{t('passwordReset.title')}</DialogTitle>
          <DialogDescription>{t('passwordReset.emailStep')}</DialogDescription>
        </DialogHeader>

        {/* Header band */}
        <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-5 text-primary-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" />
            <span className="font-bold text-lg">{t('passwordReset.title')}</span>
          </div>
          <p className="text-sm opacity-90 mt-1">
            {step === 'email' && t('passwordReset.emailStep')}
            {step === 'reset' && t('passwordReset.resetStep')}
            {step === 'success' && t('passwordReset.successDesc')}
          </p>
        </div>

        {/* ====== EMAIL STEP ====== */}
        {step === 'email' && (
          <div className="p-6 space-y-5">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                {t('passwordReset.emailInstructions')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resetEmail">{t('passwordReset.email')}</Label>
              <label className="relative block cursor-text">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="resetEmail"
                  className="pl-10 h-11"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('passwordReset.emailPlaceholder')}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRequestReset(); }}
                  autoFocus
                />
              </label>
            </div>

            <Button className="w-full h-11 font-semibold" disabled={!email || loading} onClick={handleRequestReset}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
              {t('passwordReset.requestReset')}
            </Button>

            <button
              type="button"
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
              onClick={handleClose}
            >
              <ArrowLeft className="w-3 h-3" /> {t('passwordReset.backToLogin')}
            </button>
          </div>
        )}

        {/* ====== RESET STEP ====== */}
        {step === 'reset' && (
          <div className="p-6 space-y-5">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <KeyRound className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                {t('passwordReset.tokenSentTo')} <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resetToken">{t('passwordReset.token')}</Label>
              <label className="relative block cursor-text">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="resetToken"
                  className="pl-10 h-11 font-mono text-sm"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={t('passwordReset.tokenPlaceholder')}
                />
              </label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPass">{t('passwordReset.newPassword')}</Label>
              <label className="relative block cursor-text">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="newPass"
                  className="pl-10 pr-10 h-11"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('passwordReset.newPasswordPlaceholder')}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </label>
              <p className="text-xs text-muted-foreground">{t('passwordReset.passwordHint')}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPass">{t('passwordReset.confirmPassword')}</Label>
              <label className="relative block cursor-text">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="confirmPass"
                  className="pl-10 h-11"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('passwordReset.confirmPasswordPlaceholder')}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleReset(); }}
                />
              </label>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">{t('passwordReset.passwordMismatch')}</p>
              )}
            </div>

            <Button
              className="w-full h-11 font-semibold"
              disabled={!token || !newPassword || !confirmPassword || newPassword !== confirmPassword || loading}
              onClick={handleReset}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              {t('passwordReset.resetButton')}
            </Button>

            <button
              type="button"
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
              onClick={() => setStep('email')}
            >
              <ArrowLeft className="w-3 h-3" /> {t('passwordReset.back')}
            </button>
          </div>
        )}

        {/* ====== SUCCESS STEP ====== */}
        {step === 'success' && (
          <div className="p-6 space-y-5">
            <div className="text-center space-y-3">
              <div className="mx-auto w-20 h-20 rounded-full bg-green-100 dark:bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-xl">{t('passwordReset.success')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('passwordReset.successMessage')}
              </p>
            </div>

            <Button className="w-full h-11 font-semibold" onClick={handleClose}>
              {t('passwordReset.backToLogin')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
