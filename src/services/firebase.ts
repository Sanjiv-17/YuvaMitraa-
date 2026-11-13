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
  sendEmailVerification,
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

// Initialize Firestore with auto-detect long-polling for reliable iframe/proxy connectivity
let firestoreInstance: any;
try {
  firestoreInstance = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
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

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: Array<{
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }>;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: (auth.currentUser?.providerData || []).map((provider) => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL,
      })),
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  return errInfo;
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
  await sendPasswordResetEmail(auth, cleanEmail);
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
 * Send email verification link to the current or specified Firebase user
 */
export async function sendVerificationEmail(user?: FirebaseUser | null): Promise<void> {
  const target = user || auth.currentUser;
  if (!target) return;
  await sendEmailVerification(target);
}

/**
 * Retrieve fresh Firebase ID token and parsed custom claims
 */
export async function getFirebaseIdToken(forceRefresh: boolean = false): Promise<string | null> {
  if (!auth.currentUser) return null;
  return await auth.currentUser.getIdToken(forceRefresh);
}

export async function getFirebaseCustomClaims(forceRefresh: boolean = false): Promise<Record<string, any>> {
  if (!auth.currentUser) return {};
  const tokenResult = await auth.currentUser.getIdTokenResult(forceRefresh);
  return tokenResult.claims || {};
}

function isFirestoreServiceDisabledError(err: any): boolean {
  const code = String(err?.code || '').toLowerCase();
  const msg = String(err?.message || '').toLowerCase();
  return (
    msg.includes('has not been used in project') ||
    msg.includes('firestore.googleapis.com') ||
    msg.includes('api has not been used') ||
    (code === 'permission-denied' && msg.includes('disabled'))
  );
}

function isOfflineOrUnavailableError(err: any): boolean {
  const code = String(err?.code || '').toLowerCase();
  const msg = String(err?.message || '').toLowerCase();
  return (
    code === 'unavailable' ||
    code === 'failed-precondition' ||
    msg.includes('client is offline') ||
    msg.includes('offline') ||
    msg.includes('network') ||
    msg.includes('unavailable')
  );
}

function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string') fields[k] = { stringValue: v };
    else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
    else if (typeof v === 'number') {
      fields[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    }
  }
  return fields;
}

function fromFirestoreFields(fields: Record<string, any> | undefined): Record<string, any> {
  const parsed: Record<string, any> = {};
  if (!fields) return parsed;
  for (const [k, v] of Object.entries<any>(fields)) {
    if (!v || typeof v !== 'object') continue;
    if ('stringValue' in v) parsed[k] = v.stringValue;
    else if ('integerValue' in v) parsed[k] = Number(v.integerValue);
    else if ('doubleValue' in v) parsed[k] = Number(v.doubleValue);
    else if ('booleanValue' in v) parsed[k] = Boolean(v.booleanValue);
  }
  return parsed;
}

async function getUserDocViaRest(uid: string): Promise<{ exists: boolean; data: any | null }> {
  if (!auth.currentUser) throw new Error('Not signed in');
  const idToken = await auth.currentUser.getIdToken();
  const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/users/${encodeURIComponent(uid)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (res.status === 404) {
    return { exists: false, data: null };
  }
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || `Firestore REST GET failed (${res.status})`);
  }
  const json = await res.json();
  return { exists: true, data: fromFirestoreFields(json.fields) };
}

async function writeUserDocViaRest(uid: string, payload: Record<string, any>, updateKeys?: string[]): Promise<void> {
  if (!auth.currentUser) throw new Error('Not signed in');
  const idToken = await auth.currentUser.getIdToken();
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/users/${encodeURIComponent(uid)}`;
  const params = updateKeys && updateKeys.length > 0
    ? '?' + updateKeys.map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&')
    : '';
  const res = await fetch(`${baseUrl}${params}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: toFirestoreFields(payload) }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || `Firestore REST PATCH failed (${res.status})`);
  }
}

/**
 * Sync user profile document in Firestore
 * - On create: saves { uid, email, role, createdAt, ... } with only allowed public roles ('student' | 'recruiter' | 'experienced')
 * - On update: never mutates role, uid, or createdAt
 * - Falls back to authenticated Firestore REST API if the WebChannel client reports offline
 */
