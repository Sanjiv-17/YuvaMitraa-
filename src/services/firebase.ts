import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
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
  collection,
  doc, 
  getDoc, 
  getDocs,
  query,
  where,
  setDoc, 
  updateDoc, 
  deleteDoc,
  getDocFromServer,
  serverTimestamp
} from 'firebase/firestore';
import defaultFirebaseConfig from '../../firebase-applet-config.json';
import { Application, Certificate, InternshipListing, StudentRecommendationBundle } from '../types';
import { normalizeTimestampToIso } from '../utils/relativeTime';

// Use provisioned firebase-applet-config.json as authoritative configuration (fallback to VITE_FIREBASE_* if unset)
export const firebaseConfig = {
  apiKey: defaultFirebaseConfig.apiKey || import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: defaultFirebaseConfig.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: defaultFirebaseConfig.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: defaultFirebaseConfig.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: defaultFirebaseConfig.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: defaultFirebaseConfig.appId || import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: defaultFirebaseConfig.measurementId || import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  firestoreDatabaseId: defaultFirebaseConfig.firestoreDatabaseId || import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
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
 * Respects rememberMe by using browserLocalPersistence (default) vs browserSessionPersistence.
 */
export async function loginWithEmailPassword(
  email: string,
  password: string,
  rememberMe: boolean = true
): Promise<UserCredential> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
  } catch {
    // Fallback to default browser persistence in restricted iframe environments
  }
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
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch {
    // Non-fatal in restricted storage contexts
  }
  const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
  
  if (credential.user && name.trim()) {
    updateProfile(credential.user, {
      displayName: name.trim()
    }).catch((profileErr) => {
      console.warn('Could not update Firebase display name immediately:', profileErr);
    });
  }

  return credential;
}

/**
 * Wait briefly for Firebase Auth to restore persisted local session on page load.
 */
export async function waitForFirebaseAuthReady(timeoutMs: number = 2500): Promise<FirebaseUser | null> {
  if (auth.currentUser) return auth.currentUser;
  if (typeof (auth as any).authStateReady === 'function') {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        (auth as any).authStateReady(),
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
    return auth.currentUser;
  }
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        unsub();
        resolve(auth.currentUser);
      }
    }, timeoutMs);
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        unsub();
        resolve(u);
      }
    });
  });
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
export async function signInWithGoogleOAuth(): Promise<{ user: GoogleAuthUserResult; oauthAccessToken: string } | null> {
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
              oauthAccessToken: tokenResponse.access_token,
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
export async function signInWithGoogle(): Promise<UserCredential | { user: GoogleAuthUserResult; oauthAccessToken: string } | null> {
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
      try {
        sessionStorage.setItem('ym_google_redirect_pending', '1');
      } catch {}
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
 * Check redirect result on page load — skips network check unless a redirect was actually initiated
 */
export async function checkRedirectResult(): Promise<UserCredential | null> {
  try {
    const hasPendingRedirect =
      typeof sessionStorage !== 'undefined' &&
      sessionStorage.getItem('ym_google_redirect_pending') === '1';
    if (!hasPendingRedirect) {
      return null;
    }
    sessionStorage.removeItem('ym_google_redirect_pending');
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
 * 5. Sign Out User (always purges per-UID Firestore memory cache)
 */
export async function signOutUser(): Promise<void> {
  clearFirestoreClientCache();
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Sign out warning:', err);
  }
}

/**
 * Connection test helper with 2s timeout safeguard.
 * Proactively detects stalled WebChannel in proxied/iframe networks so login reads use fast REST immediately.
 */
export async function testConnection(): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const err: any = new Error('timeout');
        err.code = 'unavailable';
        reject(err);
      }, 2000);
    });
    await Promise.race([
      getDocFromServer(doc(db, 'test', 'connection')),
      timeoutPromise
    ]);
    return true;
  } catch (error: any) {
    if (isOfflineOrUnavailableError(error)) {
      preferRestFirestore = true;
    }
    console.info('Firestore client ready (adaptive REST/SDK transport active)');
    return true;
  } finally {
    if (timer) clearTimeout(timer);
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
 * Retrieve fresh Firebase ID token and parsed custom claims (single call)
 */
export async function getFirebaseIdToken(forceRefresh: boolean = false): Promise<string | null> {
  if (!auth.currentUser) return null;
  return await auth.currentUser.getIdToken(forceRefresh);
}

export async function getFirebaseTokenAndClaims(forceRefresh: boolean = false): Promise<{
  token: string | null;
  claims: Record<string, any>;
}> {
  if (!auth.currentUser) return { token: null, claims: {} };
  const tokenResult = await auth.currentUser.getIdTokenResult(forceRefresh);
  return {
    token: tokenResult.token || null,
    claims: tokenResult.claims || {},
  };
}

export async function getFirebaseCustomClaims(forceRefresh: boolean = false): Promise<Record<string, any>> {
  if (!auth.currentUser) return {};
  const tokenResult = await auth.currentUser.getIdTokenResult(forceRefresh);
  return tokenResult.claims || {};
}

// Per-UID short-TTL in-memory cache & in-flight request deduplication (prevents duplicate Firestore reads)
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}
const firestoreReadCache = new Map<string, CacheEntry<any>>();
const inflightFirestoreReads = new Map<string, Promise<any>>();
const pendingProfileCreateByUid = new Map<string, Promise<any>>();

const USER_DOC_CACHE_TTL_MS = 30_000;
const CATALOG_CACHE_TTL_MS = 60_000;

function getCachedRead<T>(key: string): { hit: boolean; value?: T } {
  const entry = firestoreReadCache.get(key);
  if (!entry) return { hit: false };
  if (Date.now() > entry.expiresAt) {
    firestoreReadCache.delete(key);
    return { hit: false };
  }
  return { hit: true, value: entry.value as T };
}

function setCachedRead<T>(key: string, value: T, ttlMs: number = USER_DOC_CACHE_TTL_MS): void {
  firestoreReadCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function invalidateCacheKey(key: string): void {
  firestoreReadCache.delete(key);
}

/**
 * Clear strictly UID-scoped Firestore read caches on logout or account switch.
 */
export function clearFirestoreClientCache(uid?: string): void {
  if (!uid) {
    firestoreReadCache.clear();
    inflightFirestoreReads.clear();
    pendingProfileCreateByUid.clear();
    return;
  }
  for (const key of Array.from(firestoreReadCache.keys())) {
    if (key.includes(`:${uid}`)) {
      firestoreReadCache.delete(key);
    }
  }
  for (const key of Array.from(inflightFirestoreReads.keys())) {
    if (key.includes(`:${uid}`)) {
      inflightFirestoreReads.delete(key);
    }
  }
}

async function cachedFirestoreRead<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
  forceRefresh: boolean = false
): Promise<T> {
  if (!forceRefresh) {
    const cached = getCachedRead<T>(key);
    if (cached.hit) return cached.value as T;
    const inflight = inflightFirestoreReads.get(key);
    if (inflight) return inflight as Promise<T>;
  }

  const p = loader()
    .then((val) => {
      setCachedRead(key, val, ttlMs);
      return val;
    })
    .finally(() => {
      if (inflightFirestoreReads.get(key) === p) {
        inflightFirestoreReads.delete(key);
      }
    });

  inflightFirestoreReads.set(key, p);
  return p;
}

let preferRestFirestore = false;
const FIRESTORE_SDK_TIMEOUT_MS = 2000;
const FIRESTORE_REST_TIMEOUT_MS = 10000;

