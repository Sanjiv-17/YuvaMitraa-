import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { initializeApp as initFirebaseAdminApp, getApps as getFirebaseAdminApps, cert } from 'firebase-admin/app';
import { getAuth as getFirebaseAdminAuth } from 'firebase-admin/auth';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { SyncEngine } from './src/services/dataIntegration/SyncEngine';
import { parseCompensationAmount } from './src/services/dataIntegration/textUtils';
import { matchJobWithStudentProfile } from './src/utils/opportunityFilter';
import { InternshipListing, JobListing, Job } from './src/types/index';
import {
  jobToCandidate,
  rankInternshipsForStudent,
  UnifiedInternshipCandidate,
} from './src/services/matchingEngine';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUTHORIZED_ADMIN_EMAIL = 'sanjivsanju017@gmail.com';
let cfgProjectId = '';
try {
  const cfgPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    if (cfg.projectId) cfgProjectId = cfg.projectId;
  }
} catch {
  // fallback to default project id
}
const firebaseProjectId =
  cfgProjectId ||
  process.env.FIREBASE_PROJECT_ID ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  'euphoric-blueprint-f7cdj';
const allowedProjectIds = Array.from(
  new Set([
    cfgProjectId,
    firebaseProjectId,
    process.env.FIREBASE_PROJECT_ID,
    process.env.VITE_FIREBASE_PROJECT_ID,
  ].filter(Boolean) as string[])
);

const hasExplicitAdminCreds = Boolean(
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_KEY
);
let adminSdkCredentialMissing = !hasExplicitAdminCreds;

try {
  if (getFirebaseAdminApps().length === 0) {
    const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountRaw) {
      initFirebaseAdminApp({
        credential: cert(JSON.parse(serviceAccountRaw)),
        projectId: firebaseProjectId,
      });
    } else {
      initFirebaseAdminApp({
        projectId: firebaseProjectId,
      });
    }
  }
} catch (adminInitErr: any) {
  adminSdkCredentialMissing = true;
  console.warn('[FirebaseAdmin] Initialization notice:', adminInitErr?.message || adminInitErr);
}

let cachedGoogleCerts: { certs: Record<string, string>; expiresAt: number } | null = null;
let inflightCertsPromise: Promise<Record<string, string>> | null = null;

async function getGooglePublicCerts(): Promise<Record<string, string>> {
  if (cachedGoogleCerts && Date.now() < cachedGoogleCerts.expiresAt) {
    return cachedGoogleCerts.certs;
  }
  if (inflightCertsPromise) {
    return inflightCertsPromise;
  }
  inflightCertsPromise = (async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    try {
      const resp = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com', {
        signal: controller.signal,
      });
      if (!resp.ok) {
        throw new Error('Failed to fetch Firebase public certificates.');
      }
      const cacheControl = resp.headers.get('cache-control') || '';
      const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
      const maxAgeMs = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 3600 * 1000;
      const certs = (await resp.json()) as Record<string, string>;
      cachedGoogleCerts = { certs, expiresAt: Date.now() + maxAgeMs };
      return certs;
    } finally {
      clearTimeout(timeoutId);
      inflightCertsPromise = null;
    }
  })();
  return inflightCertsPromise;
}

// Pre-warm Google public certificates asynchronously so first Firebase login verifies in <1ms
getGooglePublicCerts().catch(() => {});

async function verifyFirebaseIdToken(idToken: string): Promise<Record<string, any>> {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Missing Firebase ID token.');
  }
  if (!adminSdkCredentialMissing) {
    try {
      return await getFirebaseAdminAuth().verifyIdToken(idToken);
    } catch (adminErr: any) {
      const code = adminErr?.code || '';
      const msg = String(adminErr?.message || '');
      const isCredentialOrConfigErr =
        code === 'app/no-credential' ||
        msg.includes('Could not load the default credentials') ||
        msg.includes('Failed to determine project ID') ||
        msg.includes('ENOTFOUND') ||
        msg.includes('metadata');
      if (!isCredentialOrConfigErr && code.startsWith('auth/')) {
        throw adminErr;
      }
      if (isCredentialOrConfigErr) {
        adminSdkCredentialMissing = true;
      }
    }
  }

  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid Firebase ID token format.');
  }
  const [headerB64, payloadB64, sigB64] = parts;
  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Invalid Firebase token header.');
  }
  const certs = await getGooglePublicCerts();
  const cert = certs[header.kid];
  if (!cert) {
    throw new Error('Firebase token signing key not recognized.');
  }
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  const isValidSig = verifier.verify(cert, Buffer.from(sigB64, 'base64url'));
  if (!isValidSig) {
    throw new Error('Invalid Firebase ID token signature.');
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (!allowedProjectIds.includes(payload.aud)) {
    throw new Error('Firebase token audience mismatch.');
  }
  const expectedIssuers = allowedProjectIds.map(id => `https://securetoken.google.com/${id}`);
  if (!expectedIssuers.includes(payload.iss)) {
    throw new Error('Firebase token issuer mismatch.');
  }
  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Firebase token subject missing.');
  }
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) {
    throw new Error('Firebase ID token has expired.');
  }
  return { ...payload, uid: payload.sub };
}

// Initialize Automatic Data Integration Sync Engine (6-hour refresh cycle by default)
const syncIntervalHours = Number(process.env.SYNC_INTERVAL || process.env.SYNC_INTERVAL_HOURS) || 6;
const syncEngine = SyncEngine.getInstance();
try {
  syncEngine.startScheduledSync(syncIntervalHours);
} catch (syncInitErr: any) {
  console.warn(`[SyncEngine] Non-blocking startup notice: ${syncInitErr.message}`);
}

const app = express();
// AI Studio dev environment requires the application to run on port 3000
const port = 3000;
const host = '0.0.0.0';

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health Check Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// ==========================================
// SECURITY & AUTHENTICATION INFRASTRUCTURE
// ==========================================

// Password Hashing with Salt using PBKDF2 (10,000 rounds)
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, generatedSalt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt: generatedSalt };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const checkHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return checkHash === hash;
}

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function generateOTP(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(String(otp).trim() + '::ym_otp_salt::').digest('hex');
}

// Secure Email Delivery Provider
function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function isSmsConfigured(): boolean {
  return Boolean(
    (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) ||
    (process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID)
  );
}

async function sendEmailOtp(toEmail: string, otpCode: string): Promise<{ delivered: boolean; providerNotConfigured?: boolean; info?: string }> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || '"YuvaMitraa" <noreply@yuvamitraa.gov.in>';

  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });
      await transporter.sendMail({
        from,
        to: toEmail,
        subject: `Your YuvaMitraa Verification Code: ${otpCode}`,
        text: `Your YuvaMitraa 6-digit verification code is: ${otpCode}\n\nThis OTP is valid for 5 minutes. Do not share this code with anyone.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #fed7aa; border-radius: 16px; background-color: #fffaf5;">
            <h2 style="color: #ea580c; text-align: center; margin: 0;">YuvaMitraa</h2>
            <p style="color: #64748b; font-size: 13px; text-align: center; margin: 4px 0 20px 0;">National Youth Career Gateway</p>
            <div style="background: white; padding: 20px; border-radius: 12px; border: 1px solid #fed7aa; text-align: center;">
              <p style="font-size: 14px; color: #334155; margin-bottom: 8px;">Your 6-Digit Email Verification Code is:</p>
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ea580c; padding: 12px 0;">
                ${otpCode}
              </div>
              <p style="font-size: 12px; color: #94a3b8; margin-top: 8px;">Valid for 5 minutes. If you did not request this code, please ignore this email.</p>
            </div>
          </div>
        `
      });
      return { delivered: true };
    } catch (err: any) {
      console.warn('[Email Warning] SMTP delivery failed:', err.message);
      return { delivered: false, info: err.message };
    }
  } else {
    console.warn(`[Email Service Notice] SMTP credentials are not configured; cannot deliver OTP to ${toEmail}.`);
    return { delivered: false, providerNotConfigured: true, info: 'SMTP credentials not configured in environment.' };
  }
}

async function sendEmailPasswordResetLink(toEmail: string, resetLink: string): Promise<{ delivered: boolean; providerNotConfigured?: boolean; info?: string }> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || '"YuvaMitraa" <noreply@yuvamitraa.gov.in>';

  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });
      await transporter.sendMail({
        from,
        to: toEmail,
        subject: 'Reset your YuvaMitraa password',
        text: `Hello,\n\nWe received a request to reset your YuvaMitraa password. Use the link below:\n\n${resetLink}\n\nThis link is valid for 1 hour. If you did not request this, you can ignore this email.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #fed7aa; border-radius: 16px; background-color: #fffaf5;">
            <h2 style="color: #ea580c; text-align: center; margin: 0;">YuvaMitraa</h2>
            <p style="color: #64748b; font-size: 13px; text-align: center; margin: 4px 0 20px 0;">National Youth Career Gateway</p>
            <div style="background: white; padding: 24px; border-radius: 12px; border: 1px solid #fed7aa; text-align: center;">
              <p style="font-size: 15px; color: #1e293b; font-weight: 600; margin-bottom: 8px;">Password Reset Request</p>
              <p style="font-size: 13px; color: #64748b; margin-bottom: 20px;">We received a request to reset your password. Click the button below to choose a new password.</p>
              <a href="${resetLink}" style="display: inline-block; background-color: #ea580c; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">Reset Password</a>
              <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">Or copy and paste this link:<br/><a href="${resetLink}" style="color: #ea580c; word-break: break-all;">${resetLink}</a></p>
            </div>
          </div>
        `
      });
      return { delivered: true };
    } catch (err: any) {
      console.warn('[Email Warning] SMTP password reset delivery failed:', err.message);
      return { delivered: false, info: err.message };
    }
  } else {
    console.warn(`[Email Service Notice] SMTP_HOST not configured; cannot deliver password reset link to ${toEmail}.`);
    return { delivered: false, providerNotConfigured: true, info: 'SMTP credentials not configured in environment.' };
  }
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '').slice(-10);
}

// User Record Interface
interface StudentProjectRecord {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  liveLink?: string;
  githubLink?: string;
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'student' | 'recruiter' | 'experienced' | 'college' | 'admin';
  currentRole?: string;
  yearsOfExperience?: string;
  passwordHash: string;
  passwordSalt: string;
  college?: string;
  collegeId?: string;
  branch?: string;
  course?: string;
  studyYear?: string;
  rollNumber?: string;
  cgpa?: string;
  graduationYear?: string;
  companyName?: string;
  designation?: string;
  cinOrRegistrationNumber?: string;
  industry?: string;
  companyWebsite?: string;
  collegeAisheCode?: string;
  collegeWebsite?: string;
  accreditation?: string;
  adminLevel?: string;
  isVerified: boolean;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  verificationEvidence?: string;
  status: 'active' | 'suspended';
  createdAt: string;
  lastLoginAt?: string;
  photoUrl: string;
  education?: string;
  institution?: string;
  skills?: string[];
  nonTechnicalSkills?: string[];
  interests?: string[];
  projects?: StudentProjectRecord[];
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  location?: string;
  preferredLocation?: string;
  workModePreference?: 'Online' | 'Offline' | 'Hybrid' | 'Any';
  age?: number;
  preferredRoles?: string[];
  preferredDomain?: string;
  careerGoals?: string;
  resumeFileName?: string;
  resumeText?: string;
  resumeUpdatedAt?: string;
  profileUpdatedAt?: string;
  updatedAt?: string;
  enrolledCourses?: Array<{ courseId: string; completedModuleIds: string[]; passed?: boolean; finalScore?: number; certificateId?: string }>;
  savedJobIds?: string[];
  badges?: string[];
  streakDays?: number;
  xpPoints?: number;
}

// Registered Users Store (populated exclusively through real registration and verified Firebase sessions)
const usersDatabase: UserRecord[] = [];

// Ecosystem Databases (Colleges, Companies, Jobs, Applications, Verification Requests, Notifications)
interface CollegeRecord {
  id: string;
  name: string;
  aisheCode: string;
  email: string;
  phone: string;
  website: string;
  state: string;
  city: string;
  accreditation: string;
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

const collegesDatabase: CollegeRecord[] = [
  {
    id: 'col-1',
    name: 'National Institute of Technology Delhi',
    aisheCode: 'U-0610',
    email: 'placement@nitdelhi.ac.in',
    phone: '+91 11 3386 1000',
    website: 'https://nitdelhi.ac.in',
    state: 'Delhi',
    city: 'New Delhi',
    accreditation: 'NIRF Ranked #51 | Institute of National Importance',
    contactPerson: 'Prof. R. Anand',
    designation: 'Head, Training & Placement Cell',
    departments: ['Computer Science & Engineering', 'Electronics & Communication', 'Mechanical Engineering', 'Electrical Engineering'],
    isVerified: true,
    verificationStatus: 'verified',
    verificationNotes: 'Official AISHE verification approved via Ministry of Education Portal',
    enrolledStudentsCount: 420,
    activeDrivesCount: 6,
    registeredAt: '2026-01-10T10:00:00Z'
  },
  {
    id: 'col-2',
    name: 'University of Delhi (North Campus)',
    aisheCode: 'U-0109',
    email: 'placements@du.ac.in',
    phone: '+91 11 2766 7011',
    website: 'https://du.ac.in',
    state: 'Delhi',
    city: 'New Delhi',
    accreditation: 'NAAC A++ | Central University',
    contactPerson: 'Dr. Sunita Kapoor',
    designation: 'Central Placement Officer',
    departments: ['Computer Science', 'Commerce & Economics', 'Mathematical Sciences', 'Management Studies'],
    isVerified: true,
    verificationStatus: 'verified',
    verificationNotes: 'Central University accredited verification confirmed',
    enrolledStudentsCount: 1850,
    activeDrivesCount: 12,
    registeredAt: '2026-01-12T10:00:00Z'
  },
  {
    id: 'col-3',
    name: 'Anna University College of Engineering, Guindy',
    aisheCode: 'U-0436',
    email: 'cuic.annauniv@gmail.com',
    phone: '+91 44 2235 7000',
    website: 'https://annauniv.edu',
    state: 'Tamil Nadu',
    city: 'Chennai',
    accreditation: 'NAAC A++ | State Technological University',
    contactPerson: 'Dr. K. Senthil Kumar',
    designation: 'Director, Centre for University-Industry Collaboration',
    departments: ['Information Technology', 'Computer Technology', 'Mechanical', 'Bio-Medical'],
    isVerified: true,
    verificationStatus: 'verified',
    verificationNotes: 'Verified state university portal integration',
    enrolledStudentsCount: 960,
    activeDrivesCount: 8,
    registeredAt: '2026-01-18T10:00:00Z'
  }
];

interface CompanyRecord {
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

const companiesDatabase: CompanyRecord[] = [
  {
    id: 'comp-1',
    companyName: 'BharatTech Innovations',
    cinOrRegistration: 'U72200DL2021PTC384729',
    officialEmail: 'hr@bharattech.com',
    phone: '+91 11 4982 3300',
    website: 'https://bharattech.com',
    industry: 'Financial Technology & Software',
    companySize: '250-500 employees',
    headquarters: 'Okhla Phase III, New Delhi',
    about: 'Leading homegrown fintech building inclusive payment systems and digital loan underwriting technology for semi-urban enterprises.',
    isVerified: true,
    verificationStatus: 'verified',
    verificationEvidence: 'CIN Verified: U72200DL2021PTC384729 (Ministry of Corporate Affairs Gateway)',
    activeJobsCount: 3,
    registeredAt: '2026-01-10T10:00:00Z'
  },
  {
    id: 'comp-2',
    companyName: 'DataVyuha Labs',
    cinOrRegistration: 'U72900UP2022PTC164821',
    officialEmail: 'talent@datavyuha.ai',
    phone: '+91 120 4882 100',
    website: 'https://datavyuha.ai',
    industry: 'AI & Data Engineering',
    companySize: '50-100 employees',
    headquarters: 'Noida Sector 62, Uttar Pradesh',
    about: 'Specialized enterprise AI labs developing large language model agents and automated analytics pipelines for Indian government & enterprises.',
    isVerified: true,
    verificationStatus: 'verified',
    verificationEvidence: 'Startup India Certified: DIPP94812 & MCA Registered',
    activeJobsCount: 2,
    registeredAt: '2026-02-01T10:00:00Z'
  },
  {
    id: 'comp-3',
    companyName: 'Tata Consultancy Services (TCS Youth Gateway)',
    cinOrRegistration: 'L22210MH1995PLC084781',
    officialEmail: 'campus.careers@tcs.com',
    phone: '+91 22 6778 9999',
    website: 'https://tcs.com',
    industry: 'Information Technology & Consulting',
    companySize: '500,000+ employees',
    headquarters: 'Mumbai, Maharashtra',
    about: 'Global technology transformation leader providing verified entry-level internships and skill acceleration programs across Indian campuses.',
    isVerified: true,
    verificationStatus: 'verified',
    verificationEvidence: 'Public Listed Corporate CIN: L22210MH1995PLC084781 (BSE/NSE Verified)',
    activeJobsCount: 5,
    registeredAt: '2026-01-05T10:00:00Z'
  }
];

interface JobRecord {
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
  coordinates: { lat: number; lng: number };
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
  opportunitySource:
    | 'Direct Employer'
    | 'College Placement Cell'
    | 'National Career Service (NCS)'
    | 'AICTE Portal'
    | 'IndianAPI Jobs'
    | 'Arbeitnow'
    | 'Remotive'
    | 'Firestore Verified'
    | 'Verified Partner'
    | string;
  externalSourceUrl?: string;
  originalUrl?: string;
  dateVerified?: string;
  isGovernmentSponsored?: boolean;
}

// Live recruiter/college/admin-submitted opportunities only (never hardcoded fake or demo internships)
const LEGACY_DEMO_JOB_IDS = new Set(['job-1', 'job-2', 'job-3', 'job-4']);
const jobsDatabase: JobRecord[] = [];

interface ApplicationRecord {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  candidateCollege?: string;
  candidateBranch?: string;
  candidateGraduationYear?: string;
  candidateSkills?: string[];
  candidateResumeText?: string;
  candidateResumeUrl?: string;
  status: 'Applied' | 'Under Review' | 'Shortlisted' | 'Interview' | 'Selected' | 'Rejected';
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

const applicationsDatabase: ApplicationRecord[] = [];

interface NotificationRecord {
  id: string;
  userId?: string;
  targetRole?: 'student' | 'college' | 'recruiter' | 'admin' | 'all';
  title: string;
  message: string;
  date: string;
  type: 'job' | 'course' | 'streak' | 'application' | 'interview' | 'announcement' | 'verification';
  read: boolean;
  actionTab?: string;
  actionPayload?: any;
}

const notificationsDatabase: NotificationRecord[] = [];

interface CertificateRecord {
  id: string;
  userId: string;
  certificateCode: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  issueDate: string;
  scorePercentage: number;
  qrData: string;
  instructor: string;
  source: 'earned' | 'uploaded';
  issuer?: string;
  credentialUrl?: string;
  fileName?: string;
  createdAt: string;
}

const certificatesDatabase: CertificateRecord[] = [];

interface VerificationRequestRecord {
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

const verificationRequestsDatabase: VerificationRequestRecord[] = [
  {
    id: 'vreq-1',
    entityId: 'col-seed-pending',
    entityType: 'college',
    name: 'Government Engineering College Raipur',
    identifier: 'AISHE: C-44120',
    submittedAt: new Date(Date.now() - 172800000).toISOString(),
    status: 'pending',
    details: 'State Government engineering institution requesting official placement cell verification. AISHE code C-44120.',
    actionNotes: 'Awaiting administrator AISHE portal review.'
  },
  {
    id: 'vreq-2',
    entityId: 'comp-seed-pending',
    entityType: 'company',
    name: 'NextGen Agritech Solutions Pvt Ltd',
    identifier: 'CIN: U01100KA2023PTC178942',
    submittedAt: new Date(Date.now() - 86400000).toISOString(),
    status: 'pending',
    details: 'Bangalore-based Agri-fintech startup seeking corporate recruiter badge to post paid IoT & data internships.',
    actionNotes: 'MCA portal registration submitted.'
  }
];

// In-Memory Security & Session Stores
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds countdown

interface LoginAttemptRecord {
  count: number;
  lockedUntil?: number;
}

const loginAttempts = new Map<string, LoginAttemptRecord>();

interface OtpRecord {
  hash?: string;
  code?: string;
  identifier: string;
  expiresAt: number;
  lastSentAt: number;
  attempts: number;
  payload?: any;
}

const otpStore = new Map<string, OtpRecord>();

interface RegistrationSession {
  token: string;
  identifier: string;
  type: 'email' | 'mobile';
  expiresAt: number;
}

const registrationSessions = new Map<string, RegistrationSession>();

interface SessionRecord {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

const sessions = new Map<string, SessionRecord>();

interface AuditLog {
  id: string;
  timestamp: string;
  event: string;
  identifier: string;
  role?: string;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED';
  ip?: string;
  details?: string;
}

const auditLogs: AuditLog[] = [];
let certificatesIssuedCount = 0;

function recordAuditLog(event: string, identifier: string, status: 'SUCCESS' | 'FAILED' | 'BLOCKED', details?: string, role?: string, ip?: string) {
  auditLogs.unshift({
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    event,
    identifier,
    role,
    status,
    ip: ip || '127.0.0.1',
    details
  });
  if (auditLogs.length > 200) auditLogs.pop();
}

function sanitizeUser(user: UserRecord) {
  const { passwordHash, passwordSalt, ...safeUser } = user;
  return safeUser;
}

const CITY_COORDINATES: Array<{ keywords: string[]; coords: { lat: number; lng: number } }> = [
  { keywords: ['bengaluru', 'bangalore'], coords: { lat: 12.9716, lng: 77.5946 } },
  { keywords: ['mumbai', 'navi mumbai', 'thane'], coords: { lat: 19.0760, lng: 72.8777 } },
  { keywords: ['hyderabad', 'secunderabad'], coords: { lat: 17.3850, lng: 78.4867 } },
  { keywords: ['chennai'], coords: { lat: 13.0827, lng: 80.2707 } },
  { keywords: ['pune'], coords: { lat: 18.5204, lng: 73.8567 } },
  { keywords: ['kolkata'], coords: { lat: 22.5726, lng: 88.3639 } },
  { keywords: ['noida', 'greater noida'], coords: { lat: 28.5355, lng: 77.3910 } },
  { keywords: ['gurugram', 'gurgaon'], coords: { lat: 28.4595, lng: 77.0266 } },
  { keywords: ['ahmedabad'], coords: { lat: 23.0225, lng: 72.5714 } },
  { keywords: ['jaipur'], coords: { lat: 26.9124, lng: 75.7873 } },
  { keywords: ['mysuru', 'mysore'], coords: { lat: 12.2958, lng: 76.6394 } },
  { keywords: ['mangaluru', 'mangalore'], coords: { lat: 12.9141, lng: 74.8560 } },
  { keywords: ['hubballi', 'hubli', 'dharwad'], coords: { lat: 15.3647, lng: 75.1240 } },
  { keywords: ['chandigarh', 'mohali'], coords: { lat: 30.7333, lng: 76.7794 } },
  { keywords: ['kochi', 'ernakulam'], coords: { lat: 9.9312, lng: 76.2673 } },
  { keywords: ['indore'], coords: { lat: 22.7196, lng: 75.8577 } },
  { keywords: ['bhopal'], coords: { lat: 23.2599, lng: 77.4126 } },
  { keywords: ['lucknow'], coords: { lat: 26.8467, lng: 80.9462 } },
  { keywords: ['patna'], coords: { lat: 25.5941, lng: 85.1376 } },
  { keywords: ['raipur'], coords: { lat: 21.2514, lng: 81.6296 } },
  { keywords: ['bhubaneswar'], coords: { lat: 20.2961, lng: 85.8245 } },
  { keywords: ['thiruvananthapuram', 'trivandrum'], coords: { lat: 8.5241, lng: 76.9366 } },
  { keywords: ['coimbatore'], coords: { lat: 11.0168, lng: 76.9558 } },
  { keywords: ['nagpur'], coords: { lat: 21.1458, lng: 79.0882 } },
  { keywords: ['delhi', 'new delhi', 'ncr'], coords: { lat: 28.6139, lng: 77.2090 } },
];

function resolveIndianCityCoordinates(location?: string): { lat: number; lng: number } {
  const lower = String(location || '').toLowerCase();
  for (const entry of CITY_COORDINATES) {
    if (entry.keywords.some(k => lower.includes(k))) {
      return entry.coords;
    }
  }
  return { lat: 20.5937, lng: 78.9629 };
}

async function authenticateRequest(req: Request): Promise<UserRecord | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  const session = sessions.get(token);
  if (session && Date.now() <= session.expiresAt) {
    const u = usersDatabase.find(user => user.id === session.userId);
    if (u && u.status !== 'suspended') return u;
  } else if (session) {
    sessions.delete(token);
  }

