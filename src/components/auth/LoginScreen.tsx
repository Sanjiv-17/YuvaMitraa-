import React, { useState, useEffect, useRef } from 'react';
import { 
  Mail, 
  Smartphone, 
  ShieldCheck, 
  ArrowRight, 
  RotateCcw, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  GraduationCap, 
  Briefcase, 
  Building2, 
  User, 
  Check, 
  Monitor, 
  Lock,
  ChevronRight,
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  MapPin,
  ChevronDown
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  sendOtpApi, 
  verifyOtpApi, 
  resendOtpNewApi, 
  completeRegistrationApi,
  loginApi,
  forgotPasswordInitApi,
  resetPasswordApi,
  firebaseLoginApi
} from '../../services/api';
import { 
  auth,
  signInWithGoogle,
  checkRedirectResult,
  sendMobileOtp,
  clearRecaptchaVerifier,
  syncUserProfileToFirestore,
  ConfirmationResult
} from '../../services/firebase';

type LoginStep = 'identifier' | 'otp' | 'registration' | 'forgot_password';
type AuthMethod = 'mobile' | 'email';
type LoginMode = 'otp' | 'password';

interface FirebaseErrorInfo {
  code: string;
  message: string;
}

const COUNTRY_CODES = [
  { code: '+91', name: 'India', flag: '🇮🇳', digits: 10 },
  { code: '+1', name: 'USA / Canada', flag: '🇺🇸', digits: 10 },
  { code: '+44', name: 'UK', flag: '🇬🇧', digits: 10 },
  { code: '+971', name: 'UAE', flag: '🇦🇪', digits: 9 },
  { code: '+65', name: 'Singapore', flag: '🇸🇬', digits: 8 },
  { code: '+61', name: 'Australia', flag: '🇦🇺', digits: 9 },
  { code: '+49', name: 'Germany', flag: '🇩🇪', digits: 11 },
  { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦', digits: 9 },
  { code: '+977', name: 'Nepal', flag: '🇳🇵', digits: 10 },
  { code: '+880', name: 'Bangladesh', flag: '🇧🇩', digits: 10 },
  { code: '+94', name: 'Sri Lanka', flag: '🇱🇰', digits: 9 }
];

export const LoginScreen: React.FC = () => {
  const { login, viewportMode, setViewportMode } = useApp();

  // Auth Flow State
  const [step, setStep] = useState<LoginStep>('identifier');
  const [loginMode, setLoginMode] = useState<LoginMode>('otp');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('mobile');

  // Input states
  const [countryCode, setCountryCode] = useState('+91');
  const [mobileNumber, setMobileNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Active OTP verification context
  const [activeIdentifier, setActiveIdentifier] = useState<string>('');
  const [activeAuthType, setActiveAuthType] = useState<'mobile' | 'email'>('mobile');

  // OTP Verification States
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);

  // Timer & Security State (60-second cooldown as specified)
  const [countdown, setCountdown] = useState<number>(60);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);

  // Forgot Password State
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'reset'>('request');

  // Registration State (for first-time users)
  const [registrationToken, setRegistrationToken] = useState<string>('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAge, setRegAge] = useState<number | string>(21);
  const [regLocation, setRegLocation] = useState('Bengaluru, Karnataka');
  const [regEducation, setRegEducation] = useState('Undergraduate (B.Tech / B.E. / B.Sc / B.Com)');
  const [regCollege, setRegCollege] = useState('');
  const [regRole, setRegRole] = useState<'student' | 'recruiter'>('student');
  const [roleInput, setRoleInput] = useState('');
  const [selectedPreferredRoles, setSelectedPreferredRoles] = useState<string[]>([
    'Software Engineer',
    'Frontend Developer',
    'Data Analyst'
  ]);
  const [skillInput, setSkillInput] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([
    'Digital Literacy',
    'Communication',
    'Problem Solving',
    'Computer Basics'
  ]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    'Technology & IT',
    'Apprenticeships & Internships',
    'Government Schemes'
  ]);

  // Loading States
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingMobile, setIsLoadingMobile] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isRegLoading, setIsRegLoading] = useState(false);

  // Error & Feedback States
  const [firebaseError, setFirebaseError] = useState<FirebaseErrorInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Suggested roles & skills
  const POPULAR_ROLES = [
    'Software Engineer', 'Frontend Developer', 'Python Developer', 'Data Analyst', 
    'Digital Marketer', 'Business Development Intern', 'UI/UX Designer', 'Accountant'
  ];

  const POPULAR_SKILLS = [
    'Python', 'React', 'JavaScript', 'SQL & Data', 'Digital Marketing', 
    'Accounting / Tally', 'Communication', 'Graphic Design', 'Public Speaking', 'Git & GitHub'
  ];

  const POPULAR_INTERESTS = [
    'Technology & IT', 'Govt Schemes & UPSC', 'Banking & Finance', 
    'Apprenticeships & Internships', 'Manufacturing & EV', 'Healthcare Support', 'Startups & Business'
  ];

  const clearMessages = () => {
    setFirebaseError(null);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // -------------------------------------------------------------
  // Page Load Effect: Check Google Redirect Result
  // -------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    const handlePageLoadAuth = async () => {
      try {
        const redirectCred = await checkRedirectResult();
        if (redirectCred && redirectCred.user && isMounted) {
          setIsLoadingGoogle(true);
          const fbUser = redirectCred.user;
          const res = await firebaseLoginApi({
            firebaseUid: fbUser.uid,
            email: fbUser.email || undefined,
            name: fbUser.displayName || undefined,
            role: 'student'
          });

          await syncUserProfileToFirestore(fbUser.uid, res.user);
          setSuccessMsg(`Google sign-in completed! Welcome, ${res.user.name}.`);
          login(res.token, res.user);
          return;
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn('Google redirect check caught:', err);
          if (
            err.code !== 'auth/popup-closed-by-user' &&
            err.code !== 'auth/configuration-not-found'
          ) {
            setFirebaseError({
              code: err.code || 'auth/redirect-error',
              message: err.message || 'Google redirect sign-in failed.'
            });
          }
        }
      } finally {
        if (isMounted) setIsLoadingGoogle(false);
      }
    };

    handlePageLoadAuth();

    return () => {
      isMounted = false;
    };
  }, [login]);

  // -------------------------------------------------------------
  // 60-Second Countdown Effect for OTP Resend
  // -------------------------------------------------------------
  useEffect(() => {
    let timer: any = null;
    if (isTimerActive && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setIsTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isTimerActive, countdown]);

  // Auto-focus first OTP digit when reaching OTP step & listen for WebOTP API
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);

      // WebOTP API: Automatically detect incoming SMS OTP where supported
      if (typeof window !== 'undefined' && 'OTPCredential' in window) {
        const ac = new AbortController();
        (navigator as any).credentials?.get({
          otp: { transport: ['sms'] },
          signal: ac.signal
        }).then((otp: any) => {
          if (otp?.code) {
            const digits = String(otp.code).replace(/[^0-9]/g, '').slice(0, 6).split('');
            if (digits.length === 6) {
              setOtpDigits(digits);
              setSuccessMsg('SMS OTP auto-detected from incoming message!');
            }
          }
        }).catch(() => {
          // Aborted or manual entry
        });

        return () => {
          try { ac.abort(); } catch {}
        };
      }
    }
  }, [step]);

  // -------------------------------------------------------------
  // METHOD 1: Mobile Phone Number + Real SMS OTP (Firebase Phone Auth)
  // -------------------------------------------------------------
  const handleSendMobileOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    clearMessages();

    const cleanPhone = mobileNumber.replace(/[^0-9]/g, '');
    const currentCountry = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0];
    
    if (cleanPhone.length < currentCountry.digits - 1 || cleanPhone.length > currentCountry.digits + 2) {
      setErrorMsg(`Please enter a valid ${currentCountry.digits}-digit mobile number for ${currentCountry.name}.`);
      return;
    }

    try {
      setIsLoadingMobile(true);
      const fullPhoneNumber = `${countryCode}${cleanPhone}`;
      const confirmation = await sendMobileOtp(fullPhoneNumber, 'recaptcha-container', countryCode);
      confirmationResultRef.current = confirmation;
      setActiveIdentifier(fullPhoneNumber);
      setActiveAuthType('mobile');
      setOtpDigits(['', '', '', '', '', '']);
      setCountdown(60); // 60-second cooldown as specified
      setIsTimerActive(true);
      setSuccessMsg(`Real Firebase SMS OTP sent to ${countryCode} ${cleanPhone}. Please enter the 6-digit code.`);
      setStep('otp');
      setRegPhone(cleanPhone);
    } catch (err: any) {
      console.warn('Mobile OTP Send caught:', err);
      clearRecaptchaVerifier();
      setFirebaseError({
        code: err.code || 'auth/captcha-check-failed',
        message: err.message || 'Failed to dispatch SMS OTP. Please check your number or try again.'
      });
    } finally {
      setIsLoadingMobile(false);
    }
  };

  // -------------------------------------------------------------
  // METHOD 2: Email + Six-Digit Cryptographic OTP
  // Server-generated, SHA-256 hashed storage, 5-minute expiry
  // -------------------------------------------------------------
  const handleSendEmailOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    clearMessages();

    const cleanEmail = emailAddress.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address (e.g. student@example.com).');
      return;
    }

    try {
      setIsLoadingEmail(true);
      const res = await sendOtpApi(cleanEmail, 'email');
      confirmationResultRef.current = null;
      setActiveIdentifier(cleanEmail);
      setActiveAuthType('email');
      setOtpDigits(['', '', '', '', '', '']);
      setCountdown(res.cooldownSeconds || 60);
      setIsTimerActive(true);
      setSuccessMsg(res.message || `Secure 6-digit OTP code sent to ${cleanEmail}. Valid for 5 minutes.`);
      setStep('otp');
      setRegEmail(cleanEmail);
    } catch (err: any) {
      console.warn('Email OTP Send caught:', err);
      setErrorMsg(err.message || 'Failed to dispatch email verification code. Please check your email.');
    } finally {
      setIsLoadingEmail(false);
    }
  };

  // Resend OTP (for either Mobile or Email)
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    clearMessages();

    try {
      if (activeAuthType === 'mobile') {
        setIsLoadingMobile(true);
        const confirmation = await sendMobileOtp(activeIdentifier, 'recaptcha-container', countryCode);
        confirmationResultRef.current = confirmation;
        setSuccessMsg(`Fresh SMS OTP sent to ${activeIdentifier}.`);
      } else {
        setIsLoadingEmail(true);
        const res = await resendOtpNewApi(activeIdentifier, 'email');
        setSuccessMsg(res.message || `Fresh 6-digit verification code sent to ${activeIdentifier}.`);
      }

      setCountdown(60);
      setIsTimerActive(true);
      setOtpDigits(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } catch (err: any) {
      console.warn('OTP Resend caught:', err);
      if (activeAuthType === 'mobile') {
        clearRecaptchaVerifier();
        setFirebaseError({
          code: err.code || 'auth/too-many-requests',
          message: err.message || 'Failed to resend SMS OTP. Please wait a moment.'
        });
      } else {
        setErrorMsg(err.message || 'Failed to resend OTP. Please try again.');
      }
    } finally {
      setIsLoadingMobile(false);
      setIsLoadingEmail(false);
    }
  };

  // Verify 6-Digit OTP (Dispatches to Firebase Phone Auth or Server Cryptographic Verify)
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    clearMessages();

    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the verification code.');
      return;
    }

    try {
      setIsVerifyingOtp(true);

      // Branch A: Mobile SMS OTP with Firebase ConfirmationResult
      if (activeAuthType === 'mobile' && confirmationResultRef.current) {
        const userCredential = await confirmationResultRef.current.confirm(fullOtp);
        const fbUser = userCredential.user;

        const res = await firebaseLoginApi({
          firebaseUid: fbUser.uid,
          phoneNumber: fbUser.phoneNumber || activeIdentifier,
          role: 'student'
        });

        await syncUserProfileToFirestore(fbUser.uid, res.user);

        if (res.isNewUser) {
          setRegistrationToken(`reg-fb-${fbUser.uid}`);
          setRegPhone(activeIdentifier.replace(countryCode, ''));
          setSuccessMsg('Mobile verified! Please set up your profile details.');
          setStep('registration');
        } else {
          setSuccessMsg(`Welcome back, ${res.user.name}!`);
          login(res.token, res.user);
        }
        return;
      }

      // Branch B: Email 6-Digit Cryptographic OTP with Server Verification
      const res = await verifyOtpApi(activeIdentifier, fullOtp, 'email', rememberMe);

      if (res.isNewUser) {
        setRegistrationToken(res.registrationToken);
        setRegEmail(activeIdentifier);
        setSuccessMsg('Email verified! Please complete your YuvaMitraa profile.');
        setStep('registration');
      } else {
        // Sync to Firestore if authenticated
        if (res.user?.id) {
          await syncUserProfileToFirestore(res.user.id, res.user);
        }
        setSuccessMsg(res.message || `Welcome back, ${res.user.name}!`);
        login(res.token, res.user);
      }
    } catch (err: any) {
      console.warn('OTP Verification caught:', err);
      if (activeAuthType === 'mobile') {
        setFirebaseError({
          code: err.code || 'auth/invalid-verification-code',
          message: err.message || 'Invalid or expired SMS OTP code. Please check and try again.'
        });
      } else {
        setErrorMsg(err.message || 'Incorrect or expired OTP code. Please try again.');
      }
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // -------------------------------------------------------------
  // METHOD 3: Real Firebase Google Sign-In
  // -------------------------------------------------------------
  const handleGoogleSignIn = async () => {
    clearMessages();
    setIsLoadingGoogle(true);

    try {
      const cred = await signInWithGoogle();
      if (cred && cred.user) {
        const fbUser = cred.user;
        const res = await firebaseLoginApi({
          firebaseUid: fbUser.uid,
          email: fbUser.email || undefined,
          name: fbUser.displayName || undefined,
          role: 'student'
        });

        await syncUserProfileToFirestore(fbUser.uid, res.user);
        setSuccessMsg(`Google sign-in successful! Welcome, ${res.user.name}`);
        login(res.token, res.user);
      }
    } catch (err: any) {
      console.warn('Google Sign In caught:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Google sign-in was cancelled. Please click again when you wish to log in.');
      } else {
        const isConfigNotFound = err.code === 'auth/configuration-not-found';
        setFirebaseError({
          code: err.code || 'auth/google-sign-in-failed',
          message: isConfigNotFound 
            ? 'Google Sign-In is initializing. If this error persists, ensure Google provider is enabled in Firebase Console (Authentication > Sign-in method > Google).'
            : (err.message || 'Google sign-in encountered an error. Please try again.')
        });
      }
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  // Handle OTP digit boxes input
  const handleOtpDigitChange = (index: number, value: string) => {
    const val = value.replace(/[^0-9]/g, '');
    
    if (val.length > 1) {
      const pasted = val.slice(0, 6).split('');
      const newDigits = [...otpDigits];
      pasted.forEach((d, i) => {
        if (i < 6) newDigits[i] = d;
      });
      setOtpDigits(newDigits);
      const targetIndex = Math.min(5, pasted.length);
      otpInputRefs.current[targetIndex]?.focus();
      return;
    }

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

  // Alternative: Password Login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    const identifier = authMethod === 'mobile' ? `${countryCode}${mobileNumber.trim()}` : emailAddress.trim();
    if (!identifier) {
      setErrorMsg(authMethod === 'mobile' ? 'Please enter your mobile number.' : 'Please enter your email.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    try {
      setIsPasswordLoading(true);
      const res = await loginApi(identifier, password, rememberMe);
      login(res.token, res.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid credentials. Please verify your password or use OTP login.');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleForgotInit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!forgotIdentifier.trim()) {
      setErrorMsg('Please enter your registered email or mobile number.');
      return;
    }

    try {
      setIsPasswordLoading(true);
      const res = await forgotPasswordInitApi(forgotIdentifier.trim());
      setSuccessMsg(res.message || 'Password reset OTP dispatched to your registered contact.');
      setForgotStep('reset');
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not initiate password reset. Please check details.');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (forgotOtp.length !== 6) {
      setErrorMsg('Please enter the 6-digit OTP code.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters.');
      return;
    }

    try {
      setIsPasswordLoading(true);
      const res = await resetPasswordApi(forgotIdentifier.trim(), forgotOtp.trim(), newPassword);
      setSuccessMsg(res.message || 'Password reset successful! You can now log in.');
      setStep('identifier');
      setLoginMode('password');
      setPassword(newPassword);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset password. Please check OTP.');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  // Complete Profile Registration
  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!regName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    if (!regEmail.trim() || !regEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    const cleanPhone = regPhone.replace(/[^0-9]/g, '').slice(-10);
    if (cleanPhone.length < 7) {
      setErrorMsg('Please enter a valid mobile number.');
      return;
    }

    const currentFbUser = auth.currentUser;
    const effectiveFirebaseUid = currentFbUser?.uid || (registrationToken.startsWith('reg-fb-') ? registrationToken.replace('reg-fb-', '') : undefined);

    try {
      setIsRegLoading(true);
      const res = await completeRegistrationApi({
        registrationToken,
        firebaseUid: effectiveFirebaseUid,
        name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        phone: cleanPhone,
        educationLevel: regEducation,
        skills: selectedSkills,
        interests: selectedInterests,
        role: regRole,
        college: regCollege.trim() || 'National University / Institute',
        age: Number(regAge) || 21,
        location: regLocation.trim() || 'Bengaluru, Karnataka',
        preferredRoles: selectedPreferredRoles
      });

      // Keep user signed in and save profile using auth.currentUser in Firestore
      const saveUid = currentFbUser?.uid || res.user?.id || effectiveFirebaseUid;
      if (saveUid) {
        await syncUserProfileToFirestore(saveUid, res.user);
      }

      setSuccessMsg('Profile setup complete! Welcome to YuvaMitraa.');
      login(res.token, res.user);
    } catch (err: any) {
      // Don't clear the registration session or show "Registration session expired" while the user is already authenticated.
      // Only show it if auth.currentUser is null.
      if (auth.currentUser) {
        console.warn('Backend registration notice with active Firebase user, saving profile using auth.currentUser:', err);
        const fbUser = auth.currentUser;
        const profilePayload = {
          id: fbUser.uid,
          name: regName.trim(),
          email: regEmail.trim().toLowerCase() || fbUser.email || '',
          phone: cleanPhone || (fbUser.phoneNumber ? fbUser.phoneNumber.slice(-10) : ''),
          role: regRole,
          college: regCollege.trim() || 'National University / Institute',
          course: regEducation,
          education: regEducation,
          skills: selectedSkills,
          interests: selectedInterests,
          preferredRoles: selectedPreferredRoles,
          location: regLocation.trim() || 'Bengaluru, Karnataka',
          age: Number(regAge) || 21,
          isVerified: true,
          status: 'active' as const,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          photoUrl: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
          xpPoints: 500,
          streakDays: 1,
          badges: ['New Explorer', 'Profile Complete']
        };

        try {
          await syncUserProfileToFirestore(fbUser.uid, profilePayload);
          const fbRes = await firebaseLoginApi({
            firebaseUid: fbUser.uid,
            phoneNumber: fbUser.phoneNumber || cleanPhone,
            email: regEmail.trim().toLowerCase() || fbUser.email || undefined,
            name: regName.trim(),
            role: regRole
          });
          setSuccessMsg('Profile setup complete! Welcome to YuvaMitraa.');
          login(fbRes.token, fbRes.user);
          return;
        } catch (syncErr) {
          console.warn('Local profile save fallback used:', syncErr);
          setSuccessMsg('Profile setup complete! Welcome to YuvaMitraa.');
          login(`session-${fbUser.uid}`, profilePayload as any);
          return;
        }
      } else {
        // auth.currentUser is null - ONLY show it if auth.currentUser is null!
        setErrorMsg(err.message || 'Registration session expired. Please verify OTP again.');
      }
    } finally {
      setIsRegLoading(false);
    }
  };

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const addCustomSkill = () => {
    if (skillInput.trim() && !selectedSkills.includes(skillInput.trim())) {
      setSelectedSkills([...selectedSkills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const togglePreferredRole = (role: string) => {
    if (selectedPreferredRoles.includes(role)) {
      setSelectedPreferredRoles(selectedPreferredRoles.filter(r => r !== role));
    } else {
      setSelectedPreferredRoles([...selectedPreferredRoles, role]);
    }
  };

  const addCustomRole = () => {
    if (roleInput.trim() && !selectedPreferredRoles.includes(roleInput.trim())) {
      setSelectedPreferredRoles([...selectedPreferredRoles, roleInput.trim()]);
      setRoleInput('');
    }
  };

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF7ED]/60 dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 flex flex-col font-['Poppins',sans-serif] selection:bg-[#FF7A00] selection:text-white">
      {/* Top Device Viewport Controller Bar */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-orange-100 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            YuvaMitraa Secure Auth
          </span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-950/60 text-[#FF7A00] font-medium text-[11px]">
            Production Firebase Auth
          </span>
        </div>

        {/* Viewport Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setViewportMode('desktop')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              viewportMode === 'desktop'
                ? 'bg-white dark:bg-slate-700 text-[#FF7A00] shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Desktop Mode"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Desktop</span>
          </button>

          <button
            onClick={() => setViewportMode('mobile')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              viewportMode === 'mobile'
                ? 'bg-white dark:bg-slate-700 text-[#FF7A00] shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Mobile Screen Mode"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Mobile</span>
          </button>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className={`flex-1 flex items-center justify-center p-3 sm:p-6 lg:p-8 ${
        viewportMode === 'mobile' ? 'py-4 sm:py-8' : ''
      }`}>
        
        {/* Smartphone Frame Outer Shell */}
        <div className={`w-full transition-all duration-300 ${
          viewportMode === 'mobile'
            ? 'max-w-[400px] bg-slate-900 rounded-[44px] p-2.5 shadow-2xl ring-8 ring-slate-800/80 border-4 border-slate-700'
            : 'max-w-5xl'
        }`}>

          {viewportMode === 'mobile' && (
            <div className="text-white px-5 pt-2 pb-1 flex items-center justify-between text-[11px] font-semibold tracking-wider">
              <span>9:41</span>
              <div className="w-24 h-4 bg-black rounded-full flex items-center justify-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700"></div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]">5G</span>
                <div className="w-4 h-2 rounded-sm border border-white/80 p-0.5 flex items-center">
                  <div className="h-full w-full bg-white rounded-2xs"></div>
                </div>
              </div>
            </div>
          )}

          {/* Inner Content Card */}
          <div className={`bg-white dark:bg-slate-900 shadow-xl overflow-hidden border border-orange-100 dark:border-slate-800 ${
            viewportMode === 'mobile'
              ? 'rounded-[36px] max-h-[820px] overflow-y-auto'
              : 'rounded-3xl grid grid-cols-1 lg:grid-cols-12 min-h-[640px]'
          }`}>

            {/* LEFT / HERO SECTION */}
            <div className={`bg-gradient-to-br from-[#FF7A00] via-[#F46F00] to-[#E05E00] text-white p-6 sm:p-10 flex flex-col justify-between relative overflow-hidden ${
              viewportMode === 'mobile' ? 'py-8' : 'lg:col-span-5'
            }`}>
              
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
              <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-black/10 blur-2xl pointer-events-none"></div>

              {/* Logo & Brand Header */}
              <div className="relative z-10 text-center sm:text-left flex flex-col items-center sm:items-start">
                <div className="bg-white p-3 rounded-2xl shadow-lg inline-flex items-center justify-center mb-4 ring-4 ring-white/20">
                  <img
                    src="/assets/aistudio/file_00000000317c8211a46ed3f83de08101_f1ab0447.png"
                    alt="YuvaMitraa Logo"
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                  />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-semibold uppercase tracking-wider mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  National Youth Career Gateway
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2 leading-tight">
                  YuvaMitraa
                </h1>
                <p className="text-orange-100 text-sm leading-relaxed max-w-sm">
                  Connecting youth with genuine internships, verified courses, and career development programs across India.
                </p>
              </div>

              {/* Feature Highlights (Visible on Desktop) */}
              {viewportMode === 'desktop' && (
                <div className="relative z-10 my-8 space-y-4">
                  <div className="flex items-start gap-3 bg-white/10 p-3 rounded-2xl backdrop-blur-sm border border-white/15">
                    <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 text-white">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Verified Skill Tracks</h4>
                      <p className="text-xs text-orange-100">National standards & industry micro-credentials.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-white/10 p-3 rounded-2xl backdrop-blur-sm border border-white/15">
                    <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 text-white">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Curated Internships</h4>
                      <p className="text-xs text-orange-100">AI-matched opportunities with verified recruiters.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-white/10 p-3 rounded-2xl backdrop-blur-sm border border-white/15">
                    <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 text-white">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Bank-Grade Auth Security</h4>
                      <p className="text-xs text-orange-100">SMS OTP, Cryptographic Email OTP & Google OAuth.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Badge Footer */}
              <div className="relative z-10 pt-4 border-t border-white/20 flex items-center justify-between text-xs text-orange-100">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>Firebase Auth Secured</span>
                </div>
                <span>v2.6.0</span>
              </div>
            </div>

            {/* RIGHT SECTION: AUTHENTICATION OPTIONS */}
            <div className={`p-6 sm:p-10 flex flex-col justify-center bg-white dark:bg-slate-900 ${
              viewportMode === 'desktop' ? 'lg:col-span-7' : ''
            }`}>

              {/* Exact Firebase Error Box */}
              {firebaseError && (
                <div className="mb-5 p-4 rounded-2xl bg-red-50 dark:bg-red-950/70 border-2 border-red-500 text-red-900 dark:text-red-100 shadow-md animate-fadeIn">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-red-600 text-white flex-shrink-0 mt-0.5">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-600 text-white shadow-xs">
                          {firebaseError.code}
                        </span>
                        <span className="text-xs font-bold text-red-700 dark:text-red-300">
                          Authentication Notice
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-red-800 dark:text-red-200 break-words leading-relaxed">
                        {firebaseError.message}
                      </p>

                      {firebaseError.code === 'auth/configuration-not-found' && (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-red-100/80 dark:bg-red-900/40 text-[11px] text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800 leading-relaxed">
                          <span className="font-bold">Notice:</span> In the Firebase Console for your project, ensure Google is enabled under <strong>Authentication &gt; Sign-in method</strong>. In the meantime, you can seamlessly sign in using <strong>Mobile Number (+91 SMS OTP)</strong> or <strong>Email + Six-Digit OTP</strong> below.
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setFirebaseError(null)}
                      className="text-red-400 hover:text-red-700 dark:hover:text-red-200 text-sm font-bold p-1 cursor-pointer"
                      title="Dismiss error"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Standard Validation Error */}
              {errorMsg && (
                <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                  <div className="flex-1 font-medium">{errorMsg}</div>
                </div>
              )}

              {/* Success Notification */}
              {successMsg && (
                <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2.5 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
                  <div className="flex-1 font-medium">{successMsg}</div>
                </div>
              )}

              {/* ======================================================== */}
              {/* STEP 1: LOGIN SELECTION (3 REAL METHODS) */}
              {/* ======================================================== */}
              {step === 'identifier' && (
                <div>
                  <div className="mb-5">
                    <span className="text-xs font-bold text-[#FF7A00] tracking-wide uppercase">
                      Secure Instant Access
                    </span>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      Sign in to YuvaMitraa
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Choose any of the three secure login options to proceed.
                    </p>
                  </div>

                  {/* Mode Selector: 3 Authentication Methods */}
                  <div className="grid grid-cols-2 gap-2 bg-orange-50/70 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-orange-100 dark:border-slate-800 mb-5">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMethod('mobile');
                        clearMessages();
                      }}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-xs sm:text-sm transition-all cursor-pointer ${
                        authMethod === 'mobile'
                          ? 'bg-[#FF7A00] text-white shadow-md shadow-orange-500/20'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Mobile SMS OTP</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAuthMethod('email');
                        clearMessages();
                      }}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-xs sm:text-sm transition-all cursor-pointer ${
                        authMethod === 'email'
                          ? 'bg-[#FF7A00] text-white shadow-md shadow-orange-500/20'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Mail className="w-4 h-4" />
                      <span>Email 6-Digit OTP</span>
                    </button>
                  </div>

                  {/* ---------------------------------------------------- */}
                  {/* OPTION 1: MOBILE NUMBER + COUNTRY SELECTOR + SMS OTP */}
                  {/* ---------------------------------------------------- */}
                  {authMethod === 'mobile' && loginMode === 'otp' && (
                    <form onSubmit={handleSendMobileOtp} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                          Mobile Number
                        </label>
                        <div className="flex items-center rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-[#FF7A00] focus-within:border-transparent transition-all overflow-hidden shadow-sm">
                          {/* Country Code Selector */}
                          <div className="relative bg-orange-50 dark:bg-slate-700/60 border-r border-slate-200 dark:border-slate-700 flex items-center px-2.5 py-3">
                            <select
                              value={countryCode}
                              onChange={(e) => setCountryCode(e.target.value)}
                              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer pr-4 appearance-none"
                            >
                              {COUNTRY_CODES.map((c) => (
                                <option key={c.code} value={c.code} className="dark:bg-slate-800 text-slate-800 dark:text-white">
                                  {c.flag} {c.code} ({c.name})
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1 pointer-events-none" />
                          </div>

                          <input
                            type="tel"
                            maxLength={14}
                            value={mobileNumber}
                            onChange={(e) => setMobileNumber(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="e.g. 9876543210"
                            className="flex-1 px-4 py-3.5 text-sm bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400 font-medium"
                            autoFocus
                          />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Real SMS OTP delivered through Firebase Phone Authentication.</span>
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoadingMobile || mobileNumber.length < 8}
                        className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#FF7A00] to-[#E06900] hover:from-[#E06900] hover:to-[#C55700] text-white font-bold text-sm shadow-lg shadow-orange-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isLoadingMobile ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Sending SMS OTP via Firebase...</span>
                          </>
                        ) : (
                          <>
                            <span>Send SMS OTP ({countryCode})</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  )}

                  {/* ---------------------------------------------------- */}
                  {/* OPTION 2: EMAIL + SIX-DIGIT CRYPTOGRAPHIC OTP */}
                  {/* ---------------------------------------------------- */}
                  {authMethod === 'email' && loginMode === 'otp' && (
                    <form onSubmit={handleSendEmailOtp} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                          Email Address
                        </label>
                        <div className="flex items-center rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-[#FF7A00] focus-within:border-transparent transition-all px-4 py-3.5 shadow-sm">
                          <Mail className="w-5 h-5 text-slate-400 mr-2.5 flex-shrink-0" />
                          <input
                            type="email"
                            value={emailAddress}
                            onChange={(e) => setEmailAddress(e.target.value)}
                            placeholder="Enter your email (e.g. student@example.com)"
                            className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400 font-medium"
                            autoFocus
                          />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Cryptographically secure 6-digit code. Valid for 5 minutes.</span>
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoadingEmail || !emailAddress.includes('@')}
                        className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#FF7A00] to-[#E06900] hover:from-[#E06900] hover:to-[#C55700] text-white font-bold text-sm shadow-lg shadow-orange-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isLoadingEmail ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Generating & Sending 6-Digit OTP...</span>
                          </>
                        ) : (
                          <>
                            <span>Send 6-Digit Email OTP</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  )}

                  {/* Password Fallback Mode */}
                  {loginMode === 'password' && (
                    <form onSubmit={handlePasswordLogin} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                          {authMethod === 'mobile' ? 'Mobile Number' : 'Email Address'}
                        </label>
                        <div className="flex items-center rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-[#FF7A00]">
                          <User className="w-5 h-5 text-slate-400 mr-2.5 flex-shrink-0" />
                          <input
                            type={authMethod === 'mobile' ? 'tel' : 'email'}
                            value={authMethod === 'mobile' ? mobileNumber : emailAddress}
                            onChange={(e) => authMethod === 'mobile' ? setMobileNumber(e.target.value) : setEmailAddress(e.target.value)}
                            placeholder={authMethod === 'mobile' ? '10-digit mobile' : 'name@example.com'}
                            className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-white font-medium"
                            autoFocus
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                            Password
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setStep('forgot_password');
                              setForgotStep('request');
                              setForgotIdentifier(authMethod === 'mobile' ? mobileNumber : emailAddress);
                              clearMessages();
                            }}
                            className="text-xs text-[#FF7A00] hover:underline font-semibold cursor-pointer"
                          >
                            Forgot Password?
                          </button>
                        </div>
                        <div className="flex items-center rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-[#FF7A00]">
                          <Lock className="w-5 h-5 text-slate-400 mr-2.5 flex-shrink-0" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-white font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isPasswordLoading}
                        className="w-full py-3.5 px-6 rounded-2xl bg-[#FF7A00] hover:bg-[#E06900] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isPasswordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Sign In with Password</span>}
                      </button>
                    </form>
                  )}

                  {/* ---------------------------------------------------- */}
                  {/* OPTION 3: REAL FIREBASE GOOGLE SIGN-IN */}
                  {/* ---------------------------------------------------- */}
                  <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
                    <div className="relative flex justify-center text-xs uppercase mb-4">
                      <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 font-semibold">
                        Or continue with
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={isLoadingGoogle}
                      className="w-full py-3.5 px-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {isLoadingGoogle ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[#FF7A00]" />
                          <span>Connecting Google Account...</span>
                        </>
                      ) : (
                        <>
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
                          <span>Continue with Google</span>
                        </>
                      )}
                    </button>

                    <div className="mt-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setLoginMode(loginMode === 'otp' ? 'password' : 'otp');
                          clearMessages();
                        }}
                        className="text-xs text-slate-500 dark:text-slate-400 hover:text-[#FF7A00] font-semibold cursor-pointer underline"
                      >
                        {loginMode === 'otp' ? 'Prefer password login? Click here' : 'Use OTP login instead'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* STEP 2: 6-DIGIT OTP VERIFICATION SCREEN */}
              {/* 60s Resend Countdown as requested */}
              {/* ======================================================== */}
              {step === 'otp' && (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      clearRecaptchaVerifier('recaptcha-container');
                      setStep('identifier');
                      clearMessages();
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white mb-4 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to login methods</span>
                  </button>

                  <div className="mb-6">
                    <span className="text-xs font-bold text-[#FF7A00] tracking-wide uppercase">
                      Two-Factor Verification
                    </span>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      Enter 6-Digit OTP
                    </h2>
                    
                    {/* Identifier info */}
                    <div className="flex items-center justify-between mt-2 p-2.5 rounded-xl bg-orange-50 dark:bg-slate-800/80 border border-orange-100 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        {activeAuthType === 'mobile' ? (
                          <Smartphone className="w-4 h-4 text-[#FF7A00]" />
                        ) : (
                          <Mail className="w-4 h-4 text-[#FF7A00]" />
                        )}
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {activeIdentifier}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          clearRecaptchaVerifier('recaptcha-container');
                          setStep('identifier');
                          clearMessages();
                        }}
                        className="text-xs font-semibold text-[#FF7A00] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>

                  {/* 6-Digit OTP Input Boxes */}
                  <form onSubmit={handleVerifyOtp} className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 text-center">
                        Type the 6-digit code delivered to your {activeAuthType === 'mobile' ? 'mobile' : 'email'}
                      </label>
                      <div className="flex items-center justify-between gap-2 max-w-sm mx-auto">
                        {otpDigits.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={(el) => {
                              otpInputRefs.current[idx] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                            className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#FF7A00] focus:ring-4 focus:ring-orange-500/15 outline-none transition-all shadow-sm"
                          />
                        ))}
                      </div>
                    </div>

                    {/* Resend OTP & 60-Second Countdown Timer as requested */}
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>Valid for 5 minutes</span>
                      </div>

                      {countdown > 0 ? (
                        <div className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                          <span>Resend OTP in</span>
                          <span className="font-mono text-[#FF7A00] font-bold">
                            00:{countdown < 10 ? `0${countdown}` : countdown}
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={isLoadingMobile || isLoadingEmail}
                          className="font-bold text-[#FF7A00] hover:text-[#E06900] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Resend OTP</span>
                        </button>
                      )}
                    </div>

                    {/* Verify & Proceed Button */}
                    <button
                      type="submit"
                      disabled={isVerifyingOtp || otpDigits.join('').length !== 6}
                      className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#FF7A00] to-[#E06900] hover:from-[#E06900] hover:to-[#C55700] text-white font-bold text-sm shadow-lg shadow-orange-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isVerifyingOtp ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verifying OTP...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify & Proceed</span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* ======================================================== */}
              {/* FORGOT PASSWORD SCREEN */}
              {/* ======================================================== */}
              {step === 'forgot_password' && (
                <div>
                  <button
                    type="button"
                    onClick={() => { setStep('identifier'); clearMessages(); }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white mb-4 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to sign in</span>
                  </button>

                  <div className="mb-6">
                    <span className="text-xs font-bold text-[#FF7A00] tracking-wide uppercase">
                      Account Recovery
                    </span>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      Reset Password
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {forgotStep === 'request'
                        ? 'Enter your registered email or mobile to receive a 6-digit verification code.'
                        : 'Enter the 6-digit OTP code and choose your new password.'}
                    </p>
                  </div>

                  {forgotStep === 'request' ? (
                    <form onSubmit={handleForgotInit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                          Registered Email or Mobile
                        </label>
                        <div className="flex items-center rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-[#FF7A00]">
                          <KeyRound className="w-5 h-5 text-slate-400 mr-2.5 flex-shrink-0" />
                          <input
                            type="text"
                            value={forgotIdentifier}
                            onChange={(e) => setForgotIdentifier(e.target.value)}
                            placeholder="Enter email or mobile"
                            className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-white font-medium"
                            autoFocus
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isPasswordLoading}
                        className="w-full py-3.5 px-6 rounded-2xl bg-[#FF7A00] hover:bg-[#E06900] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isPasswordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Send Reset OTP</span>}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleForgotReset} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          6-Digit OTP Code
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={forgotOtp}
                          onChange={(e) => setForgotOtp(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="e.g. 123456"
                          className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm tracking-widest font-mono text-center outline-none focus:ring-2 focus:ring-[#FF7A00]"
                          autoFocus
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          New Secure Password (min 6 chars)
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-[#FF7A00]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isPasswordLoading}
                        className="w-full py-3.5 px-6 rounded-2xl bg-[#FF7A00] hover:bg-[#E06900] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isPasswordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Update Password & Sign In</span>}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* STEP 3: CANDIDATE REGISTRATION */}
              {/* ======================================================== */}
              {step === 'registration' && (
                <div className="max-h-[550px] overflow-y-auto pr-1">
                  <div className="mb-5">
                    <span className="text-xs font-bold text-[#FF7A00] tracking-wide uppercase">
                      Candidate Profile Setup
                    </span>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      Complete Your Profile
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      OTP verified! Enter your details to access genuine internships, courses, and roadmaps.
                    </p>
                  </div>

                  <form onSubmit={handleCompleteRegistration} className="space-y-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Full Name *
                      </label>
                      <div className="flex items-center rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-3 shadow-sm focus-within:ring-2 focus-within:ring-[#FF7A00]">
                        <User className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
                        <input
                          type="text"
                          required
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="e.g. Rahul Sharma"
                          className="flex-1 text-xs sm:text-sm bg-transparent outline-none text-slate-900 dark:text-white font-medium"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Email & Phone Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Email Address *
                        </label>
                        <div className="flex items-center rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-3 shadow-sm focus-within:ring-2 focus-within:ring-[#FF7A00]">
                          <Mail className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
                          <input
                            type="email"
                            required
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            placeholder="name@example.com"
                            className="flex-1 text-xs bg-transparent outline-none text-slate-900 dark:text-white font-medium"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Mobile Number *
                        </label>
                        <div className="flex items-center rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-3 shadow-sm focus-within:ring-2 focus-within:ring-[#FF7A00]">
                          <span className="text-xs font-bold text-slate-500 mr-1.5">{countryCode}</span>
                          <input
                            type="tel"
                            required
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="10-digit mobile"
                            className="flex-1 text-xs bg-transparent outline-none text-slate-900 dark:text-white font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Age and Location Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Age (Years) *
                        </label>
                        <div className="flex items-center rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-3 shadow-sm focus-within:ring-2 focus-within:ring-[#FF7A00]">
                          <input
                            type="number"
                            min={15}
                            max={60}
                            required
                            value={regAge}
                            onChange={(e) => setRegAge(e.target.value)}
                            placeholder="21"
                            className="flex-1 text-xs bg-transparent outline-none text-slate-900 dark:text-white font-medium"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Location (City / State) *
                        </label>
                        <div className="flex items-center rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-3 shadow-sm focus-within:ring-2 focus-within:ring-[#FF7A00]">
                          <MapPin className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
                          <input
                            type="text"
                            required
                            value={regLocation}
                            onChange={(e) => setRegLocation(e.target.value)}
                            placeholder="e.g. Bengaluru, Karnataka"
                            className="flex-1 text-xs bg-transparent outline-none text-slate-900 dark:text-white font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Education Level */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Education Level *
                      </label>
                      <div className="flex items-center rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-3 shadow-sm focus-within:ring-2 focus-within:ring-[#FF7A00]">
                        <GraduationCap className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
                        <select
                          value={regEducation}
                          onChange={(e) => setRegEducation(e.target.value)}
                          className="flex-1 text-xs bg-transparent outline-none text-slate-900 dark:text-white font-medium cursor-pointer"
                        >
                          <option value="10th Pass (High School)">10th Pass (High School)</option>
                          <option value="12th Pass (Intermediate / Senior Secondary)">12th Pass (Intermediate / Senior Secondary)</option>
                          <option value="Diploma / Polytechnic Certificate">Diploma / Polytechnic Certificate</option>
                          <option value="Undergraduate (B.Tech / B.E. / B.Sc / B.Com / BCA)">Undergraduate (B.Tech / B.E. / B.Sc / B.Com / BCA)</option>
                          <option value="Postgraduate (M.Tech / MBA / MCA / M.Sc)">Postgraduate (M.Tech / MBA / MCA / M.Sc)</option>
                          <option value="Doctorate / PhD">Doctorate / PhD</option>
                        </select>
                      </div>
                    </div>

                    {/* College / Institute Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        College or Institute Name
                      </label>
                      <div className="flex items-center rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-3 shadow-sm focus-within:ring-2 focus-within:ring-[#FF7A00]">
                        <Building2 className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
                        <input
                          type="text"
                          value={regCollege}
                          onChange={(e) => setRegCollege(e.target.value)}
                          placeholder="e.g. National Institute of Technology / Delhi University"
                          className="flex-1 text-xs bg-transparent outline-none text-slate-900 dark:text-white font-medium"
                        />
                      </div>
                    </div>

                    {/* Preferred Job Roles */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Preferred Job & Internship Roles
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {POPULAR_ROLES.map((role) => {
                          const isSelected = selectedPreferredRoles.includes(role);
                          return (
                            <button
                              type="button"
                              key={role}
                              onClick={() => togglePreferredRole(role)}
                              className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                                isSelected
                                  ? 'bg-[#FF7A00] text-white shadow-sm'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                              <span>{role}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={roleInput}
                          onChange={(e) => setRoleInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addCustomRole();
                            }
                          }}
                          placeholder="Add custom role (e.g. AI Research Intern)"
                          className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-[#FF7A00]"
                        />
                        <button
                          type="button"
                          onClick={addCustomRole}
                          className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-white rounded-xl text-xs font-bold cursor-pointer"
                        >
                          + Add
                        </button>
                      </div>
                    </div>

                    {/* Skills Selection */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Skills (Select all that apply)
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {POPULAR_SKILLS.map((skill) => {
                          const isSelected = selectedSkills.includes(skill);
                          return (
                            <button
                              type="button"
                              key={skill}
                              onClick={() => toggleSkill(skill)}
                              className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                                isSelected
                                  ? 'bg-[#FF7A00] text-white shadow-sm'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                              <span>{skill}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={skillInput}
                          onChange={(e) => setSkillInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addCustomSkill();
                            }
                          }}
                          placeholder="Type other skill and click Add"
                          className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-[#FF7A00]"
                        />
                        <button
                          type="button"
                          onClick={addCustomSkill}
                          className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-white rounded-xl text-xs font-bold cursor-pointer"
                        >
                          + Add
                        </button>
                      </div>
                    </div>

                    {/* Interests Selection */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Career Interests & Aspirations
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {POPULAR_INTERESTS.map((interest) => {
                          const isSelected = selectedInterests.includes(interest);
                          return (
                            <button
                              type="button"
                              key={interest}
                              onClick={() => toggleInterest(interest)}
                              className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                                isSelected
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                              <span>{interest}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Role Selection */}
                    <div className="pt-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        I am joining YuvaMitraa as:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setRegRole('student')}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                            regRole === 'student'
                              ? 'border-[#FF7A00] bg-orange-50/60 dark:bg-orange-950/30 text-slate-900 dark:text-white'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600'
                          }`}
                        >
                          <div className="text-xs font-bold">🎓 Student / Job Seeker</div>
                          <div className="text-[10px] text-slate-500">Access jobs, roadmaps & courses</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRegRole('recruiter')}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                            regRole === 'recruiter'
                              ? 'border-[#FF7A00] bg-orange-50/60 dark:bg-orange-950/30 text-slate-900 dark:text-white'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600'
                          }`}
                        >
                          <div className="text-xs font-bold">🏢 Recruiter / Employer</div>
                          <div className="text-[10px] text-slate-500">Post jobs and hire talent</div>
                        </button>
                      </div>
                    </div>

                    {/* Submit Registration */}
                    <button
                      type="submit"
                      disabled={isRegLoading}
                      className="w-full mt-4 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#FF7A00] to-[#E06900] hover:from-[#E06900] hover:to-[#C55700] text-white font-bold text-sm shadow-lg shadow-orange-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isRegLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving Profile...</span>
                        </>
                      ) : (
                        <>
                          <span>Complete & Open Dashboard</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
