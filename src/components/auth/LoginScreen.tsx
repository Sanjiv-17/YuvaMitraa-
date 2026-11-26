import React, { useState, useEffect, useRef } from 'react';
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
  ShieldCheck, 
  GraduationCap,
  Briefcase,
  UserCheck,
  KeyRound,
  Check,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  loginApi,
  registerDirectApi,
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
  getFirebaseTokenAndClaims
} from '../../services/firebase';

type ScreenMode = 'login' | 'register' | 'forgot';
type PublicSignupRole = 'student' | 'recruiter' | 'experienced';

interface FirebaseErrorInfo {
  code: string;
  message: string;
  solution?: string;
}

export const LoginScreen: React.FC = () => {
  const { login } = useApp();

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

  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);
  // Synchronous submission lock prevents rapid double-clicks / duplicate account creation before React re-renders
  const isSubmittingRef = useRef(false);

  // Resolve user role from Firestore & Firebase claims in parallel after sign-in; non-essential subcollections load in background
  const completePostAuthLogin = async (
    fbUser: {
      uid: string;
      email?: string | null;
      displayName?: string | null;
      photoURL?: string | null;
      emailVerified?: boolean;
    },
    oauthAccessToken?: string,
    rememberMeFlag: boolean = true
  ) => {
    const email = (fbUser.email || '').toLowerCase();
    const name = fbUser.displayName || (email ? email.split('@')[0] : 'Yuva Member');
    const photoUrl = fbUser.photoURL || '';
    const isFirebaseAuthUser = Boolean(auth.currentUser && auth.currentUser.uid === fbUser.uid);

    let idToken: string | undefined;
    let claims: Record<string, any> = {};
    let firestoreProfile: any = null;

    if (isFirebaseAuthUser && auth.currentUser) {
      const [tokenAndClaims, profileVal] = await Promise.all([
        getFirebaseTokenAndClaims(false),
        getUserProfileFromFirestore(fbUser.uid),
      ]);
      idToken = tokenAndClaims.token || undefined;
      claims = tokenAndClaims.claims;
      firestoreProfile = profileVal;
    }

    // Check if user holds server-issued verified admin custom claim
    if (claims.admin === true && fbUser.emailVerified === true && idToken) {
      const adminRes = await verifyAdminClaimApi(idToken);
      login(adminRes.token, { ...adminRes.user, id: fbUser.uid, role: 'admin' }, {
        preloadedProfile: firestoreProfile,
      });
      return;
    }

    // Exchange verified Firebase token for backend session + bundled initialData (single round-trip)
    const backendRes = await firebaseLoginApi({
      firebaseUid: fbUser.uid,
      idToken,
      oauthAccessToken,
      email,
      name: firestoreProfile?.name || name,
      role: firestoreProfile?.role,
      photoUrl,
      companyName: firestoreProfile?.companyName,
      cinOrRegistrationNumber: firestoreProfile?.cinOrRegistrationNumber,
      currentRole: firestoreProfile?.currentRole,
      yearsOfExperience: firestoreProfile?.yearsOfExperience,
      rememberMe: rememberMeFlag,
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
      // Save essential profile document in background without blocking login transition
      syncUserProfileToFirestore(fbUser.uid, {
        name: backendRes.user?.name || name,
        email,
        role: resolvedRole,
        createdAt: backendRes.user?.createdAt || new Date().toISOString(),
        currentRole: backendRes.user?.currentRole,
        yearsOfExperience: backendRes.user?.yearsOfExperience,
      }, { isNewUser: true }).catch(() => {});
    }

    login(
      backendRes.token,
      {
        ...backendRes.user,
        id: fbUser.uid,
        role: resolvedRole,
        name: firestoreProfile?.name || backendRes.user?.name || name,
        email: firestoreProfile?.email || email,
      },
      {
        isNewUser: Boolean(backendRes.isNewUser && !firestoreProfile),
        initialData: backendRes.initialData,
        preloadedProfile: firestoreProfile,
      }
    );
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

    // Preload primary dashboard chunks during idle time so login transition is instant
    const preloadTimer = setTimeout(() => {
      import('../home/HomeDashboard').catch(() => {});
      import('../experienced/ExperiencedDashboard').catch(() => {});
      import('../recruiter/RecruiterPortal').catch(() => {});
    }, 350);

    return () => {
      isMounted = false;
      clearTimeout(preloadTimer);
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
    } else if (code === 'auth/configuration-not-found' || code === 'auth/operation-not-allowed') {
      message = 'Email/Password sign-in via Firebase is not enabled in this project.';
      solution = 'Please try signing in with Google, or verify your email and password credentials.';
    } else if (code === 'auth/unauthorized-domain') {
      message = 'This preview domain is not listed in your Firebase Authorized Domains.';
      solution = 'Add this domain to Firebase Console > Authentication > Settings > Authorized domains.';
    } else if (
      code === 'auth/network-request-failed' ||
      msgLower.includes('network') ||
      msgLower.includes('timed out') ||
      msgLower.includes('timeout') ||
      msgLower.includes('failed to fetch')
    ) {
      code = 'auth/network-request-failed';
      message = 'Connection is slow or offline. Unable to reach the authentication server right now.';
      solution = 'Please check your internet connection and try again in a moment.';
    }

    setErrorInfo({ code, message, solution });
  };

  // 1. Direct Email & Password Sign In via Firebase Auth + Firestore role lookup
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
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

    isSubmittingRef.current = true;
    setIsLoading(true);

    try {
      try {
        const credential = await loginWithEmailPassword(email, pass, rememberMe);
        if (!credential.user) {
          throw new Error('Authentication failed. Please try again.');
        }
        await completePostAuthLogin(credential.user, undefined, rememberMe);
      } catch (fbErr: any) {
        const fbCode = fbErr?.code || '';
        const shouldFallbackToBackend =
          fbCode === 'auth/operation-not-allowed' ||
          fbCode === 'auth/configuration-not-found' ||
          fbCode === 'auth/user-not-found' ||
          fbCode === 'auth/invalid-credential';

        if (!shouldFallbackToBackend) {
          throw fbErr;
        }

        try {
          const backendRes = await loginApi(email, pass, rememberMe);
          login(backendRes.token, backendRes.user, { initialData: backendRes.initialData });
        } catch (backendErr: any) {
          if (fbCode === 'auth/operation-not-allowed' || fbCode === 'auth/configuration-not-found') {
            throw backendErr;
          }
          throw fbErr;
        }
      }
    } catch (err: any) {
      handleAuthError(err, 'Email & Password Login');
    } finally {
      isSubmittingRef.current = false;
      setIsLoading(false);
    }
  };

  // 2. Fast Direct User Registration (Student, Recruiter, or Experienced Candidate only)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
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

    isSubmittingRef.current = true;
    setIsLoading(true);

    try {
      const companyNameVal = regRole === 'recruiter' ? regCompanyName.trim() : undefined;
      const cinVal = regRole === 'recruiter' ? regCinNumber.trim() : undefined;
      const currentRoleVal = regRole === 'experienced' ? regCurrentRole.trim() : undefined;
      const yearsExpVal = regRole === 'experienced' ? regYearsExperience.trim() : undefined;

      try {
        const credential = await registerWithEmailPassword(name, email, pass);
        const fbUser = credential.user;
        if (!fbUser) {
          throw new Error('Failed to create Firebase user.');
        }

        const createdAt = new Date().toISOString();
        const idToken = await fbUser.getIdToken(false);

        // Save essential user document to Firestore & send verification email in background (non-blocking)
        sendVerificationEmail(fbUser).catch(() => {});
        syncUserProfileToFirestore(
          fbUser.uid,
          {
            name,
            email,
            role: regRole,
            createdAt,
            companyName: companyNameVal,
            cinOrRegistrationNumber: cinVal,
            currentRole: currentRoleVal,
            yearsOfExperience: yearsExpVal,
          },
          { isNewUser: true }
        ).catch(() => {});

        // Single backend session exchange — returns session token + clean empty initialData
        const backendRes = await firebaseLoginApi({
          firebaseUid: fbUser.uid,
          idToken,
          email,
          name,
          role: regRole,
          companyName: companyNameVal,
          cinOrRegistrationNumber: cinVal,
          currentRole: currentRoleVal,
          yearsOfExperience: yearsExpVal,
          rememberMe: true,
        });

        login(
          backendRes.token,
          {
            ...backendRes.user,
            id: fbUser.uid,
            role: regRole,
            name,
            email,
            companyName: companyNameVal,
            cinOrRegistrationNumber: cinVal,
            currentRole: currentRoleVal,
            yearsOfExperience: yearsExpVal,
          },
          {
            isNewUser: true,
            initialData: backendRes.initialData,
          }
        );
      } catch (fbErr: any) {
        const fbCode = fbErr?.code || '';
        if (fbCode !== 'auth/operation-not-allowed' && fbCode !== 'auth/configuration-not-found') {
          throw fbErr;
        }

        // Fallback to backend PBKDF2 registration when Email/Password is disabled in Firebase Console
        const regRes = await registerDirectApi({
          name,
          email,
          password: pass,
          confirmPassword: confirmPass,
          role: regRole,
          companyName: companyNameVal,
          cinOrRegistrationNumber: cinVal,
          currentRole: currentRoleVal,
          yearsOfExperience: yearsExpVal,
        });

        login(regRes.token, regRes.user, {
          isNewUser: true,
          initialData: regRes.initialData,
        });
      }
    } catch (err: any) {
      handleAuthError(err, 'Registration');
    } finally {
      isSubmittingRef.current = false;
      setIsLoading(false);
    }
  };

  // 3. Send Password Reset Email Link
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
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

    isSubmittingRef.current = true;
    setIsLoading(true);

    try {
      try {
        await sendFirebasePasswordResetEmail(email);
        void sendPasswordResetLinkApi(email).catch(() => {});
      } catch (fbErr: any) {
        const fbCode = fbErr?.code || '';
        if (fbCode === 'auth/operation-not-allowed' || fbCode === 'auth/configuration-not-found') {
          await sendPasswordResetLinkApi(email);
        } else {
          throw fbErr;
        }
      }
      setSuccessMessage('Reset link sent. Check your inbox and spam folder.');
    } catch (err: any) {
      handleAuthError(err, 'Forgot Password');
    } finally {
      isSubmittingRef.current = false;
      setIsLoading(false);
    }
  };

  // 4. Google Sign-In with popup + redirect fallback
  const handleGoogleSignInClick = async () => {
    if (isSubmittingRef.current) return;
    setErrorInfo(null);
    setSuccessMessage(null);
    isSubmittingRef.current = true;
    setIsGoogleLoading(true);

    try {
      const result: any = await signInWithGoogle();
      if (!result?.user) {
        return;
      }

      await completePostAuthLogin(result.user, result.oauthAccessToken, rememberMe);
    } catch (err: any) {
      handleAuthError(err, 'Google Sign-In');
    } finally {
      isSubmittingRef.current = false;
      setIsGoogleLoading(false);
    }
  };

  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  const brandWelcomeCopy =
    mode === 'register'
      ? {
          eyebrow: 'Start your career journey',
          heading: 'Build skills and land verified internships across India.',
          description:
            'Create your YuvaMitraa account to receive AI-matched internship recommendations, track resume updates, and earn QR-verifiable certificates.',
        }
      : mode === 'forgot'
      ? {
          eyebrow: 'Account recovery',
          heading: 'Regain secure access to your YuvaMitraa workspace.',
          description:
            'We will send a verified password reset link to your registered email address so you can pick up right where you left off.',
        }
      : {
          eyebrow: 'National Youth Career & Skill Gateway',
          heading: 'Welcome back to your personalized career launchpad.',
          description:
            'Sign in to explore AI-matched internships, practice industry skills, audit your resume for ATS readiness, and manage your applications in one place.',
        };

  return (
    <div className="ym-auth-page font-['Poppins',sans-serif]">
      <div className="ym-auth-shell">
        {/* ============================================================ */}
        {/* LEFT COLUMN (Desktop/Tablet Landscape) / TOP HEADER (Mobile) */}
        {/* ============================================================ */}
        <aside className="ym-auth-brand-panel" aria-label="About YuvaMitraa">
          <div className="space-y-5 lg:space-y-7">
            {/* Prominent YuvaMitraa Logo & Brand Identity */}
            <div className="flex items-center gap-3">
              {!logoLoadFailed ? (
                <img
                  src="/logo.png"
                  alt="YuvaMitraa Logo"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoLoadFailed(true)}
                  className="w-11 h-11 lg:w-12 lg:h-12 rounded-xl object-contain bg-white/95 p-1 shadow-md shrink-0"
                />
              ) : (
                <div className="w-11 h-11 lg:w-12 lg:h-12 rounded-xl bg-[#FF7A00] text-white font-bold text-lg flex items-center justify-center shadow-md shrink-0">
                  YM
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xl lg:text-2xl font-bold tracking-tight text-white leading-none">
                  Yuva<span className="text-[#FF7A00]">Mitraa</span>
                </div>
                <p className="text-xs text-slate-300 mt-1 truncate">
                  Youth Skill Development &amp; Internship Gateway
                </p>
              </div>
            </div>

            {/* Welcome Headline & Short Platform Description (Tablet & Desktop) */}
            <div className="ym-auth-brand-details space-y-3">
              <p className="text-xs font-semibold text-[#FF9B3D] tracking-wide">
                {brandWelcomeCopy.eyebrow}
              </p>
              <h1
                className="text-2xl lg:text-[32px] font-bold text-white leading-[1.2] tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                {brandWelcomeCopy.heading}
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed max-w-md">
                {brandWelcomeCopy.description}
              </p>
            </div>
          </div>

          {/* Core Platform Highlights (Desktop & Tablet Landscape) */}
          <div className="ym-auth-brand-highlights border-t border-white/10 pt-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-white">
                01. AI-Powered Internship Matching
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Weighted recommendations calibrated to your skills, branch, interests, and location preferences.
              </p>
            </div>

            <div className="border-t border-white/10 pt-4 space-y-1">
              <h2 className="text-sm font-semibold text-white">
                02. Verified Courses &amp; Digital Credentials
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Structured skill paths, coding practice, and QR-verified digital certificates stored under your account.
              </p>
            </div>

            <div className="border-t border-white/10 pt-4 space-y-1">
              <h2 className="text-sm font-semibold text-white">
                03. ATS Resume Analyzer &amp; Career Mentor
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Upload or build resumes with automatic update tracking, instant ATS scoring, and interview readiness tools.
              </p>
            </div>
          </div>

          {/* Quiet Editorial Footer (Desktop & Tablet Landscape) */}
          <div className="ym-auth-brand-footer border-t border-white/10 pt-5 space-y-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-300">
              <span>Students</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>Recruiters</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>Experienced Professionals</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Secured with Firebase Authentication &amp; private per-user account isolation.
            </p>
          </div>
        </aside>

        {/* ============================================================ */}
        {/* RIGHT COLUMN (Desktop/Tablet Landscape) / MAIN CARD (Mobile) */}
        {/* ============================================================ */}
        <main className="ym-auth-form-panel">
          <div className="ym-auth-form-inner">
            {/* Form Section Heading */}
            <div className="mb-5 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {mode === 'login'
                  ? 'Sign in to your account'
                  : mode === 'register'
                  ? 'Create your free account'
                  : 'Reset your password'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                {mode === 'login'
                  ? 'Enter your credentials to access your personalized dashboard.'
                  : mode === 'register'
                  ? 'Join YuvaMitraa as a student, recruiter, or experienced candidate.'
                  : 'Enter your registered email address to receive a password reset link.'}
              </p>
            </div>

            {/* Segmented Switcher between Sign In & Create Account */}
            {mode !== 'forgot' && (
              <div
                role="tablist"
                aria-label="Authentication mode"
                className="ym-auth-tabs grid grid-cols-2 p-1 rounded-xl mb-6"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'login'}
                  onClick={() => {
                    setMode('login');
                    setErrorInfo(null);
                    setSuccessMessage(null);
                  }}
                  className={`min-h-[40px] py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    mode === 'login'
                      ? 'bg-[#FF7A00] text-white shadow-xs'
                      : 'ym-auth-tab-idle'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'register'}
                  onClick={() => {
                    setMode('register');
                    setErrorInfo(null);
                    setSuccessMessage(null);
                  }}
                  className={`min-h-[40px] py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    mode === 'register'
                      ? 'bg-[#FF7A00] text-white shadow-xs'
                      : 'ym-auth-tab-idle'
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}

            {/* Exact Firebase Error Alert */}
            {errorInfo && (
              <div
                role="alert"
                className="mb-5 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-700 text-rose-900 dark:text-rose-100 text-xs ym-auth-panel-fade relative"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-rose-900 dark:text-white text-xs sm:text-sm leading-tight">
                        Authentication Issue
                      </h3>
                      <span className="font-mono text-[10px] text-rose-600 dark:text-rose-300">
                        {errorInfo.code}
                      </span>
                    </div>
                    <p className="text-rose-800 dark:text-rose-200 mt-1 leading-relaxed">
                      {errorInfo.message}
                    </p>
                    {errorInfo.solution && (
                      <p className="mt-2 pt-2 border-t border-rose-200/80 dark:border-rose-800/80 text-[11px] text-rose-700 dark:text-rose-200 leading-relaxed">
                        <span className="font-semibold">Tip: </span>
                        {errorInfo.solution}
                      </p>
                    )}
                    {errorInfo.code === 'auth/user-not-found' && (
                      <button
                        type="button"
                        onClick={() => {
                          setRegEmail(loginEmail);
                          setMode('register');
                          setErrorInfo(null);
                        }}
                        className="mt-2.5 px-3 py-2 bg-[#FF7A00] hover:bg-[#E06900] text-white font-semibold text-xs rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="truncate max-w-[220px]">Create Account with {loginEmail}</span>
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setErrorInfo(null)}
                    className="absolute top-3 right-3 p-1 text-rose-500 hover:text-rose-800 dark:text-rose-400 dark:hover:text-white transition-colors cursor-pointer"
                    aria-label="Dismiss error"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Success Message Banner */}
            {successMessage && (
              <div
                role="status"
                className="mb-5 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 text-xs ym-auth-panel-fade flex items-start gap-3"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-emerald-900 dark:text-white text-xs sm:text-sm">
                    Success
                  </h3>
                  <p className="text-emerald-800 dark:text-emerald-200 mt-1 leading-relaxed">
                    {successMessage}
                  </p>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------- */}
            {/* VIEW 1: SIGN IN (EMAIL + PASSWORD)                   */}
            {/* ---------------------------------------------------- */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4 ym-auth-panel-fade">
                {/* Email Address */}
                <div>
                  <label
                    htmlFor="ym-login-email"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="ym-login-email"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="name@example.com"
                      autoComplete="email"
                      required
                      className="ym-auth-input pl-10 pr-4 py-2.5"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label
                      htmlFor="ym-login-password"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
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
                      className="text-xs text-[#FF7A00] hover:text-[#E06900] font-semibold transition-colors cursor-pointer py-0.5"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="ym-login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
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

                {/* Remember Me */}
                <div className="flex items-center justify-between pt-0.5">
                  <label className="inline-flex items-center gap-2.5 text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded-sm border-slate-300 dark:border-slate-600 text-[#FF7A00] focus:ring-[#FF7A00] accent-[#FF7A00] cursor-pointer"
                    />
                    <span>Remember this device</span>
                  </label>
                </div>

                {/* Primary Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || isGoogleLoading}
                  className="ym-auth-btn w-full py-3 px-4 bg-[#FF7A00] hover:bg-[#E06900] text-white font-semibold text-sm rounded-xl shadow-md shadow-[#FF7A00]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full ym-auth-divider-line" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="ym-auth-divider-label px-3 font-medium">
                      or continue with
                    </span>
                  </div>
                </div>

                {/* Google Sign-In Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignInClick}
                  disabled={isLoading || isGoogleLoading}
                  className="ym-auth-btn ym-auth-google-btn w-full py-2.5 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#FF7A00]" />
                  ) : (
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
                  <span>{isGoogleLoading ? 'Signing in with Google...' : 'Continue with Google'}</span>
                </button>
              </form>
            )}

            {/* ---------------------------------------------------- */}
            {/* VIEW 2: REGISTRATION (NAME, EMAIL, PASSWORD, CONFIRM)*/}
            {/* ---------------------------------------------------- */}
            {mode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5 ym-auth-panel-fade">
                {/* Full Name */}
                <div>
                  <label
                    htmlFor="ym-reg-name"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="ym-reg-name"
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Enter your full name"
                      autoComplete="name"
                      required
                      className="ym-auth-input pl-10 pr-4 py-2.5"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label
                    htmlFor="ym-reg-email"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="ym-reg-email"
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="name@example.com"
                      autoComplete="email"
                      required
                      className="ym-auth-input pl-10 pr-4 py-2.5"
                    />
                  </div>
                </div>

                {/* Password + Confirm Password (1-col mobile, 2-col tablet/desktop) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label
                      htmlFor="ym-reg-password"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Password <span className="font-normal text-slate-400">(6+ chars)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="ym-reg-password"
                        type={showPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Create password"
                        autoComplete="new-password"
                        required
                        minLength={6}
                        className="ym-auth-input pl-10 pr-11 py-2.5"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 w-10 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="ym-reg-confirm-password"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        id="ym-reg-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        autoComplete="new-password"
                        required
                        minLength={6}
                        className={`ym-auth-input pl-10 pr-11 py-2.5 ${
                          regConfirmPassword && regPassword !== regConfirmPassword
                            ? '!border-rose-500 focus:!ring-rose-500/20'
                            : ''
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 w-10 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {regConfirmPassword && (
                  <p
                    className={`text-xs font-medium flex items-center gap-1.5 -mt-1 ${
                      regPassword === regConfirmPassword
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {regPassword === regConfirmPassword ? (
                      <>
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>Passwords match</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Passwords do not match</span>
                      </>
                    )}
                  </p>
                )}

                {/* Role Selection Toggle (Student, Recruiter, Experienced Candidate only) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    I am registering as:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setRegRole('student')}
                      aria-pressed={regRole === 'student'}
                      className={`ym-auth-role-btn min-h-[58px] py-2 px-2 rounded-xl text-xs font-medium flex flex-col items-center justify-center gap-1 transition-all cursor-pointer min-w-0 ${
                        regRole === 'student' ? 'ym-auth-role-btn--active' : ''
                      }`}
                    >
                      <GraduationCap className="w-4 h-4 shrink-0" />
                      <span className="text-center leading-tight">Student</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegRole('recruiter')}
                      aria-pressed={regRole === 'recruiter'}
                      className={`ym-auth-role-btn min-h-[58px] py-2 px-2 rounded-xl text-xs font-medium flex flex-col items-center justify-center gap-1 transition-all cursor-pointer min-w-0 ${
                        regRole === 'recruiter' ? 'ym-auth-role-btn--active' : ''
                      }`}
                    >
                      <Briefcase className="w-4 h-4 shrink-0" />
                      <span className="text-center leading-tight">Recruiter</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegRole('experienced')}
                      aria-pressed={regRole === 'experienced'}
                      aria-label="Experienced Candidate"
                      className={`ym-auth-role-btn min-h-[58px] py-2 px-1.5 rounded-xl text-xs font-medium flex flex-col items-center justify-center gap-1 transition-all cursor-pointer min-w-0 ${
                        regRole === 'experienced' ? 'ym-auth-role-btn--active' : ''
                      }`}
                    >
                      <UserCheck className="w-4 h-4 shrink-0" />
                      <span className="text-center leading-tight">Experienced</span>
                    </button>
                  </div>
                </div>

                {/* Conditional Experienced Candidate Fields */}
                {regRole === 'experienced' && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-3 ym-auth-panel-fade">
                    <div>
                      <label
                        htmlFor="ym-reg-current-role"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                      >
                        Current / Previous Role
                      </label>
                      <input
                        id="ym-reg-current-role"
                        type="text"
                        value={regCurrentRole}
                        onChange={(e) => setRegCurrentRole(e.target.value)}
                        placeholder="e.g. Software Engineer"
                        className="ym-auth-input px-3.5 py-2"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="ym-reg-years-exp"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                      >
                        Years of Experience
                      </label>
                      <input
                        id="ym-reg-years-exp"
                        type="text"
                        value={regYearsExperience}
                        onChange={(e) => setRegYearsExperience(e.target.value)}
                        placeholder="e.g. 3 years"
                        className="ym-auth-input px-3.5 py-2"
                      />
                    </div>
                  </div>
                )}

                {/* Conditional Recruiter Fields */}
                {regRole === 'recruiter' && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-3 ym-auth-panel-fade">
                    <div>
                      <label
                        htmlFor="ym-reg-company"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                      >
                        Registered Company Name *
                      </label>
                      <input
                        id="ym-reg-company"
                        type="text"
                        required
                        value={regCompanyName}
                        onChange={(e) => setRegCompanyName(e.target.value)}
                        placeholder="e.g. Your Registered Company Pvt Ltd"
                        className="ym-auth-input px-3.5 py-2"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="ym-reg-cin"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                      >
                        Corporate Identification Number (CIN) or Reg *
                      </label>
                      <input
                        id="ym-reg-cin"
                        type="text"
                        required
                        value={regCinNumber}
                        onChange={(e) => setRegCinNumber(e.target.value)}
                        placeholder="e.g. U72900DL2022PTC394821"
                        className="ym-auth-input px-3.5 py-2 font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Terms Acceptance */}
                <div className="pt-1">
                  <label className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer leading-relaxed">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded-sm border-slate-300 dark:border-slate-600 text-[#FF7A00] focus:ring-[#FF7A00] accent-[#FF7A00] cursor-pointer shrink-0"
                    />
                    <span>
                      I agree to the{' '}
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.preventDefault();
                          setLegalModal('terms');
                        }}
                        className="text-[#FF7A00] font-semibold underline hover:text-[#E06900] cursor-pointer"
                      >
                        Terms of Service
                      </button>{' '}
                      and{' '}
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.preventDefault();
                          setLegalModal('privacy');
                        }}
                        className="text-[#FF7A00] font-semibold underline hover:text-[#E06900] cursor-pointer"
                      >
                        Privacy Policy
                      </button>{' '}
                      of YuvaMitraa.
                    </span>
                  </label>
                </div>

                {/* Register Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || !agreeTerms}
                  className="ym-auth-btn w-full mt-1 py-3 px-4 bg-[#FF7A00] hover:bg-[#E06900] text-white font-semibold text-sm rounded-xl shadow-md shadow-[#FF7A00]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating your account...</span>
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
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 ym-auth-panel-fade">
                <div>
                  <label
                    htmlFor="ym-forgot-email"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="ym-forgot-email"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@example.com"
                      autoComplete="email"
                      required
                      className="ym-auth-input pl-10 pr-4 py-2.5"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="ym-auth-btn w-full py-3 px-4 bg-[#FF7A00] hover:bg-[#E06900] text-white font-semibold text-sm rounded-xl shadow-md shadow-[#FF7A00]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending reset link...</span>
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
                  className="ym-auth-btn ym-auth-secondary-btn w-full py-2.5 px-4 text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Back to Sign In
                </button>
              </form>
            )}

            {/* Security Guarantee Footer */}
            <div className="mt-6 pt-4 ym-auth-divider-line flex items-center justify-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Protected by Firebase Authentication</span>
            </div>
          </div>
        </main>
      </div>

      {/* Terms & Privacy Legal Modal */}
      {legalModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ym-legal-title"
          onClick={() => setLegalModal(null)}
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="ym-auth-modal rounded-2xl max-w-md w-full p-6 text-xs sm:text-sm space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 id="ym-legal-title" className="text-base font-bold text-slate-900">
                {legalModal === 'terms' ? 'YuvaMitraa Terms of Service' : 'YuvaMitraa Privacy Policy'}
              </h3>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer rounded-lg"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {legalModal === 'terms' ? (
              <p className="leading-relaxed">
                YuvaMitraa provides verified internship discovery, skill courses, and AI-assisted career mentoring. Users must provide accurate academic or employer details and never solicit registration fees from applicants.
              </p>
            ) : (
              <p className="leading-relaxed">
                Your authentication credentials are protected by Firebase Authentication. Personal profile details and resumes are isolated under your account UID and used strictly for job matching and AI career mentoring.
              </p>
            )}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="px-4 py-2 rounded-xl bg-[#FF7A00] hover:bg-[#E06900] text-white text-xs sm:text-sm font-semibold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
