export type Language = 
  | 'English'
  | 'Hindi'
  | 'Marathi'
  | 'Gujarati'
  | 'Bengali'
  | 'Tamil'
  | 'Telugu'
  | 'Kannada'
  | 'Malayalam'
  | 'Punjabi'
  | 'Odia'
  | 'Urdu';

export type UserRole = 'student' | 'recruiter' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  photoUrl: string;
  education: string;
  institution: string;
  college?: string;
  course?: string;
  studyYear?: string;
  companyName?: string;
  designation?: string;
  adminLevel?: string;
  isVerified?: boolean;
  graduationYear: string;
  skills: string[];
  interests: string[];
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  resumeText: string;
  resumeFileName: string;
  streakDays: number;
  xpPoints: number;
  badges: string[];
  savedJobIds: string[];
  enrolledCourses: {
    courseId: string;
    completedModuleIds: string[];
    finalScore?: number;
    passed?: boolean;
    certificateId?: string;
  }[];
}

export interface AuthSession {
  token: string;
  user: UserProfile;
  expiresAt: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  event: string;
  identifier: string;
  role?: string;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED';
  ip?: string;
  details?: string;
}

export interface AdminStats {
  totalStudents: number;
  totalRecruiters: number;
  totalAdmins: number;
  totalJobs: number;
  totalApplications: number;
  totalCertificatesIssued: number;
  activeToday: number;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  city: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  type: 'internship' | 'part-time' | 'full-time' | 'remote';
  category: 'Tech' | 'Marketing' | 'Finance' | 'Design' | 'Government' | 'Operations' | 'Healthcare';
  stipend: string;
  stipendAmount: number; // for filtering
  duration: string;
  requiredSkills: string[];
  description: string;
  responsibilities: string[];
  perks: string[];
  deadline: string;
  applicantsCount: number;
  postedDate: string;
  isGovernmentSponsored?: boolean;
}

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  candidateSkills?: string[];
  candidateResumeText?: string;
  status: 'Applied' | 'Shortlisted' | 'Interview' | 'Selected' | 'Rejected';
  appliedDate: string;
  coverLetter?: string;
  matchScore?: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface CourseModule {
  id: string;
  title: string;
  durationMinutes: number;
  videoUrl?: string;
  content: string;
  keyTakeaways: string[];
  quiz: QuizQuestion[];
}

export interface Course {
  id: string;
  title: string;
  category: 'Tech' | 'Communication' | 'Digital Marketing' | 'Finance' | 'Design' | 'Soft Skills' | 'Government Exam Prep';
  thumbnail: string;
  durationHours: number;
  modulesCount: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  rating: number;
  enrolledCount: number;
  instructor: string;
  description: string;
  modules: CourseModule[];
  finalExam: QuizQuestion[];
  passMarkPercentage: number;
}

export interface Certificate {
  id: string;
  certificateCode: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  issueDate: string;
  scorePercentage: number;
  qrData: string;
  instructor: string;
}

export interface GovernmentScheme {
  id: string;
  title: string;
  ministry: string;
  description: string;
  eligibility: string[];
  benefits: string;
  applicationDeadline: string;
  applyUrl: string;
  category: 'Internship' | 'Skill Training' | 'Scholarship' | 'Loan & Support';
  stipendInfo?: string;
  badgeText?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  date: string;
  type: 'job' | 'course' | 'streak' | 'application';
  read: boolean;
  actionTab?: string;
}

export interface EligibilityResult {
  matchScore: number;
  status: 'Eligible' | 'Partially Eligible' | 'Not Eligible';
  summary: string;
  matchedSkills: string[];
  missingSkills: string[];
  suggestions: string[];
  recommendedCourseKeywords: string[];
}
