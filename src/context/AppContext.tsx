import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  UserProfile, 
  Job, 
  Course, 
  Application, 
  Certificate, 
  Language, 
  NotificationItem,
  UserRole
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
  issueCertificateApi
} from '../services/api';
import {
  auth,
  onAuthStateChanged,
  getFirebaseCustomClaims,
  getSavedResumeFromFirestore,
  signOutUser
} from '../services/firebase';

interface AppContextType {
  user: UserProfile;
  updateUser: (updated: Partial<UserProfile>) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedJobForDetail: Job | null;
  setSelectedJobForDetail: (job: Job | null) => void;
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
  refreshApplications: () => Promise<void>;
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
  graduationYear: '',
  skills: [],
  interests: [],
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
  return {
    ...EMPTY_USER,
    ...rawUser,
    skills: Array.isArray(rawUser.skills) ? rawUser.skills : [],
    interests: Array.isArray(rawUser.interests) ? rawUser.interests : [],
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
  const [selectedCourseForPlayer, setSelectedCourseForPlayer] = useState<Course | null>(null);
  
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

  // Load live opportunities from backend (reads data.jobs)
  const refreshOpportunities = async () => {
    try {
      const data = await fetchOpportunitiesApi({ showAll: isAdmin || isRecruiter || isCollege });
      const fetchedList = Array.isArray(data?.jobs) ? data.jobs : data?.opportunities;
      if (Array.isArray(fetchedList) && fetchedList.length > 0) {
        setJobs(fetchedList);
      }
    } catch (err) {
      console.warn('Backend opportunities fetch failed:', err);
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
    setHasVerifiedAdminClaim(false);
    localStorage.removeItem('ym_auth_token');
    localStorage.removeItem('ym_user');
    localStorage.removeItem('ym_applications');
    setActiveTab('home');
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
      window.history.replaceState({}, '', '/');
    }
  };

  // Monitor Firebase Auth custom claims & hydrate persisted Firestore resume (users/{uid}/resume/current) on refresh
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
          const savedResume = await getSavedResumeFromFirestore(fbUser.uid);
          if (savedResume) {
            setUser((prev) => {
              const prevEmail = (prev.email || '').toLowerCase();
              const fbEmail = (fbUser.email || '').toLowerCase();
              if (prev.id && prevEmail && fbEmail && prevEmail !== fbEmail) {
                return prev;
              }
              return normalizeUserProfile({
                ...prev,
                resumeFileName: savedResume.fileName,
                resumeText: savedResume.text,
                resumeUpdatedAt: savedResume.updatedAt,
              });
            });
          }
        } catch {
          // Non-fatal if offline; localStorage still serves cached profile
        }
      } else {
        setHasVerifiedAdminClaim(false);
      }
    });
    return () => unsub();
  }, []);

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
    await deleteOpportunityApi(authToken, jobId);
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
        refreshApplications,
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