  try {
    const decoded = await verifyFirebaseIdToken(token);
    const decodedEmail = String(decoded.email || '').toLowerCase();
    const u = usersDatabase.find(
      user => user.id === decoded.uid || (decodedEmail && user.email.toLowerCase() === decodedEmail)
    );
    if (u && u.status !== 'suspended') return u;
  } catch {
    return null;
  }
  return null;
}

const DATA_DIR = path.resolve(__dirname, '.data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

function loadStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.users)) {
      usersDatabase.splice(0, usersDatabase.length, ...parsed.users);
    }
    if (Array.isArray(parsed.colleges)) {
      collegesDatabase.splice(0, collegesDatabase.length, ...parsed.colleges);
    }
    if (Array.isArray(parsed.companies)) {
      companiesDatabase.splice(0, companiesDatabase.length, ...parsed.companies);
    }
    if (Array.isArray(parsed.jobs)) {
      const genuineJobs = parsed.jobs.filter((j: any) => j && j.id && !LEGACY_DEMO_JOB_IDS.has(String(j.id)));
      jobsDatabase.splice(0, jobsDatabase.length, ...genuineJobs);
    }
    if (Array.isArray(parsed.applications)) {
      applicationsDatabase.splice(0, applicationsDatabase.length, ...parsed.applications);
    }
    if (Array.isArray(parsed.notifications)) {
      notificationsDatabase.splice(0, notificationsDatabase.length, ...parsed.notifications);
    }
    if (Array.isArray(parsed.verificationRequests)) {
      verificationRequestsDatabase.splice(0, verificationRequestsDatabase.length, ...parsed.verificationRequests);
    }
    if (Array.isArray(parsed.auditLogs)) {
      auditLogs.splice(0, auditLogs.length, ...parsed.auditLogs.slice(0, 200));
    }
    if (Array.isArray(parsed.sessions)) {
      const now = Date.now();
      sessions.clear();
      for (const s of parsed.sessions) {
        if (s && s.token && s.userId && s.expiresAt > now) {
          sessions.set(s.token, s);
        }
      }
    }
    if (Array.isArray(parsed.certificates)) {
      certificatesDatabase.splice(0, certificatesDatabase.length, ...parsed.certificates);
    }
    if (typeof parsed.certificatesIssuedCount === 'number') {
      certificatesIssuedCount = parsed.certificatesIssuedCount;
    }
  } catch (err: any) {
    console.warn('[Store] Failed to load persisted store:', err?.message || err);
  }
}

let isStoreWriteInFlight = false;
let isStoreWriteQueued = false;
let storeSaveTimer: ReturnType<typeof setTimeout> | null = null;

async function flushStoreAsync() {
  if (isStoreWriteInFlight) {
    isStoreWriteQueued = true;
    return;
  }
  isStoreWriteInFlight = true;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      await fs.promises.mkdir(DATA_DIR, { recursive: true });
    }
    const payload = {
      users: usersDatabase,
      colleges: collegesDatabase,
      companies: companiesDatabase,
      jobs: jobsDatabase,
      applications: applicationsDatabase,
      notifications: notificationsDatabase,
      verificationRequests: verificationRequestsDatabase,
      auditLogs: auditLogs.slice(0, 200),
      sessions: Array.from(sessions.values()).filter(s => s.expiresAt > Date.now()),
      certificates: certificatesDatabase,
      certificatesIssuedCount,
      reportedJobs: typeof reportedJobsStore !== 'undefined' ? reportedJobsStore : [],
    };
    const tmpFile = `${DATA_FILE}.${process.pid}.tmp`;
    await fs.promises.writeFile(tmpFile, JSON.stringify(payload), 'utf8');
    await fs.promises.rename(tmpFile, DATA_FILE);
  } catch (err: any) {
    console.warn('[Store] Failed to save persisted store:', err?.message || err);
  } finally {
    isStoreWriteInFlight = false;
    if (isStoreWriteQueued) {
      isStoreWriteQueued = false;
      void flushStoreAsync();
    }
  }
}

function saveStore() {
  if (storeSaveTimer) return;
  storeSaveTimer = setTimeout(() => {
    storeSaveTimer = null;
    void flushStoreAsync();
  }, 50);
}

loadStore();

// Build strictly UID- and role-scoped initial session payload in one round-trip
function buildUserInitialData(user: UserRecord) {
  const userCerts = certificatesDatabase.filter(c => c.userId === user.id);

  let userApps = applicationsDatabase;
  if (user.role === 'student' || user.role === 'experienced') {
    const emailLower = user.email.toLowerCase();
    userApps = applicationsDatabase.filter(
      a => a.candidateId === user.id || (!a.candidateId && a.candidateEmail.toLowerCase() === emailLower)
    );
  } else if (user.role === 'recruiter') {
    const ownedJobIds = new Set(jobsDatabase.filter(j => j.creatorId === user.id).map(j => j.id));
    const companyLower = (user.companyName || '').toLowerCase();
    userApps = applicationsDatabase.filter(
      a => ownedJobIds.has(a.jobId) || (companyLower && a.company.toLowerCase() === companyLower)
    );
  } else if (user.role === 'college') {
    const userCollegeLower = (user.college || '').toLowerCase();
    userApps = userCollegeLower
      ? applicationsDatabase.filter(a => a.candidateCollege?.toLowerCase().includes(userCollegeLower))
      : [];
  }

  const userNotifs = notificationsDatabase.filter(n => {
    if (n.userId) return n.userId === user.id;
    return n.targetRole === 'all' || n.targetRole === user.role;
  });

  return {
    certificates: userCerts,
    applications: userApps,
    notifications: userNotifs,
  };
}

// ------------------------------------------
// AUTH API ENDPOINTS
// ------------------------------------------

// 0a. Direct User Registration (Email and Password, No OTP)
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { name, email, password, confirmPassword, role = 'student', college, course, location, firebaseUid } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Full Name is required.' });
    }

    if (!email || !String(email).trim()) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required.' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match. Please re-enter your password.' });
    }

    // Check if account already exists
    const existing = usersDatabase.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return res.status(400).json({ 
        error: 'An account with this email address already exists. Please sign in instead.' 
      });
    }

    // Enforce strict public role whitelist: only student, recruiter, or experienced
    if (role !== 'student' && role !== 'recruiter' && role !== 'experienced') {
      recordAuditLog('UNAUTHORIZED_ROLE_SIGNUP', cleanEmail, 'BLOCKED', `Blocked unauthorized role registration attempt: ${String(role)}`, undefined, clientIp);
      return res.status(403).json({
        code: 'auth/unauthorized-role',
        error: 'Unauthorized role selection. Please select Student, Recruiter, or Experienced Candidate.'
      });
    }

    // Hash password with PBKDF2
    const { hash, salt } = hashPassword(String(password));
    const newUserId = firebaseUid || `usr-${Date.now()}`;
    const selectedRole: 'student' | 'recruiter' | 'experienced' = role;

    const isPendingRole = selectedRole === 'recruiter';
    const isAutoVerified = selectedRole === 'student' || selectedRole === 'experienced';

    const newUser: UserRecord = {
      id: newUserId,
      name: String(name).trim(),
      email: cleanEmail,
      phone: req.body.phone ? normalizePhone(req.body.phone) : '',
      role: selectedRole,
      currentRole: selectedRole === 'experienced' ? (req.body.currentRole?.trim() || '') : undefined,
      yearsOfExperience: selectedRole === 'experienced' ? (req.body.yearsOfExperience?.trim() || '') : undefined,
      passwordHash: hash,
      passwordSalt: salt,
      college: college?.trim() || '',
      branch: req.body.branch?.trim() || undefined,
      course: course?.trim() || undefined,
      studyYear: req.body.studyYear || undefined,
      rollNumber: req.body.rollNumber?.trim() || '',
      cgpa: req.body.cgpa?.trim() || '',
      graduationYear: req.body.graduationYear || '',
      education: req.body.education || (selectedRole === 'experienced' ? 'Working Professional' : ''),
      institution: college?.trim() || '',
      companyName: selectedRole === 'recruiter' ? (req.body.companyName?.trim() || String(name).trim()) : undefined,
      cinOrRegistrationNumber: req.body.cinOrRegistrationNumber?.trim() || '',
      industry: req.body.industry?.trim() || '',
      companyWebsite: req.body.companyWebsite?.trim() || '',
      designation: req.body.designation?.trim() || (selectedRole === 'recruiter' ? 'HR / Talent Lead' : (selectedRole === 'experienced' ? (req.body.currentRole?.trim() || '') : undefined)),
      isVerified: isAutoVerified,
      verificationStatus: isAutoVerified ? 'verified' : 'pending',
      verificationEvidence: isAutoVerified ? 'Registered Account' : undefined,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      photoUrl: '',
      skills: Array.isArray(req.body.skills) ? req.body.skills : [],
      interests: Array.isArray(req.body.interests) ? req.body.interests : [],
      location: location?.trim() || 'India',
      preferredRoles: Array.isArray(req.body.preferredRoles) ? req.body.preferredRoles : [],
      enrolledCourses: [],
      savedJobIds: [],
      badges: isAutoVerified ? ['New Explorer'] : ['Pending Verification'],
      streakDays: 0,
      xpPoints: 0
    };

    usersDatabase.push(newUser);

    // Public signup no longer permits college role creation

    // If Recruiter / Company, register in companiesDatabase & submit verification request
    if (selectedRole === 'recruiter') {
      const companyRecord: CompanyRecord = {
        id: `comp-${Date.now()}`,
        companyName: newUser.companyName || newUser.name,
        cinOrRegistration: newUser.cinOrRegistrationNumber || 'CIN-PENDING',
        officialEmail: cleanEmail,
        phone: newUser.phone || '+91 11 0000 0000',
        website: newUser.companyWebsite || 'https://company.com',
        industry: newUser.industry || 'Information Technology',
        companySize: req.body.companySize || '50-200 employees',
        headquarters: location?.trim() || 'New Delhi, India',
        about: req.body.about || `${newUser.companyName} official recruitment account on YuvaMitraa.`,
        isVerified: false,
        verificationStatus: 'pending',
        activeJobsCount: 0,
        registeredAt: new Date().toISOString()
      };
      companiesDatabase.push(companyRecord);

      verificationRequestsDatabase.unshift({
        id: `vreq-${Date.now()}`,
        entityId: companyRecord.id,
        entityType: 'company',
        name: companyRecord.companyName,
        identifier: companyRecord.cinOrRegistration,
        submittedAt: new Date().toISOString(),
        status: 'pending',
        details: `New employer registered: ${companyRecord.companyName} (${cleanEmail}). CIN: ${companyRecord.cinOrRegistration}.`
      });

      notificationsDatabase.unshift({
        id: `notif-${Date.now()}`,
        targetRole: 'admin',
        title: 'New Company Verification Request',
        message: `${companyRecord.companyName} registered with CIN ${companyRecord.cinOrRegistration}. Review for verified badge.`,
        date: 'Just now',
        type: 'verification',
        read: false,
        actionTab: 'admin'
      });
    }

    // Create session token
    const token = generateSessionToken();
    sessions.set(token, {
      token,
      userId: newUser.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
    });

    recordAuditLog('USER_REGISTER', cleanEmail, 'SUCCESS', `New user registered as ${newUser.role}`, newUser.role, clientIp);
    saveStore();

    const welcomeMsg = isPendingRole 
      ? `Welcome to YuvaMitraa, ${newUser.name}! Your ${selectedRole} profile has been submitted for official verification.`
      : `Welcome to YuvaMitraa, ${newUser.name}! Your account is now active.`;

    return res.json({
      success: true,
      token,
      user: sanitizeUser(newUser),
      role: newUser.role,
      isNewUser: true,
      initialData: buildUserInitialData(newUser),
      message: welcomeMsg
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server registration error. Please try again.' });
  }
});

// 0b. Send Secure Password Reset Link via Email
app.post('/api/auth/send-password-reset-link', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!email || !String(email).trim()) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    if (!isEmailConfigured()) {
      return res.status(503).json({
        error: 'Email delivery service (SMTP) is not configured on this server. Please use Firebase Forgot Password.'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = usersDatabase.find(u => u.email.toLowerCase() === cleanEmail);

    const hostHeader = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const resetLink = `${protocol}://${hostHeader}/?reset_email=${encodeURIComponent(cleanEmail)}`;

    if (user) {
      const mailResult = await sendEmailPasswordResetLink(cleanEmail, resetLink);
      if (!mailResult.delivered) {
        return res.status(503).json({ error: 'Failed to dispatch reset email. Please try again later.' });
      }
      recordAuditLog('PASSWORD_RESET_LINK_SENT', cleanEmail, 'SUCCESS', 'Password reset email link dispatched', user.role, clientIp);
    } else {
      recordAuditLog('PASSWORD_RESET_LINK_NOT_FOUND', cleanEmail, 'FAILED', 'Password reset requested for unregistered email', undefined, clientIp);
    }

    return res.json({
      success: true,
      message: `If an account exists with ${cleanEmail}, a secure password reset link has been dispatched to your inbox.`
    });
  } catch (error: any) {
    console.error('Password reset link dispatch error:', error);
    return res.status(500).json({ error: 'Failed to process password reset request.' });
  }
});

// 1. User Login (Email or Mobile + Password)
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { identifier, password, rememberMe } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email or Mobile Number and Password are required.' });
    }

    const cleanIdentifier = String(identifier).trim().toLowerCase();
    const cleanPhone = normalizePhone(cleanIdentifier);

    // Check Lockout Status
    const attemptRecord = loginAttempts.get(cleanIdentifier);
    if (attemptRecord && attemptRecord.lockedUntil && attemptRecord.lockedUntil > Date.now()) {
      const remainingSeconds = Math.ceil((attemptRecord.lockedUntil - Date.now()) / 1000);
      recordAuditLog('LOGIN_BLOCKED', cleanIdentifier, 'BLOCKED', `Account locked. Remaining seconds: ${remainingSeconds}`, undefined, clientIp);
      return res.status(429).json({
        error: `Account temporarily locked due to consecutive failed attempts. Please wait ${remainingSeconds} seconds before trying again.`,
        locked: true,
        remainingSeconds
      });
    }

    // Find User by Email or Mobile
    const user = usersDatabase.find(u => 
      u.email.toLowerCase() === cleanIdentifier || 
      normalizePhone(u.phone) === cleanPhone
    );

    if (!user) {
      // Record failed attempt
      const count = (attemptRecord ? attemptRecord.count : 0) + 1;
      let lockedUntil: number | undefined;
      if (count >= MAX_FAILED_ATTEMPTS) {
        lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      }
      loginAttempts.set(cleanIdentifier, { count, lockedUntil });
      recordAuditLog('LOGIN_FAILED', cleanIdentifier, 'FAILED', 'Account not found', undefined, clientIp);

      return res.status(401).json({
        code: 'auth/user-not-found',
        error: 'No account found with this email address.',
        notFound: true
      });
    }

    if (user.status === 'suspended') {
      recordAuditLog('LOGIN_BLOCKED', cleanIdentifier, 'BLOCKED', 'Account suspended by administrator', user.role, clientIp);
      return res.status(403).json({ error: 'This account has been suspended by an administrator. Please contact support.' });
    }

    // Strict PBKDF2 password verification (no hardcoded fallback passwords)
    const isValid = user.passwordHash && user.passwordSalt
      ? verifyPassword(password, user.passwordHash, user.passwordSalt)
      : false;

    if (!isValid) {
      const count = (attemptRecord ? attemptRecord.count : 0) + 1;
      let lockedUntil: number | undefined;
      if (count >= MAX_FAILED_ATTEMPTS) {
        lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      }
      loginAttempts.set(cleanIdentifier, { count, lockedUntil });
      recordAuditLog('LOGIN_FAILED', cleanIdentifier, 'FAILED', `Incorrect password (attempt ${count})`, user.role, clientIp);

      const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - count);
      return res.status(401).json({
        code: 'auth/invalid-credential',
        error: `Incorrect password. ${remainingAttempts > 0 ? `${remainingAttempts} attempt(s) remaining before temporary lockout.` : 'Account locked for 15 minutes.'}`,
        remainingAttempts
      });
    }

    // Login Successful: Reset failed attempts
    loginAttempts.delete(cleanIdentifier);
    user.lastLoginAt = new Date().toISOString();

    // Create session token
    const token = generateSessionToken();
    const sessionDuration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    sessions.set(token, {
      token,
      userId: user.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + sessionDuration
    });

    recordAuditLog('LOGIN_SUCCESS', cleanIdentifier, 'SUCCESS', 'Password verified successfully', user.role, clientIp);
    saveStore();

    return res.json({
      success: true,
      token,
      user: sanitizeUser(user),
      role: user.role,
      initialData: buildUserInitialData(user)
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server authentication error' });
  }
});

// 1b. Passwordless / Instant OTP Login - Step 1: Request Login OTP
app.post('/api/auth/login-otp-init', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!identifier) {
      return res.status(400).json({ error: 'Email or Mobile Number is required.' });
    }

    const cleanIdentifier = String(identifier).trim().toLowerCase();
    const cleanPhone = normalizePhone(cleanIdentifier);
    const isEmailIdentifier = cleanIdentifier.includes('@');

    if (!isEmailIdentifier && !isSmsConfigured()) {
      return res.status(503).json({
        error: 'SMS OTP delivery gateway is not configured on this server. Please sign in with Email or Password.'
      });
    }
    if (isEmailIdentifier && !isEmailConfigured()) {
      return res.status(503).json({
        error: 'Email OTP delivery service (SMTP) is not configured on this server.'
      });
    }

    // Find User by Email or Mobile
    const user = usersDatabase.find(u => 
      u.email.toLowerCase() === cleanIdentifier || 
      (cleanPhone.length === 10 && normalizePhone(u.phone) === cleanPhone)
    );

    if (!user) {
      recordAuditLog('LOGIN_OTP_NOT_FOUND', cleanIdentifier, 'FAILED', 'No user found for OTP login', undefined, clientIp);
      return res.status(404).json({ 
        error: 'No account registered with this email or mobile number. Please check the details or create a new account.' 
      });
    }

    if (user.status === 'suspended') {
      recordAuditLog('LOGIN_BLOCKED', cleanIdentifier, 'BLOCKED', 'Account suspended by administrator', user.role, clientIp);
      return res.status(403).json({ error: 'This account has been suspended by an administrator. Please contact support.' });
    }

    // Rate-limit resend check
    const existingOtp = otpStore.get(user.email.toLowerCase()) || (user.phone ? otpStore.get(normalizePhone(user.phone)) : undefined);
    if (existingOtp && Date.now() - existingOtp.lastSentAt < OTP_RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - (Date.now() - existingOtp.lastSentAt)) / 1000);
      return res.status(429).json({ error: `Please wait ${waitSeconds}s before requesting a new OTP.`, waitSeconds });
    }

    // Generate real 6-digit OTP and hash
    const otpCode = generateOTP();
    const delivery = await sendEmailOtp(user.email, otpCode);
    if (!delivery.delivered) {
      return res.status(503).json({ error: 'Unable to send OTP via email. Please check SMTP configuration.' });
    }

    const record: OtpRecord = {
      hash: hashOtp(otpCode),
      identifier: user.email.toLowerCase(),
      expiresAt: Date.now() + OTP_EXPIRY_MS,
      lastSentAt: Date.now(),
      attempts: 0,
      payload: { userId: user.id, action: 'LOGIN' }
    };

    otpStore.set(user.email.toLowerCase(), record);
    if (user.phone) otpStore.set(normalizePhone(user.phone), record);

    recordAuditLog('LOGIN_OTP_SENT', user.email, 'SUCCESS', `Login OTP code dispatched to ${user.role}`, user.role, clientIp);

    // Mask email for security preview
    const maskedEmail = user.email.replace(/^(.)(.*)(@.*)$/, (_m, a, b, c) => `${a}${'*'.repeat(Math.min(5, b.length))}${c}`);

    return res.json({
      success: true,
      message: `Instant login OTP sent to ${maskedEmail}`,
      identifier: user.email.toLowerCase(),
      userMasked: {
        name: user.name,
        role: user.role,
        maskedContact: maskedEmail
      },
      resendCooldown: 60
    });
  } catch (error: any) {
    console.error('Login OTP init error:', error);
    return res.status(500).json({ error: 'Failed to initiate OTP login' });
  }
});

// 1c. Passwordless / Instant OTP Login - Step 2: Verify OTP & Sign In
app.post('/api/auth/login-otp-verify', (req: Request, res: Response) => {
  try {
    const { identifier, otp, rememberMe } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!identifier || !otp) {
      return res.status(400).json({ error: 'Identifier and 6-digit OTP are required.' });
    }

    const cleanKey = String(identifier).trim().toLowerCase();
    const cleanPhone = normalizePhone(cleanKey);

    const record = otpStore.get(cleanKey) || (cleanPhone.length === 10 ? otpStore.get(cleanPhone) : undefined);
    if (!record || record.payload?.action !== 'LOGIN') {
      return res.status(400).json({ error: 'No active OTP login session found. Please request a new OTP.' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanKey);
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    const cleanOtp = String(otp).trim();
    const inputHash = hashOtp(cleanOtp);
    let isValidOtp = false;
    try {
      if (record.hash) {
        isValidOtp = crypto.timingSafeEqual(Buffer.from(inputHash, 'hex'), Buffer.from(record.hash, 'hex'));
      }
    } catch {
      isValidOtp = false;
    }

    if (!isValidOtp) {
      record.attempts = (record.attempts || 0) + 1;
      if (record.attempts >= 4) {
        otpStore.delete(cleanKey);
        recordAuditLog('LOGIN_OTP_FAILED', cleanKey, 'FAILED', 'Max OTP attempts exceeded', undefined, clientIp);
        return res.status(400).json({ error: 'Maximum incorrect OTP attempts exceeded. Please request a new OTP.' });
      }
      return res.status(400).json({ error: `Incorrect OTP code. ${4 - record.attempts} attempts remaining.` });
    }

    // OTP is valid!
    const user = usersDatabase.find(u => u.id === record.payload?.userId);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    // Clear OTP
    otpStore.delete(cleanKey);
    if (user.phone) otpStore.delete(normalizePhone(user.phone));
    loginAttempts.delete(user.email.toLowerCase());

    user.lastLoginAt = new Date().toISOString();

    // Create session token
    const token = generateSessionToken();
    const sessionDuration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    sessions.set(token, {
      token,
      userId: user.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + sessionDuration
    });

    recordAuditLog('LOGIN_OTP_SUCCESS', user.email, 'SUCCESS', 'OTP verified successfully', user.role, clientIp);
    saveStore();

    return res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: sanitizeUser(user),
      role: user.role
    });
  } catch (error: any) {
    console.error('Verify login OTP error:', error);
    return res.status(500).json({ error: 'Failed to verify login OTP' });
  }
});