async function withSdkTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  promise.catch(() => {});
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          const err: any = new Error(`${label} timed out (client is offline)`);
          err.code = 'unavailable';
          reject(err);
        }, FIRESTORE_SDK_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
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
  const name = String(err?.name || '').toLowerCase();
  const code = String(err?.code || '').toLowerCase();
  const msg = String(err?.message || '').toLowerCase();
  return (
    name === 'timeouterror' ||
    name === 'aborterror' ||
    code === 'unavailable' ||
    code === 'failed-precondition' ||
    code === 'deadline-exceeded' ||
    code === 'aborted' ||
    msg.includes('client is offline') ||
    msg.includes('offline') ||
    msg.includes('network') ||
    msg.includes('unavailable') ||
    msg.includes('signal timed out') ||
    msg.includes('timed out') ||
    msg.includes('timeout') ||
    msg.includes('failed to fetch') ||
    msg.includes('load failed') ||
    msg.includes('aborted')
  );
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number = FIRESTORE_REST_TIMEOUT_MS,
  retries: number = 1
): Promise<Response> {
  let lastError: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
    try {
      return await fetch(url, {
        ...init,
        ...(controller ? { signal: controller.signal } : {}),
      });
    } catch (err: any) {
      lastError = err;
      if (attempt < retries && isOfflineOrUnavailableError(err)) {
        continue;
      }
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  throw lastError;
}

function toFirestoreValue(v: any): any {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (Array.isArray(v)) {
    return { arrayValue: { values: v.map(toFirestoreValue).filter(Boolean) } };
  }
  if (typeof v === 'object') {
    return { mapValue: { fields: toFirestoreFields(v) } };
  }
  return null;
}

function fromFirestoreValue(v: any): any {
  if (!v || typeof v !== 'object') return undefined;
  if ('stringValue' in v) return v.stringValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return Boolean(v.booleanValue);
  if ('arrayValue' in v) {
    const arr = Array.isArray(v.arrayValue?.values) ? v.arrayValue.values : [];
    return arr.map(fromFirestoreValue).filter((item: any) => item !== undefined);
  }
  if ('mapValue' in v) {
    return fromFirestoreFields(v.mapValue?.fields);
  }
  return undefined;
}

function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    const converted = toFirestoreValue(v);
    if (converted) fields[k] = converted;
  }
  return fields;
}

function fromFirestoreFields(fields: Record<string, any> | undefined): Record<string, any> {
  const parsed: Record<string, any> = {};
  if (!fields) return parsed;
  for (const [k, v] of Object.entries<any>(fields)) {
    const converted = fromFirestoreValue(v);
    if (converted !== undefined) parsed[k] = converted;
  }
  return parsed;
}

async function getUserDocViaRest(uid: string): Promise<{ exists: boolean; data: any | null }> {
  if (!auth.currentUser) throw new Error('Not signed in');
  const idToken = await auth.currentUser.getIdToken();
  const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/users/${encodeURIComponent(uid)}`;
  const res = await fetchWithTimeout(url, {
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

function normalizeUserDocumentTimestamps(data: any): any {
  if (!data || typeof data !== 'object') return data;
  const out = { ...data };
  if (out.updatedAt !== undefined) out.updatedAt = normalizeTimestampToIso(out.updatedAt);
  if (out.profileUpdatedAt !== undefined) out.profileUpdatedAt = normalizeTimestampToIso(out.profileUpdatedAt);
  if (out.resumeUpdatedAt !== undefined) {
    out.resumeUpdatedAt = out.resumeUpdatedAt === '' ? '' : normalizeTimestampToIso(out.resumeUpdatedAt);
  }
  return out;
}

async function commitWithServerTimestampsViaRest(
  relativeDocPath: string,
  payload: Record<string, any>,
  serverTimestampFields: string[],
  updateMaskKeys?: string[]
): Promise<{ commitTime: string; timestamps: Record<string, string> }> {
  if (!auth.currentUser) throw new Error('Not signed in');
  const idToken = await auth.currentUser.getIdToken();
  const dbPath = `projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents`;
  const commitUrl = `https://firestore.googleapis.com/v1/${dbPath}:commit`;

  const cleanPayload: Record<string, any> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (!serverTimestampFields.includes(k)) {
      cleanPayload[k] = v;
    }
  }

  const write: Record<string, any> = {
    update: {
      name: `${dbPath}/${relativeDocPath}`,
      fields: toFirestoreFields(cleanPayload),
    },
    updateTransforms: serverTimestampFields.map((fieldPath) => ({
      fieldPath,
      setToServerValue: 'REQUEST_TIME',
    })),
  };

  if (updateMaskKeys && updateMaskKeys.length > 0) {
    write.updateMask = {
      fieldPaths: updateMaskKeys.filter((k) => !serverTimestampFields.includes(k)),
    };
  }

  const res = await fetchWithTimeout(commitUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ writes: [write] }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || `Firestore REST commit failed (${res.status})`);
  }

  const json = await res.json().catch(() => ({}));
  const commitTime = normalizeTimestampToIso(json?.commitTime) || new Date().toISOString();
  const transformResults = Array.isArray(json?.writeResults?.[0]?.transformResults)
    ? json.writeResults[0].transformResults
    : [];
  const timestamps: Record<string, string> = {};
  serverTimestampFields.forEach((field, idx) => {
    const rawTs = transformResults[idx]?.timestampValue;
    timestamps[field] = normalizeTimestampToIso(rawTs) || commitTime;
  });

  return { commitTime, timestamps };
}

async function writeUserDocViaRest(
  uid: string,
  payload: Record<string, any>,
  serverTimestampFields: string[],
  updateKeys?: string[]
): Promise<{ commitTime: string; timestamps: Record<string, string> }> {
  return commitWithServerTimestampsViaRest(
    `users/${encodeURIComponent(uid)}`,
    payload,
    serverTimestampFields,
    updateKeys
  );
}

export interface SyncProfileOptions {
  isNewUser?: boolean;
  markProfileUpdated?: boolean;
  markResumeUpdated?: boolean;
  clearResumeUpdated?: boolean;
}

/**
 * Sync user profile document in Firestore
 * - On create: saves { uid, email, role, createdAt, updatedAt: serverTimestamp(), ... }
 * - On update: never mutates role, uid, or createdAt; writes serverTimestamp() for updatedAt,
 *   and sets profileUpdatedAt / resumeUpdatedAt using serverTimestamp() only when explicitly triggered.
 * - Falls back to authenticated Firestore REST API (:commit with REQUEST_TIME transforms) if WebChannel reports offline.
 */
