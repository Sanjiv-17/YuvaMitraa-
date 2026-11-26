import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  UserProfile, 
  Job, 
  Course, 
  Application, 
  Certificate, 
  Language, 
  NotificationItem,
  UserRole,
  StudentRecommendationBundle,
  InternshipListing
} from '../types';
import { 
  SAMPLE_COURSES, 
  UI_TRANSLATIONS 
} from '../data/mockData';
import { 
  fetchCurrentUserApi, 
  firebaseLoginApi,
  logoutApi,
  updateProfileApi,
  fetchOpportunitiesApi,
  fetchApplicationsApi,
  applyOpportunityApi,
  updateApplicationStatusApi,
  updateApplicationScheduleApi,
  postOpportunityApi,
  updateOpportunityApi,
  deleteOpportunityApi,
  fetchNotificationsApi,
  markNotificationReadApi,
  fetchCertificatesApi,
  issueCertificateApi,
  uploadCertificateApi,
  deleteCertificateApi,
  fetchPersonalizedRecommendationsApi
} from '../services/api';
import {
  auth,
  onAuthStateChanged,
  waitForFirebaseAuthReady,
  clearFirestoreClientCache,
  getFirebaseCustomClaims,
  getSavedResumeFromFirestore,
  getUserProfileFromFirestore,
  syncUserProfileToFirestore,
  getUserCertificatesFromFirestore,
  saveUserCertificateToFirestore,
  deleteUserCertificateFromFirestore,
  getUserApplicationsFromFirestore,
  saveUserApplicationToFirestore,
  saveStudentRecommendationsToFirestore,
  getStudentRecommendationsFromFirestore,
  getVerifiedInternshipsFromFirestore,
  saveVerifiedInternshipToFirestore,
  deleteVerifiedInternshipFromFirestore,
  signOutUser
} from '../services/firebase';
import {
  computeProfileSignature,
  suggestResourcesForMissingSkills
} from '../services/matchingEngine';
import { normalizeTimestampToIso } from '../utils/relativeTime';

export interface RecommendationSourceStatus {
  externalApiCount: number;
  firestoreCount: number;
  platformVerifiedCount: number;
  externalUnavailable: boolean;
  totalVerifiedCount: number;
}

export interface LoginSessionOptions {
  isNewUser?: boolean;
  initialData?: {
    certificates?: Certificate[];
    applications?: Application[];
    notifications?: NotificationItem[];
  };
  preloadedProfile?: any;
}

interface AppContextType {
  user: UserProfile;
  updateUser: (updated: Partial<UserProfile>) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedJobForDetail: Job | null;
  setSelectedJobForDetail: (job: Job | null) => void;
  openApplyModal: boolean;
  setOpenApplyModal: (open: boolean) => void;
  openJobApplyModal: (job: Job) => void;
  selectedCourseForPlayer: Course | null;
  setSelectedCourseForPlayer: (course: Course | null) => void;
  courses: Course[];
  jobs: Job[];
  addJob: (job: Omit<Job, 'id' | 'postedDate' | 'applicantsCount'>) => Promise<boolean>;
  updateJob: (jobId: string, updated: Partial<Job>) => Promise<void>;
  deleteJob: (jobId: string) => Promise<void>;
  applications: Application[];
  applyForJob: (job: Job, coverLetter: string, eligibilityScore?: number) => Promise<boolean>;
  updateApplicationStatus: (appId: string, status: Application['status'], details?: any) => Promise<void>;
  updateApplicationSchedule: (appId: string, details: {
    status?: Application['status'];
    interviewDate?: string;
    interviewTime?: string;
    interviewMode?: 'Online (Google Meet/Zoom)' | 'In-Person / Campus';
    interviewLinkOrVenue?: string;
    notes?: string;
  }) => Promise<void>;
  savedJobIds: string[];
  toggleSaveJob: (jobId: string) => void;
  certificates: Certificate[];
  issueCertificate: (course: Course, scorePercentage: number) => Certificate;
  uploadCertificate: (payload: {
    courseTitle: string;
    issuer: string;
    issueDate: string;
    certificateCode?: string;
    credentialUrl?: string;
    fileName?: string;
  }) => Promise<Certificate>;
  deleteCertificate: (certificateId: string) => Promise<void>;
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  fontSize: 'normal' | 'large' | 'xlarge';
  setFontSize: (size: 'normal' | 'large' | 'xlarge') => void;
  userLocation: { lat: number; lng: number };
  refreshUserLocation: () => Promise<boolean>;
  calculateDistance: (coords: { lat: number; lng: number }) => number;
  isRecruiter: boolean;
  isExperienced: boolean;
  isCollege: boolean;
  isAdmin: boolean;
  hasVerifiedAdminClaim: boolean;
  role: UserRole;
  t: (key: string) => string;
  isFirstLaunch: boolean;
  dismissFirstLaunch: () => void;
  // Viewport mode: desktop or mobile phone frame
  viewportMode: 'desktop' | 'mobile';
  setViewportMode: (mode: 'desktop' | 'mobile') => void;
  toggleViewportMode: () => void;
  // Auth state & actions
  isAuthenticated: boolean;
  isHydratingUserSession: boolean;
  authToken: string | null;
  login: (token: string, user: UserProfile, options?: LoginSessionOptions) => void;
  logout: () => void;
  refreshOpportunities: () => Promise<void>;
  isLoadingOpportunities: boolean;
  opportunitiesError: string | null;
  opportunitiesLastSyncedAt: string | null;
  firestoreInternshipsCount: number;
  refreshApplications: () => Promise<void>;
  // AI Personalized Internship Matching State
  recommendationsBundle: StudentRecommendationBundle | null;
  isLoadingRecommendations: boolean;
  recommendationsError: string | null;
  recommendationSourceStatus: RecommendationSourceStatus | null;
  refreshRecommendations: (force?: boolean) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Haversine formula to compute distance in km
function computeHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Legacy/unscoped user-private storage keys that must NEVER persist across accounts
const USER_PRIVATE_STORAGE_KEYS = [
  'ym_user',
  'ym_applications',
  'ym_certificates',
  'ym_remembered_account',
  'ym_daily_goal',
  'ym_roadmap_completed',
  'ym_bookmarked_courses',
  'ym_solved_problems',
  'ym_chat_sessions_guest',
];

const USER_SCOPED_CACHE_PREFIXES = [
  'ym_daily_goal_',
  'ym_roadmap_completed_',
  'ym_bookmarked_courses_',
  'ym_solved_problems_',
  'ym_chat_sessions_',
];

function purgeUserPrivateBrowserCaches(includeAuthToken: boolean) {
  try {
    for (const key of USER_PRIVATE_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
    if (includeAuthToken) {
      localStorage.removeItem('ym_auth_token');
      // On full logout, remove all user-specific cached keys from localStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && USER_SCOPED_CACHE_PREFIXES.some((prefix) => k.startsWith(prefix))) {
          keysToRemove.push(k);
        }
      }
      for (const k of keysToRemove) {
        localStorage.removeItem(k);
      }
    }
    // Clear any cached sessionStorage entries for this tab
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  } catch {
    // ignore storage errors in restricted contexts
  }
}

export const EMPTY_USER: UserProfile = {
  id: '',
  name: 'Yuva Member',
  email: '',
  phone: '',
  role: 'student',
  photoUrl: '',
  education: '',
  institution: '',
  course: '',
  branch: '',
  studyYear: '',
  graduationYear: '',
  skills: [],
  nonTechnicalSkills: [],
  interests: [],
  preferredRoles: [],
  preferredDomain: '',
  careerGoals: '',
  preferredLocation: '',
  workModePreference: 'Any',
  location: 'India',
  coordinates: {
    lat: 28.6139,
    lng: 77.209,
  },
  resumeText: '',
  resumeFileName: '',
  resumeUpdatedAt: '',
  profileUpdatedAt: '',
  updatedAt: '',
  streakDays: 0,
  xpPoints: 0,
  badges: [],
  savedJobIds: [],
  enrolledCourses: [],
  projects: [],
};

