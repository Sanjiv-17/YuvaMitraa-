import React, { useState } from 'react';
import {
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ShieldCheck,
  X,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { verifyAdminClaimApi } from '../../services/api';
import {
  auth,
  loginWithEmailPassword,
  signInWithGoogle,
  signOutUser,
  sendVerificationEmail
} from '../../services/firebase';

export const AdminLoginScreen: React.FC = () => {
  const { login, setActiveTab } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);

  const completeServerAdminCheck = async () => {
    const fbUser = auth.currentUser;
    if (!fbUser) {
      throw new Error('Firebase authentication session not found.');
    }

    // Force reload user metadata so emailVerified is current
    await fbUser.reload();

    if (!fbUser.emailVerified) {
      setNeedsEmailVerification(true);
      throw Object.assign(
        new Error('Email verification is required before admin access can be granted. Please verify your email address and try again.'),
        { code: 'auth/email-not-verified' }
      );
    }

    const idToken = await fbUser.getIdToken(true);
    const verifyRes = await verifyAdminClaimApi(idToken);

    // Refresh ID token after Admin SDK sets custom claim admin: true
    const refreshedTokenResult = await fbUser.getIdTokenResult(true);
    if (refreshedTokenResult.claims?.admin !== true) {
      await signOutUser();
      throw Object.assign(
        new Error('Administrator custom claim could not be verified on your account.'),
        { code: 'auth/unauthorized-role' }
      );
    }

    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/admin');
    }

    login(verifyRes.token, verifyRes.user);
    setActiveTab('admin');
  };

  const mapAdminAuthError = (err: any) => {
    const code = err?.code || '';
    const msgLower = String(err?.message || '').toLowerCase();

    if (
      code === 'auth/wrong-password' ||
      code === 'auth/invalid-credential' ||
      msgLower.includes('wrong password') ||
      msgLower.includes('invalid credential')
    ) {
      setErrorMsg('Incorrect email or password. Please verify your credentials and try again.');
    } else if (code === 'auth/user-not-found' || msgLower.includes('user-not-found')) {
      setErrorMsg('No account found with this email address.');
    } else if (code === 'auth/email-not-verified') {
      setErrorMsg(err.message);
    } else if (code === 'auth/unauthorized-role' || msgLower.includes('unauthorized') || msgLower.includes('access denied')) {
      setErrorMsg('Unauthorized role: Your account is not permitted to access the Admin Portal.');
    } else if (code === 'auth/popup-closed-by-user') {
      setErrorMsg('Google sign-in popup was closed before completing authentication.');
    } else {
      setErrorMsg(err?.message || 'Administrator authentication failed.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setNeedsEmailVerification(false);

    if (!email.trim() || !password) {
      setErrorMsg('Email and password are required.');
      return;
    }

    setIsLoading(true);
    try {
      await loginWithEmailPassword(email.trim(), password);
      await completeServerAdminCheck();
    } catch (err: any) {
      // Ensure unauthorized or unverified users do not stay logged into admin route
      if (err?.code !== 'auth/email-not-verified') {
        await signOutUser();
      }
      mapAdminAuthError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAdminSignIn = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    setNeedsEmailVerification(false);
    setIsGoogleLoading(true);

    try {
      const result: any = await signInWithGoogle();
      if (!result?.user) {
        setIsGoogleLoading(false);
        return;
      }
      await completeServerAdminCheck();
    } catch (err: any) {
      if (err?.code !== 'auth/email-not-verified') {
        await signOutUser();
      }
      mapAdminAuthError(err);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      await sendVerificationEmail();
      setInfoMsg('Verification email sent. Please open the link in your inbox, then sign in again.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to dispatch verification email right now.');
    }
  };

  const handleBackToPublic = () => {
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/');
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-3 sm:p-6 font-['Poppins',sans-serif] relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-b from-[#FF7A00]/15 via-transparent to-transparent pointer-events-none rounded-full blur-3xl" />

      <main className="w-full max-w-md bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#FF7A00] to-amber-500 p-0.5 shadow-lg shadow-[#FF7A00]/25 mb-3">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-[#FF7A00]" />
            </div>
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">
            Restricted Access Portal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Server-verified administrator sign-in with custom claims
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-4 rounded-2xl bg-rose-950/60 border-2 border-rose-600 text-rose-200 text-xs shadow-lg relative">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-xl bg-rose-600 text-white shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="flex-1 pr-6">
                <h2 className="font-bold text-white text-sm leading-tight">
                  Access Denied
                </h2>
                <p className="text-rose-200 mt-1 leading-relaxed">{errorMsg}</p>
                {needsEmailVerification && (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    className="mt-2.5 px-3 py-1.5 bg-[#FF7A00] hover:bg-[#e56d00] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Resend Verification Email
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="absolute top-3 right-3 text-rose-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {infoMsg && (
          <div className="mb-5 p-4 rounded-2xl bg-emerald-950/60 border border-emerald-600/70 text-emerald-200 text-xs flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>{infoMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Authorized Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter authorized email"
                autoComplete="email"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF7A00] focus:ring-1 focus:ring-[#FF7A00] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                required
                className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF7A00] focus:ring-1 focus:ring-[#FF7A00] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            className="w-full py-3 px-4 bg-gradient-to-r from-[#FF7A00] to-amber-500 hover:from-[#e56d00] hover:to-amber-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-[#FF7A00]/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Claims...</span>
              </>
            ) : (
              <>
                <span>Verify & Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase">
              <span className="bg-slate-950 px-3 text-slate-500 font-semibold tracking-wider">
                Or verify with
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleAdminSignIn}
            disabled={isLoading || isGoogleLoading}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800/90 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-center gap-3 transition-colors cursor-pointer disabled:opacity-60"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>
        </form>

        <button
          type="button"
          onClick={handleBackToPublic}
          className="mt-4 w-full py-2 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to YuvaMitraa Sign In</span>
        </button>

        <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Protected by Firebase Authentication & 256-bit SSL</span>
        </div>
      </main>
    </div>
  );
};