export async function syncUserProfileToFirestore(
  uid: string,
  profile: any,
  options?: SyncProfileOptions
): Promise<any | null> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    return null;
  }

  const userRef = doc(db, 'users', uid);
  const fallbackNow = new Date().toISOString();

  const appendExtendedFields = (target: Record<string, any>, source: Record<string, any>) => {
    const stringFields: Array<[string, number]> = [
      ['phone', 32],
      ['college', 200],
      ['institution', 200],
      ['education', 200],
      ['course', 160],
      ['studyYear', 64],
      ['department', 160],
      ['branch', 160],
      ['rollNumber', 80],
      ['cgpa', 20],
      ['graduationYear', 16],
      ['collegeAisheCode', 80],
      ['collegeWebsite', 300],
      ['accreditation', 120],
      ['companyName', 200],
      ['designation', 160],
      ['industry', 120],
      ['companyWebsite', 300],
      ['cinOrRegistrationNumber', 80],
      ['currentRole', 160],
      ['yearsOfExperience', 64],
      ['location', 160],
      ['preferredLocation', 160],
      ['preferredDomain', 160],
      ['careerGoals', 500],
      ['githubUrl', 300],
      ['linkedinUrl', 300],
      ['portfolioUrl', 300],
      ['resumeFileName', 200],
      ['photoUrl', 1000],
    ];
    for (const [key, maxLen] of stringFields) {
      if (source[key] !== undefined && source[key] !== null) {
        const strVal = String(source[key]).slice(0, maxLen);
        if (strVal || key in target === false) target[key] = strVal;
      }
    }
    if (
      source.workModePreference === 'Online' ||
      source.workModePreference === 'Offline' ||
      source.workModePreference === 'Hybrid' ||
      source.workModePreference === 'Any'
    ) {
      target.workModePreference = source.workModePreference;
    }
    if (typeof source.age === 'number' && source.age >= 13 && source.age <= 120) {
      target.age = source.age;
    }
    if (typeof source.streakDays === 'number' && source.streakDays >= 0) {
      target.streakDays = Math.min(10000, Math.round(source.streakDays));
    }
    if (typeof source.xpPoints === 'number' && source.xpPoints >= 0) {
      target.xpPoints = Math.min(10000000, Math.round(source.xpPoints));
    }
    const arrayFields: Array<[string, number]> = [
      ['skills', 60],
      ['nonTechnicalSkills', 40],
      ['interests', 40],
      ['preferredRoles', 30],
      ['badges', 50],
      ['savedJobIds', 200],
    ];
    for (const [key, maxItems] of arrayFields) {
      if (Array.isArray(source[key])) {
        target[key] = source[key].map((item: any) => String(item).slice(0, 120)).filter(Boolean).slice(0, maxItems);
      }
    }
    if (Array.isArray(source.enrolledCourses)) {
      target.enrolledCourses = source.enrolledCourses.slice(0, 100);
    }
    if (Array.isArray(source.projects)) {
      target.projects = source.projects.slice(0, 50);
    }
  };

  const serverTimestampFields: string[] = ['updatedAt'];
  if (options?.markProfileUpdated) serverTimestampFields.push('profileUpdatedAt');
  if (options?.markResumeUpdated) serverTimestampFields.push('resumeUpdatedAt');

  const buildSdkTimestampPatch = () => {
    const patch: Record<string, any> = { updatedAt: serverTimestamp() };
    if (options?.markProfileUpdated) patch.profileUpdatedAt = serverTimestamp();
    if (options?.markResumeUpdated) patch.resumeUpdatedAt = serverTimestamp();
    else if (options?.clearResumeUpdated) patch.resumeUpdatedAt = '';
    return patch;
  };

  const needsTimestampReadBack = Boolean(options?.markProfileUpdated || options?.markResumeUpdated);

  const resolveSdkCommittedTimestamps = async (baseObj: Record<string, any>) => {
    if (needsTimestampReadBack) {
      try {
        const snap = await withSdkTimeout(getDoc(userRef), 'Firestore getDoc after write');
        if (snap.exists()) {
          return normalizeUserDocumentTimestamps(snap.data());
        }
      } catch {
        // Non-fatal; fall back to local ISO timestamp when offline/cached
      }
    }
    const resolved: Record<string, any> = {
      ...baseObj,
      updatedAt: fallbackNow,
    };
    if (options?.markProfileUpdated) resolved.profileUpdatedAt = fallbackNow;
    if (options?.markResumeUpdated) resolved.resumeUpdatedAt = fallbackNow;
    else if (options?.clearResumeUpdated) resolved.resumeUpdatedAt = '';
    return normalizeUserDocumentTimestamps(resolved);
  };

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
      createdAt: profile.createdAt || fallbackNow,
    };
    appendExtendedFields(createPayload, profile);
    if (options?.clearResumeUpdated) {
      createPayload.resumeUpdatedAt = '';
    }
    return createPayload;
  };

  // If a background initial creation for this UID is still in flight, await it before issuing an update
  if (!options?.isNewUser && pendingProfileCreateByUid.has(uid)) {
    await pendingProfileCreateByUid.get(uid)?.catch(() => {});
  }

  try {
    // Fast path for newly created accounts: skip getDoc + read-back and save only essential initial fields
    if (options?.isNewUser) {
      const createPayload = buildCreatePayload();
      const createTask = (async () => {
        if (preferRestFirestore) {
          const { timestamps } = await writeUserDocViaRest(uid, createPayload, serverTimestampFields);
          const normalized = normalizeUserDocumentTimestamps({ ...createPayload, ...timestamps });
          setCachedRead(`profile:${uid}`, normalized);
          return normalized;
        }
        try {
          await withSdkTimeout(
            setDoc(userRef, { ...createPayload, ...buildSdkTimestampPatch() }),
            'Firestore setDoc'
          );
          const normalized = normalizeUserDocumentTimestamps({ ...createPayload, updatedAt: fallbackNow });
          setCachedRead(`profile:${uid}`, normalized);
          return normalized;
        } catch (sdkWriteErr: any) {
          if (isOfflineOrUnavailableError(sdkWriteErr)) {
            preferRestFirestore = true;
            const { timestamps } = await writeUserDocViaRest(uid, createPayload, serverTimestampFields);
            const normalized = normalizeUserDocumentTimestamps({ ...createPayload, ...timestamps });
            setCachedRead(`profile:${uid}`, normalized);
            return normalized;
          }
          throw sdkWriteErr;
        }
      })();
      pendingProfileCreateByUid.set(uid, createTask);
      try {
        return await createTask;
      } finally {
        if (pendingProfileCreateByUid.get(uid) === createTask) {
          pendingProfileCreateByUid.delete(uid);
        }
      }
    }

    // Reuse cached profile existence when available to avoid an extra getDoc before updateDoc
    const cachedExisting = getCachedRead<any>(`profile:${uid}`);
    let docExists = false;
    let existingData: any = null;
    if (cachedExisting.hit && cachedExisting.value) {
      docExists = true;
      existingData = cachedExisting.value;
    } else if (preferRestFirestore) {
      const restDoc = await getUserDocViaRest(uid);
      docExists = restDoc.exists;
      existingData = restDoc.data;
    } else {
      try {
        const existing = await withSdkTimeout(getDoc(userRef), 'Firestore getDoc');
        docExists = existing.exists();
        existingData = docExists ? existing.data() : null;
      } catch (sdkReadErr: any) {
        if (isOfflineOrUnavailableError(sdkReadErr)) {
          preferRestFirestore = true;
          const restDoc = await getUserDocViaRest(uid);
          docExists = restDoc.exists;
          existingData = restDoc.data;
        } else {
          throw sdkReadErr;
        }
      }
    }

    if (docExists) {
      const updatePayload: Record<string, any> = {};
      if (profile.name) updatePayload.name = String(profile.name).slice(0, 100);
      if (profile.email) updatePayload.email = String(profile.email).slice(0, 160).toLowerCase();
      appendExtendedFields(updatePayload, profile);
      if (options?.clearResumeUpdated) {
        updatePayload.resumeUpdatedAt = '';
      }

      if (preferRestFirestore) {
        const { timestamps } = await writeUserDocViaRest(
          uid,
          updatePayload,
          serverTimestampFields,
          Object.keys(updatePayload)
        );
        const merged = normalizeUserDocumentTimestamps({ ...(existingData || {}), ...updatePayload, ...timestamps });
        setCachedRead(`profile:${uid}`, merged);
        return merged;
      } else {
        try {
          await withSdkTimeout(
            updateDoc(userRef, { ...updatePayload, ...buildSdkTimestampPatch() }),
            'Firestore updateDoc'
          );
          const merged = await resolveSdkCommittedTimestamps({ ...(existingData || {}), ...updatePayload });
          setCachedRead(`profile:${uid}`, merged);
          return merged;
        } catch (sdkUpdateErr: any) {
          if (isOfflineOrUnavailableError(sdkUpdateErr)) {
            preferRestFirestore = true;
            const { timestamps } = await writeUserDocViaRest(
              uid,
              updatePayload,
              serverTimestampFields,
              Object.keys(updatePayload)
            );
            const merged = normalizeUserDocumentTimestamps({ ...(existingData || {}), ...updatePayload, ...timestamps });
            setCachedRead(`profile:${uid}`, merged);
            return merged;
          } else {
            throw sdkUpdateErr;
          }
        }
      }
    } else {
      const createPayload = buildCreatePayload();
      if (preferRestFirestore) {
        const { timestamps } = await writeUserDocViaRest(uid, createPayload, serverTimestampFields);
        const created = normalizeUserDocumentTimestamps({ ...createPayload, ...timestamps });
        setCachedRead(`profile:${uid}`, created);
        return created;
      } else {
        try {
          await withSdkTimeout(
            setDoc(userRef, { ...createPayload, ...buildSdkTimestampPatch() }),
            'Firestore setDoc'
          );
          const created = await resolveSdkCommittedTimestamps(createPayload);
          setCachedRead(`profile:${uid}`, created);
          return created;
        } catch (sdkWriteErr: any) {
          if (isOfflineOrUnavailableError(sdkWriteErr)) {
            preferRestFirestore = true;
            const { timestamps } = await writeUserDocViaRest(uid, createPayload, serverTimestampFields);
            const created = normalizeUserDocumentTimestamps({ ...createPayload, ...timestamps });
            setCachedRead(`profile:${uid}`, created);
            return created;
          } else {
            throw sdkWriteErr;
          }
        }
      }
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

export async function getUserProfileFromFirestore(uid: string, forceRefresh: boolean = false): Promise<any | null> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    return null;
  }

  return cachedFirestoreRead(
    `profile:${uid}`,
    USER_DOC_CACHE_TTL_MS,
    async () => {
      const userRef = doc(db, 'users', uid);
      try {
        if (preferRestFirestore) {
          const restDoc = await getUserDocViaRest(uid);
          return restDoc.exists ? normalizeUserDocumentTimestamps(restDoc.data) : null;
        }
        try {
          const snap = await withSdkTimeout(getDoc(userRef), 'Firestore getDoc');
          if (snap.exists()) {
            return normalizeUserDocumentTimestamps(snap.data());
          }
          return null;
        } catch (sdkReadErr: any) {
          if (isOfflineOrUnavailableError(sdkReadErr)) {
            preferRestFirestore = true;
            const restDoc = await getUserDocViaRest(uid);
            return restDoc.exists ? normalizeUserDocumentTimestamps(restDoc.data) : null;
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
    },
    forceRefresh
  );
}

export interface SavedResumeDoc {
  fileName: string;
  text: string;
  updatedAt: string;
}

function resumeRestUrl(uid: string): string {
  return `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/users/${encodeURIComponent(uid)}/resume/current`;
}

async function getResumeDocViaRest(uid: string): Promise<SavedResumeDoc | null> {
  if (!auth.currentUser) throw new Error('Not signed in');
  const idToken = await auth.currentUser.getIdToken();
  const res = await fetchWithTimeout(resumeRestUrl(uid), {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || `Firestore REST GET resume failed (${res.status})`);
  }
  const json = await res.json();
  const data = fromFirestoreFields(json.fields);
  if (!data?.text && !data?.fileName) return null;
  return {
    fileName: String(data.fileName || ''),
    text: String(data.text || ''),
    updatedAt: normalizeTimestampToIso(data.updatedAt),
  };
}

async function writeResumeDocViaRest(
  uid: string,
  payload: { fileName: string; text: string }
): Promise<SavedResumeDoc> {
  const { timestamps, commitTime } = await commitWithServerTimestampsViaRest(
    `users/${encodeURIComponent(uid)}/resume/current`,
    { fileName: payload.fileName, text: payload.text },
    ['updatedAt']
  );
  return {
    fileName: payload.fileName,
    text: payload.text,
    updatedAt: timestamps.updatedAt || commitTime,
  };
}

async function deleteResumeDocViaRest(uid: string): Promise<void> {
  if (!auth.currentUser) throw new Error('Not signed in');
  const idToken = await auth.currentUser.getIdToken();
  const res = await fetchWithTimeout(resumeRestUrl(uid), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (res.status === 404) return;
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || `Firestore REST DELETE resume failed (${res.status})`);
  }
}

/**
 * Save extracted resume text, filename, and Firestore serverTimestamp() to users/{uid}/resume/current
 * (overwrites the single document on every upload/replacement/edit; never stores raw file binary).
 * Also updates users/{uid}.resumeUpdatedAt via serverTimestamp() in the background.
 */
export async function saveExtractedResumeToFirestore(
  uid: string,
  payload: { fileName: string; text: string; updatedAt?: string }
): Promise<SavedResumeDoc> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    throw new Error('Sign in to save your resume.');
  }

  const cleanFileName = String(payload.fileName || 'resume.pdf').trim().slice(0, 200) || 'resume.pdf';
  const cleanText = String(payload.text || '').trim().slice(0, 150000);

  if (!cleanText) {
    throw new Error('Cannot save an empty resume.');
  }

  const resumeRef = doc(db, 'users', uid, 'resume', 'current');
  const path = `users/${uid}/resume/current`;

  const syncUserResumeMeta = () => {
    syncUserProfileToFirestore(
      uid,
      { resumeFileName: cleanFileName },
      { markResumeUpdated: true }
    ).catch(() => {});
  };

  try {
    if (preferRestFirestore) {
      const saved = await writeResumeDocViaRest(uid, { fileName: cleanFileName, text: cleanText });
      setCachedRead(`resume:${uid}`, saved, USER_DOC_CACHE_TTL_MS);
      syncUserResumeMeta();
      return saved;
    }

    try {
      await withSdkTimeout(
        setDoc(resumeRef, {
          fileName: cleanFileName,
          text: cleanText,
          updatedAt: serverTimestamp(),
        }),
        'Firestore setDoc resume'
      );

      let committedIso = '';
      try {
        const snap = await withSdkTimeout(getDoc(resumeRef), 'Firestore getDoc resume after write');
        if (snap.exists()) {
          committedIso = normalizeTimestampToIso(snap.data()?.updatedAt);
        }
      } catch {
        // Fallback to local ISO timestamp if immediate read-back times out
      }

      const savedDoc: SavedResumeDoc = {
        fileName: cleanFileName,
        text: cleanText,
        updatedAt: committedIso || new Date().toISOString(),
      };
      setCachedRead(`resume:${uid}`, savedDoc, USER_DOC_CACHE_TTL_MS);
      syncUserResumeMeta();
      return savedDoc;
    } catch (sdkErr: any) {
      if (isOfflineOrUnavailableError(sdkErr)) {
        preferRestFirestore = true;
        const saved = await writeResumeDocViaRest(uid, { fileName: cleanFileName, text: cleanText });
        setCachedRead(`resume:${uid}`, saved, USER_DOC_CACHE_TTL_MS);
        syncUserResumeMeta();
        return saved;
      }
      throw sdkErr;
    }
  } catch (err: any) {
    if (isOfflineOrUnavailableError(err)) {
      console.warn('Firestore resume save timed out or client offline:', err?.message || err);
      throw new Error('Network timed out while saving your resume. Please check your connection and try again.');
    }
    handleFirestoreError(err, OperationType.WRITE, path);
    const msg = String(err?.message || '');
    if (msg.toLowerCase().includes('permission') || err?.code === 'permission-denied') {
      throw new Error('Firestore permission denied while saving your resume. Please verify your sign-in session.');
    }
    throw new Error(msg || 'Failed to save extracted resume to Firestore.');
  }
}