// 1d. Firebase Auth Verified Login / Registration Exchange
app.post('/api/auth/firebase-login', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const rawIdToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.body.idToken;
    const {
      oauthAccessToken,
      phoneNumber,
      email,
      name,
      role,
      photoUrl,
      currentRole,
      yearsOfExperience,
      companyName,
      cinOrRegistrationNumber,
      rememberMe = true,
    } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    let verifiedUid = '';
    let verifiedEmail = '';
    let verifiedName = name ? String(name).trim() : '';
    let verifiedPhoto = photoUrl || '';
    let verifiedPhone = phoneNumber ? normalizePhone(phoneNumber) : '';
    let verifiedClaims: Record<string, any> = {};

    if (rawIdToken) {
      try {
        const decoded = await verifyFirebaseIdToken(rawIdToken);
        verifiedUid = decoded.uid || decoded.sub || '';
        verifiedEmail = (decoded.email || '').toLowerCase();
        verifiedName = verifiedName || decoded.name || '';
        verifiedPhoto = verifiedPhoto || decoded.picture || '';
        verifiedPhone = verifiedPhone || (decoded.phone_number ? normalizePhone(decoded.phone_number) : '');
        verifiedClaims = decoded;
      } catch {
        return res.status(401).json({
          code: 'auth/invalid-token',
          error: 'Invalid or expired Firebase authentication token.'
        });
      }
    } else if (oauthAccessToken) {
      try {
        const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${oauthAccessToken}` }
        });
        if (!infoRes.ok) {
          return res.status(401).json({
            code: 'auth/invalid-token',
            error: 'Invalid or expired Google OAuth token.'
          });
        }
        const info = await infoRes.json() as Record<string, any>;
        if (!info.sub || !info.email) {
          return res.status(401).json({ code: 'auth/invalid-token', error: 'Incomplete Google profile token.' });
        }
        verifiedUid = `google-${info.sub}`;
        verifiedEmail = String(info.email).trim().toLowerCase();
        verifiedName = verifiedName || info.name || '';
        verifiedPhoto = verifiedPhoto || info.picture || '';
      } catch {
        return res.status(401).json({
          code: 'auth/invalid-token',
          error: 'Failed to verify Google OAuth token.'
        });
      }
    } else {
      return res.status(401).json({
        code: 'auth/missing-token',
        error: 'Verified Firebase ID token or Google OAuth access token is required.'
      });
    }

    if (!verifiedUid) {
      return res.status(401).json({ code: 'auth/invalid-token', error: 'Verified identity UID is required.' });
    }

    // Strictly reject client attempts to request admin or college role via public firebase-login
    if (role && role !== 'student' && role !== 'recruiter' && role !== 'experienced') {
      const hasValidAdminClaim =
        role === 'admin' &&
        verifiedClaims.admin === true &&
        verifiedClaims.email_verified === true &&
        verifiedEmail === AUTHORIZED_ADMIN_EMAIL;
      if (!hasValidAdminClaim) {
        recordAuditLog('UNAUTHORIZED_ROLE_ATTEMPT', verifiedEmail || verifiedUid, 'BLOCKED', `Blocked unauthorized role request: ${String(role)}`, undefined, clientIp);
        return res.status(403).json({
          code: 'auth/unauthorized-role',
          error: 'Unauthorized role. You do not have permission to access this role.'
        });
      }
    }

    const allowedPublicRole: 'student' | 'recruiter' | 'experienced' =
      role === 'recruiter' || role === 'experienced' ? role : 'student';

    let user = usersDatabase.find(u => u.id === verifiedUid);
    if (!user && verifiedEmail) {
      const legacyMatch = usersDatabase.find(u => u.email.toLowerCase() === verifiedEmail);
      if (legacyMatch) {
        const oldId = legacyMatch.id;
        // Migrate legacy local user ID to canonical Firebase UID so all records stay strictly UID-scoped
        if (oldId !== verifiedUid && oldId.startsWith('usr-')) {
          legacyMatch.id = verifiedUid;
          for (const appRec of applicationsDatabase) {
            if (appRec.candidateId === oldId) appRec.candidateId = verifiedUid;
          }
          for (const certRec of certificatesDatabase) {
            if (certRec.userId === oldId) certRec.userId = verifiedUid;
          }
          for (const notifRec of notificationsDatabase) {
            if (notifRec.userId === oldId) notifRec.userId = verifiedUid;
          }
          for (const [, sess] of sessions.entries()) {
            if (sess.userId === oldId) sess.userId = verifiedUid;
          }
        }
        user = legacyMatch;
      }
    }

    const isNewUser = !user;

    if (!user) {
      const generatedName = verifiedName || (verifiedPhone ? `Yuva Member (+91 ${verifiedPhone.slice(-4)})` : 'Yuva Candidate');
      const isTokenAdmin =
        verifiedClaims.admin === true &&
        verifiedClaims.email_verified === true &&
        verifiedEmail === AUTHORIZED_ADMIN_EMAIL;

      const newUser: UserRecord = {
        id: verifiedUid,
        name: generatedName,
        email: verifiedEmail || (email ? String(email).trim().toLowerCase() : `${verifiedPhone || verifiedUid}@yuvamitraa.app`),
        phone: verifiedPhone ? `+91 ${verifiedPhone}` : '',
        role: isTokenAdmin ? 'admin' : allowedPublicRole,
        currentRole: allowedPublicRole === 'experienced' ? (currentRole ? String(currentRole).trim() : undefined) : undefined,
        yearsOfExperience: allowedPublicRole === 'experienced' ? (yearsOfExperience ? String(yearsOfExperience).trim() : undefined) : undefined,
        companyName: allowedPublicRole === 'recruiter' ? (companyName ? String(companyName).trim() : generatedName) : undefined,
        cinOrRegistrationNumber: allowedPublicRole === 'recruiter' ? (cinOrRegistrationNumber ? String(cinOrRegistrationNumber).trim() : '') : undefined,
        college: '',
        course: '',
        education: isTokenAdmin ? 'Platform Administration' : (allowedPublicRole === 'experienced' ? 'Working Professional' : ''),
        isVerified: true,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        photoUrl: verifiedPhoto || '',
        location: 'India',
        skills: [],
        interests: [],
        preferredRoles: [],
        enrolledCourses: [],
        savedJobIds: [],
        badges: [],
        streakDays: 0,
        xpPoints: 0,
        passwordHash: '',
        passwordSalt: ''
      };
      usersDatabase.push(newUser);
      user = newUser;
      recordAuditLog('FIREBASE_REGISTER', verifiedEmail || verifiedPhone || verifiedUid, 'SUCCESS', 'New user registered via Firebase Auth', user.role, clientIp);
    } else {
      if (user.status === 'suspended') {
        return res.status(403).json({ error: 'This account has been suspended by an administrator.' });
      }
      user.lastLoginAt = new Date().toISOString();
      if (verifiedPhoto && !user.photoUrl) user.photoUrl = verifiedPhoto;
      recordAuditLog('FIREBASE_LOGIN', verifiedEmail || verifiedPhone || verifiedUid, 'SUCCESS', 'Authenticated via Firebase Auth', user.role, clientIp);
    }

    const token = generateSessionToken();
    const sessionDuration = rememberMe === false ? 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    sessions.set(token, {
      token,
      userId: user.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + sessionDuration
    });
    saveStore();

    return res.json({
      success: true,
      message: `Welcome, ${user.name}!`,
      token,
      user: sanitizeUser(user),
      role: user.role,
      isNewUser,
      initialData: isNewUser
        ? { certificates: [], applications: [], notifications: buildUserInitialData(user).notifications }
        : buildUserInitialData(user),
    });
  } catch (error: any) {
    console.error('Firebase login error:', error);
    return res.status(500).json({ error: 'Failed to process Firebase authentication session.' });
  }
});

// 1e. Dedicated Server-Side Admin Verification & Custom Claim Provisioning (/api/auth/admin-verify)
app.post('/api/auth/admin-verify', async (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
  try {
    const authHeader = req.headers.authorization;
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.body?.idToken;

    if (!idToken) {
      return res.status(401).json({
        code: 'auth/missing-token',
        error: 'Firebase authentication token is required for admin verification.'
      });
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    const decodedEmail = String(decoded.email || '').trim().toLowerCase();

    if (decodedEmail !== AUTHORIZED_ADMIN_EMAIL) {
      recordAuditLog('ADMIN_LOGIN_DENIED', decodedEmail || decoded.uid, 'BLOCKED', 'Unauthorized email attempted admin verification', undefined, clientIp);
      return res.status(403).json({
        code: 'auth/unauthorized-role',
        error: 'Access denied. This account does not have administrator privileges.'
      });
    }

    if (decoded.email_verified !== true) {
      recordAuditLog('ADMIN_UNVERIFIED_EMAIL', decodedEmail, 'BLOCKED', 'Email must be verified before granting admin claim', undefined, clientIp);
      return res.status(403).json({
        code: 'auth/email-not-verified',
        error: 'Email verification is required before admin access can be granted. Please verify your email address and try again.'
      });
    }

    let claimGranted = decoded.admin === true;
    if (!claimGranted) {
      try {
        await getFirebaseAdminAuth().setCustomUserClaims(decoded.uid, {
          ...(decoded.claims || {}),
          admin: true
        });
        claimGranted = true;
        recordAuditLog('ADMIN_CLAIM_GRANTED', decodedEmail, 'SUCCESS', 'Firebase custom claim admin: true granted via Admin SDK', 'admin', clientIp);
      } catch (claimErr: any) {
        console.error('[FirebaseAdmin] setCustomUserClaims failed:', claimErr?.message || claimErr);
        recordAuditLog('ADMIN_CLAIM_ERROR', decodedEmail, 'FAILED', `Failed to set custom claim via Admin SDK: ${claimErr?.message || 'unknown error'}`, 'admin', clientIp);
        return res.status(503).json({
          code: 'auth/admin-claim-unavailable',
          error: 'Server could not assign Firebase admin custom claim. Ensure Firebase Admin SDK credentials are configured.'
        });
      }
    }

    let adminUser = usersDatabase.find(u => u.id === decoded.uid || u.email.toLowerCase() === AUTHORIZED_ADMIN_EMAIL);
    if (!adminUser) {
      adminUser = {
        id: decoded.uid,
        name: decoded.name || 'Platform Administrator',
        email: AUTHORIZED_ADMIN_EMAIL,
        phone: '',
        role: 'admin',
        passwordHash: '',
        passwordSalt: '',
        adminLevel: 'Super Administrator',
        designation: 'National Platform Administrator',
        isVerified: true,
        verificationStatus: 'verified',
        verificationEvidence: 'Firebase Custom Claim (admin: true) Verified',
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        photoUrl: decoded.picture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
        location: 'New Delhi, India'
      };
      usersDatabase.push(adminUser);
    } else {
      adminUser.role = 'admin';
      adminUser.lastLoginAt = new Date().toISOString();
    }

    const token = generateSessionToken();
    sessions.set(token, {
      token,
      userId: adminUser.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + 12 * 60 * 60 * 1000
    });

    recordAuditLog('ADMIN_LOGIN_SUCCESS', AUTHORIZED_ADMIN_EMAIL, 'SUCCESS', 'Verified admin authenticated via custom claims', 'admin', clientIp);
    saveStore();

    return res.json({
      success: true,
      claimGranted,
      token,
      user: sanitizeUser(adminUser),
      role: 'admin'
    });
  } catch (err: any) {
    console.error('Admin verification error:', err);
    return res.status(401).json({
      code: 'auth/invalid-credential',
      error: err?.message || 'Admin authentication failed.'
    });
  }
});

// ------------------------------------------
// UNIFIED MODERN OTP AUTHENTICATION SYSTEM
// ------------------------------------------

// 1. Dispatch 6-digit OTP (Mobile SMS or Email)
app.post('/api/auth/otp/send', async (req: Request, res: Response) => {
  try {
    const { identifier, type } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!identifier) {
      return res.status(400).json({ error: 'Please enter your Mobile Number or Email Address.' });
    }

    const cleanInput = String(identifier).trim();
    let cleanKey = '';
    let validatedType: 'email' | 'mobile' = type;

    if (type === 'email' || (!type && cleanInput.includes('@'))) {
      validatedType = 'email';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanInput)) {
        return res.status(400).json({ error: 'Please enter a valid email address (e.g. name@example.com).' });
      }
      cleanKey = cleanInput.toLowerCase();
    } else {
      validatedType = 'mobile';
      const digits = cleanInput.replace(/[^0-9]/g, '').slice(-10);
      if (digits.length !== 10) {
        return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
      }
      cleanKey = digits;
    }

    // Check Lockout
    const attemptRecord = loginAttempts.get(cleanKey);
    if (attemptRecord && attemptRecord.lockedUntil && attemptRecord.lockedUntil > Date.now()) {
      const remainingSeconds = Math.ceil((attemptRecord.lockedUntil - Date.now()) / 1000);
      return res.status(429).json({
        error: `Account temporarily locked due to too many failed attempts. Please wait ${remainingSeconds} seconds.`,
        locked: true,
        remainingSeconds
      });
    }

    // Cooldown check (60 seconds)
    const existingOtp = otpStore.get(cleanKey);
    if (existingOtp && Date.now() - existingOtp.lastSentAt < OTP_RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - (Date.now() - existingOtp.lastSentAt)) / 1000);
      return res.status(429).json({
        error: `Please wait ${waitSeconds}s before requesting a new OTP.`,
        waitSeconds
      });
    }

    // Check if user already exists
    const existingUser = usersDatabase.find(u => 
      (validatedType === 'email' && u.email.toLowerCase() === cleanKey) ||
      (validatedType === 'mobile' && normalizePhone(u.phone) === cleanKey)
    );

    const isNewUser = !existingUser;

    if (existingUser && existingUser.status === 'suspended') {
      return res.status(403).json({ error: 'This account has been suspended by an administrator. Please contact support.' });
    }

    if (validatedType === 'mobile' && !isSmsConfigured()) {
      return res.status(503).json({
        error: 'SMS OTP gateway is not configured on this server. Please use Email Sign-In or Firebase Phone Auth.'
      });
    }
    if (validatedType === 'email' && !isEmailConfigured()) {
      return res.status(503).json({
        error: 'Email OTP delivery (SMTP) is not configured on this server.'
      });
    }

    // Generate secure 6-digit cryptographic OTP
    const otpCode = generateOTP();
    const otpHash = hashOtp(otpCode);

    if (validatedType === 'email') {
      const delivery = await sendEmailOtp(cleanKey, otpCode);
      if (!delivery.delivered) {
        return res.status(503).json({
          error: 'Failed to send Email OTP. SMTP delivery error.'
        });
      }
    }

    const record: OtpRecord = {
      hash: otpHash,
      identifier: cleanKey,
      expiresAt: Date.now() + OTP_EXPIRY_MS,
      lastSentAt: Date.now(),
      attempts: 0,
      payload: {
        type: validatedType,
        identifier: cleanKey,
        isNewUser,
        userId: existingUser?.id,
        userRole: existingUser?.role || 'student'
      }
    };

    otpStore.set(cleanKey, record);

    const contactLabel = validatedType === 'mobile' ? `+91 ${cleanKey}` : cleanKey;
    recordAuditLog('OTP_SENT', cleanKey, 'SUCCESS', `6-digit OTP dispatched to ${contactLabel} (isNewUser: ${isNewUser})`, existingUser?.role, clientIp);

    return res.json({
      success: true,
      message: validatedType === 'mobile' 
        ? `6-digit SMS OTP dispatched to +91 ${cleanKey}` 
        : `6-digit verification code sent to ${cleanKey}. Please check your inbox.`,
      isNewUser,
      identifier: cleanKey,
      type: validatedType,
      cooldownSeconds: 60
    });
  } catch (error: any) {
    console.error('OTP Send Error:', error);
    return res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
});

// 2. Verify 6-digit OTP
app.post('/api/auth/otp/verify', (req: Request, res: Response) => {
  try {
    const { identifier, otp, type, rememberMe } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!identifier || !otp) {
      return res.status(400).json({ error: 'Contact detail and 6-digit OTP are required.' });
    }

    const cleanInput = String(identifier).trim();
    const cleanKey = (type === 'email' || cleanInput.includes('@')) 
      ? cleanInput.toLowerCase() 
      : cleanInput.replace(/[^0-9]/g, '').slice(-10);

    const record = otpStore.get(cleanKey);
    if (!record) {
      return res.status(400).json({ error: 'No active OTP verification session found. Please request a new OTP.' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanKey);
      return res.status(400).json({ error: 'This OTP has expired. Please request a new OTP.' });
    }

    const cleanOtp = String(otp).trim();
    const inputHash = hashOtp(cleanOtp);
    let isValidOtp = false;
    try {
      if (record.hash) {
        isValidOtp = crypto.timingSafeEqual(
          Buffer.from(inputHash, 'hex'),
          Buffer.from(record.hash, 'hex')
        );
      } else if (record.code) {
        isValidOtp = record.code === cleanOtp;
      }
    } catch {
      isValidOtp = false;
    }

    if (!isValidOtp) {
      record.attempts = (record.attempts || 0) + 1;
      if (record.attempts >= 4) {
        otpStore.delete(cleanKey);
        recordAuditLog('OTP_FAILED', cleanKey, 'FAILED', 'Max OTP verification attempts exceeded', undefined, clientIp);
        return res.status(400).json({ error: 'Maximum incorrect OTP attempts exceeded. Please request a new OTP.' });
      }
      return res.status(400).json({ 
        error: `Incorrect OTP code. ${4 - record.attempts} attempts remaining.` 
      });
    }

    // OTP Verified! Clear the OTP
    otpStore.delete(cleanKey);
    loginAttempts.delete(cleanKey);

    const isNewUser = Boolean(record.payload?.isNewUser);

    if (isNewUser) {
      const registrationToken = 'reg-' + crypto.randomBytes(24).toString('hex');
      registrationSessions.set(registrationToken, {
        token: registrationToken,
        identifier: cleanKey,
        type: record.payload?.type || (cleanKey.includes('@') ? 'email' : 'mobile'),
        expiresAt: Date.now() + 30 * 60 * 1000
      });

      recordAuditLog('OTP_VERIFIED_NEW_USER', cleanKey, 'SUCCESS', 'New user OTP verified, awaiting profile registration', undefined, clientIp);

      return res.json({
        success: true,
        isNewUser: true,
        registrationToken,
        identifier: cleanKey,
        type: record.payload?.type,
        message: 'OTP verified successfully! Please complete your registration.'
      });
    }

    // Existing User: Sign in immediately
    const user = usersDatabase.find(u => 
      u.id === record.payload?.userId || 
      u.email.toLowerCase() === cleanKey || 
      normalizePhone(u.phone) === cleanKey
    );

    if (!user) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    user.lastLoginAt = new Date().toISOString();

    const token = generateSessionToken();
    const sessionDuration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    sessions.set(token, {
      token,
      userId: user.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + sessionDuration
    });

    recordAuditLog('LOGIN_OTP_SUCCESS', cleanKey, 'SUCCESS', `User ${user.name} logged in via OTP`, user.role, clientIp);
    saveStore();

    return res.json({
      success: true,
      isNewUser: false,
      token,
      user: sanitizeUser(user),
      role: user.role,
      message: `Welcome back, ${user.name}!`
    });
  } catch (error: any) {
    console.error('OTP Verify Error:', error);
    return res.status(500).json({ error: 'Failed to verify OTP. Please try again.' });
  }
});

// 3. Resend OTP with 60s cooldown
app.post('/api/auth/otp/resend', async (req: Request, res: Response) => {
  try {
    const { identifier, type } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Identifier is required.' });
    }

    const cleanInput = String(identifier).trim();
    const cleanKey = (type === 'email' || cleanInput.includes('@')) 
      ? cleanInput.toLowerCase() 
      : cleanInput.replace(/[^0-9]/g, '').slice(-10);

    const record = otpStore.get(cleanKey);
    if (!record) {
      return res.status(400).json({ error: 'No active OTP session found. Please enter your mobile or email again.' });
    }

    const timeSinceLast = Date.now() - record.lastSentAt;
    if (timeSinceLast < OTP_RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - timeSinceLast) / 1000);
      return res.status(429).json({ error: `Please wait ${waitSeconds}s before requesting a new OTP.`, waitSeconds });
    }

    const isEmail = record.payload?.type === 'email' || cleanKey.includes('@');
    if (!isEmail && !isSmsConfigured()) {
      return res.status(503).json({ error: 'SMS OTP gateway is not configured on this server.' });
    }
    if (isEmail && !isEmailConfigured()) {
      return res.status(503).json({ error: 'Email OTP delivery (SMTP) is not configured on this server.' });
    }

    const newCode = generateOTP();
    if (isEmail) {
      const delivery = await sendEmailOtp(cleanKey, newCode);
      if (!delivery.delivered) {
        return res.status(503).json({ error: 'Failed to resend Email OTP.' });
      }
    }

    record.hash = hashOtp(newCode);
    record.expiresAt = Date.now() + OTP_EXPIRY_MS;
    record.lastSentAt = Date.now();
    record.attempts = 0;

    recordAuditLog('OTP_RESENT', cleanKey, 'SUCCESS', 'Fresh 6-digit OTP re-dispatched');

    return res.json({
      success: true,
      message: `Fresh 6-digit OTP sent to ${cleanInput}.`,
      cooldownSeconds: 60
    });
  } catch (error: any) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({ error: 'Failed to resend OTP.' });
  }
});

// 4. Complete Registration for New User after OTP
app.post('/api/auth/otp/register-complete', async (req: Request, res: Response) => {
  try {
    const {
      registrationToken,
      idToken,
      name,
      email,
      phone,
      educationLevel,
      skills,
      interests,
      role = 'student',
      college,
      course,
      age,
      location,
      preferredRoles
    } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    let verifiedUid: string | null = null;
    if (idToken) {
      try {
        const decoded = await verifyFirebaseIdToken(idToken);
        verifiedUid = decoded.uid || decoded.sub || null;
      } catch {
        return res.status(401).json({ error: 'Invalid or expired Firebase authentication token.' });
      }
    }

    const regSession = registrationToken ? registrationSessions.get(registrationToken) : null;

    if (!verifiedUid) {
      if (!registrationToken) {
        return res.status(400).json({ error: 'Registration session expired. Please verify OTP again.' });
      }
      if (!regSession || Date.now() > regSession.expiresAt) {
        return res.status(400).json({ error: 'Registration session expired. Please request a new OTP.' });
      }
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Full Name is required.' });
    }

    const cleanEmail = email
      ? String(email).trim().toLowerCase()
      : (regSession?.type === 'email' ? regSession.identifier : '');
    const cleanPhone = phone
      ? normalizePhone(String(phone))
      : (regSession?.type === 'mobile' ? regSession.identifier : '');

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (cleanPhone && cleanPhone.length !== 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
    }

    if (role !== 'student' && role !== 'recruiter' && role !== 'experienced') {
      return res.status(403).json({ code: 'auth/unauthorized-role', error: 'Unauthorized role selection.' });
    }

    const dummyPass = crypto.randomBytes(16).toString('hex');
    const { hash, salt } = hashPassword(dummyPass);
    const newUserId = verifiedUid || `usr-${Date.now()}`;

    const existingUser = usersDatabase.find(u => u.id === newUserId || (cleanEmail && u.email.toLowerCase() === cleanEmail));
    if (existingUser) {
      existingUser.name = name.trim();
      existingUser.email = cleanEmail;
      if (cleanPhone) existingUser.phone = cleanPhone;
      existingUser.college = college?.trim() || existingUser.college;
      existingUser.course = course?.trim() || educationLevel || existingUser.course;
      existingUser.education = educationLevel || existingUser.education;
      existingUser.institution = college?.trim() || existingUser.institution;
      if (existingUser.role !== 'admin') {
        existingUser.role = role;
      }
      existingUser.location = location?.trim() || existingUser.location;
      existingUser.age = age ? Number(age) : existingUser.age;
      existingUser.lastLoginAt = new Date().toISOString();
      if (Array.isArray(skills)) existingUser.skills = skills;
      if (Array.isArray(interests)) existingUser.interests = interests;
      if (Array.isArray(preferredRoles)) existingUser.preferredRoles = preferredRoles;

      if (registrationToken) registrationSessions.delete(registrationToken);
      const token = generateSessionToken();
      sessions.set(token, {
        token,
        userId: existingUser.id,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
      });
      saveStore();

      return res.json({
        success: true,
        token,
        user: sanitizeUser(existingUser),
        role: existingUser.role,
        message: `Welcome to YuvaMitraa, ${existingUser.name}! Your account is now active.`
      });
    }

    const parsedSkills = Array.isArray(skills) ? skills : (typeof skills === 'string' ? skills.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
    const parsedInterests = Array.isArray(interests) ? interests : (typeof interests === 'string' ? interests.split(',').map((i: string) => i.trim()).filter(Boolean) : []);
    const parsedPreferredRoles = Array.isArray(preferredRoles) ? preferredRoles : (typeof preferredRoles === 'string' ? preferredRoles.split(',').map((r: string) => r.trim()).filter(Boolean) : []);

    const newUser: UserRecord = {
      id: newUserId,
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      role,
      passwordHash: hash,
      passwordSalt: salt,
      college: college?.trim() || '',
      course: course?.trim() || educationLevel || '',
      studyYear: '',
      education: educationLevel || '',
      institution: college?.trim() || '',
      isVerified: true,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      photoUrl: '',
      skills: parsedSkills,
      interests: parsedInterests,
      age: age ? Number(age) : undefined,
      location: location?.trim() || 'India',
      preferredRoles: parsedPreferredRoles,
      enrolledCourses: [],
      savedJobIds: [],
      badges: ['New Explorer'],
      streakDays: 0,
      xpPoints: 0
    };

    usersDatabase.push(newUser);
    if (registrationToken) registrationSessions.delete(registrationToken);

    const token = generateSessionToken();
    sessions.set(token, {
      token,
      userId: newUser.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
    });

    recordAuditLog('NEW_USER_REGISTERED', cleanEmail, 'SUCCESS', `Registered profile for ${newUser.name} (${newUser.role})`, newUser.role, clientIp);
    saveStore();

    return res.json({
      success: true,
      token,
      user: sanitizeUser(newUser),
      role: newUser.role,
      message: `Welcome to YuvaMitraa, ${newUser.name}! Your account is now active.`
    });
  } catch (error: any) {
    console.error('Registration Complete Error:', error);
    return res.status(500).json({ error: 'Failed to complete registration.' });
  }
});

// 2. Registration Step 1: Initiate & Send OTP (Duplicate check + fields)
app.post('/api/auth/register-init', async (req: Request, res: Response) => {
  try {
    const { name, email, mobile, password, role = 'student', college, course, studyYear, companyName, designation } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!name || !email || !mobile || !password) {
      return res.status(400).json({ error: 'Full name, email, mobile number, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    if (!isEmailConfigured()) {
      return res.status(503).json({
        error: 'Email OTP delivery (SMTP) is not configured on this server. Please register directly with Email & Password.'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPhone = normalizePhone(String(mobile));

    if (cleanPhone.length !== 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
    }

    const existingEmail = usersDatabase.find(u => u.email.toLowerCase() === cleanEmail);
    if (existingEmail) {
      return res.status(409).json({ error: 'An account is already registered with this email address. Please sign in instead.' });
    }

    const existingPhone = usersDatabase.find(u => u.phone && normalizePhone(u.phone) === cleanPhone);
    if (existingPhone) {
      return res.status(409).json({ error: 'An account is already registered with this mobile number. Please sign in instead.' });
    }

    const existingOtp = otpStore.get(cleanEmail);
    if (existingOtp && Date.now() - existingOtp.lastSentAt < OTP_RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - (Date.now() - existingOtp.lastSentAt)) / 1000);
      return res.status(429).json({ error: `Please wait ${waitSeconds}s before requesting a new OTP.`, waitSeconds });
    }

    if (role !== 'student' && role !== 'recruiter' && role !== 'experienced') {
      return res.status(403).json({ code: 'auth/unauthorized-role', error: 'Unauthorized role selection.' });
    }

    const otpCode = generateOTP();
    const delivery = await sendEmailOtp(cleanEmail, otpCode);
    if (!delivery.delivered) {
      return res.status(503).json({ error: 'Failed to dispatch verification OTP via email. Check SMTP configuration.' });
    }

    const payload = {
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      password,
      role: role as 'student' | 'recruiter' | 'experienced',
      college: college?.trim() || '',
      course: course?.trim() || '',
      studyYear: studyYear?.trim() || '',
      companyName: companyName?.trim() || '',
      designation: designation?.trim() || '',
    };

    const record: OtpRecord = {
      hash: hashOtp(otpCode),
      identifier: cleanEmail,
      expiresAt: Date.now() + OTP_EXPIRY_MS,
      lastSentAt: Date.now(),
      attempts: 0,
      payload
    };

    otpStore.set(cleanEmail, record);
    otpStore.set(cleanPhone, record);

    recordAuditLog('OTP_SENT', cleanEmail, 'SUCCESS', `Registration OTP generated for ${role}`, role, clientIp);

    return res.json({
      success: true,
      message: `Verification code sent to ${cleanEmail}.`,
      resendCooldown: 60,
      expiresInMinutes: 5
    });
  } catch (error: any) {
    console.error('Registration init error:', error);
    return res.status(500).json({ error: 'Failed to initiate registration' });
  }
});

// 3. Registration Step 2: Verify OTP & Create Account
app.post('/api/auth/verify-registration-otp', (req: Request, res: Response) => {
  try {
    const { identifier, otp } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!identifier || !otp) {
      return res.status(400).json({ error: 'Identifier and 6-digit OTP are required.' });
    }

    const cleanKey = String(identifier).trim().toLowerCase();
    const cleanPhone = normalizePhone(cleanKey);

    const record = otpStore.get(cleanKey) || (cleanPhone.length === 10 ? otpStore.get(cleanPhone) : undefined);
    if (!record || !record.payload?.password) {
      return res.status(400).json({ error: 'No active OTP verification session found. Please register again.' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanKey);
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    const cleanOtp = String(otp).trim();
    const inputHash = hashOtp(cleanOtp);
    let isValidOtp = false;
    try {
      if (record.hash) {
        isValidOtp = crypto.timingSafeEqual(Buffer.from(inputHash, 'hex'), Buffer.from(record.hash, 'hex'));
      }
    } catch {
      isValidOtp = false;
    }

    if (!isValidOtp) {
      record.attempts = (record.attempts || 0) + 1;
      if (record.attempts >= 4) {
        otpStore.delete(cleanKey);
        recordAuditLog('OTP_FAILED', cleanKey, 'FAILED', 'Max OTP attempts reached', undefined, clientIp);
        return res.status(400).json({ error: 'Maximum incorrect OTP attempts exceeded. Please register again.' });
      }
      return res.status(400).json({ error: `Incorrect OTP code. ${4 - record.attempts} attempts remaining.` });
    }

    const p = record.payload;
    const { hash, salt } = hashPassword(p.password);
    const newUserId = `usr-${Date.now()}`;

    const newUser: UserRecord = {
      id: newUserId,
      name: p.name,
      email: p.email,
      phone: p.phone,
      role: p.role,
      passwordHash: hash,
      passwordSalt: salt,
      college: p.college,
      course: p.course,
      studyYear: p.studyYear,
      companyName: p.companyName,
      designation: p.designation,
      isVerified: p.role !== 'recruiter',
      verificationStatus: p.role === 'recruiter' ? 'pending' : 'verified',
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      photoUrl: '',
      education: p.role === 'student' && p.course ? `${p.course}${p.studyYear ? ` (${p.studyYear})` : ''}` : '',
      institution: p.role === 'student' ? p.college : p.companyName,
      location: 'India',
      skills: [],
      interests: [],
      preferredRoles: [],
      enrolledCourses: [],
      savedJobIds: [],
      badges: ['New Explorer'],
      streakDays: 0,
      xpPoints: 0
    };

    usersDatabase.push(newUser);
    otpStore.delete(cleanKey);
    if (p.phone) otpStore.delete(p.phone);

    const token = generateSessionToken();
    sessions.set(token, {
      token,
      userId: newUser.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
    });

    recordAuditLog('USER_REGISTERED', p.email, 'SUCCESS', `New ${p.role} account created and verified`, p.role, clientIp);
    saveStore();

    return res.json({
      success: true,
      message: 'Account verified and created successfully!',
      token,
      user: sanitizeUser(newUser),
      role: newUser.role
    });
  } catch (error: any) {
    console.error('Verify registration OTP error:', error);
    return res.status(500).json({ error: 'Failed to verify registration OTP' });
  }
});

// 4. Resend OTP with 60s Cooldown
app.post('/api/auth/resend-otp', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Identifier is required.' });
    }

    const cleanKey = String(identifier).trim().toLowerCase();
    const cleanPhone = normalizePhone(cleanKey);

    const record = otpStore.get(cleanKey) || (cleanPhone.length === 10 ? otpStore.get(cleanPhone) : undefined);
    if (!record) {
      return res.status(400).json({ error: 'No active verification session. Please initiate the request again.' });
    }

    if (!isEmailConfigured()) {
      return res.status(503).json({ error: 'Email OTP delivery (SMTP) is not configured on this server.' });
    }

    const timeSinceLast = Date.now() - record.lastSentAt;
    if (timeSinceLast < OTP_RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - timeSinceLast) / 1000);
      return res.status(429).json({ error: `Please wait ${waitSeconds}s before requesting a new OTP.`, waitSeconds });
    }

    const newCode = generateOTP();
    const delivery = await sendEmailOtp(record.identifier, newCode);
    if (!delivery.delivered) {
      return res.status(503).json({ error: 'Failed to resend Email OTP.' });
    }

    record.hash = hashOtp(newCode);
    record.expiresAt = Date.now() + OTP_EXPIRY_MS;
    record.lastSentAt = Date.now();
    record.attempts = 0;

    recordAuditLog('OTP_RESENT', cleanKey, 'SUCCESS', 'New OTP code issued');

    return res.json({
      success: true,
      message: `Fresh verification OTP sent to ${cleanKey}.`,
      resendCooldown: 60
    });
  } catch (error: any) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({ error: 'Failed to resend OTP' });
  }
});

// 5. Forgot Password: Step 1 (Initiate Reset OTP)
app.post('/api/auth/forgot-password-init', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Email or Mobile number is required.' });
    }

    if (!isEmailConfigured()) {
      return res.status(503).json({ error: 'Email OTP delivery (SMTP) is not configured on this server. Please use Firebase Forgot Password.' });
    }

    const cleanKey = String(identifier).trim().toLowerCase();
    const cleanPhone = normalizePhone(cleanKey);

    const user = usersDatabase.find(u =>
      u.email.toLowerCase() === cleanKey ||
      (cleanPhone.length === 10 && normalizePhone(u.phone) === cleanPhone)
    );

    if (!user) {
      return res.status(404).json({ error: 'No account registered with this email or mobile number.' });
    }

    const otpCode = generateOTP();
    const delivery = await sendEmailOtp(user.email, otpCode);
    if (!delivery.delivered) {
      return res.status(503).json({ error: 'Failed to send password reset OTP email.' });
    }

    const record: OtpRecord = {
      hash: hashOtp(otpCode),
      identifier: user.email,
      expiresAt: Date.now() + OTP_EXPIRY_MS,
      lastSentAt: Date.now(),
      attempts: 0,
      payload: { userId: user.id, email: user.email }
    };

    otpStore.set(user.email.toLowerCase(), record);
    if (user.phone) otpStore.set(normalizePhone(user.phone), record);

    recordAuditLog('PASSWORD_RESET_INIT', user.email, 'SUCCESS', 'Password reset OTP issued', user.role);
    const maskedEmail = user.email.replace(/^(.)(.*)(@.*)$/, (_m, a, b, c) => `${a}${'*'.repeat(Math.min(5, b.length))}${c}`);

    return res.json({
      success: true,
      message: `Password reset OTP sent to ${maskedEmail}.`,
      resendCooldown: 60,
      identifier: maskedEmail
    });
  } catch (error: any) {
    console.error('Forgot password init error:', error);
    return res.status(500).json({ error: 'Failed to initiate password reset' });
  }
});

// 6. Forgot Password: Step 2 (Verify OTP & Set New Password)
app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  try {
    const { identifier, otp, newPassword } = req.body;
    if (!identifier || !otp || !newPassword) {
      return res.status(400).json({ error: 'Identifier, OTP, and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const cleanKey = String(identifier).trim().toLowerCase();
    const cleanPhone = normalizePhone(cleanKey);

    const record = otpStore.get(cleanKey) || (cleanPhone.length === 10 ? otpStore.get(cleanPhone) : undefined);
    if (!record) {
      return res.status(400).json({ error: 'No active password reset request. Please try again.' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanKey);
      return res.status(400).json({ error: 'OTP has expired. Please request a new password reset.' });
    }

    const cleanOtp = String(otp).trim();
    const inputHash = hashOtp(cleanOtp);
    let isValidOtp = false;
    try {
      if (record.hash) {
        isValidOtp = crypto.timingSafeEqual(Buffer.from(inputHash, 'hex'), Buffer.from(record.hash, 'hex'));
      }
    } catch {
      isValidOtp = false;
    }

    if (!isValidOtp) {
      record.attempts = (record.attempts || 0) + 1;
      if (record.attempts >= 4) {
        otpStore.delete(cleanKey);
        return res.status(400).json({ error: 'Maximum incorrect OTP attempts exceeded. Please request a new reset.' });
      }
      return res.status(400).json({ error: 'Invalid OTP code. Please check and try again.' });
    }

    const user = usersDatabase.find(u => u.id === record.payload?.userId || u.email.toLowerCase() === cleanKey);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const { hash, salt } = hashPassword(newPassword);
    user.passwordHash = hash;
    user.passwordSalt = salt;

    otpStore.delete(cleanKey);
    if (user.phone) otpStore.delete(normalizePhone(user.phone));
    loginAttempts.delete(cleanKey);

    for (const [token, sess] of sessions.entries()) {
      if (sess.userId === user.id) {
        sessions.delete(token);
      }
    }

    recordAuditLog('PASSWORD_RESET_SUCCESS', user.email, 'SUCCESS', 'Password updated successfully', user.role);
    saveStore();

    return res.json({
      success: true,
      message: 'Password reset successful! You can now sign in with your new password.'
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
});

// 7. Google Sign-In (Requires verified token)
app.post('/api/auth/google', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const rawIdToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.body.idToken;
    const { oauthAccessToken, photoUrl } = req.body;

    let cleanEmail = '';
    let verifiedName = '';
    let verifiedPhoto = photoUrl || '';

    if (rawIdToken) {
      try {
        const decoded = await verifyFirebaseIdToken(rawIdToken);
        cleanEmail = String(decoded.email || '').trim().toLowerCase();
        verifiedName = decoded.name || '';
        verifiedPhoto = verifiedPhoto || decoded.picture || '';
      } catch {
        return res.status(401).json({ error: 'Invalid or expired Firebase token.' });
      }
    } else if (oauthAccessToken) {
      const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${oauthAccessToken}` }
      });
      if (!infoRes.ok) {
        return res.status(401).json({ error: 'Invalid or expired Google OAuth token.' });
      }
      const info = await infoRes.json() as Record<string, any>;
      cleanEmail = String(info.email || '').trim().toLowerCase();
      verifiedName = info.name || '';
      verifiedPhoto = verifiedPhoto || info.picture || '';
    } else {
      return res.status(401).json({ error: 'Verified Firebase ID token or Google OAuth access token is required.' });
    }

    if (!cleanEmail) {
      return res.status(400).json({ error: 'Verified Google email is required.' });
    }

    let user = usersDatabase.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      const autoHashed = hashPassword(crypto.randomBytes(16).toString('hex'));
      user = {
        id: `usr-g-${Date.now()}`,
        name: verifiedName || 'Google User',
        email: cleanEmail,
        phone: '',
        role: 'student',
        passwordHash: autoHashed.hash,
        passwordSalt: autoHashed.salt,
        college: '',
        course: '',
        studyYear: '',
        education: '',
        institution: '',
        isVerified: true,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        photoUrl: verifiedPhoto,
        skills: [],
        interests: [],
        preferredRoles: [],
        enrolledCourses: [],
        savedJobIds: [],
        badges: [],
        streakDays: 0,
        xpPoints: 0,
        location: 'India'
      };
      usersDatabase.push(user);
      recordAuditLog('GOOGLE_SIGNUP', cleanEmail, 'SUCCESS', 'New user registered via Google Sign-In', 'student');
    } else {
      if (user.role === 'admin' || user.role === 'college') {
        return res.status(403).json({
          code: 'auth/unauthorized-role',
          error: 'Unauthorized role for public sign-in.'
        });
      }
      user.lastLoginAt = new Date().toISOString();
      recordAuditLog('GOOGLE_LOGIN', cleanEmail, 'SUCCESS', 'Google Sign-In session authenticated', user.role);
    }

    const token = generateSessionToken();
    sessions.set(token, {
      token,
      userId: user.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
    });
    saveStore();

    return res.json({
      success: true,
      token,
      user: sanitizeUser(user),
      role: user.role
    });
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    return res.status(500).json({ error: 'Failed to process Google Sign-In' });
  }
});

