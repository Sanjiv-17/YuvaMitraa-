import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult, 
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  onAuthStateChanged,
  signOut,
  UserCredential
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  getDocFromServer 
} from 'firebase/firestore';
import defaultFirebaseConfig from '../../firebase-applet-config.json';

// Read Firebase configuration from environment variables with fallback to firebase-applet-config.json
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || defaultFirebaseConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || defaultFirebaseConfig.measurementId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || defaultFirebaseConfig.firestoreDatabaseId,
};

// Initialize Firebase App once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Authentication
export const auth = getAuth(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export interface GoogleAuthUserResult {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

// Seamless Google OAuth fallback when Firebase Google provider isn't enabled in console
export async function signInWithGoogleOAuth(): Promise<{ user: GoogleAuthUserResult } | null> {
  return new Promise((resolve, reject) => {
    const clientId = firebaseConfig.apiKey ? (defaultFirebaseConfig as any).oAuthClientId : '';
    if (!clientId) {
      const err: any = new Error('Google OAuth Client ID is not configured.');
      err.code = 'auth/configuration-not-found';
      return reject(err);
    }

    const initTokenFlow = () => {
      const google = (window as any).google;
      if (!google?.accounts?.oauth2) {
        const err: any = new Error('Google Identity Services library is loading. Please try again.');
        err.code = 'auth/network-request-failed';
        return reject(err);
      }

      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid email profile',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            if (tokenResponse.error === 'popup_closed_by_user' || tokenResponse.error === 'access_denied') {
              const err: any = new Error('Google sign-in was cancelled by user.');
              err.code = 'auth/popup-closed-by-user';
              return reject(err);
            }
            return reject(new Error(tokenResponse.error_description || tokenResponse.error));
          }

          try {
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
            });
            if (!res.ok) {
              throw new Error('Failed to retrieve verified Google profile.');
            }
            const info = await res.json();
            resolve({
              user: {
                uid: `google-${info.sub}`,
                email: info.email || '',
                displayName: info.name || 'Google User',
                photoURL: info.picture || ''
              }
            });
          } catch (fetchErr) {
            reject(fetchErr);
          }
        },
        error_callback: (err: any) => {
          reject(err);
        }
      });

      client.requestAccessToken({ prompt: 'select_account' });
    };

    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      initTokenFlow();
    } else {
      // Dynamic fallback script load if needed
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => initTokenFlow();
      script.onerror = () => {
        const err: any = new Error('Failed to load Google Sign-In identity script.');
        err.code = 'auth/network-request-failed';
        reject(err);
      };
      document.head.appendChild(script);
    }
  });
}

// 1. Google Authentication: Popup with Redirect Fallback + OAuth Fallback
export async function signInWithGoogle(): Promise<UserCredential | { user: GoogleAuthUserResult } | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result;
  } catch (err: any) {
    // If popup is blocked by iframe or browser, fallback to signInWithRedirect
    if (
      err.code === 'auth/popup-blocked' ||
      err.code === 'auth/cancelled-popup-request' ||
      (err.message && err.message.toLowerCase().includes('popup blocked'))
    ) {
      console.warn('Popup blocked, falling back to signInWithRedirect:', err.code);
      await signInWithRedirect(auth, googleProvider);
      return null;
    }

    // Correct auth/configuration-not-found: Seamlessly authenticate via direct Google OAuth
    if (err.code === 'auth/configuration-not-found') {
      console.info('auth/configuration-not-found intercepted. Activating Google OAuth client fallback...');
      const oauthResult = await signInWithGoogleOAuth();
      return oauthResult;
    }

    throw err;
  }
}

// Check redirect result on page load (silences uninitiated passive errors)
export async function checkRedirectResult(): Promise<UserCredential | null> {
  try {
    const result = await getRedirectResult(auth);
    return result;
  } catch (err: any) {
    // Suppress passive configuration-not-found on initial boot if no redirect is pending
    if (err.code === 'auth/configuration-not-found') {
      return null;
    }
    throw err;
  }
}

// 2. Mobile Phone Authentication with Fresh RecaptchaVerifier on every attempt
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier | null;
  }
}

export function clearRecaptchaVerifier(containerId: string = 'recaptcha-container'): void {
  if (typeof window !== 'undefined' && window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch {
      // ignore
    }
    window.recaptchaVerifier = null;
  }
  if (typeof document !== 'undefined') {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
      // Replace with pristine DOM element to clear internal grecaptcha state
      if (container.parentNode) {
        const fresh = document.createElement('div');
        fresh.id = containerId;
        container.parentNode.replaceChild(fresh, container);
      }
    }
  }
}