/**
 * Read saved resume document from Firestore at users/{uid}/resume/current.
 */
export async function getSavedResumeFromFirestore(
  uid: string,
  forceRefresh: boolean = false
): Promise<SavedResumeDoc | null> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    return null;
  }

  return cachedFirestoreRead<SavedResumeDoc | null>(
    `resume:${uid}`,
    USER_DOC_CACHE_TTL_MS,
    async () => {
      const resumeRef = doc(db, 'users', uid, 'resume', 'current');
      const path = `users/${uid}/resume/current`;

      try {
        if (preferRestFirestore) {
          return await getResumeDocViaRest(uid);
        }
        try {
          const snap = await withSdkTimeout(getDoc(resumeRef), 'Firestore getDoc resume');
          if (!snap.exists()) return null;
          const data = snap.data() as Record<string, any> | undefined;
          if (!data?.text && !data?.fileName) return null;
          return {
            fileName: String(data.fileName || ''),
            text: String(data.text || ''),
            updatedAt: normalizeTimestampToIso(data.updatedAt),
          };
        } catch (sdkErr: any) {
          if (isOfflineOrUnavailableError(sdkErr)) {
            preferRestFirestore = true;
            return await getResumeDocViaRest(uid);
          }
          throw sdkErr;
        }
      } catch (err: any) {
        if (isOfflineOrUnavailableError(err) || isFirestoreServiceDisabledError(err)) {
          console.warn('Firestore saved resume read skipped:', err?.message || err);
          return null;
        }
        handleFirestoreError(err, OperationType.GET, path);
        return null;
      }
    },
    forceRefresh
  );
}