// 8. Session Validation & Current User (`/api/auth/me`)
app.get('/api/auth/me', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    }
    return res.json({
      success: true,
      user: sanitizeUser(user),
      role: user.role,
      initialData: buildUserInitialData(user)
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Session verification failed' });
  }
});

// 9. Logout Single Session
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    sessions.delete(token);
    saveStore();
  }
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// 10. Logout From All Devices / Sessions
app.post('/api/auth/logout-all', async (req: Request, res: Response) => {
  const user = await authenticateRequest(req);
  if (!user) return res.status(401).json({ error: 'Authentication token required.' });
  for (const [token, s] of sessions.entries()) {
    if (s.userId === user.id) {
      sessions.delete(token);
    }
  }
  recordAuditLog('LOGOUT_ALL', user.id, 'SUCCESS', 'User logged out from all active sessions/devices');
  saveStore();
  return res.json({ success: true, message: 'Logged out from all devices successfully.' });
});

// 11. Delete Account Permanently
app.delete('/api/user/account', async (req: Request, res: Response) => {
  const user = await authenticateRequest(req);
  if (!user) return res.status(401).json({ error: 'Authentication token required.' });

  const userIndex = usersDatabase.findIndex(u => u.id === user.id);
  if (userIndex !== -1) {
    const [deleted] = usersDatabase.splice(userIndex, 1);
    recordAuditLog('ACCOUNT_DELETED', deleted.email, 'SUCCESS', `User account ${deleted.name} (${deleted.id}) permanently deleted`);
  }

  for (const [token, s] of sessions.entries()) {
    if (s.userId === user.id) {
      sessions.delete(token);
    }
  }
  for (let i = certificatesDatabase.length - 1; i >= 0; i--) {
    if (certificatesDatabase[i].userId === user.id) certificatesDatabase.splice(i, 1);
  }
  for (let i = applicationsDatabase.length - 1; i >= 0; i--) {
    if (applicationsDatabase[i].candidateId === user.id) applicationsDatabase.splice(i, 1);
  }
  for (let i = notificationsDatabase.length - 1; i >= 0; i--) {
    if (notificationsDatabase[i].userId === user.id) notificationsDatabase.splice(i, 1);
  }
  saveStore();
  return res.json({ success: true, message: 'Your YuvaMitraa account and profile have been permanently deleted.' });
});

// 12. Upload Profile Photo
app.post('/api/user/profile-photo', async (req: Request, res: Response) => {
  const user = await authenticateRequest(req);
  if (!user) return res.status(401).json({ error: 'Authentication token required.' });

  const { photoDataUrl } = req.body;
  if (!photoDataUrl) return res.status(400).json({ error: 'Photo data required.' });

  const nowIso = new Date().toISOString();
  user.photoUrl = photoDataUrl;
  user.profileUpdatedAt = nowIso;
  user.updatedAt = nowIso;
  recordAuditLog('PROFILE_PHOTO_UPDATED', user.email, 'SUCCESS', 'Profile photo updated');
  saveStore();
  return res.json({ success: true, photoUrl: user.photoUrl, profileUpdatedAt: user.profileUpdatedAt, user: sanitizeUser(user) });
});

// 13. Upload & Save Resume File
app.post('/api/user/resume-upload', async (req: Request, res: Response) => {
  const user = await authenticateRequest(req);
  if (!user) return res.status(401).json({ error: 'Authentication token required.' });

  const {
    resumeFileName,
    resumeText,
    resumeUpdatedAt,
  } = req.body;

  const isClearingResume = resumeText === '' && resumeFileName === '';
  const nowIso = new Date().toISOString();

  if (typeof resumeFileName === 'string') user.resumeFileName = resumeFileName.slice(0, 200);
  if (typeof resumeText === 'string') user.resumeText = resumeText.slice(0, 150000);
  if (isClearingResume) {
    user.resumeUpdatedAt = '';
  } else if (typeof resumeUpdatedAt === 'string' && resumeUpdatedAt.trim()) {
    user.resumeUpdatedAt = resumeUpdatedAt.trim().slice(0, 64);
  } else {
    user.resumeUpdatedAt = nowIso;
  }
  user.updatedAt = nowIso;

  const actionEvent = isClearingResume ? 'RESUME_DELETED' : 'RESUME_UPLOADED';
  recordAuditLog(actionEvent, user.email, 'SUCCESS', `Resume updated: ${resumeFileName || 'cleared'}`);
  saveStore();
  return res.json({
    success: true,
    resumeFileName: user.resumeFileName,
    resumeText: user.resumeText,
    resumeUpdatedAt: user.resumeUpdatedAt,
    user: sanitizeUser(user)
  });
});