export function createFreshRecaptchaVerifier(containerId: string = 'recaptcha-container'): RecaptchaVerifier {
  // Before creating a new one, call .clear() on the old one and empty the container div
  clearRecaptchaVerifier(containerId);

  if (typeof document !== 'undefined') {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
    }
  }

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved automatically
    },
    'expired-callback': () => {
      clearRecaptchaVerifier(containerId);
    }
  });

  if (typeof window !== 'undefined') {
    window.recaptchaVerifier = verifier;
  }

  return verifier;
}

export const getOrCreateRecaptchaVerifier = createFreshRecaptchaVerifier;

export async function sendMobileOtp(
  phoneOrDigits: string, 
  containerId: string = 'recaptcha-container',
  countryPrefix: string = '+91'
): Promise<ConfirmationResult> {
  const digits = phoneOrDigits.replace(/[^0-9]/g, '');
  if (digits.length < 7 || digits.length > 15) {
    const err: any = new Error('Please enter a valid mobile number.');
    err.code = 'auth/invalid-phone-number';
    throw err;
  }

  const cleanPrefix = countryPrefix.startsWith('+') ? countryPrefix : `+${countryPrefix}`;
  const formattedNumber = phoneOrDigits.startsWith('+') 
    ? phoneOrDigits 
    : `${cleanPrefix}${digits.length >= 10 ? digits.slice(-10) : digits}`;

  // Create a fresh RecaptchaVerifier at the start of every send-OTP attempt instead of reusing one
  const verifier = createFreshRecaptchaVerifier(containerId);

  try {
    const confirmation = await signInWithPhoneNumber(auth, formattedNumber, verifier);
    return confirmation;
  } catch (err: any) {
    // In the catch block of the send-OTP function, call window.recaptchaVerifier.clear(), set it to null, and empty the recaptcha container div's innerHTML
    if (typeof window !== 'undefined' && window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch {
        // ignore
      }
      window.recaptchaVerifier = null;
    }
    if (typeof document !== 'undefined') {
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = '';
      }
    }
    throw err;
  }
}

// 3. Email Authentication with sendSignInLinkWithEmail
export async function sendEmailSignInLink(email: string): Promise<string> {
  const cleanEmail = email.trim().toLowerCase();
  const actionCodeSettings = {
    url: window.location.origin,
    handleCodeInApp: true,
  };

  await sendSignInLinkToEmail(auth, cleanEmail, actionCodeSettings);
  localStorage.setItem('emailForSignIn', cleanEmail);
  return cleanEmail;
}

export async function completeEmailLinkSignInIfPresent(): Promise<UserCredential | null> {
  if (typeof window === 'undefined') return null;

  if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = localStorage.getItem('emailForSignIn');
    if (!email) {
      email = window.prompt('Please provide your email address to complete sign in:');
    }

    if (email) {
      const result = await signInWithEmailLink(auth, email, window.location.href);
      localStorage.removeItem('emailForSignIn');
      // Clean query parameters from URL without reloading
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      return result;
    }
  }
  return null;
}

// Connection test helper
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client offline, checking network connection.');
      return false;
    }
    return true;
  }
}

// Sync user profile document in Firestore
export async function syncUserProfileToFirestore(uid: string, profile: any): Promise<void> {
  if (!auth.currentUser || (auth.currentUser.uid !== uid && auth.currentUser.email !== 'sanjivsanju017@gmail.com')) {
    return;
  }

  const userRef = doc(db, 'users', uid);
  try {
    const existing = await getDoc(userRef);
    const now = new Date().toISOString();
    const payload = {
      uid,
      name: profile.name || 'Yuva Member',
      role: profile.role || 'student',
      createdAt: profile.createdAt || now,
      updatedAt: now,
      email: profile.email || '',
      phone: profile.phone || '',
      college: profile.college || '',
      location: profile.location || ''
    };

    if (existing.exists()) {
      await updateDoc(userRef, payload);
    } else {
      await setDoc(userRef, payload);
    }
  } catch (err) {
    console.warn('Firestore user profile sync warning:', err);
  }
}

export async function getUserProfileFromFirestore(uid: string): Promise<any | null> {
  if (!auth.currentUser || (auth.currentUser.uid !== uid && auth.currentUser.email !== 'sanjivsanju017@gmail.com')) {
    return null;
  }

  const userRef = doc(db, 'users', uid);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    console.warn('Firestore get profile warning:', err);
    return null;
  }
}

export { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  onAuthStateChanged, 
  signOut 
};
export const sendFirebasePhoneOtp = sendMobileOtp;
export type { ConfirmationResult, FirebaseUser, UserCredential };
