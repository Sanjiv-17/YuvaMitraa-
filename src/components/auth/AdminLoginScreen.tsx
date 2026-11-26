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

    if (!fbUser.emailVerified) {
      await fbUser.reload();
    }

    if (!fbUser.emailVerified) {
      setNeedsEmailVerification(true);
      throw Object.assign(
        new Error('Email verification is required before admin access can be granted. Please verify your email address and try again.'),
        { code: 'auth/email-not-verified' }
      );
    }

    const idToken = await fbUser.getIdToken(false);
    const verifyRes = await verifyAdminClaimApi(idToken);

    // Only force-refresh token if server newly granted the custom claim
    const refreshedTokenResult = await fbUser.getIdTokenResult(Boolean(verifyRes.claimGranted));
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
    <div className="ym-auth-page font-['Poppins',sans-serif]">
      <div className="ym-auth-shell ym-auth-shell--compact">
        {/* Left Brand Column / Mobile Header */}
        <aside className="ym-auth-brand-panel" aria-label="Administrator Portal">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#FF7A00]/15 border border-[#FF7A00]/40 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-[#FF7A00]" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-bold tracking-tight text-white leading-none">
                  Yuva<span className="text-[#FF7A00]">Mitraa</span>
                </div>
                <p className="text-xs text-slate-300 mt-1 truncate">
                  Restricted Administrator Portal
                </p>
              </div>
            </div>

            <div className="ym-auth-brand-details space-y-3">
              <p className="text-xs font-semibold text-[#FF9B3D] tracking-wide">
                Verified Governance Access
              </p>
              <h1
                className="text-2xl lg:text-[28px] font-bold text-white leading-[1.2] tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                Server-verified administrator sign-in.
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                Access to platform governance, verified Indian internship listings, and audit tools requires a verified email address and server-issued Firebase custom claims.
              </p>
            </div>
          </div>

          <div className="ym-auth-brand-footer border-t border-white/10 pt-5">
            <p className="text-[11px] text-slate-400">
              Unauthorized sign-in attempts are automatically rejected and logged.
            </p>
          </div>
        </aside>

        {/* Right Form Column / Mobile Card */}
        <main className="ym-auth-form-panel">
          <div className="ym-auth-form-inner">
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Administrator Sign In
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Sign in with an authorized administrator account.
              </p>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="mb-5 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-700 text-rose-900 dark:text-rose-100 text-xs relative ym-auth-panel-fade"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0 pr-6">
                    <h3 className="font-bold text-rose-900 dark:text-white text-xs sm:text-sm leading-tight">
                      Access Denied
                    </h3>
                    <p className="text-rose-800 dark:text-rose-200 mt-1 leading-relaxed">{errorMsg}</p>
                    {needsEmailVerification && (
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        className="mt-2.5 px-3 py-1.5 bg-[#FF7A00] hover:bg-[#E06900] text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Resend Verification Email
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setErrorMsg(null)}
                    className="absolute top-3 right-3 p-1 text-rose-500 hover:text-rose-800 dark:text-rose-400 dark:hover:text-white transition-colors cursor-pointer"
                    aria-label="Dismiss error"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {infoMsg && (
              <div
                role="status"
                className="mb-5 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 text-xs flex items-start gap-3"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <p>{infoMsg}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="ym-admin-email"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Authorized Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="ym-admin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter authorized email"
                    autoComplete="email"
                    required
                    className="ym-auth-input pl-10 pr-4 py-2.5"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="ym-admin-password"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="ym-admin-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    required
                    className="ym-auth-input pl-10 pr-12 py-2.5"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="ym-auth-btn w-full py-3 px-4 bg-[#FF7A00] hover:bg-[#E06900] text-white font-semibold text-sm rounded-xl shadow-md shadow-[#FF7A00]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Claims...</span>
                  </>
                ) : (
                  <>
                    <span>Verify &amp; Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full ym-auth-divider-line" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="ym-auth-divider-label px-3 font-medium">
                    or verify with
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleAdminSignIn}
                disabled={isLoading || isGoogleLoading}
                className="ym-auth-btn ym-auth-google-btn w-full py-2.5 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#FF7A00]" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
              className="mt-4 w-full py-2.5 text-xs sm:text-sm text-slate-500 hover:text-slate-900 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to YuvaMitraa Sign In</span>
            </button>

            <div className="mt-5 pt-4 ym-auth-divider-line flex items-center justify-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Protected by Firebase Authentication</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