// 14. Change Password Securely
app.post('/api/user/change-password', async (req: Request, res: Response) => {
  const user = await authenticateRequest(req);
  if (!user) return res.status(401).json({ error: 'Authentication token required.' });

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }
  const isValid = verifyPassword(currentPassword, user.passwordHash, user.passwordSalt);
  if (!isValid) {
    return res.status(401).json({ error: 'Incorrect current password.' });
  }
  const { hash, salt } = hashPassword(newPassword);
  user.passwordHash = hash;
  user.passwordSalt = salt;
  recordAuditLog('PASSWORD_CHANGED', user.email, 'SUCCESS', 'User updated password');
  saveStore();
  return res.json({ success: true, message: 'Password updated successfully.' });
});

// Update User Profile Details
const handleUpdateProfile = async (req: Request, res: Response) => {
  const user = await authenticateRequest(req);
  if (!user) return res.status(401).json({ error: 'Authentication token required.' });

  const {
    name,
    phone,
    education,
    college,
    collegeId,
    branch,
    course,
    studyYear,
    rollNumber,
    cgpa,
    graduationYear,
    location,
    preferredLocation,
    workModePreference,
    age,
    skills,
    nonTechnicalSkills,
    interests,
    preferredRoles,
    preferredDomain,
    careerGoals,
    projects,
    githubUrl,
    linkedinUrl,
    portfolioUrl,
    resumeText,
    resumeFileName,
    resumeUpdatedAt,
    companyName,
    designation,
    cinOrRegistrationNumber,
    industry,
    companyWebsite,
    collegeAisheCode,
    collegeWebsite,
    accreditation,
    currentRole,
    yearsOfExperience,
    enrolledCourses,
    savedJobIds,
    badges,
    streakDays,
    xpPoints,
    markProfileUpdated,
    profileUpdatedAt
  } = req.body;

  if (typeof name === 'string' && name.trim()) user.name = name.trim();
  if (phone !== undefined && typeof phone === 'string') user.phone = phone.trim();
  if (typeof education === 'string') user.education = education;
  if (typeof college === 'string') {
    user.college = college;
    user.institution = college;
  }
  if (typeof collegeId === 'string') user.collegeId = collegeId;
  if (typeof branch === 'string') user.branch = branch.trim();
  if (typeof course === 'string') user.course = course.trim();
  if (typeof studyYear === 'string') user.studyYear = studyYear;
  if (typeof rollNumber === 'string') user.rollNumber = rollNumber.trim();
  if (typeof cgpa === 'string') user.cgpa = cgpa.trim();
  if (typeof graduationYear === 'string') user.graduationYear = graduationYear;
  if (typeof location === 'string') user.location = location.trim();
  if (typeof preferredLocation === 'string') user.preferredLocation = preferredLocation.trim();
  if (
    workModePreference === 'Online' ||
    workModePreference === 'Offline' ||
    workModePreference === 'Hybrid' ||
    workModePreference === 'Any'
  ) {
    user.workModePreference = workModePreference;
  }
  if (age !== undefined && age !== null && !Number.isNaN(Number(age))) user.age = Number(age);
  if (Array.isArray(skills)) user.skills = skills;
  if (Array.isArray(nonTechnicalSkills)) user.nonTechnicalSkills = nonTechnicalSkills;
  if (Array.isArray(interests)) user.interests = interests;
  if (Array.isArray(preferredRoles)) user.preferredRoles = preferredRoles;
  if (typeof preferredDomain === 'string') user.preferredDomain = preferredDomain.trim();
  if (typeof careerGoals === 'string') user.careerGoals = careerGoals.trim();
  if (Array.isArray(projects)) user.projects = projects;
  if (githubUrl !== undefined) user.githubUrl = githubUrl;
  if (linkedinUrl !== undefined) user.linkedinUrl = linkedinUrl;
  if (portfolioUrl !== undefined) user.portfolioUrl = portfolioUrl;
  if (typeof resumeText === 'string') user.resumeText = resumeText.slice(0, 150000);
  if (typeof resumeFileName === 'string') user.resumeFileName = resumeFileName.slice(0, 200);
  if (typeof resumeUpdatedAt === 'string') user.resumeUpdatedAt = resumeUpdatedAt.slice(0, 64);
  if (typeof companyName === 'string') user.companyName = companyName.trim();
  if (typeof designation === 'string') user.designation = designation.trim();
  if (typeof cinOrRegistrationNumber === 'string') user.cinOrRegistrationNumber = cinOrRegistrationNumber.trim();
  if (typeof industry === 'string') user.industry = industry.trim();
  if (typeof companyWebsite === 'string') user.companyWebsite = companyWebsite.trim();
  if (typeof collegeAisheCode === 'string') user.collegeAisheCode = collegeAisheCode.trim();
  if (typeof collegeWebsite === 'string') user.collegeWebsite = collegeWebsite.trim();
  if (typeof accreditation === 'string') user.accreditation = accreditation.trim();
  if (typeof currentRole === 'string') user.currentRole = currentRole.trim();
  if (typeof yearsOfExperience === 'string') user.yearsOfExperience = yearsOfExperience.trim();
  if (Array.isArray(enrolledCourses)) user.enrolledCourses = enrolledCourses;
  if (Array.isArray(savedJobIds)) user.savedJobIds = savedJobIds;
  if (Array.isArray(badges)) user.badges = badges;
  if (typeof streakDays === 'number' && streakDays >= 0) user.streakDays = streakDays;
  if (typeof xpPoints === 'number' && xpPoints >= 0) user.xpPoints = xpPoints;

  const nowIso = new Date().toISOString();
  user.updatedAt = nowIso;
  if (markProfileUpdated === true) {
    user.profileUpdatedAt =
      typeof profileUpdatedAt === 'string' && profileUpdatedAt.trim()
        ? profileUpdatedAt.trim().slice(0, 64)
        : nowIso;
  }

  recordAuditLog('PROFILE_UPDATED', user.email, 'SUCCESS', 'Profile details updated', user.role);
  saveStore();
  return res.json({ success: true, profileUpdatedAt: user.profileUpdatedAt, user: sanitizeUser(user) });
};

app.post('/api/user/profile', handleUpdateProfile);
app.put('/api/user/profile', handleUpdateProfile);

// Strictly UID-scoped certificates endpoints
app.get('/api/certificates', async (req: Request, res: Response) => {
  const user = await authenticateRequest(req);
  if (!user) return res.status(401).json({ error: 'Authentication required to view certificates.' });

  const userCerts = certificatesDatabase.filter(c => c.userId === user.id);
  return res.json({ success: true, certificates: userCerts });
});

app.post('/api/certificates/issue', async (req: Request, res: Response) => {
  const user = await authenticateRequest(req);
  if (!user) return res.status(401).json({ error: 'Authentication required to issue certificate.' });
  const { id, courseId, courseTitle, score, instructor, certificateCode, issueDate, qrData } = req.body;
  if (!courseId) return res.status(400).json({ error: 'Course ID is required.' });

  const cleanCode =
    typeof certificateCode === 'string' && certificateCode.trim()
      ? certificateCode.trim().slice(0, 80)
      : `YM-${new Date().getFullYear()}-${crypto.randomInt(100000, 999999)}`;
  const cleanId =
    typeof id === 'string' && id.trim()
      ? id.trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128)
      : `cert-${Date.now()}-${crypto.randomInt(100, 999)}`;
  const numericScore = Math.max(0, Math.min(100, typeof score === 'number' ? score : 100));
  const nowIso = new Date().toISOString();

  // Deduplicate by (userId, courseId) or certificate id so retries don't duplicate
  let certRecord = certificatesDatabase.find(
    c => c.userId === user.id && (c.id === cleanId || (c.source === 'earned' && c.courseId === String(courseId)))
  );
  if (!certRecord) {
    certificatesIssuedCount += 1;
    certRecord = {
      id: cleanId,
      userId: user.id,
      certificateCode: cleanCode,
      studentName: user.name,
      courseId: String(courseId).slice(0, 128),
      courseTitle: typeof courseTitle === 'string' && courseTitle.trim() ? courseTitle.trim().slice(0, 200) : String(courseId),
      issueDate: typeof issueDate === 'string' && issueDate.trim() ? issueDate.trim().slice(0, 64) : nowIso.split('T')[0],
      scorePercentage: numericScore,
      qrData: typeof qrData === 'string' && qrData.trim() ? qrData.trim().slice(0, 500) : `https://yuvamitraa.gov.in/verify/${cleanCode}`,
      instructor: typeof instructor === 'string' && instructor.trim() ? instructor.trim().slice(0, 160) : 'YuvaMitraa Skill Foundation',
      source: 'earned',
      issuer: 'YuvaMitraa Skill Foundation',
      createdAt: nowIso,
    };
    certificatesDatabase.unshift(certRecord);
  } else {
    certRecord.scorePercentage = Math.max(certRecord.scorePercentage, numericScore);
  }

  if (!Array.isArray(user.enrolledCourses)) user.enrolledCourses = [];
  const existing = user.enrolledCourses.find(c => c.courseId === courseId);
  if (existing) {
    existing.passed = true;
    existing.finalScore = numericScore;
    if (!existing.certificateId) existing.certificateId = certRecord.id;
  } else {
    user.enrolledCourses.push({
      courseId,
      completedModuleIds: [],
      passed: true,
      finalScore: numericScore,
      certificateId: certRecord.id
    });
  }

  recordAuditLog('CERTIFICATE_ISSUED', user.email, 'SUCCESS', `Issued certificate ${certRecord.certificateCode} for ${courseId}`, user.role);
  saveStore();
  return res.json({ success: true, certificateId: certRecord.certificateCode, certificate: certRecord, user: sanitizeUser(user) });
});

app.post('/api/certificates/upload', async (req: Request, res: Response) => {
  const user = await authenticateRequest(req);
  if (!user) return res.status(401).json({ error: 'Authentication required to upload certificate.' });

  const { id, courseTitle, issuer, issueDate, certificateCode, credentialUrl, fileName } = req.body;
  if (!courseTitle || !String(courseTitle).trim()) {
    return res.status(400).json({ error: 'Certificate title is required.' });
  }
  if (!issuer || !String(issuer).trim()) {
    return res.status(400).json({ error: 'Issuing organization is required.' });
  }

  const nowIso = new Date().toISOString();
  const cleanCode =
    typeof certificateCode === 'string' && certificateCode.trim()
      ? certificateCode.trim().slice(0, 80)
      : `EXT-${new Date().getFullYear()}-${crypto.randomInt(100000, 999999)}`;
  const cleanId =
    typeof id === 'string' && id.trim()
      ? id.trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128)
      : `cert-up-${Date.now()}-${crypto.randomInt(100, 999)}`;

  const safeUrl =
    typeof credentialUrl === 'string' && /^https?:\/\//i.test(credentialUrl.trim())
      ? credentialUrl.trim().slice(0, 500)
      : '';

  const certRecord: CertificateRecord = {
    id: cleanId,
    userId: user.id,
    certificateCode: cleanCode,
    studentName: user.name,
    courseId: 'external-upload',
    courseTitle: String(courseTitle).trim().slice(0, 200),
    issueDate: typeof issueDate === 'string' && issueDate.trim() ? issueDate.trim().slice(0, 64) : nowIso.split('T')[0],
    scorePercentage: 100,
    qrData: safeUrl || `https://yuvamitraa.gov.in/verify/${cleanCode}`,
    instructor: String(issuer).trim().slice(0, 160),
    source: 'uploaded',
    issuer: String(issuer).trim().slice(0, 160),
    credentialUrl: safeUrl || undefined,
    fileName: typeof fileName === 'string' && fileName.trim() ? fileName.trim().slice(0, 200) : undefined,
    createdAt: nowIso,
  };

  certificatesDatabase.unshift(certRecord);
  recordAuditLog('CERTIFICATE_UPLOADED', user.email, 'SUCCESS', `Uploaded certificate "${certRecord.courseTitle}" (${certRecord.certificateCode})`, user.role);
  saveStore();
  return res.json({ success: true, certificate: certRecord });
});

app.delete('/api/certificates/:id', async (req: Request, res: Response) => {
  const user = await authenticateRequest(req);
  if (!user) return res.status(401).json({ error: 'Authentication required to delete certificate.' });

  const { id } = req.params;
  const idx = certificatesDatabase.findIndex(c => c.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Certificate not found.' });
  }
  const target = certificatesDatabase[idx];
  if (target.userId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: You can only delete your own certificates.' });
  }

  certificatesDatabase.splice(idx, 1);
  saveStore();
  return res.json({ success: true });
});

// 15. Report Suspicious Job or Recruiter
interface ReportedJobItem {
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
const reportedJobsStore: ReportedJobItem[] = [
  {
    id: 'rep-seed-1',
    jobId: 'job-flagged-sample',
    jobTitle: 'Data Entry Work From Home (Deposit Required)',
    company: 'Unverified QuickCash Corp',
    reportedByEmail: 'student@example.com',
    reason: 'Asked for upfront registration fee before joining',
    details: 'Recruiter asked for ₹500 fee on WhatsApp before interview.',
    reportedAt: new Date(Date.now() - 86400000).toISOString(),
    status: 'pending'
  }
];

app.post('/api/jobs/report', (req: Request, res: Response) => {
  const { jobId, jobTitle, company, reason, details, userEmail } = req.body;
  if (!jobId || !reason) {
    return res.status(400).json({ error: 'Job ID and reason are required.' });
  }
  const reportItem: ReportedJobItem = {
    id: `rep-${Date.now()}`,
    jobId,
    jobTitle: jobTitle || 'Internship / Job Opening',
    company: company || 'Employer',
    reportedByEmail: userEmail || 'anonymous@user',
    reason,
    details,
    reportedAt: new Date().toISOString(),
    status: 'pending'
  };
  reportedJobsStore.unshift(reportItem);
  recordAuditLog('JOB_REPORTED', userEmail || 'user', 'SUCCESS', `Reported job "${jobTitle}" for "${reason}"`);
  saveStore();
  return res.json({ success: true, message: 'Report submitted. Our moderation team will investigate within 24 hours.' });
});


// ------------------------------------------
// ADMIN MANAGEMENT ENDPOINTS
// ------------------------------------------

// Middleware to verify admin token (supports verified backend admin session or Firebase ID token with admin: true claim)
async function requireAdmin(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin authentication required.' });
  }
  const token = authHeader.split(' ')[1];
  const session = sessions.get(token);
  if (session && Date.now() <= session.expiresAt) {
    const user = usersDatabase.find(u => u.id === session.userId);
    if (user && user.role === 'admin' && user.email.toLowerCase() === AUTHORIZED_ADMIN_EMAIL) {
      return next();
    }
    return res.status(403).json({ error: 'Access forbidden: Administrator privileges required.' });
  }

  try {
    const decoded = await verifyFirebaseIdToken(token);
    if (
      decoded.admin === true &&
      decoded.email_verified === true &&
      String(decoded.email || '').toLowerCase() === AUTHORIZED_ADMIN_EMAIL
    ) {
      return next();
    }
    return res.status(403).json({ error: 'Access forbidden: Verified admin custom claim required.' });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired admin session.' });
  }
}

app.get('/api/admin/stats', requireAdmin, (_req: Request, res: Response) => {
  const students = usersDatabase.filter(u => u.role === 'student').length;
  const colleges = collegesDatabase.length;
  const recruiters = companiesDatabase.length;
  const admins = usersDatabase.filter(u => u.role === 'admin').length;
  const pendingOpps = jobsDatabase.filter(j => j.verificationStatus === 'pending').length;
  const pendingVerifs = verificationRequestsDatabase.filter(v => v.status === 'pending').length;
  const totalPlaced = applicationsDatabase.filter(a => a.status === 'Selected').length;
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const activeTodayUsers = usersDatabase.filter(u => u.lastLoginAt && new Date(u.lastLoginAt).getTime() >= oneDayAgo).length;

  return res.json({
    totalStudents: students,
    totalColleges: colleges,
    totalRecruiters: recruiters,
    totalAdmins: admins,
    totalUsers: usersDatabase.length,
    activeSessions: sessions.size,
    totalJobs: jobsDatabase.length,
    pendingOpportunities: pendingOpps,
    pendingVerifications: pendingVerifs,
    totalApplications: applicationsDatabase.length,
    totalPlaced: totalPlaced,
    totalCertificatesIssued: certificatesIssuedCount,
    activeToday: Math.max(activeTodayUsers, sessions.size)
  });
});

app.get('/api/admin/users', requireAdmin, (_req: Request, res: Response) => {
  return res.json({
    users: usersDatabase.map(sanitizeUser)
  });
});

app.post('/api/admin/user-status', requireAdmin, (req: Request, res: Response) => {
  const { userId, status } = req.body;
  const user = usersDatabase.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role === 'admin') return res.status(400).json({ error: 'Cannot modify Super Administrator status' });

  user.status = status === 'suspended' ? 'suspended' : 'active';
  recordAuditLog('ADMIN_USER_STATUS_CHANGE', user.email, 'SUCCESS', `User status changed to ${user.status}`);
  saveStore();
  return res.json({ success: true, user: sanitizeUser(user) });
});

app.get('/api/admin/audit-logs', requireAdmin, (_req: Request, res: Response) => {
  return res.json({
    auditLogs
  });
});

app.get('/api/admin/reported-jobs', requireAdmin, (_req: Request, res: Response) => {
  return res.json({
    success: true,
    reportedJobs: reportedJobsStore
  });
});

app.post('/api/admin/reported-jobs/:id/action', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { action } = req.body;
  const report = reportedJobsStore.find(r => r.id === id);
  if (!report) return res.status(404).json({ error: 'Report not found' });
  report.status = action === 'dismiss' ? 'dismissed' : 'resolved';

  if (action === 'resolve') {
    const job = jobsDatabase.find(j => j.id === report.jobId);
    if (job) {
      job.verificationStatus = 'rejected';
      job.isVerified = false;
      job.verificationEvidence = 'Flagged by Moderation Team following user fraud reports.';
    }
  }

  saveStore();
  return res.json({ success: true, report });
});

// ------------------------------------------
// 1. OPPORTUNITIES & INTERNSHIPS API
// ------------------------------------------

function resolveOpportunitySourceLabel(sourceName: string): string {
  const lower = String(sourceName || '').toLowerCase();
  if (lower.includes('aicte')) return 'AICTE Portal';
  if (lower.includes('ncs') || lower.includes('national career')) return 'National Career Service (NCS)';
  if (lower.includes('indianapi')) return 'IndianAPI Jobs';
  if (lower.includes('arbeitnow')) return 'Arbeitnow';
  if (lower.includes('remotive')) return 'Remotive';
  if (lower.includes('firestore')) return 'Firestore Verified';
  return sourceName || 'Verified Partner';
}

function mapInternshipToJobRecord(internship: InternshipListing): JobRecord {
  const sourceLabel = resolveOpportunitySourceLabel(internship.sourceName);
  const posted = internship.createdAt ? String(internship.createdAt).split('T')[0] : 'Active Opening';
  return {
    id: internship.id,
    title: internship.title,
    company: internship.companyName,
    companyLogo:
      internship.companyLogo ||
      (internship.isGovernmentScheme
        ? 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=120&q=80'
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(internship.companyName)}&background=0284C7&color=fff`),
    creatorRole: 'admin',
    location: internship.location,
    city: internship.location.split(',')[0].trim() || 'India',
    coordinates: resolveIndianCityCoordinates(internship.location),
    type: internship.workMode === 'Remote' ? 'remote' : 'internship',
    category: internship.category || (internship.isGovernmentScheme ? 'Government' : 'Tech'),
    stipend: internship.stipend || '',
    stipendAmount: parseCompensationAmount(internship.stipend),
    duration: internship.duration || 'Internship',
    requiredSkills: internship.skills || [],
    eligibility: internship.eligibility,
    description: internship.description,
    responsibilities: [],
    perks: [],
    deadline: internship.applicationDeadline || 'Open',
    applicantsCount: 0,
    postedDate: posted,
    isVerified: internship.verifiedStatus === 'Verified',
    verificationStatus: internship.verifiedStatus === 'Verified' ? 'approved' : 'pending',
    verificationEvidence: `Source: ${sourceLabel}`,
    opportunitySource: sourceLabel,
    originalUrl: internship.applyUrl,
    externalSourceUrl: internship.applyUrl,
    dateVerified: internship.lastVerifiedAt ? String(internship.lastVerifiedAt).split('T')[0] : undefined,
    isGovernmentSponsored: Boolean(internship.isGovernmentScheme),
  };
}

function mapExternalJobToJobRecord(job: JobListing): JobRecord {
  const sourceLabel = resolveOpportunitySourceLabel(job.sourceName);
  const posted = job.createdAt ? String(job.createdAt).split('T')[0] : 'Active Opening';
  return {
    id: job.id,
    title: job.title,
    company: job.companyName,
    companyLogo:
      job.companyLogo ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(job.companyName)}&background=0F172A&color=fff`,
    creatorRole: 'admin',
    location: job.location,
    city: job.location.split(',')[0].trim() || 'Remote',
    coordinates: resolveIndianCityCoordinates(job.location),
    type: job.workMode === 'Remote' ? 'remote' : (job.employmentType === 'Internship' ? 'internship' : (job.employmentType === 'Part-time' ? 'part-time' : 'full-time')),
    category: job.category || 'Tech',
    stipend: job.salary || '',
    stipendAmount: parseCompensationAmount(job.salary),
    duration: job.employmentType || 'Full-time',
    requiredSkills: job.requiredSkills || [],
    description: job.description,
    responsibilities: [],
    perks: [],
    deadline: 'Open',
    applicantsCount: 0,
    postedDate: posted,
    isVerified: job.verifiedStatus === 'Verified',
    verificationStatus: job.verifiedStatus === 'Verified' ? 'approved' : 'pending',
    verificationEvidence: `Source: ${sourceLabel}`,
    opportunitySource: sourceLabel,
    originalUrl: job.applyUrl,
    externalSourceUrl: job.applyUrl,
    dateVerified: job.lastVerifiedAt ? String(job.lastVerifiedAt).split('T')[0] : undefined,
    isGovernmentSponsored: job.sourceName.includes('NCS') || job.sourceName.includes('National Career Service'),
  };
}