export function normalizeUserProfile(rawUser: any): UserProfile {
  if (!rawUser) return EMPTY_USER;
  const rawMode = rawUser.workModePreference;
  const validMode: 'Online' | 'Offline' | 'Hybrid' | 'Any' =
    rawMode === 'Online' || rawMode === 'Offline' || rawMode === 'Hybrid' || rawMode === 'Any'
      ? rawMode
      : 'Any';

  return {
    ...EMPTY_USER,
    ...rawUser,
    id: String(rawUser.id || rawUser.uid || ''),
    course: rawUser.course || '',
    branch: rawUser.branch || '',
    studyYear: rawUser.studyYear || '',
    skills: Array.isArray(rawUser.skills) ? rawUser.skills : [],
    nonTechnicalSkills: Array.isArray(rawUser.nonTechnicalSkills) ? rawUser.nonTechnicalSkills : [],
    interests: Array.isArray(rawUser.interests) ? rawUser.interests : [],
    preferredRoles: Array.isArray(rawUser.preferredRoles) ? rawUser.preferredRoles : [],
    preferredDomain: rawUser.preferredDomain || '',
    careerGoals: rawUser.careerGoals || '',
    preferredLocation: rawUser.preferredLocation || '',
    workModePreference: validMode,
    enrolledCourses: Array.isArray(rawUser.enrolledCourses) ? rawUser.enrolledCourses : [],
    savedJobIds: Array.isArray(rawUser.savedJobIds) ? rawUser.savedJobIds : [],
    badges: Array.isArray(rawUser.badges) ? rawUser.badges : [],
    projects: Array.isArray(rawUser.projects) ? rawUser.projects : [],
    streakDays: typeof rawUser.streakDays === 'number' ? rawUser.streakDays : 0,
    xpPoints: typeof rawUser.xpPoints === 'number' ? rawUser.xpPoints : 0,
    location: rawUser.location || 'India',
    resumeFileName: rawUser.resumeFileName || '',
    resumeText: rawUser.resumeText || '',
    resumeUpdatedAt: normalizeTimestampToIso(rawUser.resumeUpdatedAt),
    profileUpdatedAt: normalizeTimestampToIso(rawUser.profileUpdatedAt),
    updatedAt: normalizeTimestampToIso(rawUser.updatedAt),
  };
}

function mergeProfileWithFirestore(
  baseUser: UserProfile,
  fsProfile: any | null,
  savedResume: { fileName: string; text: string; updatedAt: string } | null
): UserProfile {
  const mergedFromFs: Partial<UserProfile> = {};
  if (fsProfile) {
    const scalarKeys: Array<keyof UserProfile> = [
      'name', 'phone', 'education', 'institution', 'college', 'course',
      'branch', 'studyYear', 'rollNumber', 'cgpa', 'graduationYear',
      'location', 'preferredLocation', 'preferredDomain', 'careerGoals',
      'workModePreference', 'githubUrl', 'linkedinUrl', 'portfolioUrl', 'photoUrl',
      'companyName', 'designation', 'industry', 'companyWebsite', 'cinOrRegistrationNumber',
      'currentRole', 'yearsOfExperience'
    ];
    for (const k of scalarKeys) {
      if (fsProfile[k] !== undefined && fsProfile[k] !== null && fsProfile[k] !== '') {
        (mergedFromFs as any)[k] = fsProfile[k];
      }
    }
    if (typeof fsProfile.age === 'number') mergedFromFs.age = fsProfile.age;
    if (typeof fsProfile.streakDays === 'number') {
      mergedFromFs.streakDays = Math.max(baseUser.streakDays || 0, fsProfile.streakDays);
    }
    if (typeof fsProfile.xpPoints === 'number') {
      mergedFromFs.xpPoints = Math.max(baseUser.xpPoints || 0, fsProfile.xpPoints);
    }
    const arrKeys: Array<keyof UserProfile> = [
      'skills', 'nonTechnicalSkills', 'interests', 'preferredRoles', 'savedJobIds', 'badges'
    ];
    for (const k of arrKeys) {
      if (Array.isArray(fsProfile[k]) && fsProfile[k].length > 0) {
        (mergedFromFs as any)[k] = fsProfile[k];
      }
    }
    if (Array.isArray(fsProfile.enrolledCourses) && fsProfile.enrolledCourses.length > 0) {
      mergedFromFs.enrolledCourses = fsProfile.enrolledCourses;
    }
    if (Array.isArray(fsProfile.projects) && fsProfile.projects.length > 0) {
      mergedFromFs.projects = fsProfile.projects;
    }

    const fsProfileUpdatedAt = normalizeTimestampToIso(fsProfile.profileUpdatedAt);
    const fsUpdatedAt = normalizeTimestampToIso(fsProfile.updatedAt);
    const fsResumeUpdatedAt = normalizeTimestampToIso(fsProfile.resumeUpdatedAt);

    if (fsUpdatedAt) mergedFromFs.updatedAt = fsUpdatedAt;
    if (fsProfileUpdatedAt) {
      mergedFromFs.profileUpdatedAt = fsProfileUpdatedAt;
    } else if (!baseUser.profileUpdatedAt && fsUpdatedAt) {
      mergedFromFs.profileUpdatedAt = fsUpdatedAt;
    }
    if (fsResumeUpdatedAt) {
      mergedFromFs.resumeUpdatedAt = fsResumeUpdatedAt;
    }
  }

  return normalizeUserProfile({
    ...EMPTY_USER,
    ...baseUser,
    ...mergedFromFs,
    ...(savedResume ? {
      resumeFileName: savedResume.fileName,
      resumeText: savedResume.text,
      resumeUpdatedAt: normalizeTimestampToIso(savedResume.updatedAt) || mergedFromFs.resumeUpdatedAt || baseUser.resumeUpdatedAt || '',
    } : {}),
  });
}

function deduplicateCertificates(lists: Certificate[][], expectedUid: string): Certificate[] {
  const seen = new Set<string>();
  const merged: Certificate[] = [];
  for (const list of lists) {
    for (const cert of list) {
      if (!cert || !cert.id) continue;
      // Enforce strict UID match whenever userId is recorded on the certificate
      if (cert.userId && expectedUid && cert.userId !== expectedUid) continue;
      const dedupeKey = `${cert.id}::${cert.certificateCode || ''}`;
      if (seen.has(cert.id) || seen.has(dedupeKey)) continue;
      seen.add(cert.id);
      seen.add(dedupeKey);
      merged.push({ ...cert, userId: cert.userId || expectedUid });
    }
  }
  return merged;
}

function deduplicateApplications(lists: Application[][]): Application[] {
  const seen = new Set<string>();
  const merged: Application[] = [];
  for (const list of lists) {
    for (const app of list) {
      if (!app || !app.id) continue;
      if (seen.has(app.id)) continue;
      seen.add(app.id);
      merged.push(app);
    }
  }
  return merged;
}

