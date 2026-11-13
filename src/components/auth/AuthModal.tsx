import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  Phone, 
  User, 
  Building2, 
  GraduationCap, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Clock, 
  RotateCcw, 
  Sparkles,
  Loader2,
  KeyRound,
  Check,
  Smartphone,
  Key,
  UserCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  loginApi,
  loginOtpInitApi,
  verifyLoginOtpApi,
  registerInitApi, 
  verifyRegistrationOtpApi, 
  resendOtpApi, 
  forgotPasswordInitApi, 
  resetPasswordApi, 
  firebaseLoginApi 
} from '../../services/api';
import { signInWithGoogle, getUserProfileFromFirestore, syncUserProfileToFirestore } from '../../services/firebase';

interface RememberedAccount {
  name: string;
  email: string;
  phone?: string;
  role: string;
  photoUrl?: string;
}

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    closeAuthModal, 
    authModalMode, 
    login,
  } = useApp();

  const [mode, setMode] = useState<'login' | 'register' | 'otp' | 'forgot' | 'reset-password'>('login');
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  
  // Login states
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // OTP Login states (within login mode)
  const [loginOtpSent, setLoginOtpSent] = useState(false);
  const [loginOtpDigits, setLoginOtpDigits] = useState(['', '', '', '', '', '']);
  const [loginOtpTarget, setLoginOtpTarget] = useState('');
  const [loginOtpDemoCode, setLoginOtpDemoCode] = useState<string | null>(null);
  const loginOtpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Registration states
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState<'student' | 'recruiter' | 'experienced'>('student');
  const [regCollege, setRegCollege] = useState('');
  const [regCourse, setRegCourse] = useState('');
  const [regStudyYear, setRegStudyYear] = useState('3rd Year');
  const [regCompany, setRegCompany] = useState('');
  const [regDesignation, setRegDesignation] = useState('');
  const [regCurrentRole, setRegCurrentRole] = useState('');
  const [regYearsExperience, setRegYearsExperience] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Registration & General OTP states
  const [otpTarget, setOtpTarget] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpCooldown, setOtpCooldown] = useState(30);
  const [otpDemoCode, setOtpDemoCode] = useState<string | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Forgot Password states
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');

  // UI status states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Remembered Account on this browser
  const [rememberedAccount, setRememberedAccount] = useState<RememberedAccount | null>(null);
  const [showRememberedCard, setShowRememberedCard] = useState(true);

  // Read remembered account on mount/open
  useEffect(() => {
    if (isAuthModalOpen) {
      try {
        const stored = localStorage.getItem('ym_remembered_account');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.name && (parsed?.email || parsed?.phone)) {
            setRememberedAccount(parsed);
            setShowRememberedCard(true);
          }
        }
      } catch (err) {
        // ignore parse error
      }
    }
  }, [isAuthModalOpen]);

  // Sync mode with parent prop
  useEffect(() => {
    if (authModalMode === 'register') {
      setMode('register');
    } else if (authModalMode === 'forgot') {
      setMode('forgot');
    } else {
      setMode('login');
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoginOtpSent(false);
  }, [authModalMode, isAuthModalOpen]);

  // 30-Second Countdown Timer for OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if ((mode === 'otp' || mode === 'reset-password' || (mode === 'login' && loginOtpSent)) && otpCooldown > 0) {
      timer = setInterval(() => {
        setOtpCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [mode, loginOtpSent, otpCooldown]);

  if (!isAuthModalOpen) return null;

  // Helper: Detect whether the input is Mobile or Email
  const detectIdentifier = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return null;
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length === 10 || (digitsOnly.length === 12 && digitsOnly.startsWith('91'))) {
      return { type: 'mobile', label: '🇮🇳 +91 Mobile Number', valid: true };
    }
    if (trimmed.includes('@') && trimmed.includes('.')) {
      return { type: 'email', label: '✉️ Email Address', valid: true };
    }
    if (/^\d+$/.test(trimmed)) {
      return { type: 'mobile', label: `${digitsOnly.length}/10 Digits`, valid: false };
    }
    return { type: 'email', label: 'Entering Email...', valid: false };
  };

  // Helper: Password Strength Evaluation
  const evaluatePasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'Empty', color: 'bg-slate-200', text: 'text-slate-400' };
    let score = 0;
    if (pass.length >= 6) score += 25;
    if (pass.length >= 8) score += 25;
    if (/\d/.test(pass)) score += 25;
    if (/[^a-zA-Z0-9]/.test(pass) || /[A-Z]/.test(pass)) score += 25;

    if (score <= 25) return { score: 30, label: 'Weak', color: 'bg-red-500', text: 'text-red-500' };
    if (score <= 75) return { score: 70, label: 'Good', color: 'bg-amber-500', text: 'text-amber-600' };
    return { score: 100, label: 'Strong & Secure', color: 'bg-emerald-500', text: 'text-emerald-600' };
  };

  // Use Remembered Account for 1-Click email prefill
  const handleUseRemembered = () => {
    if (!rememberedAccount) return;
    setLoginIdentifier(rememberedAccount.email || rememberedAccount.phone || '');
    setShowRememberedCard(false);
  };

  // 1. Handle Login Submit (Password Mode)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!loginIdentifier.trim() || !loginPassword) {
      setErrorMsg('Please enter your email or mobile number and password.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await loginApi(loginIdentifier.trim(), loginPassword, rememberMe);
      setSuccessMsg(`Welcome back, ${data.user.name}! Redirecting to ${data.role} dashboard...`);
      setTimeout(() => {
        login(data.token, data.user);
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // 1b. Handle Login OTP Request (Step 1)
  const handleRequestLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!loginIdentifier.trim()) {
      setErrorMsg('Please enter your registered email or 10-digit mobile number.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await loginOtpInitApi(loginIdentifier.trim());
      setLoginOtpTarget(data.identifier || loginIdentifier.trim());
      setLoginOtpDemoCode(data.otpDemo || null);
      setLoginOtpSent(true);
      setOtpCooldown(data.resendCooldown || 30);
      setLoginOtpDigits(['', '', '', '', '', '']);
      setSuccessMsg(data.message || '6-digit OTP code dispatched!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not send login OTP. Please check your contact information.');
    } finally {
      setIsLoading(false);
    }
  };

  // 1c. Handle Verify Login OTP (Step 2)
  const handleVerifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = loginOtpDigits.join('');
    if (code.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the login OTP.');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);
    try {
      const data = await verifyLoginOtpApi(loginOtpTarget || loginIdentifier, code, rememberMe);
      setSuccessMsg(`Welcome back, ${data.user.name}! Verified via OTP. Redirecting...`);
      setTimeout(() => {
        login(data.token, data.user);
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired OTP. Please check the code.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handle Google Sign-In via Firebase Auth
  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const result: any = await signInWithGoogle();
      if (!result?.user) {
        setIsLoading(false);
        return;
      }
      const fbUser = result.user;
      const email = (fbUser.email || '').toLowerCase();
      const name = fbUser.displayName || (email ? email.split('@')[0] : 'Yuva Member');
      const photoUrl = fbUser.photoURL || '';
      const firestoreProfile = await getUserProfileFromFirestore(fbUser.uid).catch(() => null);
      const resolvedRole = firestoreProfile?.role || 'student';
      if (resolvedRole !== 'student' && resolvedRole !== 'recruiter' && resolvedRole !== 'experienced') {
        throw new Error('Unauthorized role for public sign-in.');
      }
      if (!firestoreProfile) {
        await syncUserProfileToFirestore(fbUser.uid, {
          name,
          email,
          role: 'student',
          createdAt: new Date().toISOString(),
        }).catch(() => {});
      }
      const data = await firebaseLoginApi({
        firebaseUid: fbUser.uid,
        email,
        name: firestoreProfile?.name || name,
        role: resolvedRole,
        photoUrl,
      });
      setSuccessMsg('Google authentication verified! Redirecting to dashboard...');
      setTimeout(() => {
        login(data.token, { ...data.user, role: resolvedRole });
      }, 400);
    } catch (err: any) {
      setErrorMsg(err.message || 'Google Sign-In failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Handle Registration Submit (Step 1 -> Send OTP)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!regName.trim() || !regEmail.trim() || !regMobile.trim() || !regPassword) {
      setErrorMsg('Please complete all required registration fields.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (!agreeTerms) {
      setErrorMsg('Please agree to the YuvaMitraa Terms of Service.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await registerInitApi({
        name: regName,
        email: regEmail,
        mobile: regMobile,
        password: regPassword,
        role: regRole,
        college: regRole === 'student' ? regCollege : undefined,
        course: regRole === 'student' ? regCourse : undefined,
        studyYear: regRole === 'student' ? regStudyYear : undefined,
        companyName: regRole === 'recruiter' ? regCompany : undefined,
        designation: regRole === 'recruiter' ? regDesignation : undefined,
        currentRole: regRole === 'experienced' ? regCurrentRole : undefined,
        yearsOfExperience: regRole === 'experienced' ? regYearsExperience : undefined,
      });

      setOtpTarget(regEmail);
      setOtpDemoCode(data.otpDemo || null);
      setOtpCooldown(data.resendCooldown || 30);
      setOtpDigits(['', '', '', '', '', '']);
      setMode('otp');
      setSuccessMsg(data.message || 'OTP sent successfully!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Handle OTP Digit Inputs with Auto-Focus for General OTP
  const handleOtpDigitChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = val.slice(-1);
    setOtpDigits(newDigits);

    if (val && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste) {
      const newDigits = [...otpDigits];
      for (let i = 0; i < paste.length; i++) {
        newDigits[i] = paste[i];
      }
      setOtpDigits(newDigits);
      otpInputRefs.current[Math.min(5, paste.length - 1)]?.focus();
    }
  };

  // Login OTP digit handler
  const handleLoginOtpDigitChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newDigits = [...loginOtpDigits];
    newDigits[index] = val.slice(-1);
    setLoginOtpDigits(newDigits);

    if (val && index < 5) {
      loginOtpRefs.current[index + 1]?.focus();
    }
  };

  const handleLoginOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !loginOtpDigits[index] && index > 0) {
      loginOtpRefs.current[index - 1]?.focus();
    }
  };

  const handleLoginOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste) {
      const newDigits = [...loginOtpDigits];
      for (let i = 0; i < paste.length; i++) {
        newDigits[i] = paste[i];
      }
      setLoginOtpDigits(newDigits);
      loginOtpRefs.current[Math.min(5, paste.length - 1)]?.focus();
    }
  };

  // 5. Verify Registration OTP (Step 2)
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpDigits.join('');
    if (code.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the OTP.');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);
    try {
      const data = await verifyRegistrationOtpApi(otpTarget, code);
      setSuccessMsg('Account verified & created successfully! Redirecting...');
      setTimeout(() => {
        login(data.token, data.user);
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Resend OTP with 30s Countdown
  const handleResendOtp = async () => {
    if (otpCooldown > 0 || isLoading) return;
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const target = mode === 'login' ? (loginOtpTarget || loginIdentifier) : (otpTarget || forgotIdentifier);
      const data = await resendOtpApi(target);
      if (mode === 'login') {
        setLoginOtpDemoCode(data.otpDemo || null);
      } else {
        setOtpDemoCode(data.otpDemo || null);
      }
      setOtpCooldown(30);
      setSuccessMsg(data.message || 'Fresh OTP sent!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  // 7. Forgot Password Step 1: Send Reset OTP
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      setErrorMsg('Please enter your registered email or mobile number.');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);
    try {
      const data = await forgotPasswordInitApi(forgotIdentifier.trim());
      setOtpTarget(data.identifier || forgotIdentifier);
      setOtpDemoCode(data.otpDemo || null);
      setOtpCooldown(30);
      setOtpDigits(['', '', '', '', '', '']);
      setMode('reset-password');
      setSuccessMsg(data.message || 'Reset code sent!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process password reset request.');
    } finally {
      setIsLoading(false);
    }
  };

  // 8. Forgot Password Step 2: Verify & Set New Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpDigits.join('');
    if (code.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the reset code.');
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (resetNewPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);
    try {
      const data = await resetPasswordApi(otpTarget, code, resetNewPassword);
      setSuccessMsg(data.message || 'Password reset successfully! Please sign in.');
      setTimeout(() => {
        setMode('login');
        setLoginPassword('');
        setSuccessMsg('Password updated! You can now sign in.');
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Password reset failed. Please check the code.');
    } finally {
      setIsLoading(false);
    }
  };

  const detectedLogin = detectIdentifier(loginIdentifier);
  const passStrength = evaluatePasswordStrength(mode === 'register' ? regPassword : resetNewPassword);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 text-slate-800">
        
        {/* Header Strip with High-Contrast Orange Theme */}
        <div className="bg-gradient-to-r from-[#FF7A00] via-[#FF8A1A] to-[#E06900] text-white p-4.5 sm:p-5 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white p-1 flex items-center justify-center shadow-md">
              <img
                src="/logo.png"
                alt="YuvaMitraa"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">YuvaMitraa Access</h2>
                <span className="text-[10px] bg-white/25 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider backdrop-blur-xs">
                  Govt Youth AI
                </span>
              </div>
              <p className="text-[11px] text-orange-100 font-medium">
                Learn • Skill • Work • Grow
              </p>
            </div>
          </div>

          <button
            onClick={closeAuthModal}
            aria-label="Close dialog"
            className="p-1.5 rounded-xl text-orange-100 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Tab Switcher: Sign In vs Create Account */}
        {(mode === 'login' || mode === 'register') && (
          <div className="flex border-b border-slate-100 bg-slate-50/80 p-1.5 gap-1.5 shrink-0">
            <button
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'bg-white text-[#FF7A00] shadow-xs border border-orange-100'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              onClick={() => {
                setMode('register');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'register'
                  ? 'bg-white text-[#FF7A00] shadow-xs border border-orange-100'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* Status Banners */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-700 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span className="leading-relaxed">{successMsg}</span>
            </div>
          )}

          {/* Remembered Account Card (if user previously logged in on this browser) */}
          {mode === 'login' && rememberedAccount && showRememberedCard && !loginOtpSent && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-orange-50/90 to-amber-50/60 border border-orange-200/90 shadow-2xs flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={rememberedAccount.photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80"}
                  alt={rememberedAccount.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-[#FF7A00]/40 shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-800 truncate">
                      {rememberedAccount.name}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider ${
                      rememberedAccount.role === 'admin' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : rememberedAccount.role === 'recruiter' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-orange-100 text-[#FF7A00]'
                    }`}>
                      {rememberedAccount.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    {rememberedAccount.email || rememberedAccount.phone}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleUseRemembered}
                  className="px-3 py-1.5 bg-[#FF7A00] text-white hover:bg-[#E06900] rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
                >
                  Quick Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setShowRememberedCard(false)}
                  className="text-[10px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
                >
                  Different account
                </button>
              </div>
            </div>
          )}

          {/* VIEW 1: SIGN IN (With Password Login vs Instant OTP Login toggle) */}
          {mode === 'login' && (
            <div className="space-y-3.5">
              
              {/* Login Method Sub-Toggle */}
              <div className="flex bg-slate-100/80 p-1 rounded-xl gap-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('password');
                    setLoginOtpSent(false);
                    setErrorMsg(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    loginMethod === 'password'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Lock className="w-3 h-3 text-[#FF7A00]" />
                  <span>Password Login</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('otp');
                    setErrorMsg(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    loginMethod === 'otp'
                      ? 'bg-white text-[#FF7A00] shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-[#FF7A00]" />
                  <span>Instant OTP Login</span>
                  <span className="text-[9px] bg-orange-100 text-[#FF7A00] px-1.5 py-0.2 rounded-full font-bold">
                    Fast
                  </span>
                </button>
              </div>

              {/* METHOD A: PASSWORD LOGIN */}
              {loginMethod === 'password' && (
                <form onSubmit={handleLoginSubmit} className="space-y-3.5 animate-in fade-in">
                  
                  {/* Smart Identifier Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        Mobile Number or Email
                      </label>
                      {detectedLogin && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          detectedLogin.valid 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {detectedLogin.valid && <Check className="w-2.5 h-2.5 text-emerald-600" />}
                          <span>{detectedLogin.label}</span>
                        </span>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="name@example.com or 10-digit mobile"
                        className="w-full pl-9.5 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] focus:bg-white text-slate-900 font-medium transition-all"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">Password</label>
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setErrorMsg(null);
                          setSuccessMsg(null);
                        }}
                        className="text-[11px] font-semibold text-[#FF7A00] hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative flex items-center">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9.5 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] focus:bg-white text-slate-900 font-medium transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 absolute right-2.5 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Persistent Session / Remember Me */}
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-600 select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded-md text-[#FF7A00] focus:ring-orange-400 accent-[#FF7A00]"
                      />
                      <span>Remember Me (Keep 30-Day Session)</span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FF7A00] to-[#E06900] text-white font-bold text-xs shadow-md shadow-orange-500/20 hover:shadow-orange-500/35 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Credentials...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In to Dashboard</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Social Divider */}
                  <div className="relative flex py-2 items-center">
                    <div className="grow border-t border-slate-200" />
                    <span className="shrink mx-3 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                      Or Connect With
                    </span>
                    <div className="grow border-t border-slate-200" />
                  </div>

                  {/* Google Sign-In */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all flex items-center justify-center gap-2.5 shadow-2xs cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                </form>
              )}

              {/* METHOD B: INSTANT OTP LOGIN */}
              {loginMethod === 'otp' && (
                <div className="space-y-3.5 animate-in fade-in">
                  
                  {!loginOtpSent ? (
                    <form onSubmit={handleRequestLoginOtp} className="space-y-3.5">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-700">
                            Registered Mobile or Email
                          </label>
                          {detectedLogin && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                              detectedLogin.valid 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {detectedLogin.valid && <Check className="w-2.5 h-2.5 text-emerald-600" />}
                              <span>{detectedLogin.label}</span>
                            </span>
                          )}
                        </div>
                        <div className="relative flex items-center">
                          <Smartphone className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                          <input
                            type="text"
                            required
                            value={loginIdentifier}
                            onChange={(e) => setLoginIdentifier(e.target.value)}
                            placeholder="Enter 10-digit mobile (e.g. 9876543210) or email"
                            className="w-full pl-9.5 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] focus:bg-white text-slate-900 font-medium transition-all"
                          />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          We will send a 6-digit one-time code for instant passwordless sign-in.
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FF7A00] to-[#E06900] text-white font-bold text-xs shadow-md shadow-orange-500/20 hover:shadow-orange-500/35 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Sending Login Code...</span>
                          </>
                        ) : (
                          <>
                            <span>Send 6-Digit Login Code</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    /* Step 2 of OTP Login: Enter Code */
                    <form onSubmit={handleVerifyLoginOtp} className="space-y-4 py-1 text-center animate-in fade-in">
                      
                      <div className="text-center space-y-1">
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#FF7A00] border border-orange-200 flex items-center justify-center mx-auto shadow-2xs">
                          <Smartphone className="w-6 h-6 stroke-[2.2]" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Enter 6-Digit Login OTP
                        </h3>
                        <p className="text-xs text-slate-500">
                          Code sent to <strong className="text-slate-800">{loginOtpTarget}</strong>
                        </p>
                      </div>

                      {/* Demo OTP Banner */}
                      {loginOtpDemoCode && (
                        <div className="bg-[#E6F4FF] p-2.5 rounded-2xl border border-sky-200 flex items-center justify-between gap-3 text-xs text-left">
                          <div>
                            <span className="text-[10px] font-bold text-[#0284C7] uppercase tracking-wider block">
                              Instant Login OTP Code
                            </span>
                            <span className="font-mono text-sm font-black text-slate-800 tracking-wider">
                              {loginOtpDemoCode}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (loginOtpDemoCode?.length === 6) {
                                setLoginOtpDigits(loginOtpDemoCode.split(''));
                              }
                            }}
                            className="px-3 py-1 bg-white text-[#0284C7] font-bold rounded-xl text-xs shadow-xs hover:bg-sky-50 border border-sky-200 cursor-pointer"
                          >
                            Auto-Fill
                          </button>
                        </div>
                      )}

                      {/* 6-Digit Boxes */}
                      <div className="flex items-center justify-center gap-2 sm:gap-2.5 my-2" onPaste={handleLoginOtpPaste}>
                        {loginOtpDigits.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={(el) => { loginOtpRefs.current[idx] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleLoginOtpDigitChange(idx, e.target.value)}
                            onKeyDown={(e) => handleLoginOtpKeyDown(idx, e)}
                            className="w-10 sm:w-11 h-11 text-center text-lg font-black bg-slate-50 border-2 border-slate-200 focus:border-[#FF7A00] focus:bg-white rounded-xl outline-hidden transition-all text-slate-900"
                          />
                        ))}
                      </div>

                      {/* Countdown & Resend */}
                      <div className="flex items-center justify-between text-xs px-1 text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            Resend in: <strong className={otpCooldown > 0 ? 'text-[#FF7A00]' : 'text-slate-700'}>{otpCooldown}s</strong>
                          </span>
                        </span>

                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={otpCooldown > 0 || isLoading}
                          className="font-bold text-xs text-[#FF7A00] hover:underline disabled:opacity-40 disabled:no-underline cursor-pointer flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Resend Code</span>
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading || loginOtpDigits.join('').length < 6}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FF7A00] to-[#E06900] text-white font-bold text-xs shadow-md shadow-orange-500/20 hover:shadow-orange-500/35 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Signing In...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Verify & Sign In</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setLoginOtpSent(false)}
                        className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                      >
                        Change mobile / email
                      </button>

                    </form>
                  )}

                </div>
              )}

            </div>
          )}

          {/* VIEW 2: REGISTRATION FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 animate-in fade-in">
              
              {/* Role Selection (Student, Recruiter, Experienced Candidate only) */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  I am Registering As:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegRole('student')}
                    className={`py-2 px-2 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      regRole === 'student'
                        ? 'border-[#FF7A00] bg-orange-50 text-[#FF7A00] shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>Student</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegRole('recruiter')}
                    className={`py-2 px-2 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      regRole === 'recruiter'
                        ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Recruiter</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegRole('experienced')}
                    className={`py-2 px-2 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      regRole === 'experienced'
                        ? 'border-[#FF7A00] bg-orange-50 text-[#FF7A00] shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span className="text-center leading-tight">Experienced Candidate</span>
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Full Name *</label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-9.5 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] focus:bg-white text-slate-900"
                  />
                </div>
              </div>

              {/* Email & Mobile Number Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email Address *</label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-8.5 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] focus:bg-white text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Mobile Number *</label>
                  <div className="flex items-center">
                    <span className="px-2.5 py-2 text-xs font-bold bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-slate-600">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      value={regMobile}
                      onChange={(e) => setRegMobile(e.target.value)}
                      placeholder="9876543210"
                      maxLength={10}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-r-xl outline-hidden focus:border-[#FF7A00] focus:bg-white text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Student Academic Details */}
              {regRole === 'student' && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    College & Academic Track
                  </span>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-0.5">College / University</label>
                    <input
                      type="text"
                      value={regCollege}
                      onChange={(e) => setRegCollege(e.target.value)}
                      placeholder="e.g. Delhi Technological University, NIT..."
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-0.5">Course / Degree</label>
                      <input
                        type="text"
                        value={regCourse}
                        onChange={(e) => setRegCourse(e.target.value)}
                        placeholder="e.g. B.Tech, BCA, B.Com"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-0.5">Study Year</label>
                      <select
                        value={regStudyYear}
                        onChange={(e) => setRegStudyYear(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00]"
                      >
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                        <option value="Final Year">Final Year</option>
                        <option value="Recent Graduate">Recent Graduate</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Experienced Candidate Details */}
              {regRole === 'experienced' && (
                <div className="p-3 bg-orange-50/50 rounded-2xl border border-orange-200 space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF7A00]">
                    Professional Experience
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-0.5">Current / Previous Role</label>
                      <input
                        type="text"
                        value={regCurrentRole}
                        onChange={(e) => setRegCurrentRole(e.target.value)}
                        placeholder="e.g. Software Engineer"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-orange-200 rounded-xl outline-hidden focus:border-[#FF7A00]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-0.5">Years of Experience</label>
                      <input
                        type="text"
                        value={regYearsExperience}
                        onChange={(e) => setRegYearsExperience(e.target.value)}
                        placeholder="e.g. 3 years"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-orange-200 rounded-xl outline-hidden focus:border-[#FF7A00]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Recruiter Details */}
              {regRole === 'recruiter' && (
                <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                    Company Information
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-0.5">Company Name *</label>
                      <input
                        type="text"
                        required
                        value={regCompany}
                        onChange={(e) => setRegCompany(e.target.value)}
                        placeholder="Enter company name"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-purple-200 rounded-xl outline-hidden focus:border-purple-600"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-0.5">Designation</label>
                      <input
                        type="text"
                        value={regDesignation}
                        onChange={(e) => setRegDesignation(e.target.value)}
                        placeholder="e.g. HR Manager, Founder"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-purple-200 rounded-xl outline-hidden focus:border-purple-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Password & Confirm */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Password *</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Confirm Password *</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] focus:bg-white"
                    />
                  </div>
                </div>

                {/* Password Strength Meter */}
                {regPassword && (
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Password Strength:</span>
                      <span className={`font-bold ${passStrength.text}`}>{passStrength.label}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${passStrength.color}`} 
                        style={{ width: `${passStrength.score}%` }} 
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs pt-1">
                <input
                  type="checkbox"
                  id="agree"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="rounded-md text-[#FF7A00] focus:ring-orange-400 accent-[#FF7A00]"
                />
                <label htmlFor="agree" className="text-slate-600 text-[11px]">
                  I agree to YuvaMitraa’s youth privacy policy and internship terms.
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FF7A00] to-[#E06900] text-white font-bold text-xs shadow-md shadow-orange-500/20 hover:shadow-orange-500/35 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Verification Code...</span>
                  </>
                ) : (
                  <>
                    <span>Verify Mobile & Email via OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

            </form>
          )}

          {/* VIEW 3: OTP VERIFICATION (Registration) */}
          {mode === 'otp' && (
            <form onSubmit={handleVerifyOtpSubmit} className="space-y-4 py-2 text-center animate-in fade-in">
              
              <div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#FF7A00] border border-orange-200 flex items-center justify-center mx-auto shadow-2xs">
                <ShieldCheck className="w-7 h-7 stroke-[2.2]" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Verify One-Time Password (OTP)
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Enter the 6-digit verification code sent to <strong className="text-slate-700">{otpTarget}</strong>
                </p>
              </div>

              {/* Demo Banner */}
              {otpDemoCode && (
                <div className="bg-[#E6F4FF] p-3 rounded-2xl border border-sky-200 flex items-center justify-between gap-3 text-xs text-left">
                  <div>
                    <span className="text-[10px] font-bold text-[#0284C7] uppercase tracking-wider block">
                      SMS / Email OTP Code
                    </span>
                    <span className="font-mono text-sm font-black text-slate-800 tracking-wider">
                      {otpDemoCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (otpDemoCode?.length === 6) {
                        setOtpDigits(otpDemoCode.split(''));
                      }
                    }}
                    className="px-3 py-1 bg-white text-[#0284C7] font-bold rounded-xl text-xs shadow-xs hover:bg-sky-50 border border-sky-200 cursor-pointer"
                  >
                    Auto-Fill
                  </button>
                </div>
              )}

              {/* 6-Digit Box Inputs */}
              <div className="flex items-center justify-center gap-2 sm:gap-2.5 my-3" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { otpInputRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-10 sm:w-12 h-12 text-center text-lg font-black bg-slate-50 border-2 border-slate-200 focus:border-[#FF7A00] focus:bg-white rounded-xl outline-hidden transition-all text-slate-900"
                  />
                ))}
              </div>

              {/* Countdown & Resend */}
              <div className="flex items-center justify-between text-xs px-2 pt-1 text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Resend in: <strong className={otpCooldown > 0 ? 'text-[#FF7A00]' : 'text-slate-700'}>{otpCooldown}s</strong>
                  </span>
                </span>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={otpCooldown > 0 || isLoading}
                  className="font-bold text-xs text-[#FF7A00] hover:underline disabled:opacity-40 disabled:no-underline cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Resend Code</span>
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || otpDigits.join('').length < 6}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FF7A00] to-[#E06900] text-white font-bold text-xs shadow-md shadow-orange-500/20 hover:shadow-orange-500/35 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Verify & Enter YuvaMitraa</span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                Back to Registration
              </button>

            </form>
          )}

          {/* VIEW 4: FORGOT PASSWORD STEP 1 */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4 py-2 animate-in fade-in">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#FF7A00] border border-orange-200 flex items-center justify-center mx-auto mb-2">
                  <KeyRound className="w-6 h-6 stroke-[2.2]" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Reset Forgotten Password
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Enter your registered email address or mobile number to receive a secure password reset code.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Registered Email or Mobile
                </label>
                <input
                  type="text"
                  required
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  placeholder="name@example.com or 10-digit mobile"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] focus:bg-white text-slate-900 font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-[#FF7A00] hover:bg-[#E06900] text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Remember password? Sign In
                </button>
              </div>
            </form>
          )}

          {/* VIEW 5: RESET PASSWORD STEP 2 */}
          {mode === 'reset-password' && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5 animate-in fade-in">
              <div className="text-center space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Set New Account Password
                </h3>
                <p className="text-xs text-slate-500">
                  Enter the 6-digit reset code sent to <strong className="text-slate-700">{otpTarget}</strong>
                </p>
              </div>

              {otpDemoCode && (
                <div className="bg-[#E6F4FF] p-2.5 rounded-xl border border-sky-200 flex items-center justify-between text-xs">
                  <span>Reset Code: <strong className="font-mono text-sm">{otpDemoCode}</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      if (otpDemoCode?.length === 6) {
                        setOtpDigits(otpDemoCode.split(''));
                      }
                    }}
                    className="px-2.5 py-1 bg-white text-[#0284C7] font-bold rounded-lg text-xs"
                  >
                    Auto-Fill
                  </button>
                </div>
              )}

              {/* 6-digit Box */}
              <div className="flex items-center justify-center gap-2 my-2" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { otpInputRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-10 h-11 text-center text-lg font-black bg-slate-50 border-2 border-slate-200 focus:border-[#FF7A00] focus:bg-white rounded-xl outline-hidden text-slate-900"
                  />
                ))}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Confirm New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] focus:bg-white"
                />
              </div>

              {resetNewPassword && (
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Password Strength:</span>
                    <span className={`font-bold ${passStrength.text}`}>{passStrength.label}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${passStrength.color}`} 
                      style={{ width: `${passStrength.score}%` }} 
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Resend: {otpCooldown}s</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={otpCooldown > 0}
                  className="text-[#FF7A00] font-bold disabled:opacity-40"
                >
                  Resend Code
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-[#FF7A00] hover:bg-[#E06900] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm & Reset Password</span>
                  </>
                )}
              </button>
            </form>
          )}

        </div>

        {/* Modal Footer with Security Certifications */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 px-4">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>PBKDF2-SHA512 Cryptographic Hashing</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <UserCheck className="w-3.5 h-3.5 text-orange-500" />
            <span>Anti-Lockout</span>
          </div>
        </div>

      </div>
    </div>
  );
};