// Fetch Opportunities (Returns approved opportunities, plus live synced external listings)
app.get('/api/opportunities', async (req: Request, res: Response) => {
  try {
    // Cap initial external sync wait at 1.5s so opportunities never stall user startup on slow networks
    await syncEngine.ensureInitialSync(1500).catch(() => {});
    const {
      category,
      type,
      search,
      collegeId,
      creatorId,
      showAll,
      source,
      skills,
      education,
      interests,
      preferredLocation,
      page,
      limit,
    } = req.query;

    // Base database listings (automatically exclude expired deadlines)
    const todayIso = new Date().toISOString().split('T')[0];
    const isExpiredDeadline = (deadline?: string): boolean => {
      const d = String(deadline || '').trim();
      if (!d || /rolling|open|ongoing|active/i.test(d)) return false;
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d < todayIso;
      const parsed = Date.parse(d);
      return !Number.isNaN(parsed) && parsed < Date.now() - 24 * 60 * 60 * 1000;
    };

    let list = jobsDatabase.filter(j => !isExpiredDeadline(j.deadline));

    // Filter by approval status
    if (showAll !== 'true') {
      list = list.filter(j => j.verificationStatus === 'approved' || (creatorId && j.creatorId === creatorId));
    }

    // Merge active verified listings from SyncEngine (Arbeitnow, Remotive, & any configured adapters)
    const externalInternships = syncEngine.getInternships({ includeExpired: false }).map(mapInternshipToJobRecord);
    const externalJobs = syncEngine.getJobs({ includeExpired: false }).map(mapExternalJobToJobRecord);
    const combined = [...list, ...externalInternships, ...externalJobs].filter(item => !isExpiredDeadline(item.deadline));

    // Deduplicate by ID
    const seenIds = new Set<string>();
    let uniqueList: JobRecord[] = [];
    for (const item of combined) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        uniqueList.push(item);
      }
    }

    if (source && source !== 'All') {
      const s = String(source).toLowerCase();
      uniqueList = uniqueList.filter(j => (j.opportunitySource || '').toLowerCase().includes(s));
    }

    if (category && category !== 'All') {
      uniqueList = uniqueList.filter(j => j.category.toLowerCase() === String(category).toLowerCase());
    }

    if (type && type !== 'All') {
      uniqueList = uniqueList.filter(j => j.type === type);
    }

    if (collegeId) {
      uniqueList = uniqueList.filter(j => !j.collegeId || j.collegeId === collegeId);
    }

    if (search) {
      const q = String(search).toLowerCase();
      uniqueList = uniqueList.filter(j =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q) ||
        j.requiredSkills.some(s => s.toLowerCase().includes(q))
      );
    }

    // Optional server-side filtering by student skills, education, interests & location
    if (skills || education || interests || preferredLocation) {
      const profileCriteria = {
        skills: skills ? String(skills).split(',').map(s => s.trim()).filter(Boolean) : [],
        education: education ? String(education) : '',
        interests: interests ? String(interests).split(',').map(s => s.trim()).filter(Boolean) : [],
        preferredLocation: preferredLocation ? String(preferredLocation) : '',
        location: preferredLocation ? String(preferredLocation) : '',
      };
      uniqueList = uniqueList
        .map(job => ({ job, match: matchJobWithStudentProfile(job as unknown as Job, profileCriteria) }))
        .filter(entry => entry.match.matches)
        .sort((a, b) => b.match.relevanceScore - a.match.relevanceScore)
        .map(entry => entry.job);
    }

    const total = uniqueList.length;
    const parsedLimit = limit ? Math.max(1, Math.min(200, Number(limit) || 0)) : 0;
    const parsedPage = page ? Math.max(1, Number(page) || 1) : 1;

    const lastSyncedAt = syncEngine.getLastSyncAt();

    if (parsedLimit > 0) {
      const start = (parsedPage - 1) * parsedLimit;
      const pagedJobs = uniqueList.slice(start, start + parsedLimit);
      return res.json({
        success: true,
        jobs: pagedJobs,
        total,
        page: parsedPage,
        limit: parsedLimit,
        hasMore: start + parsedLimit < total,
        lastSyncedAt,
      });
    }

    return res.json({ success: true, jobs: uniqueList, total, lastSyncedAt });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch opportunities' });
  }
});

// ------------------------------------------
// AUTOMATIC DATA INTEGRATION ENDPOINTS
// ------------------------------------------

// 1. Get Genuine Internships (Arbeitnow, Remotive, AICTE & Verified Partners)
app.get('/api/external/internships', async (req: Request, res: Response) => {
  try {
    await syncEngine.ensureInitialSync().catch(() => {});
    const { keyword, search, source, location, workMode, includeExpired } = req.query;
    const items = syncEngine.getInternships({
      keyword: (keyword || search) ? String(keyword || search) : undefined,
      source: source ? String(source) : undefined,
      location: location ? String(location) : undefined,
      workMode: workMode ? String(workMode) : undefined,
      includeExpired: includeExpired === 'true'
    });
    return res.json({ success: true, count: items.length, internships: items });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve genuine internships' });
  }
});

// 2. Get Genuine Jobs (Arbeitnow, Remotive, IndianAPI & NCS)
app.get('/api/external/jobs', async (req: Request, res: Response) => {
  try {
    await syncEngine.ensureInitialSync().catch(() => {});
    const { keyword, search, source, location, workMode, employmentType, type, includeExpired } = req.query;
    const items = syncEngine.getJobs({
      keyword: (keyword || search) ? String(keyword || search) : undefined,
      source: source ? String(source) : undefined,
      location: location ? String(location) : undefined,
      workMode: workMode ? String(workMode) : undefined,
      employmentType: (employmentType || type) ? String(employmentType || type) : undefined,
      includeExpired: includeExpired === 'true'
    });
    return res.json({ success: true, count: items.length, jobs: items });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve genuine jobs' });
  }
});

// 3. Get Sources Status (Admin Data Integration Dashboard)
app.get('/api/external/sources', (_req: Request, res: Response) => {
  try {
    const sources = syncEngine.getSourcesStatus();
    return res.json({ success: true, sources });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve sources status' });
  }
});

// 4. Get Data Synchronization Logs (Audit Trail)
app.get('/api/external/sync-logs', (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const logs = syncEngine.getSyncLogs(limit);
    return res.json({ success: true, count: logs.length, logs });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve sync logs' });
  }
});

// 5. Trigger Manual Sync (Admin only)
app.post('/api/external/sync/trigger', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { sourceId } = req.body;
    const results = await syncEngine.triggerManualSync(sourceId);
    return res.json({ success: true, message: 'Synchronization completed successfully', results });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Manual synchronization failed' });
  }
});

// 6. Pause / Enable Source Adapter (Admin only)
app.post('/api/external/sources/:id/toggle', requireAdmin, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    const ok = syncEngine.toggleSource(id, Boolean(enabled));
    if (!ok) return res.status(404).json({ error: 'Source adapter not found' });
    return res.json({ success: true, message: `Source "${id}" ${enabled ? 'enabled' : 'paused'}` });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to toggle source adapter' });
  }
});

// 7. Personalized Recommendations for Student (40/25/20/10/5 Weighted AI Matching + Skill Gap Analysis)
app.post('/api/external/recommendations', async (req: Request, res: Response) => {
  try {
    await syncEngine.ensureInitialSync().catch(() => {});
    const { studentProfile, firestoreInternships = [], limit = 8 } = req.body;
    const maxItems = Math.min(Math.max(Number(limit) || 8, 1), 20);

    const allInternships = syncEngine.getInternships();
    const allExternalJobs = syncEngine.getJobs();
    const strictlyInternJobs = allExternalJobs.filter(
      j => j.employmentType === 'Internship' || /intern|trainee|fellow|apprentice|junior|entry|graduate/i.test(j.title)
    );
    const seenExternalJobIds = new Set(strictlyInternJobs.map(j => j.id));
    const externalInternshipJobs =
      allInternships.length + strictlyInternJobs.length >= maxItems
        ? strictlyInternJobs
        : [
            ...strictlyInternJobs,
            ...allExternalJobs.filter(j => !seenExternalJobIds.has(j.id)).slice(0, 30),
          ];

    const mapExternalMode = (wm?: string): 'Online' | 'Offline' | 'Hybrid' => {
      if (wm === 'Remote') return 'Online';
      if (wm === 'Hybrid') return 'Hybrid';
      return 'Offline';
    };

    const externalCandidates: UnifiedInternshipCandidate[] = [
      ...allInternships.map(i => ({
        id: i.id,
        jobId: i.id,
        title: i.title,
        companyName: i.companyName,
        description: i.description || '',
        category: i.category || (i.isGovernmentScheme ? 'Government' : 'Tech'),
        type: 'internship',
        requiredSkills: i.skills || [],
        eligibility: i.eligibility || 'Open to eligible students',
        stipend: i.stipend || '',
        duration: i.duration || 'Internship',
        workMode: mapExternalMode(i.workMode),
        location: i.location || 'Remote',
        applicationDeadline: i.applicationDeadline || 'Open',
        applyUrl: i.applyUrl || i.sourceUrl || '',
        sourceName: i.sourceName,
        isVerified: i.verifiedStatus === 'Verified',
        isGovernmentSponsored: Boolean(i.isGovernmentScheme),
        verifiedStatus: i.verifiedStatus,
      })),
      ...externalInternshipJobs.map(j => ({
        id: j.id,
        jobId: j.id,
        title: j.title,
        companyName: j.companyName,
        description: j.description || '',
        category: j.category || 'Tech',
        type: 'internship',
        requiredSkills: j.requiredSkills || [],
        eligibility: 'Open to eligible students & early-career applicants',
        stipend: j.salary || '',
        duration: j.employmentType || 'Role',
        workMode: mapExternalMode(j.workMode),
        location: j.location || 'Remote',
        applicationDeadline: 'Open',
        applyUrl: j.applyUrl || j.sourceUrl || '',
        sourceName: j.sourceName,
        isVerified: j.verifiedStatus === 'Verified',
        isGovernmentSponsored: j.sourceName.includes('NCS') || j.sourceName.includes('National Career Service'),
        verifiedStatus: j.verifiedStatus,
      })),
    ];

    const firestoreCandidates: UnifiedInternshipCandidate[] = Array.isArray(firestoreInternships)
      ? firestoreInternships
          .filter((item: any) => item && item.verifiedStatus === 'Verified' && item.title && item.companyName)
          .map((item: any) => ({
            id: String(item.id),
            jobId: String(item.id),
            title: String(item.title),
            companyName: String(item.companyName),
            description: String(item.description || ''),
            category: item.isGovernmentScheme ? 'Government' : 'Tech',
            type: 'internship',
            requiredSkills: Array.isArray(item.skills) ? item.skills.map(String) : [],
            eligibility: String(item.eligibility || 'Open to eligible students'),
            stipend: String(item.stipend || ''),
            duration: String(item.duration || 'Internship'),
            workMode: mapExternalMode(item.workMode),
            location: String(item.location || 'India'),
            applicationDeadline: String(item.applicationDeadline || 'Active Opening'),
            applyUrl: String(item.applyUrl || item.sourceUrl || ''),
            sourceName: String(item.sourceName || 'Verified Partner'),
            isVerified: true,
            isGovernmentSponsored: Boolean(item.isGovernmentScheme),
            verifiedStatus: 'Verified',
          }))
      : [];

    const platformCandidates: UnifiedInternshipCandidate[] = jobsDatabase
      .filter(j => j.verificationStatus === 'approved' && (j.type === 'internship' || j.type === 'remote' || /intern|trainee|fellow/i.test(j.title)))
      .map(j => jobToCandidate(j as unknown as Job));

    const allCandidates = [...externalCandidates, ...firestoreCandidates, ...platformCandidates];

    const sourceStatus = {
      externalApiCount: externalCandidates.length,
      firestoreCount: firestoreCandidates.length,
      platformVerifiedCount: platformCandidates.length,
      externalUnavailable: externalCandidates.length === 0,
      totalVerifiedCount: allCandidates.length,
    };

    if (!studentProfile || allCandidates.length === 0) {
      return res.json({
        success: true,
        recommendations: [],
        overallMissingSkills: [],
        topSkillGapResources: [],
        beginnerFriendlyCount: 0,
        profileSignature: '',
        sourceStatus,
      });
    }

    const ranked = rankInternshipsForStudent(studentProfile, allCandidates, maxItems);

    // Optional Gemini enrichment strictly for personalized "Why this internship matches you" narrative (non-blocking)
    if (process.env.GEMINI_API_KEY && ranked.recommendations.length > 0) {
      try {
        const promptItems = ranked.recommendations.slice(0, 6).map(r => ({
          id: r.internshipId,
          title: r.title,
          companyName: r.companyName,
          matchScore: r.matchScore,
          matchedSkills: r.matchedSkills,
          missingSkills: r.missingSkills,
          breakdown: r.breakdown,
          location: r.location,
          workMode: r.workMode,
          eligibility: r.eligibility,
        }));

        const aiPrompt = `You are the YuvaMitraa AI Career Advisor.
Write concise, personalized 1-2 sentence explanations ("why it matches") for why each verified internship fits this specific student.

Student Profile:
- Name: ${studentProfile.name || 'Student'}
- Education: ${studentProfile.education || ''} | Course: ${studentProfile.course || ''} | Branch: ${studentProfile.branch || ''} | Semester/Year: ${studentProfile.studyYear || ''}
- Technical Skills: ${(studentProfile.skills || []).join(', ') || 'None specified yet'}
- Non-Technical Skills: ${(studentProfile.nonTechnicalSkills || []).join(', ') || 'None specified'}
- Areas of Interest: ${(studentProfile.interests || []).join(', ') || 'General'}
- Preferred Domain: ${studentProfile.preferredDomain || 'Open'}
- Career Goals: ${studentProfile.careerGoals || 'Industry internship readiness'}
- Preferred Location: ${studentProfile.preferredLocation || studentProfile.location || 'India'}
- Work Mode Preference: ${studentProfile.workModePreference || 'Any'}

Verified Ranked Matches (DO NOT alter matchScore or invent companies/skills):
${JSON.stringify(promptItems)}

For each internship ID, write an encouraging, concrete "matchReason" referencing the student's actual matched skills, branch/interest, location preference, and mention missing skills (if any) they can bridge.`;

        const aiResponse = await generateContentWithRetry(
          {
            model: 'gemini-4-hydrogen',
            contents: aiPrompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    matchReason: { type: Type.STRING },
                  },
                },
              },
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            },
          },
          15000,
          'RecommendationNarrative'
        );

        const parsedReasons = cleanAndParseJSON(aiResponse.text || '[]');
        if (Array.isArray(parsedReasons)) {
          for (const rec of ranked.recommendations) {
            const enriched = parsedReasons.find((p: any) => p?.id === rec.internshipId && typeof p?.matchReason === 'string' && p.matchReason.trim());
            if (enriched) {
              rec.matchReason = enriched.matchReason.trim();
            }
          }
        }
      } catch (aiErr: any) {
        console.warn('[Recommendations] Gemini explanation enrichment skipped (using deterministic grounded reasons):', aiErr?.message || aiErr);
      }
    }

    return res.json({
      success: true,
      recommendations: ranked.recommendations,
      overallMissingSkills: ranked.overallMissingSkills,
      topSkillGapResources: ranked.topSkillGapResources,
      beginnerFriendlyCount: ranked.beginnerFriendlyCount,
      profileSignature: ranked.profileSignature,
      sourceStatus,
      updatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return sendAiError(res, err, 'Failed to generate AI recommendations.');
  }
});

// Post Genuine Opportunity (With Fraud Detection & Verification Queue)
app.post('/api/opportunities', async (req: Request, res: Response) => {
  try {
    const creator = await authenticateRequest(req);
    if (!creator) {
      return res.status(401).json({ error: 'Authentication required to post an opportunity.' });
    }
    if (creator.role !== 'recruiter' && creator.role !== 'college' && creator.role !== 'admin') {
      return res.status(403).json({ error: 'Only verified recruiters, colleges, or administrators can post opportunities.' });
    }

    const {
      title,
      company,
      companyLogo,
      location,
      city,
      type = 'internship',
      category = 'Tech',
      stipend,
      stipendAmount = 15000,
      duration = '3 Months',
      requiredSkills = [],
      eligibility,
      description,
      responsibilities = [],
      perks = [],
      deadline = '2026-12-31',
      opportunitySource = 'Direct Employer',
      collegeId,
      targetColleges
    } = req.body;

    if (!title || !company || !description) {
      return res.status(400).json({ error: 'Opportunity title, organization name, and description are required.' });
    }

    const fraudTriggers = ['registration fee', 'deposit money', 'pay money', 'security deposit', 'telegram only', 'earn 50000 daily without work'];
    const lowerDesc = `${title} ${description} ${(Array.isArray(responsibilities) ? responsibilities : []).join(' ')}`.toLowerCase();
    const hasFraudTrigger = fraudTriggers.some(trigger => lowerDesc.includes(trigger));

    if (hasFraudTrigger) {
      recordAuditLog('OPPORTUNITY_FLAGGED', creator.email || company, 'BLOCKED', `Suspicious keywords detected in opportunity "${title}"`);
      return res.status(400).json({
        error: 'Opportunity rejected by automated anti-fraud policy: Asking for registration fees or security deposits is strictly prohibited on YuvaMitraa.'
      });
    }

    const isVerifiedCreator = creator.isVerified === true || creator.role === 'admin' || creator.role === 'college';
    const verificationStatus = isVerifiedCreator ? 'approved' : 'pending';
    const isVerified = isVerifiedCreator;
    const jobLocation = location?.trim() || 'India';

    const newJob: JobRecord = {
      id: `job-${Date.now()}`,
      title: title.trim(),
      company: company.trim(),
      companyLogo: companyLogo || 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=120&q=80',
      creatorId: creator.id,
      creatorRole: creator.role === 'college' ? 'college' : (creator.role === 'admin' ? 'admin' : 'recruiter'),
      collegeId: collegeId || (creator.role === 'college' ? creator.collegeId : undefined),
      targetColleges,
      location: jobLocation,
      city: city?.trim() || jobLocation.split(',')[0].trim() || 'India',
      coordinates: resolveIndianCityCoordinates(jobLocation),
      type,
      category,
      stipend: stipend || '₹18,000 / month',
      stipendAmount: Number(stipendAmount) || 18000,
      duration,
      requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : String(requiredSkills).split(',').map(s => s.trim()).filter(Boolean),
      eligibility: eligibility || 'Open to all eligible undergraduate and graduate students with relevant skills.',
      description: description.trim(),
      responsibilities: Array.isArray(responsibilities) && responsibilities.length > 0 ? responsibilities : ['Contribute to team deliverables', 'Document work progress', 'Participate in learning syncs'],
      perks: Array.isArray(perks) && perks.length > 0 ? perks : ['Certificate of Completion', 'PPO Consideration', 'Flexible Timings'],
      deadline,
      applicantsCount: 0,
      postedDate: 'Just now',
      isVerified,
      verificationStatus,
      verificationEvidence: isVerifiedCreator ? `Verified by ${creator.role === 'college' ? 'College Placement Office' : 'Corporate Identity MCA Gateway'}` : undefined,
      opportunitySource: creator.role === 'college' ? 'College Placement Cell' : opportunitySource
    };

    jobsDatabase.unshift(newJob);

    if (!isVerifiedCreator) {
      verificationRequestsDatabase.unshift({
        id: `vreq-${Date.now()}`,
        entityId: newJob.id,
        entityType: 'opportunity',
        name: `${newJob.title} (${newJob.company})`,
        identifier: `Job ID: ${newJob.id}`,
        submittedAt: new Date().toISOString(),
        status: 'pending',
        details: `New opportunity posted by unverified employer ${company}. Stipend: ${newJob.stipend}. Requires admin moderation before public listing.`
      });

      notificationsDatabase.unshift({
        id: `notif-${Date.now()}`,
        targetRole: 'admin',
        title: 'New Opportunity Awaiting Approval',
        message: `"${newJob.title}" at ${newJob.company} has been submitted for verification.`,
        date: 'Just now',
        type: 'verification',
        read: false,
        actionTab: 'admin'
      });
    }

    recordAuditLog('OPPORTUNITY_POSTED', creator.email, 'SUCCESS', `Posted opportunity "${title}" (Status: ${verificationStatus})`);
    saveStore();

    return res.json({
      success: true,
      job: newJob,
      message: isVerifiedCreator
        ? 'Opportunity published successfully and visible to candidates!'
        : 'Opportunity submitted! It is currently in the verification queue and will appear publicly once approved by administrators.'
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to post opportunity' });
  }
});

// Update Opportunity (Owner or Admin)
app.put('/api/opportunities/:id', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    const { id } = req.params;
    const job = jobsDatabase.find(j => j.id === id);
    if (!job) return res.status(404).json({ error: 'Opportunity not found' });

    if (user.role !== 'admin' && job.creatorId !== user.id) {
      return res.status(403).json({ error: 'Access denied: You can only edit opportunities you created.' });
    }

    const { title, company, location, city, type, category, stipend, stipendAmount, duration, requiredSkills, eligibility, description, deadline } = req.body;
    const fraudTriggers = ['registration fee', 'deposit money', 'pay money', 'security deposit', 'telegram only', 'earn 50000 daily without work'];
    const combinedText = `${title || job.title} ${description || job.description}`.toLowerCase();
    if (fraudTriggers.some(t => combinedText.includes(t))) {
      return res.status(400).json({ error: 'Update rejected by automated anti-fraud policy.' });
    }

    if (typeof title === 'string' && title.trim()) job.title = title.trim();
    if (typeof company === 'string' && company.trim()) job.company = company.trim();
    if (typeof location === 'string' && location.trim()) {
      job.location = location.trim();
      job.coordinates = resolveIndianCityCoordinates(job.location);
    }
    if (typeof city === 'string' && city.trim()) job.city = city.trim();
    if (type) job.type = type;
    if (category) job.category = category;
    if (typeof stipend === 'string') job.stipend = stipend;
    if (stipendAmount !== undefined) job.stipendAmount = Number(stipendAmount) || job.stipendAmount;
    if (typeof duration === 'string') job.duration = duration;
    if (Array.isArray(requiredSkills)) job.requiredSkills = requiredSkills;
    if (typeof eligibility === 'string') job.eligibility = eligibility;
    if (typeof description === 'string' && description.trim()) job.description = description.trim();
    if (typeof deadline === 'string') job.deadline = deadline;

    recordAuditLog('OPPORTUNITY_UPDATED', user.email, 'SUCCESS', `Updated opportunity "${job.title}"`);
    saveStore();
    return res.json({ success: true, job });
  } catch {
    return res.status(500).json({ error: 'Failed to update opportunity' });
  }
});

// Admin Approve / Reject Opportunity
app.post('/api/opportunities/:id/verify', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { action, evidenceNotes } = req.body;
  const job = jobsDatabase.find(j => j.id === id);
  if (!job) return res.status(404).json({ error: 'Opportunity not found' });

  if (action === 'approve') {
    job.isVerified = true;
    job.verificationStatus = 'approved';
    job.verificationEvidence = evidenceNotes || 'Admin Verified: Company credentials and opportunity validity confirmed.';
  } else {
    job.isVerified = false;
    job.verificationStatus = 'rejected';
    job.verificationEvidence = evidenceNotes || 'Rejected by platform moderation guidelines.';
  }

  const vreq = verificationRequestsDatabase.find(v => v.entityId === id);
  if (vreq) {
    vreq.status = action === 'approve' ? 'approved' : 'rejected';
    vreq.actionNotes = evidenceNotes;
  }

  recordAuditLog('OPPORTUNITY_VERIFICATION', 'admin', 'SUCCESS', `Opportunity ${id} marked ${job.verificationStatus}`);
  saveStore();
  return res.json({ success: true, job });
});