function mapFirestoreInternshipToJob(item: InternshipListing): Job {
  const modeLower = String(item.workMode || '').toLowerCase();
  const jobType: Job['type'] = modeLower === 'remote' ? 'remote' : 'internship';
  const stipendText = String(item.stipend || '').trim();
  const amountMatch = stipendText.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  const stipendAmount = amountMatch ? Math.round(parseFloat(amountMatch[1])) : 0;
  const locationText = String(item.location || 'India').trim() || 'India';
  const city = locationText.split(',')[0].trim() || 'India';

  return {
    id: item.id,
    title: item.title,
    company: item.companyName,
    companyLogo:
      item.companyLogo ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(item.companyName || 'YM')}&background=FF7A00&color=fff`,
    location: locationText,
    city,
    coordinates: { lat: 20.5937, lng: 78.9629 },
    type: jobType,
    category: item.category || (item.isGovernmentScheme ? 'Government' : 'Tech'),
    stipend: stipendText,
    stipendAmount,
    duration: item.duration || 'Internship',
    requiredSkills: Array.isArray(item.skills) ? item.skills : [],
    eligibility: item.eligibility || undefined,
    description: item.description || `${item.title} internship at ${item.companyName}.`,
    responsibilities: [],
    perks: [],
    deadline: item.applicationDeadline || 'Active Opening',
    applicantsCount: 0,
    postedDate: (item.createdAt || new Date().toISOString()).split('T')[0],
    isVerified: item.verifiedStatus === 'Verified',
    verificationStatus: item.verifiedStatus === 'Verified' ? 'approved' : 'pending',
    verificationEvidence: 'Verified Indian Internship (Firestore)',
    opportunitySource:
      item.sourceName && !item.sourceName.toLowerCase().includes('direct')
        ? item.sourceName
        : 'Firestore Verified',
    originalUrl: item.applyUrl || undefined,
    externalSourceUrl: item.applyUrl || item.sourceUrl || undefined,
    dateVerified: (item.lastVerifiedAt || item.updatedAt || new Date().toISOString()).split('T')[0],
    isGovernmentSponsored: Boolean(item.isGovernmentScheme),
  };
}

function getDefaultTabForRole(role: UserRole): string {
  if (role === 'admin') return 'admin';
  if (role === 'recruiter') return 'recruiter';
  if (role === 'experienced') return 'experienced';
  if (role === 'college') return 'college';
  return 'home';
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always start with clean empty user state in memory; never hydrate another user's localStorage cache
  const [user, setUser] = useState<UserProfile>(EMPTY_USER);

  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('ym_language') as Language) || 'English';
  });

  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean>(() => {
    return !localStorage.getItem('ym_language');
  });

  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedJobForDetail, setSelectedJobForDetail] = useState<Job | null>(null);
  const [openApplyModal, setOpenApplyModal] = useState<boolean>(false);
  const [selectedCourseForPlayer, setSelectedCourseForPlayer] = useState<Course | null>(null);

  const openJobApplyModal = (job: Job) => {
    setOpenApplyModal(true);
    setSelectedJobForDetail(job);
  };

  // Public opportunities list (live verified listings only — never fake or hardcoded demo internships)
  const [jobs, setJobs] = useState<Job[]>(() => {
    try {
      const saved = localStorage.getItem('ym_jobs');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      const legacyDemoIds = new Set(['job-1', 'job-2', 'job-3', 'job-4', 'job-5']);
      return parsed.filter((j: any) => j && j.id && !legacyDemoIds.has(String(j.id)));
    } catch {
      return [];
    }
  });

  // Strictly in-memory per-UID user state — never initialized from unscoped localStorage
  const [applications, setApplications] = useState<Application[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('ym_dark_mode') === 'true';
  });

  const [fontSize, setFontSizeState] = useState<'normal' | 'large' | 'xlarge'>(() => {
    return (localStorage.getItem('ym_font_size') as 'normal' | 'large' | 'xlarge') || 'normal';
  });

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>(() => {
    try {
      const saved = localStorage.getItem('ym_location');
      return saved ? JSON.parse(saved) : { lat: 28.6315, lng: 77.2167 }; // New Delhi default
    } catch {
      return { lat: 28.6315, lng: 77.2167 };
    }
  });

  // Viewport mode: desktop (full responsive) vs mobile (exact phone frame)
  const [viewportMode, setViewportModeState] = useState<'desktop' | 'mobile'>(() => {
    return (localStorage.getItem('ym_viewport_mode') as 'desktop' | 'mobile') || 'desktop';
  });

  const setViewportMode = (mode: 'desktop' | 'mobile') => {
    setViewportModeState(mode);
    localStorage.setItem('ym_viewport_mode', mode);
  };

  const toggleViewportMode = () => {
    const next = viewportMode === 'desktop' ? 'mobile' : 'desktop';
    setViewportMode(next);
  };

  const [authToken, setAuthToken] = useState<string | null>(() => {
    const saved = localStorage.getItem('ym_auth_token');
    return saved && saved !== 'token-demo-session' ? saved : null;
  });

  // Show loading screen while restoring or switching user sessions until UID-scoped data arrives
  const [isHydratingUserSession, setIsHydratingUserSession] = useState<boolean>(() => {
    const saved = localStorage.getItem('ym_auth_token');
    return Boolean(saved && saved !== 'token-demo-session');
  });

  const [hasVerifiedAdminClaim, setHasVerifiedAdminClaim] = useState<boolean>(false);

  const isAuthenticated = Boolean(authToken && user?.id);
  const isRecruiter = user.role === 'recruiter';
  const isExperienced = user.role === 'experienced';
  const isCollege = user.role === 'college';
  const isAdmin = user.role === 'admin' && hasVerifiedAdminClaim;
  const role = user.role;

  // Opportunities & AI Personalized Internship Matching state
  const [isLoadingOpportunities, setIsLoadingOpportunities] = useState<boolean>(false);
  const [opportunitiesError, setOpportunitiesError] = useState<string | null>(null);
  const [opportunitiesLastSyncedAt, setOpportunitiesLastSyncedAt] = useState<string | null>(null);
  const [firestoreInternshipsCount, setFirestoreInternshipsCount] = useState<number>(0);
  const [recommendationsBundle, setRecommendationsBundle] = useState<StudentRecommendationBundle | null>(null);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState<boolean>(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);
  const [recommendationSourceStatus, setRecommendationSourceStatus] = useState<RecommendationSourceStatus | null>(null);

  // Monotonic session generation counter to cancel/ignore stale async responses across login/logout
  const sessionGenRef = useRef<number>(0);
  const activeUidRef = useRef<string>('');
  const pendingProfileSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recommendationsInFlightSigRef = useRef<string | null>(null);

  // Cleanly purge any legacy unscoped keys on first mount so stale caches from prior builds cannot leak
  useEffect(() => {
    purgeUserPrivateBrowserCaches(false);
  }, []);

  const resetUserSessionState = () => {
    if (pendingProfileSyncRef.current) {
      clearTimeout(pendingProfileSyncRef.current);
      pendingProfileSyncRef.current = null;
    }
    recommendationsInFlightSigRef.current = null;
    activeUidRef.current = '';
    setUser(EMPTY_USER);
    setApplications([]);
    setCertificates([]);
    setNotifications([]);
    setRecommendationsBundle(null);
    setRecommendationsError(null);
    setRecommendationSourceStatus(null);
    setSelectedJobForDetail(null);
    setSelectedCourseForPlayer(null);
    setOpenApplyModal(false);
    setHasVerifiedAdminClaim(false);
  };

  // Load live opportunities from backend + verified Indian internships from Firestore
  const refreshOpportunities = async () => {
    setIsLoadingOpportunities(true);
    setOpportunitiesError(null);
    try {
      const [apiResult, firestoreResult] = await Promise.allSettled([
        fetchOpportunitiesApi({ showAll: isAdmin || isRecruiter || isCollege }),
        auth.currentUser ? getVerifiedInternshipsFromFirestore() : Promise.resolve([] as InternshipListing[]),
      ]);

      const backendJobs: Job[] =
        apiResult.status === 'fulfilled'
          ? (Array.isArray(apiResult.value?.jobs)
              ? apiResult.value.jobs
              : Array.isArray(apiResult.value?.opportunities)
              ? apiResult.value.opportunities
              : [])
          : [];
      if (apiResult.status === 'fulfilled' && apiResult.value?.lastSyncedAt) {
        setOpportunitiesLastSyncedAt(String(apiResult.value.lastSyncedAt));
      }

      const fsListings: InternshipListing[] =
        firestoreResult.status === 'fulfilled' && Array.isArray(firestoreResult.value)
          ? firestoreResult.value
          : [];
      setFirestoreInternshipsCount(fsListings.length);

      const fsMappedJobs = fsListings.map(mapFirestoreInternshipToJob);
      const merged: Job[] = [];
      const seenKeys = new Set<string>();

      for (const j of [...fsMappedJobs, ...backendJobs]) {
        const key = `${j.id}::${(j.title || '').toLowerCase().trim()}::${(j.company || '').toLowerCase().trim()}`;
        const titleCompanyKey = `${(j.title || '').toLowerCase().trim()}::${(j.company || '').toLowerCase().trim()}`;
        if (seenKeys.has(j.id) || seenKeys.has(key) || seenKeys.has(titleCompanyKey)) {
          continue;
        }
        seenKeys.add(j.id);
        seenKeys.add(key);
        seenKeys.add(titleCompanyKey);
        merged.push(j);
      }

      if (apiResult.status === 'rejected') {
        const errMsg = (apiResult.reason as any)?.message || 'Unable to fetch live opportunities from server.';
        setOpportunitiesError(errMsg);
        if (merged.length > 0) {
          setJobs(merged);
        }
      } else {
        setJobs(merged);
      }
    } catch (err: any) {
      console.warn('Backend opportunities fetch failed:', err);
      setOpportunitiesError(err?.message || 'Unable to load opportunities right now.');
    } finally {
      setIsLoadingOpportunities(false);
    }
  };

  // Load live applications for the currently authenticated user (server enforces UID ownership)
  const refreshApplications = async () => {
    if (!authToken || !user?.id) return;
    const gen = sessionGenRef.current;
    const uid = auth.currentUser?.uid || user.id;
    try {
      const [apiRes, fsApps] = await Promise.all([
        fetchApplicationsApi(undefined, authToken).catch(() => ({ applications: [] })),
        auth.currentUser?.uid === uid && (user.role === 'student' || user.role === 'experienced')
          ? getUserApplicationsFromFirestore(uid).catch(() => [] as Application[])
          : Promise.resolve([] as Application[]),
      ]);
      if (sessionGenRef.current !== gen) return;
      const backendApps: Application[] = Array.isArray(apiRes?.applications) ? apiRes.applications : [];
      setApplications(deduplicateApplications([backendApps, fsApps]));
    } catch (err) {
      console.warn('Backend applications fetch skipped:', err);
    }
  };

  const loadedOpportunitiesScopeRef = useRef<string | null>(null);

  // Hydrate remaining UID-scoped data asynchronously in the background without blocking dashboard render
  const hydrateUserSession = async (
    token: string,
    rawUser: UserProfile,
    gen: number,
    options?: LoginSessionOptions
  ) => {
    const baseUser = normalizeUserProfile(rawUser);
    const fbUser = auth.currentUser;
    const isMatchingFirebaseUser = Boolean(
      fbUser && (fbUser.uid === baseUser.id || (fbUser.email && baseUser.email && fbUser.email.toLowerCase() === baseUser.email.toLowerCase()))
    );
    const activeUid = (isMatchingFirebaseUser && fbUser ? fbUser.uid : baseUser.id) || '';
    activeUidRef.current = activeUid;

    const hasBundledInitialData = Boolean(options?.initialData);
    const hasPreloadedProfile = options?.preloadedProfile !== undefined;

    try {
      // Brand-new accounts start clean — skip empty Firestore subcollection scans & duplicate API calls
      if (options?.isNewUser) {
        if (sessionGenRef.current === gen) {
          setIsHydratingUserSession(false);
        }
        return;
      }

      const [
        fsProfile,
        savedResume,
        fsCertificates,
        fsApplications,
        cachedRecs,
        backendCertsRes,
        backendAppsRes,
        backendNotifsRes,
        adminClaims,
      ] = await Promise.all([
        !hasPreloadedProfile && isMatchingFirebaseUser && fbUser
          ? getUserProfileFromFirestore(fbUser.uid).catch(() => null)
          : Promise.resolve(options?.preloadedProfile ?? null),
        isMatchingFirebaseUser && fbUser
          ? getSavedResumeFromFirestore(fbUser.uid).catch(() => null)
          : Promise.resolve(null),
        isMatchingFirebaseUser && fbUser
          ? getUserCertificatesFromFirestore(fbUser.uid).catch(() => [] as Certificate[])
          : Promise.resolve([] as Certificate[]),
        isMatchingFirebaseUser && fbUser && (baseUser.role === 'student' || baseUser.role === 'experienced')
          ? getUserApplicationsFromFirestore(fbUser.uid).catch(() => [] as Application[])
          : Promise.resolve([] as Application[]),
        isMatchingFirebaseUser && fbUser && (baseUser.role === 'student' || baseUser.role === 'experienced')
          ? getStudentRecommendationsFromFirestore(fbUser.uid).catch(() => null)
          : Promise.resolve(null),
        !hasBundledInitialData
          ? fetchCertificatesApi(token).catch(() => ({ certificates: [] }))
          : Promise.resolve({ certificates: options?.initialData?.certificates || [] }),
        !hasBundledInitialData
          ? fetchApplicationsApi(undefined, token).catch(() => ({ applications: [] }))
          : Promise.resolve({ applications: options?.initialData?.applications || [] }),
        !hasBundledInitialData
          ? fetchNotificationsApi(token, baseUser.role).catch(() => ({ notifications: [] }))
          : Promise.resolve({ notifications: options?.initialData?.notifications || [] }),
        isMatchingFirebaseUser && fbUser && fbUser.emailVerified && baseUser.role === 'admin'
          ? getFirebaseCustomClaims(false).catch(() => ({}))
          : Promise.resolve({}),
      ]);

      // Abort immediately if the user logged out or switched accounts while requests were in flight
      if (sessionGenRef.current !== gen || activeUidRef.current !== activeUid) return;

      const hydratedUser = mergeProfileWithFirestore(
        { ...baseUser, id: activeUid || baseUser.id },
        fsProfile,
        savedResume
      );

      const backendCerts: Certificate[] = Array.isArray(backendCertsRes?.certificates)
        ? backendCertsRes.certificates
        : [];
      const mergedCerts = deduplicateCertificates([fsCertificates, backendCerts], activeUid);

      const backendApps: Application[] = Array.isArray(backendAppsRes?.applications)
        ? backendAppsRes.applications
        : [];
      const mergedApps = deduplicateApplications([backendApps, fsApplications]);

      const backendNotifs: NotificationItem[] = Array.isArray(backendNotifsRes?.notifications)
        ? backendNotifsRes.notifications
        : [];

      const verifiedAdmin =
        hydratedUser.role === 'admin' &&
        Boolean((adminClaims as any)?.admin === true);

      setHasVerifiedAdminClaim(verifiedAdmin || hydratedUser.role === 'admin');
      setUser((prev) => {
        if (prev.id && prev.id !== (activeUid || baseUser.id)) return prev;
        return mergeProfileWithFirestore(prev.id ? prev : hydratedUser, fsProfile, savedResume);
      });
      setCertificates((prev) => deduplicateCertificates([prev, mergedCerts], activeUid));
      setApplications((prev) => deduplicateApplications([prev, mergedApps]));
      if (backendNotifs.length > 0 || !hasBundledInitialData) {
        setNotifications(backendNotifs);
      }

      if (
        cachedRecs &&
        cachedRecs.userId === activeUid &&
        Array.isArray(cachedRecs.recommendations) &&
        cachedRecs.recommendations.length > 0
      ) {
        const currentSig = computeProfileSignature(hydratedUser);
        if (cachedRecs.profileSignature === currentSig) {
          const missing = Array.isArray(cachedRecs.overallMissingSkills) ? cachedRecs.overallMissingSkills : [];
          setRecommendationsBundle({
            userId: activeUid,
            profileSignature: cachedRecs.profileSignature,
            recommendations: cachedRecs.recommendations,
            overallMissingSkills: missing,
            topSkillGapResources: suggestResourcesForMissingSkills(
              missing,
              cachedRecs.recommendations[0]?.title
            ),
            beginnerFriendlyCount: cachedRecs.recommendations.filter((r: any) => r.isBeginnerFriendly).length,
            updatedAt: cachedRecs.updatedAt || new Date().toISOString(),
          });
        } else {
          setRecommendationsBundle(null);
        }
      }
    } finally {
      if (sessionGenRef.current === gen) {
        setIsHydratingUserSession(false);
      }
    }
  };

  // Load opportunities only after authentication (avoids unnecessary network work on the login screen)
  useEffect(() => {
    if (!isAuthenticated) {
      loadedOpportunitiesScopeRef.current = null;
      return;
    }
    const scopeKey = isAdmin || isRecruiter || isCollege ? 'all' : 'public';
    if (loadedOpportunitiesScopeRef.current !== scopeKey) {
      loadedOpportunitiesScopeRef.current = scopeKey;
      void refreshOpportunities();
    }
  }, [isAuthenticated, isAdmin, isRecruiter, isCollege]);

  // Persist ONLY non-private UI preferences & public jobs catalog to localStorage (debounced to avoid blocking UI)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('ym_jobs', JSON.stringify(jobs));
      } catch {}
    }, 600);
    return () => clearTimeout(timer);
  }, [jobs]);

  useEffect(() => {
    try { localStorage.setItem('ym_language', language); } catch {}
  }, [language]);

  useEffect(() => {
    localStorage.setItem('ym_dark_mode', darkMode.toString());
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('ym_font_size', fontSize);
    document.body.classList.remove('font-large', 'font-xlarge');
    if (fontSize === 'large') document.body.classList.add('font-large');
    if (fontSize === 'xlarge') document.body.classList.add('font-xlarge');
  }, [fontSize]);

  // Persist profile/progress mutations (enrolledCourses, savedJobIds, xpPoints, streakDays, badges, etc.) strictly under active UID
  const scheduleUserPersistence = useCallback((nextUser: UserProfile, safeUpdates: Partial<UserProfile>) => {
    const currentGen = sessionGenRef.current;
    const tokenSnapshot = localStorage.getItem('ym_auth_token');
    const uidSnapshot = auth.currentUser?.uid || nextUser.id;
    if (!uidSnapshot || !tokenSnapshot) return;

    if (pendingProfileSyncRef.current) {
      clearTimeout(pendingProfileSyncRef.current);
    }

    pendingProfileSyncRef.current = setTimeout(() => {
      pendingProfileSyncRef.current = null;
      if (sessionGenRef.current !== currentGen || activeUidRef.current !== uidSnapshot) {
        return;
      }
      if (auth.currentUser && auth.currentUser.uid === uidSnapshot) {
        syncUserProfileToFirestore(uidSnapshot, nextUser).catch(() => {});
      }
      updateProfileApi(tokenSnapshot, safeUpdates).catch(() => {});
    }, 350);
  }, []);

  const updateUser = useCallback((updated: Partial<UserProfile>) => {
    setUser(prev => {
      if (!prev.id) return prev;
      // Never allow profile edits to escalate or mutate user role or UID
      const { role: _ignoredRole, id: _ignoredId, ...safeUpdates } = updated;
      const nextUser = normalizeUserProfile({ ...prev, ...safeUpdates });
      scheduleUserPersistence(nextUser, safeUpdates);
      return nextUser;
    });
  }, [scheduleUserPersistence]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const dismissFirstLaunch = useCallback(() => {
    setIsFirstLaunch(false);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);

  const setFontSize = useCallback((size: 'normal' | 'large' | 'xlarge') => {
    setFontSizeState(size);
  }, []);

  const login = useCallback((token: string, newUser: UserProfile, options?: LoginSessionOptions) => {
    // 1. Invalidate any in-flight work from previous user & wipe all previous user state & caches
    sessionGenRef.current += 1;
    const gen = sessionGenRef.current;
    resetUserSessionState();
    clearFirestoreClientCache();
    purgeUserPrivateBrowserCaches(false);

    // 2. Immediately hydrate essential user state + bundled initialData so dashboard opens instantly
    const baseNormalized = normalizeUserProfile(newUser);
    const mergedInitialUser = options?.preloadedProfile
      ? mergeProfileWithFirestore(baseNormalized, options.preloadedProfile, null)
      : baseNormalized;
    const activeUid = mergedInitialUser.id;
    activeUidRef.current = activeUid;

    localStorage.setItem('ym_auth_token', token);
    setAuthToken(token);
    setUser(mergedInitialUser);
    setHasVerifiedAdminClaim(mergedInitialUser.role === 'admin');
    setActiveTab(getDefaultTabForRole(mergedInitialUser.role));

    if (options?.initialData) {
      const initCerts = Array.isArray(options.initialData.certificates) ? options.initialData.certificates : [];
      const initApps = Array.isArray(options.initialData.applications) ? options.initialData.applications : [];
      const initNotifs = Array.isArray(options.initialData.notifications) ? options.initialData.notifications : [];
      setCertificates(deduplicateCertificates([initCerts], activeUid));
      setApplications(deduplicateApplications([initApps]));
      setNotifications(initNotifs);
    }

    // Never block the user behind a full-screen waiting wall once authenticated
    setIsHydratingUserSession(false);

    // 3. Hydrate remaining Firestore subcollections in the background (skipped for brand-new accounts)
    void hydrateUserSession(token, mergedInitialUser, gen, options);
  }, []);

  const logout = useCallback(() => {
    // 1. Invalidate any in-flight async hydration or fetches immediately
    sessionGenRef.current += 1;
    const tokenToRevoke = localStorage.getItem('ym_auth_token');

    // 2. Clear all in-memory user data & client Firestore caches
    resetUserSessionState();
    clearFirestoreClientCache();
    setAuthToken(null);
    setIsHydratingUserSession(false);

    // 3. Clear all user-specific cached data from localStorage & sessionStorage
    purgeUserPrivateBrowserCaches(true);

    // 4. Properly terminate both backend session & Firebase Authentication session
    if (tokenToRevoke) {
      void logoutApi(tokenToRevoke);
    }
    void signOutUser();

    setActiveTab('home');
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // Monitor Firebase Auth state strictly for admin custom-claims verification (no duplicate Firestore reads!)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setHasVerifiedAdminClaim(false);
        return;
      }

      const gen = sessionGenRef.current;
      if (fbUser.emailVerified) {
        try {
          const claims = await getFirebaseCustomClaims(false);
          if (sessionGenRef.current === gen) {
            setHasVerifiedAdminClaim(claims.admin === true);
          }
        } catch {
          if (sessionGenRef.current === gen) {
            setHasVerifiedAdminClaim(false);
          }
        }
      } else {
        setHasVerifiedAdminClaim(false);
      }
    });
    return () => unsub();
  }, []);

  // Restore remembered session seamlessly on initial page reload (backend token OR persisted Firebase Auth session)
  useEffect(() => {
    const savedToken = localStorage.getItem('ym_auth_token');
    sessionGenRef.current += 1;
    const gen = sessionGenRef.current;

    const tryRestoreFromFirebaseSession = async () => {
      try {
        const fbUser = await waitForFirebaseAuthReady(1500);
        if (sessionGenRef.current !== gen || !fbUser) return false;
        const email = (fbUser.email || '').toLowerCase();
        if (!email) return false;

        const [idToken, fsProfile] = await Promise.all([
          fbUser.getIdToken(false),
          getUserProfileFromFirestore(fbUser.uid).catch(() => null),
        ]);
        if (sessionGenRef.current !== gen) return false;

        const resolvedRole = fsProfile?.role;
        // Never auto-restore admin sessions on public reload without explicit claim check
        if (resolvedRole === 'admin') return false;

        const backendRes = await firebaseLoginApi({
          firebaseUid: fbUser.uid,
          idToken,
          email,
          name: fsProfile?.name || fbUser.displayName || email.split('@')[0] || 'Yuva Member',
          role: resolvedRole,
          photoUrl: fbUser.photoURL || '',
          currentRole: fsProfile?.currentRole,
          yearsOfExperience: fsProfile?.yearsOfExperience,
          rememberMe: true,
        });
        if (sessionGenRef.current !== gen || !backendRes?.user) return false;

        const restoredUser = mergeProfileWithFirestore(
          normalizeUserProfile({ ...backendRes.user, id: fbUser.uid }),
          fsProfile,
          null
        );
        activeUidRef.current = restoredUser.id;
        localStorage.setItem('ym_auth_token', backendRes.token);
        setAuthToken(backendRes.token);
        setUser(restoredUser);
        setActiveTab(getDefaultTabForRole(restoredUser.role));
        if (backendRes.initialData) {
          setCertificates(deduplicateCertificates([backendRes.initialData.certificates || []], restoredUser.id));
          setApplications(deduplicateApplications([backendRes.initialData.applications || []]));
          setNotifications(Array.isArray(backendRes.initialData.notifications) ? backendRes.initialData.notifications : []);
        }
        setIsHydratingUserSession(false);

        void hydrateUserSession(backendRes.token, restoredUser, gen, {
          initialData: backendRes.initialData,
          preloadedProfile: fsProfile,
        });
        return true;
      } catch {
        return false;
      }
    };

    if (!savedToken || savedToken === 'token-demo-session') {
      purgeUserPrivateBrowserCaches(true);
      setIsHydratingUserSession(false);
      // Silently check if Firebase still has a remembered session so users don't have to log in again
      void tryRestoreFromFirebaseSession();
      return;
    }

    setIsHydratingUserSession(true);

    fetchCurrentUserApi(savedToken)
      .then(async (data) => {
        if (sessionGenRef.current !== gen) return;
        if (data?.user) {
          const normalized = normalizeUserProfile(data.user);
          activeUidRef.current = normalized.id;
          setAuthToken(savedToken);
          setUser(normalized);
          setHasVerifiedAdminClaim(normalized.role === 'admin');
          setActiveTab(getDefaultTabForRole(normalized.role));
          if (data.initialData) {
            setCertificates(deduplicateCertificates([data.initialData.certificates || []], normalized.id));
            setApplications(deduplicateApplications([data.initialData.applications || []]));
            setNotifications(Array.isArray(data.initialData.notifications) ? data.initialData.notifications : []);
          }
          // Immediately reveal dashboard while Firestore subcollections sync in background
          setIsHydratingUserSession(false);
          void hydrateUserSession(savedToken, normalized, gen, { initialData: data.initialData });
        } else {
          const restored = await tryRestoreFromFirebaseSession();
          if (!restored && sessionGenRef.current === gen) {
            resetUserSessionState();
            purgeUserPrivateBrowserCaches(true);
            setAuthToken(null);
            setIsHydratingUserSession(false);
          }
        }
      })
      .catch(async () => {
        if (sessionGenRef.current !== gen) return;
        const restored = await tryRestoreFromFirebaseSession();
        if (!restored && sessionGenRef.current === gen) {
          resetUserSessionState();
          purgeUserPrivateBrowserCaches(true);
          setAuthToken(null);
          setIsHydratingUserSession(false);
        }
      });
  }, []);

  const refreshRecommendations = async (force: boolean = false) => {
    if (!user?.id || isHydratingUserSession) return;
    const gen = sessionGenRef.current;
    const targetUid = auth.currentUser?.uid || user.id;
    const currentSig = computeProfileSignature(user);

    if (
      !force &&
      recommendationsBundle?.userId === targetUid &&
      recommendationsBundle?.profileSignature === currentSig &&
      recommendationsBundle.recommendations.length > 0
    ) {
      return;
    }
    if (!force && recommendationsInFlightSigRef.current === `${targetUid}:${currentSig}`) {
      return;
    }

    recommendationsInFlightSigRef.current = `${targetUid}:${currentSig}`;
    setIsLoadingRecommendations(true);
    setRecommendationsError(null);

    try {
      const firestoreInternships = auth.currentUser
        ? await getVerifiedInternshipsFromFirestore().catch(() => [])
        : [];

      const res = await fetchPersonalizedRecommendationsApi(user, 8, firestoreInternships);
      if (sessionGenRef.current !== gen) return;

      const recs = Array.isArray(res?.recommendations) ? res.recommendations : [];
      const overallMissingSkills = Array.isArray(res?.overallMissingSkills) ? res.overallMissingSkills : [];
      const topSkillGapResources = Array.isArray(res?.topSkillGapResources)
        ? res.topSkillGapResources
        : suggestResourcesForMissingSkills(overallMissingSkills, recs[0]?.title);

      const bundle: StudentRecommendationBundle = {
        userId: targetUid,
        profileSignature: res?.profileSignature || currentSig,
        recommendations: recs,
        overallMissingSkills,
        topSkillGapResources,
        beginnerFriendlyCount:
          typeof res?.beginnerFriendlyCount === 'number'
            ? res.beginnerFriendlyCount
            : recs.filter((r: any) => r.isBeginnerFriendly).length,
        updatedAt: res?.updatedAt || new Date().toISOString(),
      };

      setRecommendationsBundle(bundle);
      if (res?.sourceStatus) {
        setRecommendationSourceStatus(res.sourceStatus);
      }

      if (auth.currentUser?.uid && auth.currentUser.uid === targetUid) {
        saveStudentRecommendationsToFirestore(auth.currentUser.uid, bundle).catch(() => {});
      }
    } catch (err: any) {
      if (sessionGenRef.current === gen) {
        setRecommendationsError(err?.message || 'Unable to compute personalized internship matches right now.');
      }
    } finally {
      if (recommendationsInFlightSigRef.current === `${targetUid}:${currentSig}`) {
        recommendationsInFlightSigRef.current = null;
      }
      if (sessionGenRef.current === gen) {
        setIsLoadingRecommendations(false);
      }
    }
  };

  // Automatically analyze student profile & recompute matches whenever the authenticated student's profile changes
  const profileSignature = computeProfileSignature(user);
  useEffect(() => {
    if (!isAuthenticated || isHydratingUserSession) {
      return;
    }
    if (user.role !== 'student' && user.role !== 'experienced') {
      return;
    }
    const timer = setTimeout(() => {
      void refreshRecommendations(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [isAuthenticated, isHydratingUserSession, user.id, profileSignature, user.role]);

  const refreshUserLocation = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setUserLocation(loc);
            localStorage.setItem('ym_location', JSON.stringify(loc));
            updateUser({ coordinates: loc });
            resolve(true);
          },
          (err) => {
            console.warn('Geolocation error or denied:', err);
            setUserLocation({ lat: 28.6315, lng: 77.2167 });
            resolve(false);
          },
          { timeout: 8000 }
        );
      } else {
        resolve(false);
      }
    });
  };

  const calculateDistance = (coords: { lat: number; lng: number }): number => {
    if (!coords || !userLocation) return 0;
    return computeHaversineDistance(userLocation.lat, userLocation.lng, coords.lat, coords.lng);
  };

  const toggleSaveJob = (jobId: string) => {
    const isSaved = user.savedJobIds.includes(jobId);
    const updated = isSaved 
      ? user.savedJobIds.filter(id => id !== jobId)
      : [...user.savedJobIds, jobId];
    updateUser({ savedJobIds: updated });
  };

  const applyForJob = async (job: Job, coverLetter: string, eligibilityScore?: number): Promise<boolean> => {
    if (!authToken || !user.id) return false;
    const exists = applications.some(app => app.jobId === job.id);
    if (exists) return false;

    const res = await applyOpportunityApi(authToken, {
      jobId: job.id,
      coverLetter,
      matchScore: eligibilityScore || 80,
      candidateEmail: user.email,
      candidateName: user.name
    });

    const createdApp: Application = res?.application || {
      id: `app-${Date.now()}`,
      jobId: job.id,
      jobTitle: job.title,
      company: job.company,
      candidateId: user.id,
      candidateName: user.name,
      candidateEmail: user.email,
      candidatePhone: user.phone,
      candidateCollege: user.college || user.institution,
      candidateBranch: user.branch || user.course,
      candidateGraduationYear: user.graduationYear,
      candidateSkills: user.skills,
      candidateResumeText: user.resumeText,
      status: 'Applied',
      appliedDate: new Date().toISOString().split('T')[0],
      coverLetter,
      matchScore: eligibilityScore || 80,
    };

    setApplications(prev => [createdApp, ...prev]);

    if (auth.currentUser?.uid) {
      saveUserApplicationToFirestore(auth.currentUser.uid, createdApp).catch(() => {});
    }

    updateUser({
      xpPoints: (user.xpPoints || 0) + 100,
      badges: user.badges.includes('Job Hunter') ? user.badges : [...user.badges, 'Job Hunter']
    });

    setNotifications(prev => [
      {
        id: `notif-${Date.now()}`,
        userId: user.id,
        title: `Applied to ${job.company}`,
        message: `Your application for "${job.title}" has been successfully submitted!`,
        date: 'Just now',
        type: 'application',
        read: false,
        actionTab: 'applications'
      },
      ...prev
    ]);

    return true;
  };

  const updateApplicationStatus = async (appId: string, status: Application['status'], details?: any) => {
    const res = await updateApplicationStatusApi(authToken, appId, {
      status,
      ...(details || {})
    });
    const updatedApp = res?.application;
    setApplications(prev =>
      prev.map(app => (app.id === appId ? (updatedApp || { ...app, status, ...(details || {}) }) : app))
    );
  };

  const updateApplicationSchedule = async (
    appId: string,
    details: {
      status?: Application['status'];
      interviewDate?: string;
      interviewTime?: string;
      interviewMode?: 'Online (Google Meet/Zoom)' | 'In-Person / Campus';
      interviewLinkOrVenue?: string;
      notes?: string;
    }
  ) => {
    let savedApp: Application | undefined;
    try {
      const res = await updateApplicationScheduleApi(authToken, appId, details);
      savedApp = res?.application;
    } catch (err: any) {
      // Allow persisting interview schedule to Firestore if the application exists only in Firestore
      const localApp = applications.find(a => a.id === appId);
      if (!localApp) throw err;
      savedApp = {
        ...localApp,
        ...details,
        status: details.status || (details.interviewDate && (localApp.status === 'Applied' || localApp.status === 'Under Review') ? 'Interview' : localApp.status),
        updatedDate: new Date().toISOString().split('T')[0],
      };
    }

    if (!savedApp) return;
    const finalized = savedApp;
    setApplications(prev => prev.map(app => (app.id === appId ? finalized : app)));

    if (auth.currentUser?.uid && (finalized.candidateId === auth.currentUser.uid || !finalized.candidateId)) {
      saveUserApplicationToFirestore(auth.currentUser.uid, finalized).catch(() => {});
    }

    if (finalized.interviewDate) {
      setNotifications(prev => [
        {
          id: `notif-${Date.now()}`,
          userId: user.id,
          title: `Interview Reminder: ${finalized.company}`,
          message: `Scheduled for "${finalized.jobTitle}" on ${finalized.interviewDate}${finalized.interviewTime ? ` at ${finalized.interviewTime}` : ''}.`,
          date: 'Just now',
          type: 'interview',
          read: false,
          actionTab: 'applications',
        },
        ...prev,
      ]);
    }
  };

  const addJob = async (jobData: Omit<Job, 'id' | 'postedDate' | 'applicantsCount'>): Promise<boolean> => {
    const res = await postOpportunityApi(authToken, jobData);
    const createdJob = res?.job || res?.opportunity;
    if (!createdJob) {
      throw new Error(res?.error || 'Backend did not return created opportunity.');
    }

    if (
      auth.currentUser &&
      (isAdmin || isRecruiter || isCollege) &&
      (createdJob.type === 'internship' || jobData.opportunitySource === 'Firestore Verified')
    ) {
      const nowIso = new Date().toISOString();
      const applyHref = createdJob.originalUrl || createdJob.externalSourceUrl || `https://yuvamitraa.in/internships/${createdJob.id}`;
      const fsListing: InternshipListing = {
        id: createdJob.id,
        title: createdJob.title,
        companyName: createdJob.company,
        companyLogo: createdJob.companyLogo,
        category: createdJob.category,
        description: createdJob.description || '',
        eligibility: createdJob.eligibility || 'Indian college students & freshers',
        skills: Array.isArray(createdJob.requiredSkills) ? createdJob.requiredSkills : [],
        location: createdJob.location || 'India',
        workMode: createdJob.type === 'remote' ? 'Remote' : 'On-site',
        duration: createdJob.duration || 'Internship',
        stipend: createdJob.stipend || '',
        applicationDeadline: createdJob.deadline || '',
        applyUrl: applyHref,
        sourceName: createdJob.opportunitySource || 'Firestore Verified',
        sourceUrl: applyHref,
        sourceId: createdJob.id,
        verifiedStatus: 'Verified',
        lastVerifiedAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
        isGovernmentScheme: Boolean(createdJob.isGovernmentSponsored),
      };
      const saved = await saveVerifiedInternshipToFirestore(fsListing).catch(() => false);
      if (saved) {
        setFirestoreInternshipsCount((prev) => prev + 1);
      }
    }

    setJobs(prev => [createdJob, ...prev]);
    return true;
  };

  const updateJob = async (jobId: string, updated: Partial<Job>): Promise<void> => {
    const res = await updateOpportunityApi(authToken, jobId, updated);
    const savedJob = res?.job;
    setJobs(prev =>
      prev.map(job => (job.id === jobId ? (savedJob || { ...job, ...updated }) : job))
    );
  };

  const deleteJob = async (jobId: string) => {
    if (!authToken) {
      throw new Error('Authentication required to delete an opportunity.');
    }
    let backendDeleted = false;
    try {
      await deleteOpportunityApi(authToken, jobId);
      backendDeleted = true;
    } catch (err) {
      if (!auth.currentUser || (!isAdmin && !isRecruiter && !isCollege)) {
        throw err;
      }
    }

    let firestoreDeleted = false;
    if (auth.currentUser && (isAdmin || isRecruiter || isCollege)) {
      firestoreDeleted = await deleteVerifiedInternshipFromFirestore(jobId).catch(() => false);
      if (firestoreDeleted) {
        setFirestoreInternshipsCount((prev) => Math.max(0, prev - 1));
      }
    }

    if (!backendDeleted && !firestoreDeleted) {
      throw new Error('Failed to delete opportunity from server and Firestore.');
    }
    setJobs(prev => prev.filter(job => job.id !== jobId));
  };

  const issueCertificate = (course: Course, scorePercentage: number): Certificate => {
    const ownerUid = auth.currentUser?.uid || user.id;
    const code = `YM-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const newCert: Certificate = {
      id: `cert-${Date.now()}`,
      userId: ownerUid,
      certificateCode: code,
      studentName: user.name,
      courseId: course.id,
      courseTitle: course.title,
      issueDate: new Date().toISOString().split('T')[0],
      scorePercentage,
      qrData: `https://yuvamitraa.gov.in/verify/${code}`,
      instructor: course.instructor,
      source: 'earned',
      issuer: 'YuvaMitraa Skill Foundation',
    };

    setCertificates(prev => deduplicateCertificates([[newCert], prev], ownerUid));

    const existingEnrolled = user.enrolledCourses.find(e => e.courseId === course.id);
    const updatedEnrolled = existingEnrolled
      ? user.enrolledCourses.map(e => e.courseId === course.id ? { ...e, passed: true, finalScore: scorePercentage, certificateId: newCert.id } : e)
      : [...user.enrolledCourses, { courseId: course.id, completedModuleIds: course.modules.map(m => m.id), passed: true, finalScore: scorePercentage, certificateId: newCert.id }];

    updateUser({
      xpPoints: (user.xpPoints || 0) + 350,
      enrolledCourses: updatedEnrolled,
      badges: user.badges.includes('Certified Champion') ? user.badges : [...user.badges, 'Certified Champion']
    });

    if (auth.currentUser?.uid && auth.currentUser.uid === ownerUid) {
      saveUserCertificateToFirestore(auth.currentUser.uid, newCert).catch(() => {});
    }

    if (authToken) {
      issueCertificateApi(authToken, course.id, scorePercentage, {
        id: newCert.id,
        certificateCode: newCert.certificateCode,
        courseTitle: newCert.courseTitle,
        instructor: newCert.instructor,
        issueDate: newCert.issueDate,
        qrData: newCert.qrData,
      }).catch((err) => {
        console.warn('Certificate backend sync warning:', err);
      });
    }

    setNotifications(prev => [
      {
        id: `notif-${Date.now()}`,
        userId: ownerUid,
        title: '🎓 Certificate Earned!',
        message: `Congratulations! You successfully passed "${course.title}" with ${scorePercentage}%. Download your certificate now.`,
        date: 'Just now',
        type: 'course',
        read: false,
        actionTab: 'certificates'
      },
      ...prev
    ]);

    return newCert;
  };

  const uploadCertificate = async (payload: {
    courseTitle: string;
    issuer: string;
    issueDate: string;
    certificateCode?: string;
    credentialUrl?: string;
    fileName?: string;
  }): Promise<Certificate> => {
    if (!authToken || !user.id) {
      throw new Error('Please sign in to upload a certificate.');
    }
    const ownerUid = auth.currentUser?.uid || user.id;
    const localId = `cert-up-${Date.now()}`;
    const res = await uploadCertificateApi(authToken, { ...payload, id: localId });
    const created: Certificate = {
      ...(res.certificate as Certificate),
      userId: ownerUid,
      source: 'uploaded',
    };

    setCertificates(prev => deduplicateCertificates([[created], prev], ownerUid));

    if (auth.currentUser?.uid && auth.currentUser.uid === ownerUid) {
      await saveUserCertificateToFirestore(auth.currentUser.uid, created).catch(() => {});
    }

    return created;
  };

  const deleteCertificate = async (certificateId: string): Promise<void> => {
    if (!authToken || !user.id) {
      throw new Error('Authentication required to delete a certificate.');
    }
    const ownerUid = auth.currentUser?.uid || user.id;
    await deleteCertificateApi(authToken, certificateId).catch(() => {});
    if (auth.currentUser?.uid && auth.currentUser.uid === ownerUid) {
      await deleteUserCertificateFromFirestore(auth.currentUser.uid, certificateId).catch(() => {});
    }
    setCertificates(prev => prev.filter(c => c.id !== certificateId));
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    if (authToken) {
      markNotificationReadApi(id, authToken).catch(() => {});
    }
  };

  const t = useCallback((key: string): string => {
    const dict = UI_TRANSLATIONS[language] || UI_TRANSLATIONS['English'];
    return dict[key] || UI_TRANSLATIONS['English'][key] || key;
  }, [language]);

  const contextValue = useMemo<AppContextType>(() => ({
    user,
    updateUser,
    language,
    setLanguage,
    activeTab,
    setActiveTab,
    selectedJobForDetail,
    setSelectedJobForDetail,
    openApplyModal,
    setOpenApplyModal,
    openJobApplyModal,
    selectedCourseForPlayer,
    setSelectedCourseForPlayer,
    courses: SAMPLE_COURSES,
    jobs,
    addJob,
    updateJob,
    deleteJob,
    applications,
    applyForJob,
    updateApplicationStatus,
    updateApplicationSchedule,
    savedJobIds: user.savedJobIds,
    toggleSaveJob,
    certificates,
    issueCertificate,
    uploadCertificate,
    deleteCertificate,
    notifications,
    markNotificationRead,
    darkMode,
    toggleDarkMode,
    fontSize,
    setFontSize,
    userLocation,
    refreshUserLocation,
    calculateDistance,
    isRecruiter,
    isExperienced,
    isCollege,
    isAdmin,
    hasVerifiedAdminClaim,
    role,
    t,
    isFirstLaunch,
    dismissFirstLaunch,
    viewportMode,
    setViewportMode,
    toggleViewportMode,
    isAuthenticated,
    isHydratingUserSession,
    authToken,
    login,
    logout,
    refreshOpportunities,
    isLoadingOpportunities,
    opportunitiesError,
    opportunitiesLastSyncedAt,
    firestoreInternshipsCount,
    refreshApplications,
    recommendationsBundle,
    isLoadingRecommendations,
    recommendationsError,
    recommendationSourceStatus,
    refreshRecommendations,
  }), [
    user,
    updateUser,
    language,
    setLanguage,
    activeTab,
    selectedJobForDetail,
    openApplyModal,
    selectedCourseForPlayer,
    jobs,
    applications,
    certificates,
    notifications,
    darkMode,
    toggleDarkMode,
    fontSize,
    setFontSize,
    userLocation,
    isRecruiter,
    isExperienced,
    isCollege,
    isAdmin,
    hasVerifiedAdminClaim,
    role,
    t,
    isFirstLaunch,
    dismissFirstLaunch,
    viewportMode,
    isAuthenticated,
    isHydratingUserSession,
    authToken,
    login,
    logout,
    isLoadingOpportunities,
    opportunitiesError,
    opportunitiesLastSyncedAt,
    firestoreInternshipsCount,
    recommendationsBundle,
    isLoadingRecommendations,
    recommendationsError,
    recommendationSourceStatus,
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