/**
 * Delete saved resume document from Firestore at users/{uid}/resume/current
 * and clear resume metadata on users/{uid}.
 */
export async function deleteSavedResumeFromFirestore(uid: string): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    throw new Error('Sign in to delete your saved resume.');
  }

  const resumeRef = doc(db, 'users', uid, 'resume', 'current');
  const path = `users/${uid}/resume/current`;

  const clearUserResumeMeta = () => {
    syncUserProfileToFirestore(
      uid,
      { resumeFileName: '' },
      { clearResumeUpdated: true }
    ).catch(() => {});
  };

  try {
    if (preferRestFirestore) {
      await deleteResumeDocViaRest(uid);
      setCachedRead(`resume:${uid}`, null, USER_DOC_CACHE_TTL_MS);
      clearUserResumeMeta();
      return;
    }
    try {
      await withSdkTimeout(deleteDoc(resumeRef), 'Firestore deleteDoc resume');
      setCachedRead(`resume:${uid}`, null, USER_DOC_CACHE_TTL_MS);
      clearUserResumeMeta();
    } catch (sdkErr: any) {
      if (isOfflineOrUnavailableError(sdkErr)) {
        preferRestFirestore = true;
        await deleteResumeDocViaRest(uid);
        setCachedRead(`resume:${uid}`, null, USER_DOC_CACHE_TTL_MS);
        clearUserResumeMeta();
        return;
      }
      throw sdkErr;
    }
  } catch (err: any) {
    if (isOfflineOrUnavailableError(err)) {
      console.warn('Firestore resume delete timed out or client offline:', err?.message || err);
      throw new Error('Network timed out while deleting your saved resume. Please check your connection and try again.');
    }
    handleFirestoreError(err, OperationType.DELETE, path);
    throw new Error(err?.message || 'Failed to delete saved resume from Firestore.');
  }
}

function recommendationsRestUrl(uid: string): string {
  return `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/users/${encodeURIComponent(uid)}/recommendations/current`;
}

export interface PersistedRecommendationsPayload {
  userId: string;
  profileSignature: string;
  recommendations: any[];
  overallMissingSkills: string[];
  updatedAt: string;
}

function sanitizeRecommendationsForFirestore(
  uid: string,
  bundle: Partial<StudentRecommendationBundle>
): PersistedRecommendationsPayload {
  const cleanRecs = Array.isArray(bundle.recommendations)
    ? bundle.recommendations.slice(0, 25).map((r: any) => ({
        internshipId: String(r.internshipId || r.id || '').slice(0, 128),
        jobId: String(r.jobId || r.internshipId || '').slice(0, 128),
        title: String(r.title || '').slice(0, 200),
        companyName: String(r.companyName || '').slice(0, 200),
        requiredSkills: Array.isArray(r.requiredSkills) ? r.requiredSkills.map(String).slice(0, 20) : [],
        eligibility: String(r.eligibility || '').slice(0, 500),
        stipend: String(r.stipend || '').slice(0, 120),
        duration: String(r.duration || '').slice(0, 100),
        workMode: String(r.workMode || 'Online').slice(0, 32),
        location: String(r.location || '').slice(0, 200),
        applicationDeadline: String(r.applicationDeadline || '').slice(0, 80),
        applyUrl: String(r.applyUrl || '').slice(0, 1000),
        sourceName: String(r.sourceName || '').slice(0, 128),
        isVerified: Boolean(r.isVerified),
        matchScore: Number(r.matchScore) || 0,
        matchTier: String(r.matchTier || 'Good').slice(0, 32),
        breakdown: {
          skillsScore: Number(r.breakdown?.skillsScore) || 0,
          interestScore: Number(r.breakdown?.interestScore) || 0,
          educationScore: Number(r.breakdown?.educationScore) || 0,
          careerGoalScore: Number(r.breakdown?.careerGoalScore) || 0,
          locationPreferenceScore: Number(r.breakdown?.locationPreferenceScore) || 0,
        },
        matchReason: String(r.matchReason || '').slice(0, 600),
        matchedSkills: Array.isArray(r.matchedSkills) ? r.matchedSkills.map(String).slice(0, 20) : [],
        missingSkills: Array.isArray(r.missingSkills) ? r.missingSkills.map(String).slice(0, 20) : [],
        suggestedResources: Array.isArray(r.suggestedResources)
          ? r.suggestedResources.slice(0, 6).map((sr: any) => ({
              skill: String(sr.skill || '').slice(0, 80),
              courseId: sr.courseId ? String(sr.courseId).slice(0, 64) : '',
              courseTitle: String(sr.courseTitle || '').slice(0, 200),
              provider: String(sr.provider || '').slice(0, 120),
              duration: sr.duration ? String(sr.duration).slice(0, 64) : '',
              resourceUrl: sr.resourceUrl ? String(sr.resourceUrl).slice(0, 400) : '',
              reason: String(sr.reason || '').slice(0, 300),
            }))
          : [],
        isBeginnerFriendly: Boolean(r.isBeginnerFriendly),
        generatedAt: String(r.generatedAt || new Date().toISOString()).slice(0, 64),
      }))
    : [];

  return {
    userId: uid,
    profileSignature: String(bundle.profileSignature || 'default').slice(0, 256),
    recommendations: cleanRecs,
    overallMissingSkills: Array.isArray(bundle.overallMissingSkills)
      ? bundle.overallMissingSkills.map((s) => String(s).slice(0, 80)).filter(Boolean).slice(0, 30)
      : [],
    updatedAt: String(bundle.updatedAt || new Date().toISOString()).slice(0, 64),
  };
}

/**
 * Save personalized student recommendations privately at users/{uid}/recommendations/current.
 */