// Delete Opportunity
app.delete('/api/opportunities/:id', async (req: Request, res: Response) => {
  const user = await authenticateRequest(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const { id } = req.params;
  const index = jobsDatabase.findIndex(j => j.id === id);
  if (index === -1) return res.status(404).json({ error: 'Opportunity not found' });

  if (user.role !== 'admin' && jobsDatabase[index].creatorId !== user.id) {
    return res.status(403).json({ error: 'Access denied: You can only delete opportunities you created.' });
  }

  const deleted = jobsDatabase.splice(index, 1)[0];
  recordAuditLog('OPPORTUNITY_DELETED', user.email, 'SUCCESS', `Opportunity "${deleted.title}" removed`);
  saveStore();
  return res.json({ success: true, message: 'Opportunity removed successfully.' });
});

// ------------------------------------------
// 2. APPLICATIONS MANAGEMENT & TRACKING API
// ------------------------------------------

// Fetch Applications (Authenticated & Role-Scoped)
app.get('/api/applications', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required to view applications.' });
    }

    const { candidateEmail, jobId, collegeName, status } = req.query;
    let list = [...applicationsDatabase];

    if (user.role === 'student' || user.role === 'experienced') {
      list = list.filter(
        a =>
          a.candidateId === user.id ||
          (!a.candidateId && a.candidateEmail.toLowerCase() === user.email.toLowerCase())
      );
    } else if (user.role === 'recruiter') {
      const ownedJobIds = new Set(jobsDatabase.filter(j => j.creatorId === user.id).map(j => j.id));
      const companyLower = (user.companyName || '').toLowerCase();
      list = list.filter(a => ownedJobIds.has(a.jobId) || (companyLower && a.company.toLowerCase() === companyLower));
    } else if (user.role === 'college') {
      const userCollegeLower = (user.college || '').toLowerCase();
      if (userCollegeLower) {
        list = list.filter(a => a.candidateCollege?.toLowerCase().includes(userCollegeLower));
      } else {
        list = [];
      }
    }

    if (candidateEmail && user.role === 'admin') {
      list = list.filter(a => a.candidateEmail.toLowerCase() === String(candidateEmail).toLowerCase());
    }
    if (jobId) {
      list = list.filter(a => a.jobId === jobId);
    }
    if (collegeName && user.role === 'admin') {
      list = list.filter(a => a.candidateCollege?.toLowerCase() === String(collegeName).toLowerCase());
    }
    if (status && status !== 'All') {
      list = list.filter(a => a.status === status);
    }

    return res.json({ success: true, applications: list });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Candidate Applies for Opportunity (Supports both local and synced AICTE/NCS/IndianAPI jobs)
app.post('/api/applications/apply', async (req: Request, res: Response) => {
  try {
    const candidate = await authenticateRequest(req);
    if (!candidate) {
      return res.status(401).json({ error: 'Please sign in to submit an application.' });
    }

    const { jobId, coverLetter, matchScore } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required.' });
    }

    const externalInternships = syncEngine.getInternships().map(mapInternshipToJobRecord);
    const externalJobs = syncEngine.getJobs().map(mapExternalJobToJobRecord);
    const job =
      jobsDatabase.find(j => j.id === jobId) ||
      externalInternships.find(j => j.id === jobId) ||
      externalJobs.find(j => j.id === jobId);

    if (!job) {
      return res.status(404).json({ error: 'Opportunity not found or no longer available.' });
    }

    const existingApp = applicationsDatabase.find(a =>
      a.jobId === jobId && (a.candidateId === candidate.id || a.candidateEmail.toLowerCase() === candidate.email.toLowerCase())
    );
    if (existingApp) {
      return res.status(400).json({
        error: `You have already applied for "${job.title}" at ${job.company}. Current status: ${existingApp.status}.`
      });
    }

    const newApp: ApplicationRecord = {
      id: `app-${Date.now()}`,
      jobId,
      jobTitle: job.title,
      company: job.company,
      candidateId: candidate.id,
      candidateName: candidate.name,
      candidateEmail: candidate.email,
      candidatePhone: candidate.phone || '',
      candidateCollege: candidate.college || candidate.institution || '',
      candidateBranch: candidate.branch || '',
      candidateGraduationYear: candidate.graduationYear || '',
      candidateSkills: candidate.skills || [],
      candidateResumeText: candidate.resumeText || '',
      status: 'Applied',
      appliedDate: new Date().toISOString().split('T')[0],
      updatedDate: new Date().toISOString().split('T')[0],
      coverLetter: coverLetter || '',
      matchScore: typeof matchScore === 'number' ? matchScore : undefined,
      notes: 'Application received and queued for recruiter review.'
    };

    applicationsDatabase.unshift(newApp);
    const localJob = jobsDatabase.find(j => j.id === jobId);
    if (localJob) {
      localJob.applicantsCount = (localJob.applicantsCount || 0) + 1;
    }

    notificationsDatabase.unshift({
      id: `notif-${Date.now()}`,
      userId: candidate.id,
      targetRole: candidate.role === 'admin' ? 'admin' : 'student',
      title: `Applied to ${job.company}`,
      message: `Your application for "${job.title}" was submitted successfully.`,
      date: 'Just now',
      type: 'application',
      read: false,
      actionTab: 'opportunities'
    });

    if (job.creatorId) {
      notificationsDatabase.unshift({
        id: `notif-${Date.now()}-rec`,
        userId: job.creatorId,
        targetRole: 'recruiter',
        title: `New Candidate Application: ${newApp.candidateName}`,
        message: `${newApp.candidateName} applied for ${job.title}.`,
        date: 'Just now',
        type: 'application',
        read: false,
        actionTab: 'recruiter'
      });
    }

    recordAuditLog('JOB_APPLICATION_SUBMITTED', candidate.email, 'SUCCESS', `Applied for ${job.title} at ${job.company}`);
    saveStore();

    return res.json({
      success: true,
      application: newApp,
      message: `Your application for "${job.title}" has been submitted successfully!`
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to submit application' });
  }
});

// Update Application Status & Schedule Interview (Recruiter / College / Admin)
app.post('/api/applications/:id/status', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });
    if (user.role !== 'recruiter' && user.role !== 'college' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Only recruiters, colleges, or administrators can update application status.' });
    }

    const { id } = req.params;
    const {
      status,
      interviewDate,
      interviewTime,
      interviewMode,
      interviewLinkOrVenue,
      recruiterFeedback,
      notes
    } = req.body;

    const application = applicationsDatabase.find(a => a.id === id);
    if (!application) {
      return res.status(404).json({ error: 'Application record not found.' });
    }

    const job = jobsDatabase.find(j => j.id === application.jobId);
    if (
      user.role === 'recruiter' &&
      job &&
      job.creatorId !== user.id &&
      (!user.companyName || job.company.toLowerCase() !== user.companyName.toLowerCase())
    ) {
      return res.status(403).json({ error: 'Access denied: You do not own this job posting.' });
    }

    application.status = status || application.status;
    application.updatedDate = new Date().toISOString().split('T')[0];
    if (interviewDate) application.interviewDate = interviewDate;
    if (interviewTime) application.interviewTime = interviewTime;
    if (interviewMode) application.interviewMode = interviewMode;
    if (interviewLinkOrVenue) application.interviewLinkOrVenue = interviewLinkOrVenue;
    if (recruiterFeedback) application.recruiterFeedback = recruiterFeedback;
    if (notes) application.notes = notes;

    let notifTitle = `Application Update: ${application.status}`;
    let notifMsg = `Your application for "${application.jobTitle}" at ${application.company} is now "${application.status}".`;
    let notifType: 'application' | 'interview' = 'application';

    if (application.status === 'Interview') {
      notifType = 'interview';
      notifTitle = 'Interview Invitation! 📅';
      notifMsg = `${application.company} has invited you for an interview on ${interviewDate || 'upcoming date'} (${interviewTime || 'TBD'}).`;
    } else if (application.status === 'Selected') {
      notifTitle = 'Congratulations! Offer Extended 🎉';
      notifMsg = `You have been Selected by ${application.company} for "${application.jobTitle}"!`;
    } else if (application.status === 'Shortlisted') {
      notifTitle = "You've been Shortlisted! 🌟";
      notifMsg = `${application.company} shortlisted your profile for "${application.jobTitle}".`;
    }

    notificationsDatabase.unshift({
      id: `notif-${Date.now()}`,
      userId: application.candidateId,
      targetRole: 'student',
      title: notifTitle,
      message: notifMsg,
      date: 'Just now',
      type: notifType,
      read: false,
      actionTab: 'opportunities'
    });

    recordAuditLog('APPLICATION_STATUS_UPDATED', application.candidateEmail, 'SUCCESS', `Status changed to ${application.status} by ${user.email}`);
    saveStore();

    return res.json({
      success: true,
      application,
      message: `Candidate application status updated to "${application.status}". Notification sent!`
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update application status' });
  }
});

// Candidate / Owner Interview Schedule & Self-Tracked Progress Update (strictly owner-scoped)
app.put('/api/applications/:id/schedule', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    const { id } = req.params;
    const {
      status,
      interviewDate,
      interviewTime,
      interviewMode,
      interviewLinkOrVenue,
      notes
    } = req.body;

    const application = applicationsDatabase.find(a => a.id === id);
    if (!application) {
      return res.status(404).json({ error: 'Application record not found.' });
    }

    const isCandidateOwner =
      application.candidateId === user.id ||
      (!application.candidateId && application.candidateEmail.toLowerCase() === user.email.toLowerCase());
    if (!isCandidateOwner && user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: You can only manage schedules on your own applications.' });
    }

    const allowedStatuses = new Set(['Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected', 'Rejected']);
    if (status && allowedStatuses.has(String(status))) {
      application.status = status;
    } else if (interviewDate && (application.status === 'Applied' || application.status === 'Under Review')) {
      application.status = 'Interview';
    }

    application.updatedDate = new Date().toISOString().split('T')[0];
    if (interviewDate !== undefined) application.interviewDate = String(interviewDate).trim().slice(0, 32);
    if (interviewTime !== undefined) application.interviewTime = String(interviewTime).trim().slice(0, 32);
    if (interviewMode === 'Online (Google Meet/Zoom)' || interviewMode === 'In-Person / Campus') {
      application.interviewMode = interviewMode;
    }
    if (interviewLinkOrVenue !== undefined) {
      application.interviewLinkOrVenue = String(interviewLinkOrVenue).trim().slice(0, 300);
    }
    if (notes !== undefined) {
      application.notes = String(notes).trim().slice(0, 1000);
    }

    if (application.interviewDate) {
      notificationsDatabase.unshift({
        id: `notif-${Date.now()}`,
        userId: user.id,
        targetRole: user.role === 'admin' ? 'admin' : 'student',
        title: `Interview Reminder Set: ${application.company}`,
        message: `Interview for "${application.jobTitle}" scheduled on ${application.interviewDate}${application.interviewTime ? ` at ${application.interviewTime}` : ''}${application.interviewMode ? ` (${application.interviewMode})` : ''}.`,
        date: 'Just now',
        type: 'interview',
        read: false,
        actionTab: 'applications'
      });
    }

    recordAuditLog('INTERVIEW_SCHEDULE_UPDATED', user.email, 'SUCCESS', `Updated schedule for ${application.jobTitle} at ${application.company}`);
    saveStore();

    return res.json({
      success: true,
      application,
      message: 'Interview schedule and reminder saved.'
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update interview schedule' });
  }
});

// ------------------------------------------
// 3. COLLEGES & CAMPUS PLACEMENT APIS
// ------------------------------------------

// List Colleges
app.get('/api/colleges', (_req: Request, res: Response) => {
  return res.json({ success: true, colleges: collegesDatabase });
});

// Register New College
app.post('/api/colleges/register', (req: Request, res: Response) => {
  const { name, aisheCode, email, phone, website, state, city, accreditation, contactPerson, designation, departments } = req.body;
  if (!name || !aisheCode || !email) {
    return res.status(400).json({ error: 'College Name, AISHE Code, and Official Email are required.' });
  }

  const newCollege: CollegeRecord = {
    id: `col-${Date.now()}`,
    name: name.trim(),
    aisheCode: aisheCode.trim(),
    email: email.trim().toLowerCase(),
    phone: phone || '',
    website: website || '',
    state: state || '',
    city: city || '',
    accreditation: accreditation || 'AICTE / UGC Recognized',
    contactPerson: contactPerson || 'Principal / Placement Officer',
    designation: designation || 'TPO',
    departments: Array.isArray(departments) ? departments : [],
    isVerified: false,
    verificationStatus: 'pending',
    enrolledStudentsCount: 0,
    activeDrivesCount: 0,
    registeredAt: new Date().toISOString()
  };

  collegesDatabase.push(newCollege);

  verificationRequestsDatabase.unshift({
    id: `vreq-${Date.now()}`,
    entityId: newCollege.id,
    entityType: 'college',
    name: newCollege.name,
    identifier: newCollege.aisheCode,
    submittedAt: new Date().toISOString(),
    status: 'pending',
    details: `New institution onboarding: ${newCollege.name} (AISHE: ${newCollege.aisheCode}).`
  });

  saveStore();
  return res.json({ success: true, college: newCollege, message: 'College registered and submitted for AISHE verification.' });
});

// Get Students Enrolled in College (For College Dashboard)
app.get('/api/colleges/my-students', async (req: Request, res: Response) => {
  const user = await authenticateRequest(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'college' && user.role !== 'admin') {
    return res.status(403).json({ error: 'College or administrator privileges required.' });
  }

  const { collegeId, collegeName } = req.query;
  const filterCollege = String(collegeName || user.college || '').trim().toLowerCase();

  const students = usersDatabase
    .filter(u => u.role === 'student' && (
      (filterCollege && u.college?.toLowerCase().includes(filterCollege)) ||
      (collegeId && u.collegeId === collegeId)
    ))
    .map(u => {
      const studentApps = applicationsDatabase.filter(a => a.candidateEmail.toLowerCase() === u.email.toLowerCase());
      const placed = studentApps.some(a => a.status === 'Selected');
      const inInterview = studentApps.some(a => a.status === 'Interview');
      return {
        ...sanitizeUser(u),
        applicationsCount: studentApps.length,
        placed,
        inInterview,
        placementStatus: placed ? 'Placed' : (inInterview ? 'Interviewing' : (studentApps.length > 0 ? 'Active Applicant' : 'Exploring'))
      };
    });

  return res.json({ success: true, students });
});

// College Portal Analytics
app.get('/api/colleges/analytics', async (req: Request, res: Response) => {
  const user = await authenticateRequest(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'college' && user.role !== 'admin') {
    return res.status(403).json({ error: 'College or administrator privileges required.' });
  }

  const { collegeName } = req.query;
  const filterName = String(collegeName || user.college || '').trim().toLowerCase();

  const collegeStudents = filterName ? usersDatabase.filter(u => u.role === 'student' && u.college?.toLowerCase().includes(filterName)) : [];
  const collegeApps = filterName ? applicationsDatabase.filter(a => a.candidateCollege?.toLowerCase().includes(filterName)) : [];
  const placedCount = collegeApps.filter(a => a.status === 'Selected').length;
  const interviewingCount = collegeApps.filter(a => a.status === 'Interview').length;
  const shortlistedCount = collegeApps.filter(a => a.status === 'Shortlisted').length;

  const placementRate = collegeStudents.length > 0 ? Math.round((placedCount / Math.max(1, collegeStudents.length)) * 100) : 0;

  return res.json({
    success: true,
    stats: {
      enrolledStudents: collegeStudents.length,
      totalApplications: collegeApps.length,
      studentsPlaced: placedCount,
      studentsInterviewing: interviewingCount,
      studentsShortlisted: shortlistedCount,
      placementRatePercentage: placementRate,
      activeCampusDrives: jobsDatabase.filter(j => j.creatorRole === 'college' || (user.collegeId && j.collegeId === user.collegeId)).length,
      partnerRecruiters: companiesDatabase.length
    }
  });
});

// ------------------------------------------
// 4. COMPANIES & RECRUITERS APIS
// ------------------------------------------

app.get('/api/companies', (_req: Request, res: Response) => {
  return res.json({ success: true, companies: companiesDatabase });
});

// ------------------------------------------
// 5. VERIFICATION CENTER APIS (ADMIN)
// ------------------------------------------

app.get('/api/verification/pending', requireAdmin, (_req: Request, res: Response) => {
  return res.json({
    success: true,
    requests: verificationRequestsDatabase
  });
});

app.post('/api/verification/action', requireAdmin, (req: Request, res: Response) => {
  const { requestId, entityType, entityId, action, notes } = req.body;
  const vreq = verificationRequestsDatabase.find(v => v.id === requestId || (v.entityId === entityId && v.entityType === entityType));

  if (vreq) {
    vreq.status = action === 'approve' ? 'approved' : 'rejected';
    vreq.actionNotes = notes || (action === 'approve' ? 'Verified by Administrator' : 'Rejected after compliance review');
  }

  if (entityType === 'college') {
    const col = collegesDatabase.find(c => c.id === entityId || c.aisheCode === vreq?.identifier);
    if (col) {
      col.isVerified = action === 'approve';
      col.verificationStatus = action === 'approve' ? 'verified' : 'rejected';
      col.verificationNotes = notes || 'AISHE Verification complete.';
    }
    const user = usersDatabase.find(u => u.collegeId === entityId || u.collegeAisheCode === vreq?.identifier);
    if (user) {
      user.isVerified = action === 'approve';
      user.verificationStatus = action === 'approve' ? 'verified' : 'rejected';
    }
  } else if (entityType === 'company') {
    const comp = companiesDatabase.find(c => c.id === entityId || c.cinOrRegistration === vreq?.identifier);
    if (comp) {
      comp.isVerified = action === 'approve';
      comp.verificationStatus = action === 'approve' ? 'verified' : 'rejected';
      comp.verificationEvidence = notes || 'MCA Corporate Verification complete.';
    }
    const user = usersDatabase.find(u => u.companyName === comp?.companyName);
    if (user) {
      user.isVerified = action === 'approve';
      user.verificationStatus = action === 'approve' ? 'verified' : 'rejected';
    }
  } else if (entityType === 'opportunity') {
    const job = jobsDatabase.find(j => j.id === entityId);
    if (job) {
      job.isVerified = action === 'approve';
      job.verificationStatus = action === 'approve' ? 'approved' : 'rejected';
      job.verificationEvidence = notes || 'Admin verified opportunity credentials.';
    }
  }

  recordAuditLog('VERIFICATION_ACTION', 'admin', 'SUCCESS', `${entityType} ${entityId} marked ${action === 'approve' ? 'VERIFIED' : 'REJECTED'}`);
  saveStore();

  return res.json({
    success: true,
    message: `Verification request successfully ${action === 'approve' ? 'approved' : 'rejected'}.`
  });
});

// ------------------------------------------
// 6. REAL-TIME NOTIFICATIONS APIS
// ------------------------------------------

