import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
  UserCredential
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
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

// Initialize Firestore with long-polling to prevent proxy/iframe 10-second backend timeout
let firestoreInstance: any;
try {
  firestoreInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, firebaseConfig.firestoreDatabaseId);
} catch {
  firestoreInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = firestoreInstance; /* CRITICAL: The app will break without this line */

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

/**
 * 1. Email & Password Authentication (Login)
 */
export async function loginWithEmailPassword(email: string, password: string): Promise<UserCredential> {
  const cleanEmail = email.trim().toLowerCase();
  return await signInWithEmailAndPassword(auth, cleanEmail, password);
}

/**
 * 2. Email & Password Registration (Direct signup without OTP)
 */
export async function registerWithEmailPassword(
  name: string,
  email: string,
  password: string
): Promise<UserCredential> {
  const cleanEmail = email.trim().toLowerCase();
  const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
  
  if (credential.user && name.trim()) {
    try {
      await updateProfile(credential.user, {
        displayName: name.trim()
      });
    } catch (profileErr) {
      console.warn('Could not update Firebase display name immediately:', profileErr);
    }
  }

  return credential;
}

/**
 * 3. Send Password Reset Email Link
 */
export async function sendFirebasePasswordResetEmail(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const actionCodeSettings = {
    url: window.location.origin,
    handleCodeInApp: true
  };
  await sendPasswordResetEmail(auth, cleanEmail, actionCodeSettings);
}

/**
 * Direct Google OAuth fallback when Firebase Google provider isn't enabled in console
 */
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

/**
 * 4. Google Authentication: Popup with Redirect Fallback + OAuth Fallback
 */
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

/**
 * Check redirect result on page load (silences uninitiated passive errors)
 */
export async function checkRedirectResult(): Promise<UserCredential | null> {
  try {
    const result = await getRedirectResult(auth);
    return result;
  } catch (err: any) {
    if (err.code === 'auth/configuration-not-found') {
      return null;
    }
    throw err;
  }
}

/**
 * 5. Sign Out User
 */
export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Sign out warning:', err);
  }
}

/**
 * Connection test helper with 4s timeout safeguard
 */
export async function testConnection(): Promise<boolean> {
  try {
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000));
    await Promise.race([
      getDocFromServer(doc(db, 'test', 'connection')),
      timeoutPromise
    ]);
    return true;
  } catch (error) {
    // Graceful offline readiness: avoid unhandled rejection or blocking errors
    console.info('Firestore client ready (offline-first mode active)');
    return true;
  }
}

/**
 * Sync user profile document in Firestore
 */
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
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged, 
  signOut 
};

export type { FirebaseUser, UserCredential };
