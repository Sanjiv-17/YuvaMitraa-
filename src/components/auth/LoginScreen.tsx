import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  ShieldCheck, 
  Monitor, 
  Smartphone,
  GraduationCap,
  Briefcase,
  UserCheck,
  KeyRound,
  Check,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  sendPasswordResetLinkApi,
  firebaseLoginApi,
  verifyAdminClaimApi
} from '../../services/api';
import { 
  auth,
  loginWithEmailPassword,
  registerWithEmailPassword,
  sendFirebasePasswordResetEmail,
  sendVerificationEmail,
  signInWithGoogle,
  signOutUser,
  checkRedirectResult,
  syncUserProfileToFirestore,
  getUserProfileFromFirestore,
  getFirebaseCustomClaims
} from '../../services/firebase';

type ScreenMode = 'login' | 'register' | 'forgot';
type PublicSignupRole = 'student' | 'recruiter' | 'experienced';

interface FirebaseErrorInfo {
  code: string;
  message: string;
  solution?: string;
}

export const LoginScreen: React.FC = () => {
  const { login, viewportMode, setViewportMode } = useApp();

  // Navigation mode
  const [mode, setMode] = useState<ScreenMode>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Register form state (strictly 3 public options: student, recruiter, experienced)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState<PublicSignupRole>('student');
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regCinNumber, setRegCinNumber] = useState('');
  const [regCurrentRole, setRegCurrentRole] = useState('');
  const [regYearsExperience, setRegYearsExperience] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Forgot Password state
  const [forgotEmail, setForgotEmail] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<FirebaseErrorInfo | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Resolve user role from Firestore & Firebase claims after sign-in, then redirect to matching dashboard
  const completePostAuthLogin = async (fbUser: {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
    emailVerified?: boolean;
  }) => {
    const email = (fbUser.email || '').toLowerCase();
    const name = fbUser.displayName || (email ? email.split('@')[0] : 'Yuva Member');
    const photoUrl = fbUser.photoURL || '';
    const isFirebaseAuthUser = Boolean(auth.currentUser && auth.currentUser.uid === fbUser.uid);

    let idToken: string | undefined;
    let claims: Record<string, any> = {};
    if (isFirebaseAuthUser && auth.currentUser) {
      idToken = await auth.currentUser.getIdToken(true);
      claims = await getFirebaseCustomClaims(false);
    }

    // Check if user holds server-issued verified admin custom claim
    if (claims.admin === true && fbUser.emailVerified === true && idToken) {
      const adminRes = await verifyAdminClaimApi(idToken);
      login(adminRes.token, { ...adminRes.user, role: 'admin' });
      return;
    }

    // Read role from Firestore users/{uid} (gracefully null if Firestore API is disabled or offline)
    const firestoreProfile = isFirebaseAuthUser ? await getUserProfileFromFirestore(fbUser.uid) : null;

    // Pass Firestore role if available; otherwise let server preserve registered role
    const backendRes = await firebaseLoginApi({
      firebaseUid: fbUser.uid,
      idToken,
      email,
      name: firestoreProfile?.name || name,
      role: firestoreProfile?.role,
      photoUrl,
      currentRole: firestoreProfile?.currentRole,
      yearsOfExperience: firestoreProfile?.yearsOfExperience,
    });

    const resolvedRole = firestoreProfile?.role || backendRes.user?.role || 'student';

    // Reject unauthorized roles on public login (e.g. admin without custom claim or unsupported role)
    if (resolvedRole !== 'student' && resolvedRole !== 'recruiter' && resolvedRole !== 'experienced') {
      await signOutUser();
      const err: any = new Error('Unauthorized role: Your account role is not authorized for this portal.');
      err.code = 'auth/unauthorized-role';
      throw err;
    }

    if (!firestoreProfile && isFirebaseAuthUser) {
      // Best-effort sync to Firestore without blocking login if Firestore API is disabled
      syncUserProfileToFirestore(fbUser.uid, {
        name: backendRes.user?.name || name,
        email,
        role: resolvedRole,
        createdAt: backendRes.user?.createdAt || new Date().toISOString(),
        currentRole: backendRes.user?.currentRole,
        yearsOfExperience: backendRes.user?.yearsOfExperience,
      }, { isNewUser: true }).catch(() => {});
    }

    login(backendRes.token, {
      ...backendRes.user,
      role: resolvedRole,
      name: firestoreProfile?.name || backendRes.user?.name || name,
      email: firestoreProfile?.email || email,
    });
  };

  // Check for redirect result on page boot
  useEffect(() => {
    let isMounted = true;
    checkRedirectResult()
      .then(async (result) => {
        if (!isMounted || !result?.user) return;
        await completePostAuthLogin(result.user);
      })
      .catch((err) => {
        console.info('Initial redirect check completed:', err?.code || err?.message || 'ready');
      });

    // Check URL parameters for password reset link
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const resetParam = urlParams.get('reset_email');
      if (resetParam) {
        setMode('login');
        setLoginEmail(resetParam);
        setSuccessMessage(`Password reset link verified for ${resetParam}. You can now sign in with your updated password.`);
      }
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // Standardized Error Parsing with clear messages for wrong password, unknown email, and unauthorized role
  const handleAuthError = (err: any, context: string = 'Authentication') => {
    console.warn(`${context} notice:`, err?.code || err?.message || err);
    let code = err?.code || 'auth/operation-failed';
    let message = err?.message || 'An error occurred during authentication.';
    let solution: string | undefined;
    const msgLower = (message || '').toLowerCase();

    if (code === 'auth/wrong-password') {
      code = 'auth/wrong-password';
      message = 'Incorrect password. Please re-enter your password and try again.';
      solution = 'If you have forgotten your password, click "Forgot Password?" below to receive a password reset link.';
    } else if (
      code === 'auth/invalid-credential' ||
      msgLower.includes('invalid credential') ||
      msgLower.includes('incorrect password') ||
      msgLower.includes('wrong password')
    ) {
      code = 'auth/invalid-credential';
      message = 'Incorrect email or password. Please verify your credentials and try again.';
      solution = 'If you have forgotten your password, click "Forgot Password?" below to receive a secure password reset link.';
    } else if (code === 'auth/user-not-found' || msgLower.includes('no registered account') || msgLower.includes('user-not-found')) {
      code = 'auth/user-not-found';
      message = 'No account found with this email address.';
      solution = 'Please verify your email address or switch to "Create Account" to register.';
    } else if (code === 'auth/unauthorized-role' || msgLower.includes('unauthorized role')) {
      code = 'auth/unauthorized-role';
      message = 'Unauthorized role: You do not have permission to access or register with this role.';
      solution = 'Please sign in with an authorized account or select Student, Recruiter, or Experienced Candidate.';
    } else if (code === 'auth/email-already-in-use') {
      message = 'An account with this email address already exists.';
      solution = 'Please sign in with your existing password, or use the "Forgot Password?" option to reset it.';
    } else if (code === 'auth/weak-password') {
      message = 'The password is too weak. Please use at least 6 characters.';
      solution = 'Choose a strong password containing a combination of letters, numbers, and symbols.';
    } else if (code === 'auth/invalid-email') {
      message = 'The email address format is invalid.';
      solution = 'Please enter a valid email address.';
    } else if (code === 'auth/too-many-requests' || msgLower.includes('locked')) {
      message = 'Access to this account has been temporarily disabled due to multiple failed login attempts.';
      solution = 'Please wait a few moments before trying again, or reset your password.';
    } else if (code === 'auth/popup-closed-by-user') {
      message = 'Google sign-in popup was closed before completing authentication.';
      solution = 'Please click "Continue with Google" again and complete the account selection.';
    } else if (code === 'auth/configuration-not-found') {
      message = 'Google Sign-In provider is not enabled in Firebase Console for this project.';
      solution = 'You can sign in directly using your registered Email & Password.';
    } else if (code === 'auth/unauthorized-domain') {
      message = 'This preview domain is not listed in your Firebase Authorized Domains.';
      solution = 'Add this domain to Firebase Console > Authentication > Settings > Authorized domains.';
    }

    setErrorInfo({ code, message, solution });
  };

  // 1. Direct Email & Password Sign In via Firebase Auth + Firestore role lookup
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorInfo(null);
    setSuccessMessage(null);

    const email = loginEmail.trim();
    const pass = loginPassword;

    if (!email) {
      setErrorInfo({
        code: 'auth/missing-email',
        message: 'Please enter your registered email address.'
      });
      return;
    }

    if (!pass) {
      setErrorInfo({
        code: 'auth/missing-password',
        message: 'Please enter your password.'
      });
      return;
    }

    setIsLoading(true);

    try {
      const credential = await loginWithEmailPassword(email, pass);
      if (!credential.user) {
        throw new Error('Authentication failed. Please try again.');
      }
      await completePostAuthLogin(credential.user);
    } catch (err: any) {
      handleAuthError(err, 'Email & Password Login');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Direct User Registration (Student, Recruiter, or Experienced Candidate only)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorInfo(null);
    setSuccessMessage(null);

    const name = regName.trim();
    const email = regEmail.trim().toLowerCase();
    const pass = regPassword;
    const confirmPass = regConfirmPassword;

    if (!name) {
      setErrorInfo({
        code: 'auth/missing-name',
        message: 'Please enter your full name.'
      });
      return;
    }

    if (!email) {
      setErrorInfo({
        code: 'auth/missing-email',
        message: 'Please enter your email address.'
      });
      return;
    }

    if (!pass || pass.length < 6) {
      setErrorInfo({
        code: 'auth/weak-password',
        message: 'Password must be at least 6 characters in length.'
      });
      return;
    }

    if (pass !== confirmPass) {
      setErrorInfo({
        code: 'auth/password-mismatch',
        message: 'Passwords do not match. Please verify both password fields.'
      });
      return;
    }

    if (regRole !== 'student' && regRole !== 'recruiter' && regRole !== 'experienced') {
      setErrorInfo({
        code: 'auth/unauthorized-role',
        message: 'Unauthorized role selection.'
      });
      return;
    }

    if (!agreeTerms) {
      setErrorInfo({
        code: 'auth/terms-required',
        message: 'Please accept the Terms of Service to create your YuvaMitraa account.'
      });
      return;
    }

    setIsLoading(true);

    try {
      const credential = await registerWithEmailPassword(name, email, pass);
      const fbUser = credential.user;
      if (!fbUser) {
        throw new Error('Failed to create Firebase user.');
      }

      // Send email verification link (non-blocking if SMTP/Firebase rate-limited)
      sendVerificationEmail(fbUser).catch(() => {});

      const createdAt = new Date().toISOString();
      // Save chosen role in Firestore: users/{uid} -> { role, email, createdAt }
      await syncUserProfileToFirestore(fbUser.uid, {
        name,
        email,
        role: regRole,
        createdAt,
        currentRole: regRole === 'experienced' ? regCurrentRole.trim() : undefined,
        yearsOfExperience: regRole === 'experienced' ? regYearsExperience.trim() : undefined,
      }, { isNewUser: true });

      const idToken = await fbUser.getIdToken();
      const backendRes = await firebaseLoginApi({
        firebaseUid: fbUser.uid,
        idToken,
        email,
        name,
        role: regRole,
        currentRole: regRole === 'experienced' ? regCurrentRole.trim() : undefined,
        yearsOfExperience: regRole === 'experienced' ? regYearsExperience.trim() : undefined,
      });

      login(backendRes.token, {
        ...backendRes.user,
        role: regRole,
        name,
        email,
        companyName: regRole === 'recruiter' ? regCompanyName.trim() : undefined,
        cinOrRegistrationNumber: regRole === 'recruiter' ? regCinNumber.trim() : undefined,
        currentRole: regRole === 'experienced' ? regCurrentRole.trim() : undefined,
        yearsOfExperience: regRole === 'experienced' ? regYearsExperience.trim() : undefined,
      });
    } catch (err: any) {
      handleAuthError(err, 'Registration');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Send Password Reset Email Link
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorInfo(null);
    setSuccessMessage(null);

    const email = forgotEmail.trim();
    if (!email) {
      setErrorInfo({
        code: 'auth/missing-email',
        message: 'Please enter the email address associated with your account.'
      });
      return;
    }

    setIsLoading(true);

    try {
      await sendFirebasePasswordResetEmail(email);
      await sendPasswordResetLinkApi(email).catch(() => {});
      setSuccessMessage('Reset link sent. Check your inbox and spam folder.');
    } catch (err: any) {
      handleAuthError(err, 'Forgot Password');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Google Sign-In with popup + redirect fallback
  const handleGoogleSignInClick = async () => {
    setErrorInfo(null);
    setSuccessMessage(null);
    setIsGoogleLoading(true);

    try {
      const result: any = await signInWithGoogle();
      if (!result?.user) {
        setIsGoogleLoading(false);
        return;
      }

      await completePostAuthLogin(result.user);
    } catch (err: any) {
      handleAuthError(err, 'Google Sign-In');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-3 sm:p-6 font-['Poppins',sans-serif] relative overflow-hidden">
      
      {/* Background Subtle Gradient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-b from-[#FF7A00]/15 via-transparent to-transparent pointer-events-none rounded-full blur-3xl"></div>
      
      {/* Viewport Control Bar */}
      <header className="w-full max-w-md mb-4 flex items-center justify-between bg-slate-800/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-700/80 text-xs shadow-lg relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="font-semibold text-slate-200">YuvaMitraa Secure Auth</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-700/60">
          <button
            type="button"
            onClick={() => setViewportMode('desktop')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
              viewportMode === 'desktop' ? 'bg-[#FF7A00] text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setViewportMode('mobile')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
              viewportMode === 'mobile' ? 'bg-[#FF7A00] text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Mobile</span>
          </button>
        </div>
      </header>

      {/* Main Container Card */}
      <main className="w-full max-w-md bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 relative z-10 transition-all">
        
        {/* YuvaMitraa Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#FF7A00] to-amber-500 p-0.5 shadow-lg shadow-[#FF7A00]/25 mb-3">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-[#FF7A00]" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            YuvaMitraa
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-[#FF7A00]/20 text-[#FF7A00] border border-[#FF7A00]/30">
              Official
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            National Youth Career & Skill Gateway
          </p>
        </div>

        {/* Tab Switcher between Login & Register (hidden when in forgot mode) */}
        {mode !== 'forgot' && (
          <div className="grid grid-cols-2 p-1 bg-slate-900 border border-slate-800 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorInfo(null);
                setSuccessMessage(null);
              }}
              className={`py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-[#FF7A00] text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorInfo(null);
                setSuccessMessage(null);
              }}
              className={`py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-[#FF7A00] text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Exact Firebase Error Box */}
        {errorInfo && (
          <div className="mb-5 p-4 rounded-2xl bg-rose-950/60 border-2 border-rose-600 text-rose-200 text-xs shadow-lg animate-fadeIn relative">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-xl bg-rose-600 text-white shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="flex-1 pr-6">
                <div className="inline-block px-2 py-0.5 rounded-md bg-rose-600 text-white font-mono text-[10px] font-bold uppercase tracking-wider mb-1">
                  {errorInfo.code}
                </div>
                <h2 className="font-bold text-white text-sm leading-tight">
                  Authentication Failure
                </h2>
                <p className="text-rose-200 mt-1 leading-relaxed">
                  {errorInfo.message}
                </p>
                {errorInfo.solution && (
                  <div className="mt-2.5 p-2 rounded-xl bg-rose-900/40 border border-rose-800/80 text-[11px] text-rose-100">
                    <span className="font-semibold text-white">Suggested Action: </span>
                    {errorInfo.solution}
                  </div>
                )}
                {errorInfo.code === 'auth/user-not-found' && (
                  <button
                    type="button"
                    onClick={() => {
                      setRegEmail(loginEmail);
                      setMode('register');
                      setErrorInfo(null);
                    }}
                    className="mt-2.5 px-3 py-1.5 bg-[#FF7A00] hover:bg-[#e56d00] text-white font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Create Account with {loginEmail}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setErrorInfo(null)}
                className="absolute top-3 right-3 text-rose-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Success Message Banner */}
        {successMessage && (
          <div className="mb-5 p-4 rounded-2xl bg-emerald-950/60 border border-emerald-600/70 text-emerald-200 text-xs shadow-lg animate-fadeIn flex items-start gap-3">
            <div className="p-1.5 rounded-xl bg-emerald-600 text-white shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-white text-sm">Success</h2>
              <p className="text-emerald-200 mt-1 leading-relaxed">
                {successMessage}
              </p>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VIEW 1: SIGN IN (EMAIL + PASSWORD)                   */}
        {/* ---------------------------------------------------- */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            
            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF7A00] focus:ring-1 focus:ring-[#FF7A00] transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setForgotEmail(loginEmail);
                    setErrorInfo(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-[#FF7A00] hover:text-amber-400 font-medium transition-colors cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
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

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-sm bg-slate-900 border-slate-700 text-[#FF7A00] focus:ring-[#FF7A00] cursor-pointer"
                />
                <span>Remember this device</span>
              </label>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#FF7A00] to-amber-500 hover:from-[#e56d00] hover:to-amber-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-[#FF7A00]/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="bg-slate-950 px-3 text-slate-500 font-semibold tracking-wider">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleSignInClick}
              disabled={isLoading || isGoogleLoading}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800/90 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-center gap-3 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGoogleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>
          </form>
        )}

        {/* ---------------------------------------------------- */}
        {/* VIEW 2: REGISTRATION (NAME, EMAIL, PASSWORD, CONFIRM)*/}
        {/* ---------------------------------------------------- */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF7A00] focus:ring-1 focus:ring-[#FF7A00] transition-colors"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF7A00] focus:ring-1 focus:ring-[#FF7A00] transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Password <span className="text-[10px] text-slate-400">(min. 6 characters)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Create password"
                  autoComplete="new-password"
                  required
                  minLength={6}
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

            {/* Confirm Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Confirm Password
                </label>
                {regConfirmPassword && (
                  <span className={`text-[10px] font-semibold flex items-center gap-1 ${
                    regPassword === regConfirmPassword ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {regPassword === regConfirmPassword ? (
                      <>
                        <Check className="w-3 h-3" /> Passwords match
                      </>
                    ) : (
                      'Passwords do not match'
                    )}
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className={`w-full pl-10 pr-10 py-2.5 bg-slate-900/90 border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-colors ${
                    regConfirmPassword && regPassword !== regConfirmPassword
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-slate-700 focus:border-[#FF7A00] focus:ring-1 focus:ring-[#FF7A00]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Role Selection Toggle (Student, Recruiter, Experienced Candidate only) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                I am registering as:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setRegRole('student')}
                  className={`py-2 px-2 rounded-xl border text-[11px] font-medium flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    regRole === 'student'
                      ? 'bg-[#FF7A00]/15 border-[#FF7A00] text-amber-300 font-bold'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRegRole('recruiter')}
                  className={`py-2 px-2 rounded-xl border text-[11px] font-medium flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    regRole === 'recruiter'
                      ? 'bg-[#FF7A00]/15 border-[#FF7A00] text-amber-300 font-bold'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  <span>Recruiter</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRegRole('experienced')}
                  className={`py-2 px-2 rounded-xl border text-[11px] font-medium flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    regRole === 'experienced'
                      ? 'bg-[#FF7A00]/15 border-[#FF7A00] text-amber-300 font-bold'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span className="text-center leading-tight">Experienced Candidate</span>
                </button>
              </div>
            </div>

            {/* Conditional Experienced Candidate Fields */}
            {regRole === 'experienced' && (
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700 space-y-2.5 animate-in fade-in">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Current / Previous Role
                  </label>
                  <input
                    type="text"
                    value={regCurrentRole}
                    onChange={(e) => setRegCurrentRole(e.target.value)}
                    placeholder="e.g. Software Engineer, Operations Analyst"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF7A00]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Years of Experience
                  </label>
                  <input
                    type="text"
                    value={regYearsExperience}
                    onChange={(e) => setRegYearsExperience(e.target.value)}
                    placeholder="e.g. 3 years"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF7A00]"
                  />
                </div>
              </div>
            )}

            {/* Conditional Recruiter Fields */}
            {regRole === 'recruiter' && (
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700 space-y-2.5 animate-in fade-in">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Registered Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={regCompanyName}
                    onChange={(e) => setRegCompanyName(e.target.value)}
                    placeholder="e.g. Your Registered Company Pvt Ltd"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF7A00]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Corporate Identification Number (CIN) or Reg *
                  </label>
                  <input
                    type="text"
                    required
                    value={regCinNumber}
                    onChange={(e) => setRegCinNumber(e.target.value)}
                    placeholder="e.g. U72900DL2022PTC394821"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-[#FF7A00]"
                  />
                </div>
              </div>
            )}

            {/* Terms Acceptance */}
            <div className="pt-1">
              <label className="flex items-start gap-2 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded-sm bg-slate-900 border-slate-700 text-[#FF7A00] focus:ring-[#FF7A00] cursor-pointer"
                />
                <span>
                  I agree to the <span className="text-[#FF7A00] underline">Terms of Service</span> and <span className="text-[#FF7A00] underline">Privacy Policy</span> of YuvaMitraa.
                </span>
              </label>
            </div>

            {/* Register Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !agreeTerms}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-[#FF7A00] to-amber-500 hover:from-[#e56d00] hover:to-amber-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-[#FF7A00]/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ---------------------------------------------------- */}
        {/* VIEW 3: FORGOT PASSWORD (EMAIL RESET LINK)           */}
        {/* ---------------------------------------------------- */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
            <div className="text-left mb-2">
              <h2 className="text-lg font-bold text-white">Reset Password</h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your registered email address and we will dispatch a secure link to reset your password.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Registered Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF7A00] focus:ring-1 focus:ring-[#FF7A00] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#FF7A00] to-amber-500 hover:from-[#e56d00] hover:to-amber-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-[#FF7A00]/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Dispatching Reset Link...</span>
                </>
              ) : (
                <>
                  <span>Send Password Reset Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorInfo(null);
                setSuccessMessage(null);
              }}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
            >
              Back to Sign In
            </button>
          </form>
        )}

        {/* Footer Guarantee */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Protected by Firebase Authentication & 256-bit SSL</span>
        </div>
      </main>
    </div>
  );
};