export async function saveStudentRecommendationsToFirestore(
  uid: string,
  bundle: Partial<StudentRecommendationBundle>
): Promise<PersistedRecommendationsPayload | null> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    return null;
  }

  const payload = sanitizeRecommendationsForFirestore(uid, bundle);
  const recRef = doc(db, 'users', uid, 'recommendations', 'current');
  const path = `users/${uid}/recommendations/current`;

  const writeViaRest = async () => {
    const idToken = await auth.currentUser!.getIdToken();
    const res = await fetchWithTimeout(recommendationsRestUrl(uid), {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: toFirestoreFields(payload) }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody?.error?.message || `Firestore REST PATCH recommendations failed (${res.status})`);
    }
  };

  try {
    if (preferRestFirestore) {
      await writeViaRest();
      setCachedRead(`recs:${uid}`, payload, USER_DOC_CACHE_TTL_MS);
      return payload;
    }
    try {
      await withSdkTimeout(setDoc(recRef, payload), 'Firestore setDoc recommendations');
      setCachedRead(`recs:${uid}`, payload, USER_DOC_CACHE_TTL_MS);
      return payload;
    } catch (sdkErr: any) {
      if (isOfflineOrUnavailableError(sdkErr)) {
        preferRestFirestore = true;
        await writeViaRest();
        setCachedRead(`recs:${uid}`, payload, USER_DOC_CACHE_TTL_MS);
        return payload;
      }
      throw sdkErr;
    }
  } catch (err: any) {
    if (isOfflineOrUnavailableError(err) || isFirestoreServiceDisabledError(err)) {
      console.warn('Firestore recommendations sync skipped:', err?.message || err);
      return null;
    }
    handleFirestoreError(err, OperationType.WRITE, path);
    return null;
  }
}

/**
 * Load private student recommendations from users/{uid}/recommendations/current.
 */
export async function getStudentRecommendationsFromFirestore(
  uid: string,
  forceRefresh: boolean = false
): Promise<PersistedRecommendationsPayload | null> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    return null;
  }

  return cachedFirestoreRead<PersistedRecommendationsPayload | null>(
    `recs:${uid}`,
    USER_DOC_CACHE_TTL_MS,
    async () => {
      const recRef = doc(db, 'users', uid, 'recommendations', 'current');
      const path = `users/${uid}/recommendations/current`;

      const readViaRest = async (): Promise<PersistedRecommendationsPayload | null> => {
        const idToken = await auth.currentUser!.getIdToken();
        const res = await fetchWithTimeout(recommendationsRestUrl(uid), {
          method: 'GET',
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (res.status === 404) return null;
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody?.error?.message || `Firestore REST GET recommendations failed (${res.status})`);
        }
        const json = await res.json();
        const data = fromFirestoreFields(json.fields);
        if (!data || !Array.isArray(data.recommendations)) return null;
        return data as PersistedRecommendationsPayload;
      };

      try {
        if (preferRestFirestore) {
          return await readViaRest();
        }
        try {
          const snap = await withSdkTimeout(getDoc(recRef), 'Firestore getDoc recommendations');
          if (!snap.exists()) return null;
          const data = snap.data();
          if (!data || !Array.isArray(data.recommendations)) return null;
          return data as PersistedRecommendationsPayload;
        } catch (sdkErr: any) {
          if (isOfflineOrUnavailableError(sdkErr)) {
            preferRestFirestore = true;
            return await readViaRest();
          }
          throw sdkErr;
        }
      } catch (err: any) {
        if (isOfflineOrUnavailableError(err) || isFirestoreServiceDisabledError(err)) {
          return null;
        }
        handleFirestoreError(err, OperationType.GET, path);
        return null;
      }
    },
    forceRefresh
  );
}

function sanitizeFirestoreInternshipId(rawId: string): string {
  const cleaned = String(rawId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 128);
  return cleaned || `int-${Date.now()}`;
}

function sanitizeInternshipForFirestore(internship: InternshipListing): InternshipListing {
  const now = new Date().toISOString();
  const id = sanitizeFirestoreInternshipId(internship.id);
  const validModes = ['Remote', 'On-site', 'Hybrid'] as const;
  const workMode = validModes.includes(internship.workMode as any) ? internship.workMode : 'On-site';
  const validStatuses = ['Pending verification', 'Verified', 'Expired', 'Rejected', 'Unavailable'] as const;
  const verifiedStatus = validStatuses.includes(internship.verifiedStatus as any)
    ? internship.verifiedStatus
    : 'Verified';

  return {
    id,
    title: String(internship.title || '').trim().slice(0, 200),
    companyName: String(internship.companyName || '').trim().slice(0, 200),
    description: String(internship.description || '').trim().slice(0, 3000),
    eligibility: String(internship.eligibility || '').trim().slice(0, 400),
    skills: Array.isArray(internship.skills)
      ? internship.skills.map((s) => String(s).trim().slice(0, 60)).filter(Boolean).slice(0, 20)
      : [],
    location: String(internship.location || 'India').trim().slice(0, 200),
    workMode,
    duration: String(internship.duration || '').trim().slice(0, 100),
    stipend: String(internship.stipend || '').trim().slice(0, 120),
    applicationDeadline: String(internship.applicationDeadline || '').trim().slice(0, 64),
    applyUrl: String(internship.applyUrl || '').trim().slice(0, 1000),
    sourceName: String(internship.sourceName || 'Firestore Verified').trim().slice(0, 128),
    sourceUrl: String(internship.sourceUrl || internship.applyUrl || '').trim().slice(0, 1000),
    sourceId: String(internship.sourceId || id).trim().slice(0, 128),
    verifiedStatus,
    lastVerifiedAt: String(internship.lastVerifiedAt || now).slice(0, 64),
    createdAt: String(internship.createdAt || now).slice(0, 64),
    updatedAt: now,
    isGovernmentScheme: Boolean(internship.isGovernmentScheme),
  };
}

/**
 * Read verified internships from Firestore /internships collection (SDK + REST fallback).
 */