app.get('/api/notifications', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required to view notifications.' });
    }

    const userRole = currentUser.role;
    const userId = currentUser.id;

    // Strictly isolate private user notifications: if n.userId is set, ONLY that owner may see it.
    const list = notificationsDatabase.filter(n => {
      if (n.userId) {
        return n.userId === userId;
      }
      return n.targetRole === 'all' || n.targetRole === userRole;
    });

    return res.json({ success: true, notifications: list });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.post('/api/notifications/:id/read', async (req: Request, res: Response) => {
  const currentUser = await authenticateRequest(req);
  if (!currentUser) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  const { id } = req.params;
  const notif = notificationsDatabase.find(n => n.id === id);
  if (notif) {
    if (notif.userId && notif.userId !== currentUser.id && currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    notif.read = true;
    saveStore();
  }
  return res.json({ success: true });
});

// ------------------------------------------
// 7. STUDENT PROJECTS API
// ------------------------------------------

app.post('/api/user/project', async (req: Request, res: Response) => {
  const user = await authenticateRequest(req);
  if (!user) return res.status(401).json({ error: 'Authentication token required.' });

  const { id, title, description, technologies, liveLink, githubLink } = req.body;
  if (!title || !description) {
    return res.status(400).json({ error: 'Project title and description are required.' });
  }

  if (!Array.isArray(user.projects)) {
    user.projects = [];
  }

  const normalizedTech = Array.isArray(technologies)
    ? technologies
    : String(technologies || '').split(',').map(t => t.trim()).filter(Boolean);

  if (id) {
    const existingIndex = user.projects.findIndex(p => p.id === id);
    if (existingIndex !== -1) {
      user.projects[existingIndex] = {
        id,
        title: title.trim(),
        description: description.trim(),
        technologies: normalizedTech,
        liveLink,
        githubLink
      };
    }
  } else {
    user.projects.push({
      id: `proj-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      technologies: normalizedTech,
      liveLink,
      githubLink
    });
  }

  const nowIso = new Date().toISOString();
  user.profileUpdatedAt = nowIso;
  user.updatedAt = nowIso;
  recordAuditLog('PROJECT_SAVED', user.email, 'SUCCESS', `Saved project "${title}"`);
  saveStore();
  return res.json({ success: true, profileUpdatedAt: user.profileUpdatedAt, user: sanitizeUser(user) });
});


// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper to bound external Gemini API calls so Express endpoints never hang indefinitely
async function withTimeout<T>(promise: Promise<T>, ms: number = 45000, label: string = 'Gemini API'): Promise<T> {
  promise.catch(() => {});
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} request timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Helper for safe JSON parsing from Gemini
function cleanAndParseJSON(rawText: string) {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse JSON:', cleaned);
    throw err;
  }
}

function extractErrorMessage(error: any, fallbackMessage: string): string {
  let msg = String(error?.message || fallbackMessage);
  if (msg.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(msg);
      if (parsed?.error?.message) {
        msg = String(parsed.error.message);
      }
    } catch {}
  }
  return msg;
}

function isTransientAiError(error: any): boolean {
  const msg = extractErrorMessage(error, '').toLowerCase();
  const statusStr = String(error?.status || '');
  return (
    statusStr === '503' ||
    statusStr === '429' ||
    msg.includes('high demand') ||
    msg.includes('unavailable') ||
    msg.includes('overloaded') ||
    msg.includes('temporarily') ||
    msg.includes('quota') ||
    msg.includes('resource_exhausted') ||
    msg.includes('rate limit') ||
    msg.includes('timed out')
  );
}

async function generateContentWithRetry(
  params: Parameters<typeof ai.models.generateContent>[0],
  timeoutMs: number = 45000,
  label: string = 'Gemini API'
) {
  const primaryTimeoutMs = params.model === 'gemini-4-hydrogen' ? Math.min(timeoutMs, 15000) : timeoutMs;
  try {
    return await withTimeout(ai.models.generateContent(params), primaryTimeoutMs, label);
  } catch (primaryErr: any) {
    if (!isTransientAiError(primaryErr)) {
      throw primaryErr;
    }
    await new Promise(resolve => setTimeout(resolve, 300));
    // Fallback to gemini-3.1-flash-lite if primary gemini-4-hydrogen is overloaded or stalled
    if (params.model === 'gemini-4-hydrogen') {
      const { thinkingConfig: _omitThinking, ...restConfig } = (params.config || {}) as Record<string, any>;
      return await withTimeout(
        ai.models.generateContent({
          ...params,
          model: 'gemini-3.1-flash-lite',
          config: Object.keys(restConfig).length > 0 ? restConfig : undefined,
        }),
        Math.max(timeoutMs, 30000),
        `${label} (fallback)`
      );
    }
    return await withTimeout(ai.models.generateContent(params), timeoutMs, `${label} (retry)`);
  }
}

function sendAiError(res: Response, error: any, fallbackMessage: string) {
  const msg = extractErrorMessage(error, fallbackMessage);
  const lower = msg.toLowerCase();
  if (msg.includes('GEMINI_API_KEY') || lower.includes('api key not valid')) {
    return res.status(503).json({ error: 'Gemini AI API key is missing or invalid on the server.' });
  }
  if (lower.includes('quota') || lower.includes('resource_exhausted') || lower.includes('rate limit') || String(error?.status) === '429') {
    return res.status(429).json({ error: 'AI Mentor is temporarily busy due to rate limits. Please wait a few seconds and try again.' });
  }
  if (lower.includes('high demand') || lower.includes('unavailable') || lower.includes('overloaded') || String(error?.status) === '503') {
    return res.status(503).json({ error: 'AI Mentor is experiencing high demand right now. Please wait a moment and try again.' });
  }
  if (lower.includes('timed out')) {
    return res.status(504).json({ error: msg });
  }
  return res.status(502).json({ error: msg || fallbackMessage });
}

// 1. AI Eligibility Checker
app.post('/api/ai/eligibility', async (req: Request, res: Response) => {
  try {
    const { job, candidate } = req.body;
    if (!job || !candidate) {
      return res.status(400).json({ error: 'Job and candidate profile are required' });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const prompt = `
You are an expert HR and Technical Evaluator for YuvaMitraa. Evaluate the candidate's eligibility for the specified internship or job.

Job Title: ${job.title}
Company: ${job.company}
Required Skills: ${(job.requiredSkills || []).join(', ')}
Requirements & Description: ${job.description || ''}

Candidate Name: ${candidate.name || 'Candidate'}
Candidate Education: ${candidate.education || 'Not specified'}
Candidate Skills: ${(candidate.skills || []).join(', ')}
Candidate Resume Summary/Experience: ${candidate.resumeText || candidate.experience || 'Not specified'}

Analyze the gap and return a valid JSON object matching this schema:
{
  "matchScore": number (0-100),
  "status": "Eligible" | "Partially Eligible" | "Not Eligible",
  "summary": string (2-3 sentences explaining the assessment in an encouraging, constructive tone),
  "matchedSkills": string[] (skills present in both candidate and job),
  "missingSkills": string[] (skills required by the job that candidate is missing),
  "suggestions": string[] (3-4 specific, actionable tips for the candidate),
  "recommendedCourseKeywords": string[] (3-5 keywords or topics from: Tech, Communication, Digital Marketing, Finance, Design, Soft Skills, Python, React, Data Analysis, Aptitude)
}
`;

    const response = await generateContentWithRetry(
      {
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      },
      45000,
      'Eligibility'
    );

    const result = cleanAndParseJSON(response.text || '{}');
    return res.json(result);
  } catch (error: any) {
    console.error('AI Eligibility error:', error);
    return sendAiError(res, error, 'Failed to evaluate eligibility with Gemini AI.');
  }
});

// 2. Advanced AI Career Mentor Chat (English & Kannada Support, Profile Personalization, Genuine Opportunities)
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, history, language = 'English', userContext, focusMode = 'guidance' } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const isKannada = language === 'Kannada' || /[\u0C80-\u0CFF]/.test(message || '');

    const allInternships = syncEngine.getInternships({ includeExpired: false }).slice(0, 5);
    const allJobs = syncEngine.getJobs({ includeExpired: false }).slice(0, 5);
    const catalogJobs = jobsDatabase.filter(j => j.verificationStatus === 'approved').slice(0, 5);

    const verifiedLiveListings = [
      ...allInternships.map(i => `[Internship] ${i.title} at ${i.companyName} (${i.location}) - Stipend: ${i.stipend} - Apply URL: ${i.applyUrl}`),
      ...allJobs.map(j => `[Job] ${j.title} at ${j.companyName} (${j.location}) - Salary: ${j.salary} - Apply URL: ${j.applyUrl}`),
      ...catalogJobs.map(c => `[Verified Post] ${c.title} at ${c.company} (${c.location}) - Stipend/Salary: ${c.stipend} - Open on YuvaMitraa`)
    ];

    const focusInstructionMap: Record<string, string> = {
      guidance: 'FOCUS MODE — CAREER GUIDANCE: Give structured, realistic career mentoring grounded in the student profile, next 30-day actions, and verified opportunities.',
      interview: 'FOCUS MODE — INTERVIEW QUESTION GENERATOR: Generate tailored technical and HR interview questions matched to the student skills & target role, along with concise model STAR answers and common pitfalls to avoid.',
      communication: 'FOCUS MODE — COMMUNICATION SKILLS COACH: Help the student improve professional English/Kannada communication—self-introductions, elevator pitches, cold recruiter emails, LinkedIn outreach, clarity, grammar, and structured STAR storytelling. Give rewritten examples and speaking tips.',
      'career-path': 'FOCUS MODE — CAREER PATHS & RELEVANT SKILLS: Compare 2-3 high-growth career paths aligned with the student education and interests, listing exact in-demand skills, starter projects, entry-level roles, and realistic learning milestones.'
    };
    const activeFocusDirective = focusInstructionMap[String(focusMode)] || focusInstructionMap.guidance;

    const systemInstruction = `You are "YuvaMitraa AI Career Mentor", an advanced, intelligent, compassionate career mentor and educational advisor dedicated to empowering Indian students, graduates, and jobseekers.

${activeFocusDirective}

CORE MISSION & CAPABILITIES:
1. Personalized Career Guidance: Analyze the student's education, college, branch, skills, projects, and career aspirations. Provide tailored step-by-step roadmaps, skill gap analysis, and industry trends.
2. Interview Preparation: Generate role-specific technical, behavioral, and HR interview questions with model STAR method answers.
3. Communication Skills Coaching: Improve spoken and written workplace communication—drafts for cold emails, cover notes, self-introductions, and presentation structure with constructive feedback.
4. Career Paths & Relevant Skills: Suggest concrete career tracks, high-demand skills to learn next, and practical portfolio projects.
5. Genuine Opportunity Matching: When asked about internships or jobs, ONLY recommend from the verified catalog provided below. NEVER invent fake companies, fake job titles, or broken links.

LANGUAGE REQUIREMENT:
${isKannada
  ? 'CRITICAL INSTRUCTION: Respond in authentic, fluent, grammatically correct KANNADA (ಕನ್ನಡ). Use clear Kannada vocabulary, with English technical terms in parentheses where appropriate (e.g., ರೆಸ್ಯೂಮೆ (Resume), ಪೈಥಾನ್ (Python), ಸಾಫ್ಟ್‌ವೇರ್ ಇಂಟರ್ನ್‌ಶಿಪ್ (Software Internship)). Provide warm, step-by-step explanations in Kannada.'
  : 'Respond in clear, professional, student-friendly English. Be warm, structured, and provide step-by-step explanations.'}

FORMATTING:
- Use clear bullet points, bold headings, and numbered steps.
- For code, use standard Markdown code fences.
- Keep explanations inspiring, practical, and actionable.

VERIFIED GENUINE OPPORTUNITIES AVAILABLE:
${verifiedLiveListings.join('\n') || 'Refer the student to the live Opportunities tab (Arbeitnow, Remotive, Verified Indian Internships, AICTE & NCS portals).'}

STUDENT PROFILE CONTEXT:
- Name: ${userContext?.name || 'Student'}
- College: ${userContext?.college || userContext?.institution || 'Not specified'}
- Branch / Specialization: ${userContext?.branch || userContext?.course || 'Not specified'}
- Study Year: ${userContext?.studyYear || 'Not specified'}
- Technical Skills: ${(userContext?.skills || []).join(', ') || 'None specified yet'}
- Career Interests: ${(userContext?.interests || []).join(', ') || 'None specified yet'}
- Career Goals: ${userContext?.careerGoals || 'Not specified yet'}
- Completed Projects: ${(userContext?.projects || []).map((p: any) => p.title || p).join(', ') || 'None listed yet'}
- Enrolled Courses: ${typeof userContext?.enrolledCoursesCount === 'number' ? userContext.enrolledCoursesCount : (userContext?.enrolledCourses || []).length} course(s) on YuvaMitraa`;

    const rawTurns: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    if (Array.isArray(history)) {
      for (const h of history.slice(-10)) {
        if (!h || !h.text || !String(h.text).trim()) continue;
        rawTurns.push({
          role: h.sender === 'user' ? 'user' : 'model',
          parts: [{ text: String(h.text).trim() }]
        });
      }
    }
    rawTurns.push({
      role: 'user',
      parts: [{ text: String(message || '').trim() || 'Hello' }]
    });

    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    for (const turn of rawTurns) {
      if (contents.length === 0 && turn.role !== 'user') continue;
      if (contents.length > 0 && contents[contents.length - 1].role === turn.role) {
        contents[contents.length - 1].parts.push(...turn.parts);
      } else {
        contents.push(turn);
      }
    }

    const response = await generateContentWithRetry(
      {
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      },
      45000,
      'AI Mentor Chat'
    );

    const reply = response.text?.trim() || '';
    if (!reply) {
      return res.status(502).json({ error: 'Gemini returned an empty response. Please try again.' });
    }

    const suggestedQuestions = isKannada
      ? [
          'ನನ್ನ ಪ್ರೊಫೈಲ್‌ಗೆ ಸೂಕ್ತವಾದ ಇಂಟರ್ನ್‌ಶಿಪ್‌ಗಳು ಯಾವುವು?',
          'ರೆಸ್ಯೂಮೆ ATS ಸ್ಕೋರ್ ಹೆಚ್ಚಿಸಲು 5 ಸಲಹೆಗಳು ನೀಡಿ',
          'ಟೆಕ್ನಿಕಲ್ ಇಂಟರ್ವ್ಯೂನಲ್ಲಿ ಸಾಮಾನ್ಯವಾಗಿ ಕೇಳುವ ಪ್ರಶ್ನೆಗಳು',
          'ಬಿ.ಟೆಕ್ / ಪದವಿಯ ನಂತರ ಉತ್ತಮ ಕರಿಯರ್ ಆಯ್ಕೆಗಳು ಯಾವುವು?'
        ]
      : [
          `What genuine internships match my ${userContext?.branch || 'current'} profile?`,
          'How can I improve my resume ATS score for tech roles?',
          'Conduct a mock interview question for me',
          'Generate a 4-week step-by-step career roadmap'
        ];

    return res.json({
      reply,
      suggestedQuestions,
      language: isKannada ? 'Kannada' : 'English',
      relatedOpportunities: verifiedLiveListings.slice(0, 2)
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    return sendAiError(res, error, 'Failed to get AI mentor response. Please try again.');
  }
});

// 2b. AI Voice Assistant: Text-to-Speech (TTS) using Gemini 3.8 Flash Lite TTS
app.post('/api/ai/tts', async (req: Request, res: Response) => {
  try {
    const { text, language = 'English' } = req.body;
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured for voice synthesis.' });
    }

    const cleanText = String(text).slice(0, 400).replace(/[*#_`]/g, '');
    const response = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
                speechMetadata: {
                  style: language === 'Kannada' ? 'Clear, warm Indian Kannada speaker' : 'Clear, friendly Indian career mentor',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      }),
      30000,
      'AI TTS'
    );

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(502).json({ error: 'Gemini TTS returned no audio data.' });
    }
    return res.json({ success: true, audioBase64: base64Audio, format: 'audio/wav' });
  } catch (err: any) {
    return sendAiError(res, err, 'Voice synthesis failed.');
  }
});

// 2c. AI Voice Assistant: Speech Transcription using Gemini 3.5 Transcribe
app.post('/api/ai/transcribe', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType = 'audio/webm', language = 'English' } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Audio data is required' });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured for transcription.' });
    }

    const audioPart = {
      inlineData: {
        mimeType,
        data: audioBase64,
      },
    };

    const response = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            audioPart,
            { text: `Transcribe this spoken query accurately into text. The language is ${language} (Kannada or English). Return only the transcript text without quotation marks or notes.` },
          ],
        },
      }),
      30000,
      'AI Transcribe'
    );

    return res.json({ success: true, text: response.text?.trim() || '' });
  } catch (err: any) {
    return sendAiError(res, err, 'Audio transcription failed.');
  }
});

// 3. AI Resume Review & ATS Score
app.post('/api/ai/resume-review', async (req: Request, res: Response) => {
  try {
    const { resumeText, targetRole = 'Software Intern / Fresher' } = req.body;
    if (!resumeText || !String(resumeText).trim()) {
      return res.status(400).json({ error: 'Resume text is required for review.' });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const prompt = `
Analyze this candidate's resume for the target role: "${targetRole}".
1. Accurately extract the candidate's real Education, Skills, Projects, and Experience directly from the resume text (do not invent items that are not in the resume).
2. Evaluate ATS (Applicant Tracking System) friendliness, clarity, impact metrics, action verbs, and skill coverage.
3. Identify crucial missing skills/keywords for the target role and actionable resume improvement suggestions.

Resume content:
${resumeText}

Return a valid JSON object matching:
{
  "atsScore": number (0-100),
  "overallVerdict": string (e.g. "Strong Foundational Resume", "Needs Better Quantifiable Achievements"),
  "formattingScore": number (0-100),
  "contentScore": number (0-100),
  "strengths": string[] (3-4 points),
  "improvements": string[] (3-5 high-impact specific fixes),
  "missingKeywords": string[] (5-8 crucial missing skills/keywords for this target role),
  "rewrittenHeadline": string (a punchy 1-line professional title for their resume),
  "extractedProfile": {
    "education": string[] (extracted degrees, institutions, years, CGPA/grades found in the resume),
    "skills": string[] (extracted technical and soft skills found in the resume),
    "projects": [{ "title": string, "summary": string, "technologies": string[] }],
    "experience": string[] (extracted internships, work roles, leadership positions or volunteer experience found in the resume)
  }
}
`;

    const response = await generateContentWithRetry(
      {
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      },
      45000,
      'Resume Review'
    );

    const result = cleanAndParseJSON(response.text || '{}');
    return res.json(result);
  } catch (error: any) {
    console.error('Resume review error:', error);
    return sendAiError(res, error, 'Failed to analyze resume.');
  }
});

// 3b. AI Resume Generator from Student Profile
app.post('/api/ai/resume-generate', async (req: Request, res: Response) => {
  try {
    const { userProfile, targetRole = 'Software Intern' } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const prompt = `
You are a professional resume writer for Indian college students and freshers.
Generate an impressive, ATS-optimized, professional text resume based on this student profile:
Target Role: "${targetRole}"
Name: ${userProfile?.name || 'Candidate'}
Email: ${userProfile?.email || 'Not provided'}
Phone: ${userProfile?.phone || 'Not provided'}
College: ${userProfile?.college || 'Not specified'}
Branch: ${userProfile?.branch || 'Not specified'}
CGPA: ${userProfile?.cgpa || 'Not specified'}
Graduation Year: ${userProfile?.graduationYear || 'Not specified'}
Skills: ${(userProfile?.skills || []).join(', ') || 'None specified'}
Projects: ${(userProfile?.projects || []).map((p: any) => `${p.title}: ${p.description} (Tech: ${(p.technologies || []).join(', ')})`).join('\n') || 'None specified'}
Location: ${userProfile?.location || 'India'}

Format with clean uppercase section headers:
- FULL NAME & CONTACT INFO
- PROFESSIONAL SUMMARY (2-3 sentences with high impact)
- TECHNICAL SKILLS (categorized into Languages, Frameworks, Tools, Core Concepts)
- PROJECTS (2-3 projects formatted with bullet points starting with strong action verbs and metrics)
- EDUCATION (Degree, College, CGPA, Years)
- CERTIFICATIONS & ACHIEVEMENTS

Return JSON:
{
  "resumeText": string,
  "headline": string,
  "atsTips": string[]
}
`;

    const response = await generateContentWithRetry(
      {
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      },
      45000,
      'Resume Generate'
    );
    const result = cleanAndParseJSON(response.text || '{}');
    return res.json(result);
  } catch (err: any) {
    return sendAiError(res, err, 'Failed to generate resume with Gemini AI.');
  }
});

// 3c. AI Resume Bullet Point Enhancer
app.post('/api/ai/resume-enhance', async (req: Request, res: Response) => {
  try {
    const { bulletPoint, targetRole = 'Software Intern' } = req.body;
    if (!bulletPoint) {
      return res.status(400).json({ error: 'bulletPoint is required' });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const prompt = `
You are an expert resume editor. Transform this weak or basic resume bullet point into 3 professional, high-impact variations using strong action verbs, the STAR method, and quantifiable metrics for the role: "${targetRole}".

Original bullet: "${bulletPoint}"

Return JSON:
{
  "enhancedBullets": string[] (3 compelling options)
}
`;

    const response = await generateContentWithRetry(
      {
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      },
      45000,
      'Resume Enhance'
    );
    const result = cleanAndParseJSON(response.text || '{}');
    return res.json(result);
  } catch (err: any) {
    return sendAiError(res, err, 'Failed to enhance bullet point with Gemini AI.');
  }
});

// 4. AI Mock Interview Practice & Answer Evaluation (Supports English & Kannada)
app.post('/api/ai/mock-interview', async (req: Request, res: Response) => {
  try {
    const { role, question, answer, stage = 'technical', language = 'English' } = req.body;
    if (!answer || !String(answer).trim()) {
      return res.status(400).json({ error: 'Answer is required for evaluation.' });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const isKannada = language === 'Kannada' || /[\u0C80-\u0CFF]/.test(answer || '');

    const prompt = `
You are an expert interviewer for Indian companies hiring freshers and interns for the role: "${role}".
Interview Stage: "${stage}".
Candidate was asked: "${question}"
Candidate answered: "${answer}"

Evaluate their answer fairly, constructively, and encouragingly.
${isKannada ? 'Respond entirely in authentic KANNADA (ಕನ್ನಡ).' : 'Respond in clear, professional English.'}

Provide:
1. Score from 1 to 10 (and equivalent 10-100 scale).
2. Detailed constructive feedback (strengths and areas to deepen).
3. An improved exemplar response showing how to answer using the STAR method (Situation, Task, Action, Result).
4. The next logical interview question to ask the candidate.

Return JSON:
{
  "score": number (1-10),
  "scoreOutOf100": number (10-100),
  "feedback": string,
  "strengths": string[],
  "improvements": string[],
  "improvedAnswer": string,
  "nextQuestion": string
}
`;

    const response = await generateContentWithRetry(
      {
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      },
      45000,
      'Mock Interview'
    );

    const result = cleanAndParseJSON(response.text || '{}');
    return res.json(result);
  } catch (error: any) {
    return sendAiError(res, error, 'Failed to evaluate interview answer with Gemini AI.');
  }
});

// 4b. AI Dynamic Interview Question Generator
app.post('/api/ai/interview-question', async (req: Request, res: Response) => {
  try {
    const { role = 'Frontend Developer', stage = 'technical', questionNumber = 1, language = 'English' } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const isKannada = language === 'Kannada';

    const prompt = `
Generate an authentic, realistic interview question for an Indian campus placement or internship hiring drive.
Target Role: "${role}"
Stage: "${stage}" (screening, technical, or behavioral)
Question Number in session: ${questionNumber}
${isKannada ? 'Write the question and tips in KANNADA (ಕನ್ನಡ).' : 'Write in English.'}

Return JSON:
{
  "question": string,
  "stage": string,
  "expectedKeyPoints": string[],
  "timeLimitSeconds": number (usually 90)
}
`;

    const response = await generateContentWithRetry(
      {
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      },
      45000,
      'Interview Question'
    );
    const result = cleanAndParseJSON(response.text || '{}');
    return res.json(result);
  } catch (err: any) {
    return sendAiError(res, err, 'Failed to generate interview question with Gemini AI.');
  }
});

// 5. AI Career Roadmap Generator
app.post('/api/ai/roadmap', async (req: Request, res: Response) => {
  try {
    const { careerGoal, currentLevel = 'Beginner', language = 'English' } = req.body;
    if (!careerGoal) {
      return res.status(400).json({ error: 'Career goal is required.' });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const isKannada = language === 'Kannada';

    const prompt = `
Create a comprehensive, motivating step-by-step career learning roadmap for a youth student aiming to become: "${careerGoal}".
Current experience level: "${currentLevel}".
${isKannada ? 'Provide titles, descriptions, and advice in KANNADA (ಕನ್ನಡ).' : 'Provide in English.'}

Return a valid JSON object matching:
{
  "title": string,
  "estimatedMonths": number,
  "summary": string,
  "targetStartingSalary": string (e.g. "₹4.5 LPA - ₹7.5 LPA" or "₹20,000 - ₹35,000 / month internship"),
  "phases": [
    {
      "phaseNumber": number,
      "phaseName": string,
      "duration": string,
      "goal": string,
      "keySkills": string[],
      "recommendedProjects": string[],
      "milestoneQuizTopic": string
    }
  ],
  "topAdvice": string
}
`;

    const response = await generateContentWithRetry(
      {
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      },
      45000,
      'Career Roadmap'
    );

    const result = cleanAndParseJSON(response.text || '{}');
    return res.json(result);
  } catch (error: any) {
    return sendAiError(res, error, 'Failed to generate career roadmap with Gemini AI.');
  }
});

// 5b. AI Personalized Learning Plan Generator
app.post('/api/ai/learning-plan', async (req: Request, res: Response) => {
  try {
    const { targetSkillOrRole = 'Full Stack Developer', weeklyHours = 10, language = 'English', userSkills = [] } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const isKannada = language === 'Kannada';

    const prompt = `
Create a personalized 4-week skill development and learning plan for a student wanting to master: "${targetSkillOrRole}".
Weekly time commitment: ${weeklyHours} hours/week.
Existing skills: ${(userSkills || []).join(', ')}.
${isKannada ? 'Output in KANNADA (ಕನ್ನಡ).' : 'Output in English.'}

Return JSON:
{
  "planTitle": string,
  "weeklyCommitment": string,
  "weeks": [
    {
      "weekNumber": number,
      "focusArea": string,
      "learningObjectives": string[],
      "recommendedYuvaCourses": string[],
      "handsOnTask": string,
      "hoursEstimate": number
    }
  ],
  "capstoneProjectIdea": string,
  "successMetric": string
}
`;

    const response = await generateContentWithRetry(
      {
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      },
      45000,
      'Learning Plan'
    );
    const result = cleanAndParseJSON(response.text || '{}');
    return res.json(result);
  } catch (err: any) {
    return sendAiError(res, err, 'Failed to generate learning plan with Gemini AI.');
  }
});

// 6. Translation API endpoint using Gemini
app.post('/api/ai/translate', async (req: Request, res: Response) => {
  try {
    const { text, targetLanguage } = req.body;
    if (!text || !targetLanguage || targetLanguage === 'English') {
      return res.json({ translatedText: text });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const response = await generateContentWithRetry(
      {
        model: 'gemini-4-hydrogen',
        contents: `Translate the following text accurately and naturally into ${targetLanguage}. Maintain any formatting and technical terms where appropriate.
Only return the translated string, without extra comments or quotation marks:

${text}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      },
      45000,
      'Translate'
    );

    return res.json({ translatedText: response.text?.trim() || text });
  } catch (err: any) {
    return sendAiError(res, err, 'Translation failed.');
  }
});

// Process Level Error Guards
process.on('uncaughtException', (err) => {
  console.error('[Process Error] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process Error] Unhandled Rejection at:', promise, 'reason:', reason);
});

// Vite Middleware integration for development / Static file serving for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const server = app.listen(port, host, () => {
    console.log(`YuvaMitraa server running on http://${host}:${port}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Server Alert] Port ${port} is currently in use. Cleaning up...`);
    } else {
      console.error('[Server Alert] Server error:', err);
    }
  });
}

startServer();
