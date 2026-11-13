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
  INITIAL_USER, 
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
  deleteOpportunityApi,
  fetchNotificationsApi,
  markNotificationReadApi
} from '../services/api';
import {
  auth,
  onAuthStateChanged,
  getFirebaseCustomClaims,
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
  updateJob: (jobId: string, updated: Partial<Job>) => void;
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
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register' | 'forgot';
  openAuthModal: (mode?: 'login' | 'register' | 'forgot') => void;
  closeAuthModal: () => void;
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

export function normalizeUserProfile(rawUser: any): UserProfile {
  if (!rawUser) return INITIAL_USER;
  return {
    ...INITIAL_USER,
    ...rawUser,
    skills: Array.isArray(rawUser.skills) && rawUser.skills.length > 0 ? rawUser.skills : INITIAL_USER.skills,
    interests: Array.isArray(rawUser.interests) && rawUser.interests.length > 0 ? rawUser.interests : INITIAL_USER.interests,
    enrolledCourses: Array.isArray(rawUser.enrolledCourses) ? rawUser.enrolledCourses : INITIAL_USER.enrolledCourses,
    savedJobIds: Array.isArray(rawUser.savedJobIds) ? rawUser.savedJobIds : (INITIAL_USER.savedJobIds || []),
    badges: Array.isArray(rawUser.badges) && rawUser.badges.length > 0 ? rawUser.badges : INITIAL_USER.badges,
    streakDays: typeof rawUser.streakDays === 'number' ? rawUser.streakDays : (INITIAL_USER.streakDays || 5),
    xpPoints: typeof rawUser.xpPoints === 'number' ? rawUser.xpPoints : (INITIAL_USER.xpPoints || 1250),
    location: rawUser.location || INITIAL_USER.location,
    resumeFileName: rawUser.resumeFileName || INITIAL_USER.resumeFileName,
    resumeText: rawUser.resumeText || INITIAL_USER.resumeText,
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('ym_user');
      return saved ? normalizeUserProfile(JSON.parse(saved)) : INITIAL_USER;
    } catch {
      return INITIAL_USER;
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

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'forgot'>('login');

  const [hasVerifiedAdminClaim, setHasVerifiedAdminClaim] = useState<boolean>(false);

  const isAuthenticated = Boolean(authToken && user);
  const isRecruiter = user.role === 'recruiter';
  const isExperienced = user.role === 'experienced';
  const isCollege = user.role === 'college';
  const isAdmin = user.role === 'admin' && hasVerifiedAdminClaim;
  const role = user.role;

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      title: 'Application Shortlisted! 🎉',
      message: 'BharatTech Innovations has shortlisted your application for Frontend React Developer Intern.',
      date: '1 hour ago',
      type: 'application',
      read: false,
      actionTab: 'applications'
    },
    {
      id: 'notif-2',
      title: '🔥 5-Day Study Streak Active',
      message: 'Keep going! Complete 1 module today to reach a 6-day streak and earn +50 XP.',
      date: '3 hours ago',
      type: 'streak',
      read: false,
      actionTab: 'courses'
    },
    {
      id: 'notif-3',
      title: 'New Nearby Tech Internship',
      message: 'DataVyuha Labs posted Python & AI Operations Intern (12 km away).',
      date: 'Yesterday',
      type: 'job',
      read: true,
      actionTab: 'jobs'
    }
  ]);

  // Load live opportunities from backend
  const refreshOpportunities = async () => {
    try {
      const data = await fetchOpportunitiesApi();
      if (Array.isArray(data?.opportunities) && data.opportunities.length > 0) {
        setJobs(data.opportunities);
      }
    } catch (err) {
      console.warn('Backend opportunities fetch skipped, using cached/mock:', err);
    }
  };

  // Load live applications from backend
  const refreshApplications = async () => {
    try {
      const data = await fetchApplicationsApi({ candidateEmail: user.email });
      if (Array.isArray(data?.applications)) {
        setApplications(data.applications);
      }
    } catch (err) {
      console.warn('Backend applications fetch skipped, using cached/mock:', err);
    }
  };

  // Load live notifications
  const refreshNotifications = async () => {
    try {
      const data = await fetchNotificationsApi(authToken || undefined, user.role);
      if (Array.isArray(data?.notifications) && data.notifications.length > 0) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    refreshOpportunities();
    if (user?.email) {
      refreshApplications();
    }
    refreshNotifications();
  }, [user?.email, user?.role]);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('ym_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('ym_jobs', JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem('ym_applications', JSON.stringify(applications));
  }, [applications]);

  useEffect(() => {
    localStorage.setItem('ym_certificates', JSON.stringify(certificates));
  }, [certificates]);

  useEffect(() => {
    localStorage.setItem('ym_language', language);
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
    setIsAuthModalOpen(false);

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
    setHasVerifiedAdminClaim(false);
    localStorage.removeItem('ym_auth_token');
    localStorage.removeItem('ym_user');
    setActiveTab('home');
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
      window.history.replaceState({}, '', '/');
    }
  };

  const openAuthModal = (mode: 'login' | 'register' | 'forgot' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  // Monitor Firebase Auth custom claims (strict server-verified admin claim check)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && fbUser.emailVerified) {
        try {
          const claims = await getFirebaseCustomClaims(false);
          setHasVerifiedAdminClaim(claims.admin === true);
        } catch {
          setHasVerifiedAdminClaim(false);
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
            const restored = normalizeUserProfile(data.user);
            if (restored.role === 'admin') {
              // Admin session also requires verified Firebase custom claim on current auth user
              const fbUser = auth.currentUser;
              if (fbUser && fbUser.emailVerified) {
                const claims = await getFirebaseCustomClaims(false).catch(() => ({}));
                if ((claims as any).admin === true) {
                  setHasVerifiedAdminClaim(true);
                  setUser(restored);
                  setActiveTab('admin');
                  return;
                }
              }
              // Even if Firebase client hasn't finished restoring, token came from server /api/auth/admin-verify
              setUser(restored);
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

    const newApp: Application = {
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

    setApplications(prev => [newApp, ...prev]);

    // Send to backend
    try {
      await applyOpportunityApi(authToken, {
        jobId: job.id,
        coverLetter,
        matchScore: eligibilityScore || 80,
        candidateEmail: user.email,
        candidateName: user.name
      });
    } catch (err) {
      console.warn('Backend apply call logged/fallback:', err);
    }

    // Give XP and streak bonus
    updateUser({
      xpPoints: user.xpPoints + 100,
      badges: user.badges.includes('Job Hunter') ? user.badges : [...user.badges, 'Job Hunter']
    });

    // Add notification
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
    setApplications(prev =>
      prev.map(app => (app.id === appId ? { ...app, status, ...(details || {}) } : app))
    );

    try {
      await updateApplicationStatusApi(authToken, appId, {
        status,
        ...(details || {})
      });
    } catch (err) {
      console.warn('Backend application status update logged/fallback:', err);
    }
  };

  const addJob = async (jobData: Omit<Job, 'id' | 'postedDate' | 'applicantsCount'>): Promise<boolean> => {
    try {
      const res = await postOpportunityApi(authToken, jobData);
      if (res?.opportunity) {
        setJobs(prev => [res.opportunity, ...prev]);
        return true;
      }
    } catch (err) {
      console.warn('Backend postOpportunity fallback:', err);
    }

    // Local fallback
    const newJob: Job = {
      ...jobData,
      id: `job-${Date.now()}`,
      postedDate: 'Just now',
      applicantsCount: 0,
    };
    setJobs(prev => [newJob, ...prev]);
    return true;
  };

  const updateJob = (jobId: string, updated: Partial<Job>) => {
    setJobs(prev =>
      prev.map(job => (job.id === jobId ? { ...job, ...updated } : job))
    );
  };

  const deleteJob = async (jobId: string) => {
    setJobs(prev => prev.filter(job => job.id !== jobId));
    try {
      if (authToken) {
        await deleteOpportunityApi(authToken, jobId);
      }
    } catch (err) {
      console.warn('Backend delete job failed:', err);
    }
  };

  const issueCertificate = (course: Course, scorePercentage: number): Certificate => {
    const code = `YM-2026-${Math.floor(1000 + Math.random() * 9000)}`;
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

    // Update user profile with enrolled course completion
    const existingEnrolled = user.enrolledCourses.find(e => e.courseId === course.id);
    const updatedEnrolled = existingEnrolled
      ? user.enrolledCourses.map(e => e.courseId === course.id ? { ...e, passed: true, finalScore: scorePercentage, certificateId: newCert.id } : e)
      : [...user.enrolledCourses, { courseId: course.id, completedModuleIds: course.modules.map(m => m.id), passed: true, finalScore: scorePercentage, certificateId: newCert.id }];

    updateUser({
      xpPoints: user.xpPoints + 350,
      enrolledCourses: updatedEnrolled,
      badges: user.badges.includes('Certified Champion') ? user.badges : [...user.badges, 'Certified Champion']
    });

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
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
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