export async function getVerifiedInternshipsFromFirestore(
  forceRefresh: boolean = false
): Promise<InternshipListing[]> {
  if (!auth.currentUser) {
    return [];
  }

  return cachedFirestoreRead<InternshipListing[]>(
    'internships:verified',
    CATALOG_CACHE_TTL_MS,
    async () => {
      const path = 'internships';

      const readViaRest = async (): Promise<InternshipListing[]> => {
        const idToken = await auth.currentUser!.getIdToken();
        const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/internships?pageSize=100`;
        const res = await fetchWithTimeout(url, {
          method: 'GET',
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (res.status === 404) return [];
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody?.error?.message || `Firestore REST GET internships failed (${res.status})`);
        }
        const json = await res.json();
        const docs = Array.isArray(json.documents) ? json.documents : [];
        return docs
          .map((d: any) => fromFirestoreFields(d.fields) as InternshipListing)
          .filter((item: InternshipListing) => item && item.verifiedStatus === 'Verified');
      };

      try {
        if (preferRestFirestore) {
          return await readViaRest();
        }
        try {
          const q = query(collection(db, 'internships'), where('verifiedStatus', '==', 'Verified'));
          const snap = await withSdkTimeout(getDocs(q), 'Firestore getDocs internships');
          return snap.docs.map((d) => d.data() as InternshipListing);
        } catch (sdkErr: any) {
          if (isOfflineOrUnavailableError(sdkErr)) {
            preferRestFirestore = true;
            return await readViaRest();
          }
          throw sdkErr;
        }
      } catch (err: any) {
        if (isOfflineOrUnavailableError(err) || isFirestoreServiceDisabledError(err)) {
          return [];
        }
        handleFirestoreError(err, OperationType.LIST, path);
        return [];
      }
    },
    forceRefresh
  );
}

/**
 * Save a verified internship record to Firestore /internships/{id} (admin / employer / college only),
 * with REST fallback for iframe/proxy resilience.
 */
export async function saveVerifiedInternshipToFirestore(
  internship: InternshipListing
): Promise<boolean> {
  if (!auth.currentUser || !internship?.id || !internship?.title || !internship?.companyName) {
    return false;
  }

  const clean = sanitizeInternshipForFirestore(internship);
  const path = `internships/${clean.id}`;
  const ref = doc(db, 'internships', clean.id);

  const writeViaRest = async (): Promise<void> => {
    const idToken = await auth.currentUser!.getIdToken();
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/internships/${encodeURIComponent(clean.id)}`;
    const res = await fetchWithTimeout(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: toFirestoreFields(clean) }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody?.error?.message || `Firestore REST PATCH internship failed (${res.status})`);
    }
  };

  try {
    if (preferRestFirestore) {
      await writeViaRest();
      invalidateCacheKey('internships:verified');
      return true;
    }
    try {
      await withSdkTimeout(setDoc(ref, clean), 'Firestore setDoc internship');
      invalidateCacheKey('internships:verified');
      return true;
    } catch (sdkErr: any) {
      if (isOfflineOrUnavailableError(sdkErr)) {
        preferRestFirestore = true;
        await writeViaRest();
        invalidateCacheKey('internships:verified');
        return true;
      }
      throw sdkErr;
    }
  } catch (err: any) {
    if (isOfflineOrUnavailableError(err) || isFirestoreServiceDisabledError(err)) {
      return false;
    }
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Delete a verified internship record from Firestore /internships/{id} (admin / employer / college only).
 */
export async function deleteVerifiedInternshipFromFirestore(internshipId: string): Promise<boolean> {
  if (!auth.currentUser || !internshipId) return false;
  const cleanId = sanitizeFirestoreInternshipId(internshipId);
  const path = `internships/${cleanId}`;
  const ref = doc(db, 'internships', cleanId);

  const deleteViaRest = async (): Promise<void> => {
    const idToken = await auth.currentUser!.getIdToken();
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/internships/${encodeURIComponent(cleanId)}`;
    const res = await fetchWithTimeout(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (res.status === 404) return;
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody?.error?.message || `Firestore REST DELETE internship failed (${res.status})`);
    }
  };

  try {
    if (preferRestFirestore) {
      await deleteViaRest();
      invalidateCacheKey('internships:verified');
      return true;
    }
    try {
      await withSdkTimeout(deleteDoc(ref), 'Firestore deleteDoc internship');
      invalidateCacheKey('internships:verified');
      return true;
    } catch (sdkErr: any) {
      if (isOfflineOrUnavailableError(sdkErr)) {
        preferRestFirestore = true;
        await deleteViaRest();
        invalidateCacheKey('internships:verified');
        return true;
      }
      throw sdkErr;
    }
  } catch (err: any) {
    if (isOfflineOrUnavailableError(err) || isFirestoreServiceDisabledError(err)) {
      return false;
    }
    handleFirestoreError(err, OperationType.DELETE, path);
    return false;
  }
}

function sanitizeFirestoreDocId(rawId: string, prefix: string): string {
  const cleaned = String(rawId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 128);
  return cleaned || `${prefix}-${Date.now()}`;
}

function sanitizeCertificateForFirestore(uid: string, cert: Certificate): Record<string, any> {
  const id = sanitizeFirestoreDocId(cert.id, 'cert');
  const now = new Date().toISOString();
  const payload: Record<string, any> = {
    id,
    userId: uid,
    certificateCode: String(cert.certificateCode || `YM-${Date.now()}`).trim().slice(0, 80),
    studentName: String(cert.studentName || 'Yuva Member').trim().slice(0, 120),
    courseId: String(cert.courseId || 'external-upload').trim().slice(0, 128),
    courseTitle: String(cert.courseTitle || 'Verified Certificate').trim().slice(0, 200),
    issueDate: String(cert.issueDate || now.split('T')[0]).trim().slice(0, 64),
    scorePercentage: Math.max(0, Math.min(100, Number(cert.scorePercentage ?? 100) || 0)),
    qrData: String(cert.qrData || `https://yuvamitraa.gov.in/verify/${cert.certificateCode || id}`).trim().slice(0, 500),
    instructor: String(cert.instructor || cert.issuer || 'YuvaMitraa').trim().slice(0, 160),
    source: cert.source === 'uploaded' ? 'uploaded' : 'earned',
    createdAt: now,
  };
  if (cert.issuer) payload.issuer = String(cert.issuer).trim().slice(0, 160);
  if (cert.credentialUrl) payload.credentialUrl = String(cert.credentialUrl).trim().slice(0, 500);
  if (cert.fileName) payload.fileName = String(cert.fileName).trim().slice(0, 200);
  return payload;
}

/**
 * Fetch strictly the currently authenticated user's certificates from users/{uid}/certificates.
 */
export async function getUserCertificatesFromFirestore(
  uid: string,
  forceRefresh: boolean = false
): Promise<Certificate[]> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    return [];
  }

  return cachedFirestoreRead<Certificate[]>(
    `certs:${uid}`,
    USER_DOC_CACHE_TTL_MS,
    async () => {
      const path = `users/${uid}/certificates`;

      const readViaRest = async (): Promise<Certificate[]> => {
        const idToken = await auth.currentUser!.getIdToken();
        const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/users/${encodeURIComponent(uid)}/certificates?pageSize=100`;
        const res = await fetchWithTimeout(url, {
          method: 'GET',
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (res.status === 404) return [];
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody?.error?.message || `Firestore REST GET certificates failed (${res.status})`);
        }
        const json = await res.json();
        const docs = Array.isArray(json.documents) ? json.documents : [];
        return docs
          .map((d: any) => fromFirestoreFields(d.fields) as Certificate)
          .filter((c: Certificate) => c && c.id && c.userId === uid);
      };

      try {
        if (preferRestFirestore) {
          return await readViaRest();
        }
        try {
          const q = query(collection(db, 'users', uid, 'certificates'), where('userId', '==', uid));
          const snap = await withSdkTimeout(getDocs(q), 'Firestore getDocs user certificates');
          return snap.docs
            .map((d) => d.data() as Certificate)
            .filter((c) => c && c.userId === uid);
        } catch (sdkErr: any) {
          if (isOfflineOrUnavailableError(sdkErr)) {
            preferRestFirestore = true;
            return await readViaRest();
          }
          throw sdkErr;
        }
      } catch (err: any) {
        if (isOfflineOrUnavailableError(err) || isFirestoreServiceDisabledError(err)) {
          return [];
        }
        handleFirestoreError(err, OperationType.LIST, path);
        return [];
      }
    },
    forceRefresh
  );
}

/**
 * Persist a certificate strictly under users/{uid}/certificates/{certId}.
 */
export async function saveUserCertificateToFirestore(
  uid: string,
  cert: Certificate
): Promise<Certificate | null> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    return null;
  }

  const payload = sanitizeCertificateForFirestore(uid, cert);
  const path = `users/${uid}/certificates/${payload.id}`;
  const ref = doc(db, 'users', uid, 'certificates', payload.id);

  const writeViaRest = async (): Promise<void> => {
    const idToken = await auth.currentUser!.getIdToken();
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/users/${encodeURIComponent(uid)}/certificates/${encodeURIComponent(payload.id)}`;
    const res = await fetchWithTimeout(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: toFirestoreFields(payload) }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody?.error?.message || `Firestore REST PATCH certificate failed (${res.status})`);
    }
  };

  try {
    if (preferRestFirestore) {
      await writeViaRest();
      invalidateCacheKey(`certs:${uid}`);
      return payload as Certificate;
    }
    try {
      await withSdkTimeout(setDoc(ref, payload), 'Firestore setDoc user certificate');
      invalidateCacheKey(`certs:${uid}`);
      return payload as Certificate;
    } catch (sdkErr: any) {
      if (isOfflineOrUnavailableError(sdkErr)) {
        preferRestFirestore = true;
        await writeViaRest();
        invalidateCacheKey(`certs:${uid}`);
        return payload as Certificate;
      }
      throw sdkErr;
    }
  } catch (err: any) {
    if (isOfflineOrUnavailableError(err) || isFirestoreServiceDisabledError(err)) {
      return null;
    }
    handleFirestoreError(err, OperationType.WRITE, path);
    return null;
  }
}

