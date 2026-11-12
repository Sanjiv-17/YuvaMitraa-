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

export type UserRole = 'student' | 'college' | 'recruiter' | 'admin';

export interface StudentProject {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  liveLink?: string;
  githubLink?: string;
}

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
  collegeId?: string;
  branch?: string;
  course?: string;
  studyYear?: string;
  rollNumber?: string;
  cgpa?: string;
  graduationYear: string;
  age?: number;
  companyName?: string;
  designation?: string;
  cinOrRegistrationNumber?: string;
  industry?: string;
  companyWebsite?: string;
  collegeAisheCode?: string;
  collegeWebsite?: string;
  accreditation?: string;
  adminLevel?: string;
  isVerified?: boolean;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  verificationEvidence?: string;
  preferredRoles?: string[];
  skills: string[];
  interests: string[];
  projects?: StudentProject[];
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  resumeText: string;
  resumeFileName: string;
  resumeUrl?: string;
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

export interface CollegeProfile {
  id: string;
  name: string;
  aisheCode: string;
  email: string;
  phone: string;
  website: string;
  state: string;
  city: string;
  accreditation: string; // e.g. 'NAAC A++', 'NIRF Ranked #12', 'AICTE Approved'
  affiliatedUniversity?: string;
  contactPerson: string;
  designation: string;
  departments: string[];
  isVerified: boolean;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verificationNotes?: string;
  enrolledStudentsCount: number;
  activeDrivesCount: number;
  registeredAt: string;
}

export interface CompanyProfile {
  id: string;
  companyName: string;
  cinOrRegistration: string;
  officialEmail: string;
  phone: string;
  website: string;
  industry: string;
  companySize: string;
  headquarters: string;
  about: string;
  isVerified: boolean;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verificationEvidence?: string;
  activeJobsCount: number;
  registeredAt: string;
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
  totalColleges: number;
  totalRecruiters: number;
  totalAdmins: number;
  totalJobs: number;
  pendingOpportunities: number;
  pendingVerifications: number;
  totalApplications: number;
  totalPlaced: number;
  totalCertificatesIssued: number;
  activeToday: number;
}

export type OpportunitySource = 
  | 'Direct Employer'
  | 'College Placement Cell'
  | 'National Career Service (NCS)'
  | 'AICTE Portal'
  | 'IndianAPI Jobs'
  | 'Verified Partner'
  | string;

export interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  creatorId?: string;
  creatorRole?: 'recruiter' | 'college' | 'admin';
  collegeId?: string;
  targetColleges?: string[];
  location: string;
  city: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  type: 'internship' | 'part-time' | 'full-time' | 'remote';
  category: 'Tech' | 'Marketing' | 'Finance' | 'Design' | 'Government' | 'Operations' | 'Healthcare';
  stipend: string;
  stipendAmount: number;
  duration: string;
  requiredSkills: string[];
  eligibility?: string;
  description: string;
  responsibilities: string[];
  perks: string[];
  deadline: string;
  applicantsCount: number;
  postedDate: string;
  isVerified: boolean;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  verificationEvidence?: string;
  opportunitySource: OpportunitySource;
  externalSourceUrl?: string;
  originalUrl?: string;
  dateVerified?: string;
  isGovernmentSponsored?: boolean;
}

export type ApplicationStatus = 'Applied' | 'Under Review' | 'Shortlisted' | 'Interview' | 'Selected' | 'Rejected';

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  candidateId?: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  candidateCollege?: string;
  candidateBranch?: string;
  candidateGraduationYear?: string;
  candidateSkills?: string[];
  candidateResumeText?: string;
  candidateResumeUrl?: string;
  status: ApplicationStatus;
  appliedDate: string;
  updatedDate?: string;
  coverLetter?: string;
  matchScore?: number;
  interviewDate?: string;
  interviewTime?: string;
  interviewMode?: 'Online (Google Meet/Zoom)' | 'In-Person / Campus';
  interviewLinkOrVenue?: string;
  recruiterFeedback?: string;
  notes?: string;
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
  userId?: string;
  targetRole?: UserRole | 'all';
  title: string;
  message: string;
  date: string;
  type: 'job' | 'course' | 'streak' | 'application' | 'interview' | 'announcement' | 'verification';
  read: boolean;
  actionTab?: string;
  actionPayload?: any;
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

export interface ReportedJob {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  reportedByEmail: string;
  reason: string;
  details?: string;
  reportedAt: string;
  status: 'pending' | 'resolved' | 'dismissed';
}

export interface VerificationRequestItem {
  id: string;
  entityId: string;
  entityType: 'college' | 'company' | 'opportunity';
  name: string;
  identifier: string; // AISHE or CIN
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  details: string;
  officialDocument?: string;
  actionNotes?: string;
}

export type VerifiedStatus = 'Pending verification' | 'Verified' | 'Expired' | 'Rejected' | 'Unavailable';
export type WorkMode = 'Remote' | 'On-site' | 'Hybrid';
export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract' | 'Internship';

export interface InternshipListing {
  id: string;
  title: string;
  companyName: string;
  description: string;
  eligibility: string;
  skills: string[];
  location: string;
  workMode: WorkMode;
  duration: string;
  stipend: string;
  applicationDeadline: string;
  applyUrl: string;
  sourceName: string;
  sourceUrl: string;
  sourceId: string;
  verifiedStatus: VerifiedStatus;
  lastVerifiedAt: string;
  createdAt: string;
  updatedAt: string;
  isGovernmentScheme?: boolean;
}

export interface JobListing {
  id: string;
  title: string;
  companyName: string;
  description: string;
  requiredSkills: string[];
  location: string;
  workMode: WorkMode;
  employmentType: EmploymentType;
  salary: string;
  applyUrl: string;
  sourceName: string;
  sourceUrl: string;
  sourceId: string;
  verifiedStatus: VerifiedStatus;
  lastVerifiedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DataSyncLog {
  id: string;
  sourceName: string;
  lastSyncAt: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'CONFIG_REQUIRED';
  fetchedCount: number;
  insertedCount: number;
  updatedCount: number;
  duplicateCount: number;
  errorMessage?: string;
}

export interface SourceAdapterInfo {
  id: string;
  name: string;
  type: 'internship' | 'job' | 'portal_gateway';
  status: 'CONNECTED' | 'CONFIG_REQUIRED' | 'PAUSED' | 'FAILED';
  enabled: boolean;
  requiresKey: boolean;
  isKeyConfigured: boolean;
  lastSyncAt: string;
  totalListings: number;
  officialPortalUrl: string;
  documentationUrl?: string;
  description: string;
}
