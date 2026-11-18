import React, { createContext, useContext, useState, useEffect } from 'react';
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
  SAMPLE_JOBS, 
  SAMPLE_COURSES, 
  UI_TRANSLATIONS 
} from '../data/mockData';
import { 
  fetchCurrentUserApi, 
  logoutApi,
  fetchOpportunitiesApi,
  fetchApplicationsApi,
  applyOpportunityApi,
  updateApplicationStatusApi,
  postOpportunityApi,
  updateOpportunityApi,
  deleteOpportunityApi,
  fetchNotificationsApi,
  markNotificationReadApi,
  issueCertificateApi,
  fetchPersonalizedRecommendationsApi
} from '../services/api';
import {
  auth,
  onAuthStateChanged,
  getFirebaseCustomClaims,
  getSavedResumeFromFirestore,
  getUserProfileFromFirestore,
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

export interface RecommendationSourceStatus {
  externalApiCount: number;
  firestoreCount: number;
  platformVerifiedCount: number;
  externalUnavailable: boolean;
  totalVerifiedCount: number;
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
  savedJobIds: string[];
  toggleSaveJob: (jobId: string) => void;
  certificates: Certificate[];
  issueCertificate: (course: Course, scorePercentage: number) => Certificate;
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
  authToken: string | null;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  refreshOpportunities: () => Promise<void>;
  isLoadingOpportunities: boolean;
  opportunitiesError: string | null;
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

const INITIAL_APPLICATIONS: Application[] = [];

const INITIAL_CERTIFICATES: Certificate[] = [];

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
  streakDays: 0,
  xpPoints: 0,
  badges: [],
  savedJobIds: [],
  enrolledCourses: [],
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
    streakDays: typeof rawUser.streakDays === 'number' ? rawUser.streakDays : 0,
    xpPoints: typeof rawUser.xpPoints === 'number' ? rawUser.xpPoints : 0,
    location: rawUser.location || 'India',
    resumeFileName: rawUser.resumeFileName || '',
    resumeText: rawUser.resumeText || '',
    resumeUpdatedAt: rawUser.resumeUpdatedAt || '',
  };
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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('ym_user');
      return saved ? normalizeUserProfile(JSON.parse(saved)) : EMPTY_USER;
    } catch {
      return EMPTY_USER;
    }
  });

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
  
  const [jobs, setJobs] = useState<Job[]>(() => {
    try {
      const saved = localStorage.getItem('ym_jobs');
      return saved ? JSON.parse(saved) : SAMPLE_JOBS;
    } catch {
      return SAMPLE_JOBS;
    }
  });

  const [applications, setApplications] = useState<Application[]>(() => {
    try {
      const saved = localStorage.getItem('ym_applications');
      return saved ? JSON.parse(saved) : INITIAL_APPLICATIONS;
    } catch {
      return INITIAL_APPLICATIONS;
    }
  });

  const [certificates, setCertificates] = useState<Certificate[]>(() => {
    try {
      const saved = localStorage.getItem('ym_certificates');
      return saved ? JSON.parse(saved) : INITIAL_CERTIFICATES;
    } catch {
      return INITIAL_CERTIFICATES;
    }
  });

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
    return localStorage.getItem('ym_auth_token') || null;
  });

  const [hasVerifiedAdminClaim, setHasVerifiedAdminClaim] = useState<boolean>(false);

  const isAuthenticated = Boolean(authToken && user);
  const isRecruiter = user.role === 'recruiter';
  const isExperienced = user.role === 'experienced';
  const isCollege = user.role === 'college';
  const isAdmin = user.role === 'admin' && hasVerifiedAdminClaim;
  const role = user.role;

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Opportunities & AI Personalized Internship Matching state
  const [isLoadingOpportunities, setIsLoadingOpportunities] = useState<boolean>(false);
  const [opportunitiesError, setOpportunitiesError] = useState<string | null>(null);
  const [firestoreInternshipsCount, setFirestoreInternshipsCount] = useState<number>(0);
  const [recommendationsBundle, setRecommendationsBundle] = useState<StudentRecommendationBundle | null>(null);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState<boolean>(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);
  const [recommendationSourceStatus, setRecommendationSourceStatus] = useState<RecommendationSourceStatus | null>(null);

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

  // Load live applications from backend (requires valid authToken)
  const refreshApplications = async () => {
    if (!authToken || !user?.email) return;
    try {
      const data = await fetchApplicationsApi(
        user.role === 'student' || user.role === 'experienced' ? { candidateEmail: user.email } : undefined,
        authToken
      );
      if (Array.isArray(data?.applications)) {
        setApplications(data.applications);
      }
    } catch (err) {
      console.warn('Backend applications fetch skipped:', err);
    }
  };

  // Load live notifications (only when authenticated)
  const refreshNotifications = async () => {
    if (!authToken) return;
    try {
      const data = await fetchNotificationsApi(authToken, user.role);
      if (Array.isArray(data?.notifications)) {
        setNotifications(data.notifications);
      }
    } catch {
      // ignore non-critical notification polling failures
    }
  };

  const hasFetchedPublicOpportunitiesRef = React.useRef(false);

  useEffect(() => {
    const needsAllScope = isAdmin || isRecruiter || isCollege;
    if (!hasFetchedPublicOpportunitiesRef.current || needsAllScope) {
      hasFetchedPublicOpportunitiesRef.current = true;
      void refreshOpportunities();
    }
    if (authToken && user?.email) {
      void Promise.all([refreshApplications(), refreshNotifications()]);
    }
  }, [authToken, user?.email, user?.role]);

  // Sync to local storage safely
  useEffect(() => {
    try { localStorage.setItem('ym_user', JSON.stringify(user)); } catch {}
  }, [user]);

  useEffect(() => {
    try { localStorage.setItem('ym_jobs', JSON.stringify(jobs)); } catch {}
  }, [jobs]);

  useEffect(() => {
    try { localStorage.setItem('ym_applications', JSON.stringify(applications)); } catch {}
  }, [applications]);

  useEffect(() => {
    try { localStorage.setItem('ym_certificates', JSON.stringify(certificates)); } catch {}
  }, [certificates]);

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

  const updateUser = (updated: Partial<UserProfile>) => {
    setUser(prev => {
      // Never allow profile edits to escalate or mutate user role
      const { role: _ignoredRole, ...safeUpdates } = updated;
      return normalizeUserProfile({ ...prev, ...safeUpdates });
    });
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const dismissFirstLaunch = () => {
    setIsFirstLaunch(false);
  };

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const setFontSize = (size: 'normal' | 'large' | 'xlarge') => {
    setFontSizeState(size);
  };

  const login = (token: string, newUser: UserProfile) => {
    const normalized = normalizeUserProfile(newUser);
    setAuthToken(token);
    setUser(normalized);
    localStorage.setItem('ym_auth_token', token);
    localStorage.setItem('ym_user', JSON.stringify(normalized));
    localStorage.setItem('ym_remembered_account', JSON.stringify({
      name: normalized.name,
      email: normalized.email,
      phone: normalized.phone,
      role: normalized.role,
      photoUrl: normalized.photoUrl,
    }));

    // Automatically redirect users to their respective dashboards based on Firestore/server role
    if (normalized.role === 'admin') {
      setHasVerifiedAdminClaim(true);
      setActiveTab('admin');
    } else if (normalized.role === 'recruiter') {
      setHasVerifiedAdminClaim(false);
      setActiveTab('recruiter');
    } else if (normalized.role === 'experienced') {
      setHasVerifiedAdminClaim(false);
      setActiveTab('experienced');
    } else if (normalized.role === 'college') {
      setHasVerifiedAdminClaim(false);
      setActiveTab('college');
    } else {
      setHasVerifiedAdminClaim(false);
      setActiveTab('home');
    }
  };

  const logout = () => {
    if (authToken) {
      logoutApi(authToken);
    }
    signOutUser();
    setAuthToken(null);
    setUser(EMPTY_USER);
    setApplications([]);
    setNotifications([]);
    setRecommendationsBundle(null);
    setRecommendationsError(null);
    setRecommendationSourceStatus(null);
    setOpenApplyModal(false);
    setHasVerifiedAdminClaim(false);
    localStorage.removeItem('ym_auth_token');
    localStorage.removeItem('ym_user');
    localStorage.removeItem('ym_applications');
    setActiveTab('home');
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
      window.history.replaceState({}, '', '/');
    }
  };

  // Monitor Firebase Auth custom claims & hydrate persisted Firestore profile, resume, and private recommendations on refresh
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        if (fbUser.emailVerified) {
          try {
            const claims = await getFirebaseCustomClaims(false);
            setHasVerifiedAdminClaim(claims.admin === true);
          } catch {
            setHasVerifiedAdminClaim(false);
          }
        } else {
          setHasVerifiedAdminClaim(false);
        }

        try {
          const [savedResume, fsProfile, cachedRecs] = await Promise.all([
            getSavedResumeFromFirestore(fbUser.uid).catch(() => null),
            getUserProfileFromFirestore(fbUser.uid).catch(() => null),
            getStudentRecommendationsFromFirestore(fbUser.uid).catch(() => null),
          ]);

          let nextNormalizedUser: UserProfile | null = null;
          setUser((prev) => {
            const prevEmail = (prev.email || '').toLowerCase();
            const fbEmail = (fbUser.email || '').toLowerCase();
            if (prev.id && prevEmail && fbEmail && prevEmail !== fbEmail) {
              return prev;
            }
            const mergedFromFs: Partial<UserProfile> = {};
            if (fsProfile) {
              const scalarKeys: Array<keyof UserProfile> = [
                'name', 'phone', 'education', 'institution', 'college', 'course',
                'branch', 'studyYear', 'rollNumber', 'cgpa', 'graduationYear',
                'location', 'preferredLocation', 'preferredDomain', 'careerGoals',
                'workModePreference', 'githubUrl', 'linkedinUrl', 'portfolioUrl', 'photoUrl'
              ];
              for (const k of scalarKeys) {
                if (fsProfile[k]) {
                  (mergedFromFs as any)[k] = fsProfile[k];
                }
              }
              if (typeof fsProfile.age === 'number') mergedFromFs.age = fsProfile.age;
              const arrKeys: Array<keyof UserProfile> = ['skills', 'nonTechnicalSkills', 'interests', 'preferredRoles', 'savedJobIds', 'badges'];
              for (const k of arrKeys) {
                if (Array.isArray(fsProfile[k]) && fsProfile[k].length > 0) {
                  (mergedFromFs as any)[k] = fsProfile[k];
                }
              }
            }
            nextNormalizedUser = normalizeUserProfile({
              ...prev,
              ...mergedFromFs,
              ...(savedResume ? {
                resumeFileName: savedResume.fileName,
                resumeText: savedResume.text,
                resumeUpdatedAt: savedResume.updatedAt,
              } : {}),
            });
            return nextNormalizedUser;
          });

          if (cachedRecs && Array.isArray(cachedRecs.recommendations) && cachedRecs.recommendations.length > 0) {
            const targetUser = nextNormalizedUser || user;
            const currentSig = computeProfileSignature(targetUser);
            if (cachedRecs.profileSignature === currentSig) {
              const missing = Array.isArray(cachedRecs.overallMissingSkills) ? cachedRecs.overallMissingSkills : [];
              setRecommendationsBundle({
                userId: fbUser.uid,
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
            }
          }

          // Hydrate verified Indian internships stored in Firestore once Firebase Auth is ready
          void refreshOpportunities();
        } catch {
          // Non-fatal if offline; localStorage still serves cached profile
        }
      } else {
        setHasVerifiedAdminClaim(false);
      }
    });
    return () => unsub();
  }, []);

  const recommendationsInFlightSigRef = React.useRef<string | null>(null);

  const refreshRecommendations = async (force: boolean = false) => {
    const currentSig = computeProfileSignature(user);
    if (
      !force &&
      recommendationsBundle?.profileSignature === currentSig &&
      recommendationsBundle.recommendations.length > 0
    ) {
      return;
    }
    if (!force && recommendationsInFlightSigRef.current === currentSig) {
      return;
    }

    recommendationsInFlightSigRef.current = currentSig;
    setIsLoadingRecommendations(true);
    setRecommendationsError(null);

    try {
      const firestoreInternships = auth.currentUser
        ? await getVerifiedInternshipsFromFirestore().catch(() => [])
        : [];

      const res = await fetchPersonalizedRecommendationsApi(user, 8, firestoreInternships);
      const recs = Array.isArray(res?.recommendations) ? res.recommendations : [];
      const overallMissingSkills = Array.isArray(res?.overallMissingSkills) ? res.overallMissingSkills : [];
      const topSkillGapResources = Array.isArray(res?.topSkillGapResources)
        ? res.topSkillGapResources
        : suggestResourcesForMissingSkills(overallMissingSkills, recs[0]?.title);

      const bundle: StudentRecommendationBundle = {
        userId: auth.currentUser?.uid || user.id || 'guest',
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

      if (auth.currentUser?.uid) {
        saveStudentRecommendationsToFirestore(auth.currentUser.uid, bundle).catch(() => {});
      }
    } catch (err: any) {
      setRecommendationsError(err?.message || 'Unable to compute personalized internship matches right now.');
    } finally {
      if (recommendationsInFlightSigRef.current === currentSig) {
        recommendationsInFlightSigRef.current = null;
      }
      setIsLoadingRecommendations(false);
    }
  };

  // Automatically analyze student profile & recompute matches on load and whenever profile changes
  const profileSignature = computeProfileSignature(user);
  useEffect(() => {
    if (user.role !== 'student' && user.role !== 'experienced') {
      return;
    }
    const timer = setTimeout(() => {
      void refreshRecommendations(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [profileSignature, user.role]);

  // Restore session token on load
  useEffect(() => {
    const savedToken = localStorage.getItem('ym_auth_token');
    if (savedToken && savedToken !== 'token-demo-session') {
      fetchCurrentUserApi(savedToken)
        .then(async (data) => {
          if (data?.user) {
            const fbUser = auth.currentUser;
            const savedResume = fbUser
              ? await getSavedResumeFromFirestore(fbUser.uid).catch(() => null)
              : null;
            const restored = normalizeUserProfile({
              ...data.user,
              ...(savedResume?.fileName ? { resumeFileName: savedResume.fileName } : {}),
              ...(savedResume?.text ? { resumeText: savedResume.text } : {}),
              ...(savedResume?.updatedAt ? { resumeUpdatedAt: savedResume.updatedAt } : {}),
            });
            if (restored.role === 'admin') {
              // Admin session also requires verified Firebase custom claim on current auth user
              if (fbUser && fbUser.emailVerified) {
                const claims = await getFirebaseCustomClaims(false).catch(() => ({}));
                if ((claims as any).admin === true) {
                  setHasVerifiedAdminClaim(true);
                  setUser(restored);
                  setActiveTab('admin');
                  return;
                }
              }
              setUser(restored);
              setActiveTab('admin');
              return;
            }
            setUser(restored);
            if (restored.role === 'recruiter') {
              setActiveTab('recruiter');
            } else if (restored.role === 'experienced') {
              setActiveTab('experienced');
            } else if (restored.role === 'college') {
              setActiveTab('college');
            }
          }
        })
        .catch(() => {
          localStorage.removeItem('ym_auth_token');
          setAuthToken(null);
          setHasVerifiedAdminClaim(false);
        });
    }
  }, []);

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
            // Default to Delhi Connaught Place
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

    updateUser({
      xpPoints: (user.xpPoints || 0) + 100,
      badges: user.badges.includes('Job Hunter') ? user.badges : [...user.badges, 'Job Hunter']
    });

    setNotifications(prev => [
      {
        id: `notif-${Date.now()}`,
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

  const addJob = async (jobData: Omit<Job, 'id' | 'postedDate' | 'applicantsCount'>): Promise<boolean> => {
    const res = await postOpportunityApi(authToken, jobData);
    const createdJob = res?.job || res?.opportunity;
    if (!createdJob) {
      throw new Error(res?.error || 'Backend did not return created opportunity.');
    }

    // Store verified Indian internships in Firebase Firestore (/internships) when signed in with write privileges
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
    const code = `YM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newCert: Certificate = {
      id: `cert-${Date.now()}`,
      certificateCode: code,
      studentName: user.name,
      courseId: course.id,
      courseTitle: course.title,
      issueDate: new Date().toISOString().split('T')[0],
      scorePercentage,
      qrData: `https://yuvamitraa.gov.in/verify/${code}`,
      instructor: course.instructor,
    };

    setCertificates(prev => [newCert, ...prev]);

    const existingEnrolled = user.enrolledCourses.find(e => e.courseId === course.id);
    const updatedEnrolled = existingEnrolled
      ? user.enrolledCourses.map(e => e.courseId === course.id ? { ...e, passed: true, finalScore: scorePercentage, certificateId: newCert.id } : e)
      : [...user.enrolledCourses, { courseId: course.id, completedModuleIds: course.modules.map(m => m.id), passed: true, finalScore: scorePercentage, certificateId: newCert.id }];

    updateUser({
      xpPoints: (user.xpPoints || 0) + 350,
      enrolledCourses: updatedEnrolled,
      badges: user.badges.includes('Certified Champion') ? user.badges : [...user.badges, 'Certified Champion']
    });

    if (authToken) {
      issueCertificateApi(authToken, course.id, scorePercentage).catch((err) => {
        console.warn('Certificate backend sync warning:', err);
      });
    }

    setNotifications(prev => [
      {
        id: `notif-${Date.now()}`,
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

  const markNotificationRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    markNotificationReadApi(id).catch(() => {});
  };

  const t = (key: string): string => {
    const dict = UI_TRANSLATIONS[language] || UI_TRANSLATIONS['English'];
    return dict[key] || UI_TRANSLATIONS['English'][key] || key;
  };

  return (
    <AppContext.Provider
      value={{
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
        savedJobIds: user.savedJobIds,
        toggleSaveJob,
        certificates,
        issueCertificate,
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
        authToken,
        login,
        logout,
        refreshOpportunities,
        isLoadingOpportunities,
        opportunitiesError,
        firestoreInternshipsCount,
        refreshApplications,
        recommendationsBundle,
        isLoadingRecommendations,
        recommendationsError,
        recommendationSourceStatus,
        refreshRecommendations,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