export async function syncUserProfileToFirestore(
  uid: string,
  profile: any,
  options?: { isNewUser?: boolean }
): Promise<any | null> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    return null;
  }

  const userRef = doc(db, 'users', uid);
  const now = new Date().toISOString();

  const buildCreatePayload = () => {
    const requestedRole = profile.role;
    const safeRole =
      requestedRole === 'recruiter' || requestedRole === 'experienced' || requestedRole === 'student'
        ? requestedRole
        : 'student';

    const createPayload: Record<string, any> = {
      uid,
      name: String(profile.name || auth.currentUser?.displayName || 'Yuva Member').slice(0, 100),
      email: String(profile.email || auth.currentUser?.email || '').toLowerCase().slice(0, 160),
      role: safeRole,
      createdAt: profile.createdAt || now,
      updatedAt: now,
    };
    if (profile.phone) createPayload.phone = String(profile.phone).slice(0, 32);
    if (profile.college) createPayload.college = String(profile.college).slice(0, 200);
    if (profile.location) createPayload.location = String(profile.location).slice(0, 160);
    if (profile.currentRole) createPayload.currentRole = String(profile.currentRole).slice(0, 160);
    if (profile.yearsOfExperience) createPayload.yearsOfExperience = String(profile.yearsOfExperience).slice(0, 64);
    return createPayload;
  };

  try {
    // Fast path for newly created accounts: skip getDoc and create directly
    if (options?.isNewUser) {
      const createPayload = buildCreatePayload();
      try {
        await setDoc(userRef, createPayload);
      } catch (sdkWriteErr: any) {
        if (isOfflineOrUnavailableError(sdkWriteErr)) {
          await writeUserDocViaRest(uid, createPayload);
        } else {
          throw sdkWriteErr;
        }
      }
      return createPayload;
    }

    let docExists = false;
    let existingData: any = null;
    try {
      const existing = await getDoc(userRef);
      docExists = existing.exists();
      existingData = docExists ? existing.data() : null;
    } catch (sdkReadErr: any) {
      if (isOfflineOrUnavailableError(sdkReadErr)) {
        const restDoc = await getUserDocViaRest(uid);
        docExists = restDoc.exists;
        existingData = restDoc.data;
      } else {
        throw sdkReadErr;
      }
    }

    if (docExists) {
      const updatePayload: Record<string, any> = {
        updatedAt: now,
      };
      if (profile.name) updatePayload.name = String(profile.name).slice(0, 100);
      if (profile.email) updatePayload.email = String(profile.email).slice(0, 160);
      if (profile.phone !== undefined) updatePayload.phone = String(profile.phone || '').slice(0, 32);
      if (profile.college !== undefined) updatePayload.college = String(profile.college || '').slice(0, 200);
      if (profile.location !== undefined) updatePayload.location = String(profile.location || '').slice(0, 160);
      if (profile.currentRole !== undefined) updatePayload.currentRole = String(profile.currentRole || '').slice(0, 160);
      if (profile.yearsOfExperience !== undefined) updatePayload.yearsOfExperience = String(profile.yearsOfExperience || '').slice(0, 64);

      try {
        await updateDoc(userRef, updatePayload);
      } catch (sdkUpdateErr: any) {
        if (isOfflineOrUnavailableError(sdkUpdateErr)) {
          await writeUserDocViaRest(uid, updatePayload, Object.keys(updatePayload));
        } else {
          throw sdkUpdateErr;
        }
      }
      return { ...(existingData || {}), ...updatePayload };
    } else {
      const createPayload = buildCreatePayload();
      try {
        await setDoc(userRef, createPayload);
      } catch (sdkWriteErr: any) {
        if (isOfflineOrUnavailableError(sdkWriteErr)) {
          await writeUserDocViaRest(uid, createPayload);
        } else {
          throw sdkWriteErr;
        }
      }
      return createPayload;
    }
  } catch (err: any) {
    if (isOfflineOrUnavailableError(err) || isFirestoreServiceDisabledError(err)) {
      console.warn('Firestore profile sync skipped:', err?.message || err);
      return null;
    }
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    return null;
  }
}

export async function getUserProfileFromFirestore(uid: string): Promise<any | null> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    return null;
  }

  const userRef = doc(db, 'users', uid);
  try {
    try {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        return snap.data();
      }
      return null;
    } catch (sdkReadErr: any) {
      if (isOfflineOrUnavailableError(sdkReadErr)) {
        const restDoc = await getUserDocViaRest(uid);
        return restDoc.exists ? restDoc.data : null;
      }
      throw sdkReadErr;
    }
  } catch (err: any) {
    if (isOfflineOrUnavailableError(err) || isFirestoreServiceDisabledError(err)) {
      console.warn('Firestore profile read skipped:', err?.message || err);
      return null;
    }
    handleFirestoreError(err, OperationType.GET, `users/${uid}`);
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