/**
 * Delete a certificate strictly owned by uid at users/{uid}/certificates/{certId}.
 */
export async function deleteUserCertificateFromFirestore(uid: string, certId: string): Promise<boolean> {
  if (!auth.currentUser || auth.currentUser.uid !== uid || !certId) {
    return false;
  }
  const cleanId = sanitizeFirestoreDocId(certId, 'cert');
  const path = `users/${uid}/certificates/${cleanId}`;
  const ref = doc(db, 'users', uid, 'certificates', cleanId);

  const deleteViaRest = async (): Promise<void> => {
    const idToken = await auth.currentUser!.getIdToken();
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/users/${encodeURIComponent(uid)}/certificates/${encodeURIComponent(cleanId)}`;
    const res = await fetchWithTimeout(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (res.status === 404) return;
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody?.error?.message || `Firestore REST DELETE certificate failed (${res.status})`);
    }
  };

  try {
    if (preferRestFirestore) {
      await deleteViaRest();
      invalidateCacheKey(`certs:${uid}`);
      return true;
    }
    try {
      await withSdkTimeout(deleteDoc(ref), 'Firestore deleteDoc user certificate');
      invalidateCacheKey(`certs:${uid}`);
      return true;
    } catch (sdkErr: any) {
      if (isOfflineOrUnavailableError(sdkErr)) {
        preferRestFirestore = true;
        await deleteViaRest();
        invalidateCacheKey(`certs:${uid}`);
        return true;
      }
      throw sdkErr;
    }
  } catch (err: any) {
    if (isOfflineOrUnavailableError(err) || isFirestoreServiceDisabledError(err)) {
      return false;
    }
    handleFirestoreError(err, OperationType.DELETE, path);
    return false;
  }
}

/**
 * Fetch strictly the currently authenticated user's applications from /applications where userId == uid.
 */
export async function getUserApplicationsFromFirestore(
  uid: string,
  forceRefresh: boolean = false
): Promise<Application[]> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    return [];
  }

  return cachedFirestoreRead<Application[]>(
    `apps:${uid}`,
    USER_DOC_CACHE_TTL_MS,
    async () => {
      const path = 'applications';

      const readViaRest = async (): Promise<Application[]> => {
        const idToken = await auth.currentUser!.getIdToken();
        const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents:runQuery`;
        const res = await fetchWithTimeout(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            structuredQuery: {
              from: [{ collectionId: 'applications' }],
              where: {
                fieldFilter: {
                  field: { fieldPath: 'userId' },
                  op: 'EQUAL',
                  value: { stringValue: uid },
                },
              },
              limit: 100,
            },
          }),
        });
        if (!res.ok) return [];
        const rows = await res.json();
        if (!Array.isArray(rows)) return [];
        return rows
          .filter((row: any) => row?.document?.fields)
          .map((row: any) => {
            const d = fromFirestoreFields(row.document.fields);
            return {
              ...d,
              candidateId: d.userId || d.candidateId,
            } as Application;
          })
          .filter((a: Application) => a && a.id && (a.candidateId === uid || (a as any).userId === uid));
      };

      try {
        if (preferRestFirestore) {
          return await readViaRest();
        }
        try {
          const q = query(collection(db, 'applications'), where('userId', '==', uid));
          const snap = await withSdkTimeout(getDocs(q), 'Firestore getDocs user applications');
          return snap.docs.map((d) => {
            const data = d.data() as any;
            return {
              ...data,
              candidateId: data.userId || data.candidateId,
            } as Application;
          });
        } catch (sdkErr: any) {
          if (isOfflineOrUnavailableError(sdkErr)) {
            preferRestFirestore = true;
            return await readViaRest();
          }
          throw sdkErr;
        }
      } catch (err: any) {
        if (isOfflineOrUnavailableError(err) || isFirestoreServiceDisabledError(err)) {
          return [];
        }
        handleFirestoreError(err, OperationType.LIST, path);
        return [];
      }
    },
    forceRefresh
  );
}

/**
 * Persist an authenticated user's application record to Firestore /applications/{id} with userId == uid.
 */
export async function saveUserApplicationToFirestore(uid: string, app: Application): Promise<boolean> {
  if (!auth.currentUser || auth.currentUser.uid !== uid || !app?.id || !app?.jobId) {
    return false;
  }

  const cleanId = sanitizeFirestoreDocId(app.id, 'app');
  const payload: Record<string, any> = {
    id: cleanId,
    jobId: String(app.jobId).slice(0, 128),
    userId: uid,
    jobTitle: String(app.jobTitle || '').slice(0, 200),
    company: String(app.company || '').slice(0, 200),
    candidateName: String(app.candidateName || '').slice(0, 120),
    candidateEmail: String(app.candidateEmail || '').slice(0, 160),
    candidatePhone: String(app.candidatePhone || '').slice(0, 32),
    candidateCollege: String(app.candidateCollege || '').slice(0, 200),
    status: app.status || 'Applied',
    appliedDate: String(app.appliedDate || new Date().toISOString().split('T')[0]).slice(0, 64),
    coverLetter: String(app.coverLetter || '').slice(0, 3000),
  };
  if (typeof app.matchScore === 'number') payload.matchScore = app.matchScore;
  if (app.updatedDate) payload.updatedDate = String(app.updatedDate).slice(0, 64);
  if (app.interviewDate) payload.interviewDate = String(app.interviewDate).slice(0, 32);
  if (app.interviewTime) payload.interviewTime = String(app.interviewTime).slice(0, 32);
  if (app.interviewMode) payload.interviewMode = String(app.interviewMode).slice(0, 64);
  if (app.interviewLinkOrVenue) payload.interviewLinkOrVenue = String(app.interviewLinkOrVenue).slice(0, 300);
  if (app.recruiterFeedback) payload.recruiterFeedback = String(app.recruiterFeedback).slice(0, 1000);
  if (app.notes) payload.notes = String(app.notes).slice(0, 1000);

  const path = `applications/${cleanId}`;
  const ref = doc(db, 'applications', cleanId);

  const writeViaRest = async (): Promise<void> => {
    const idToken = await auth.currentUser!.getIdToken();
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/applications/${encodeURIComponent(cleanId)}`;
    const res = await fetchWithTimeout(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: toFirestoreFields(payload) }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody?.error?.message || `Firestore REST PATCH application failed (${res.status})`);
    }
  };

  try {
    if (preferRestFirestore) {
      await writeViaRest();
      invalidateCacheKey(`apps:${uid}`);
      return true;
    }
    try {
      await withSdkTimeout(setDoc(ref, payload), 'Firestore setDoc user application');
      invalidateCacheKey(`apps:${uid}`);
      return true;
    } catch (sdkErr: any) {
      if (isOfflineOrUnavailableError(sdkErr)) {
        preferRestFirestore = true;
        await writeViaRest();
        invalidateCacheKey(`apps:${uid}`);
        return true;
      }
      throw sdkErr;
    }
  } catch (err: any) {
    if (isOfflineOrUnavailableError(err) || isFirestoreServiceDisabledError(err)) {
      return false;
    }
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
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
