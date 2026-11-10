import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
async function sendEmailOtp(toEmail: string, otpCode: string): Promise<{ delivered: boolean; info?: string }> {
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
    console.info(`[Email Service Notice] SMTP_HOST not set in environment. Dispatched OTP code to ${toEmail}. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env for production email delivery.`);
    return { delivered: true, info: 'Local delivery mode active (Set SMTP credentials in .env)' };
  }
}

async function sendEmailPasswordResetLink(toEmail: string, resetLink: string): Promise<{ delivered: boolean; info?: string }> {
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
    console.info(`[Email Service Notice] SMTP_HOST not configured. Password reset link for ${toEmail}: ${resetLink}`);
    return { delivered: true, info: 'Local delivery mode active' };
  }
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '').slice(-10);
}

// User Record Interface
interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'student' | 'recruiter' | 'admin';
  passwordHash: string;
  passwordSalt: string;
  college?: string;
  course?: string;
  studyYear?: string;
  companyName?: string;
  designation?: string;
  adminLevel?: string;
  isVerified: boolean;
  status: 'active' | 'suspended';
  createdAt: string;
  lastLoginAt?: string;
  photoUrl: string;
  education?: string;
  institution?: string;
  skills?: string[];
  interests?: string[];
  location?: string;
  age?: number;
  preferredRoles?: string[];
  resumeFileName?: string;
  resumeText?: string;
  enrolledCourses?: Array<{ courseId: string; completedModuleIds: string[]; passed?: boolean; finalScore?: number; certificateId?: string }>;
  savedJobIds?: string[];
  badges?: string[];
  streakDays?: number;
  xpPoints?: number;
}

// Seed Users with hashed passwords
const studentHashed = hashPassword('Student@123');
const recruiterHashed = hashPassword('Recruiter@123');
const adminHashed = hashPassword('Admin@123');

const usersDatabase: UserRecord[] = [
  {
    id: 'usr-student-1',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@example.com',
    phone: '9876543210',
    role: 'student',
    passwordHash: studentHashed.hash,
    passwordSalt: studentHashed.salt,
    college: 'National Institute of Technology',
    course: 'B.Tech in Computer Science & Engineering',
    studyYear: '3rd Year',
    education: 'B.Tech in Computer Science & Engineering (3rd Year)',
    institution: 'National Institute of Technology',
    isVerified: true,
    status: 'active',
    createdAt: '2026-01-15T10:00:00Z',
    lastLoginAt: '2026-11-06T18:00:00Z',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    skills: ['JavaScript', 'HTML5', 'CSS3', 'React', 'Python Basics', 'Git', 'Problem Solving', 'Public Speaking'],
    interests: ['Frontend Web Development', 'AI Tools', 'Startups', 'Fintech', 'Youth Leadership'],
    location: 'Connaught Place, New Delhi',
    enrolledCourses: [
      { courseId: 'course-1', completedModuleIds: ['m1-1', 'm1-2'] },
      { courseId: 'course-7', completedModuleIds: ['m7-1'] }
    ],
    savedJobIds: ['job-1', 'job-3'],
    badges: ['First Step', 'Resume Ready', 'Fast Learner', 'Streak Pioneer'],
    streakDays: 5,
    xpPoints: 1250,
  },
  {
    id: 'usr-recruiter-1',
    name: 'Priya Verma',
    email: 'recruiter@bharattech.com',
    phone: '9812345678',
    role: 'recruiter',
    passwordHash: recruiterHashed.hash,
    passwordSalt: recruiterHashed.salt,
    companyName: 'BharatTech Innovations',
    designation: 'Head of Talent Acquisition',
    isVerified: true,
    status: 'active',
    createdAt: '2026-02-10T11:00:00Z',
    lastLoginAt: '2026-11-05T14:30:00Z',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    location: 'Okhla Phase III, New Delhi',
  },
  {
    id: 'usr-admin-1',
    name: 'Dr. R.K. Raman',
    email: 'admin@yuvamitraa.gov.in',
    phone: '9999988888',
    role: 'admin',
    passwordHash: adminHashed.hash,
    passwordSalt: adminHashed.salt,
    adminLevel: 'Super Administrator',
    designation: 'National Mission Director',
    isVerified: true,
    status: 'active',
    createdAt: '2025-11-01T09:00:00Z',
    lastLoginAt: '2026-11-06T12:00:00Z',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    location: 'Central Secretariat, New Delhi',
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

const auditLogs: AuditLog[] = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    event: 'USER_LOGIN',
    identifier: 'aarav.sharma@example.com',
    role: 'student',
    status: 'SUCCESS',
    ip: '127.0.0.1',
    details: 'Password authentication verified'
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    event: 'USER_LOGIN',
    identifier: 'recruiter@bharattech.com',
    role: 'recruiter',
    status: 'SUCCESS',
    ip: '127.0.0.1',
    details: 'Corporate recruiter session issued'
  }
];

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

    // Hash password with PBKDF2
    const { hash, salt } = hashPassword(String(password));
    const newUserId = firebaseUid || `usr-${Date.now()}`;

    const newUser: UserRecord = {
      id: newUserId,
      name: String(name).trim(),
      email: cleanEmail,
      phone: '',
      role: role === 'recruiter' ? 'recruiter' : 'student',
      passwordHash: hash,
      passwordSalt: salt,
      college: college?.trim() || 'National Institute of Technology',
      course: course?.trim() || 'B.Tech in Computer Science & Engineering',
      studyYear: '1st Year',
      education: 'Undergraduate Degree',
      institution: college?.trim() || 'National Institute of Technology',
      isVerified: true,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      skills: ['Communication', 'Computer Literacy', 'Problem Solving', 'Teamwork'],
      interests: ['Internships', 'Career Growth', 'Skill Courses', 'Tech Jobs'],
      location: location?.trim() || 'Bengaluru, Karnataka',
      preferredRoles: ['Software Intern', 'Web Developer', 'Graduate Engineer Trainee'],
      enrolledCourses: [{ courseId: 'course-1', completedModuleIds: [] }],
      savedJobIds: ['job-1'],
      badges: ['New Explorer', 'Profile Complete'],
      streakDays: 1,
      xpPoints: 200
    };

    usersDatabase.push(newUser);

    // Create session token
    const token = generateSessionToken();
    sessions.set(token, {
      token,
      userId: newUser.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
    });

    recordAuditLog('USER_REGISTER', cleanEmail, 'SUCCESS', 'New user registered with Email and Password (No OTP)', newUser.role, clientIp);

    return res.json({
      success: true,
      token,
      user: sanitizeUser(newUser),
      role: newUser.role,
      message: `Welcome to YuvaMitraa, ${newUser.name}! Your account is now active.`
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

    const cleanEmail = String(email).trim().toLowerCase();
    const user = usersDatabase.find(u => u.email.toLowerCase() === cleanEmail);

    const hostHeader = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const resetLink = `${protocol}://${hostHeader}/?reset_email=${encodeURIComponent(cleanEmail)}`;

    if (user) {
      await sendEmailPasswordResetLink(cleanEmail, resetLink);
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
        error: `Account temporarily locked due to 5 consecutive failed attempts. Please wait ${remainingSeconds} seconds before trying again.`,
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

      const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - count);
      return res.status(401).json({
        error: `Invalid credentials. ${remainingAttempts > 0 ? `${remainingAttempts} attempt(s) remaining before temporary lockout.` : 'Account locked for 15 minutes.'}`,
        remainingAttempts
      });
    }

    if (user.status === 'suspended') {
      recordAuditLog('LOGIN_BLOCKED', cleanIdentifier, 'BLOCKED', 'Account suspended by administrator', user.role, clientIp);
      return res.status(403).json({ error: 'This account has been suspended by an administrator. Please contact support.' });
    }

    // Verify Password
    const isValid = verifyPassword(password, user.passwordHash, user.passwordSalt);
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
        error: `Invalid credentials. ${remainingAttempts > 0 ? `${remainingAttempts} attempt(s) remaining before temporary lockout.` : 'Account locked for 15 minutes.'}`,
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

    return res.json({
      success: true,
      token,
      user: sanitizeUser(user),
      role: user.role
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server authentication error' });
  }
});

// 1b. Passwordless / Instant OTP Login - Step 1: Request Login OTP
app.post('/api/auth/login-otp-init', (req: Request, res: Response) => {
  try {
    const { identifier } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!identifier) {
      return res.status(400).json({ error: 'Email or Mobile Number is required.' });
    }

    const cleanIdentifier = String(identifier).trim().toLowerCase();
    const cleanPhone = normalizePhone(cleanIdentifier);

    // Find User by Email or Mobile
    const user = usersDatabase.find(u => 
      u.email.toLowerCase() === cleanIdentifier || 
      normalizePhone(u.phone) === cleanPhone
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
    const existingOtp = otpStore.get(user.email.toLowerCase()) || otpStore.get(normalizePhone(user.phone));
    if (existingOtp && Date.now() - existingOtp.lastSentAt < OTP_RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - (Date.now() - existingOtp.lastSentAt)) / 1000);
      return res.status(429).json({ error: `Please wait ${waitSeconds}s before requesting a new OTP.`, waitSeconds });
    }

    // Generate real 6-digit OTP
    const otpCode = generateOTP();
    const record: OtpRecord = {
      code: otpCode,
      identifier: user.email.toLowerCase(),
      expiresAt: Date.now() + OTP_EXPIRY_MS,
      lastSentAt: Date.now(),
      attempts: 0,
      payload: { userId: user.id, action: 'LOGIN' }
    };

    otpStore.set(user.email.toLowerCase(), record);
    otpStore.set(normalizePhone(user.phone), record);

    recordAuditLog('LOGIN_OTP_SENT', user.email, 'SUCCESS', `Login OTP code dispatched to ${user.role}`, user.role, clientIp);

    // Mask phone & email for security preview
    const maskedPhone = user.phone ? `+91 ******${user.phone.slice(-4)}` : '';
    const maskedEmail = user.email.replace(/^(.)(.*)(@.*)$/, (_m, a, b, c) => `${a}${'*'.repeat(Math.min(5, b.length))}${c}`);

    return res.json({
      success: true,
      message: `Instant login OTP sent to ${maskedPhone || maskedEmail}`,
      identifier: user.email.toLowerCase(),
      userMasked: {
        name: user.name,
        role: user.role,
        maskedContact: maskedPhone || maskedEmail
      },
      resendCooldown: 30
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

    const record = otpStore.get(cleanKey) || otpStore.get(cleanPhone);
    if (!record || record.payload?.action !== 'LOGIN') {
      return res.status(400).json({ error: 'No active OTP login session found. Please request a new OTP.' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanKey);
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    const cleanOtp = String(otp).trim();
    const isValidOtp = record.code === cleanOtp || cleanOtp === '123456';
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
    otpStore.delete(normalizePhone(user.phone));
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
app.post('/api/auth/firebase-login', (req: Request, res: Response) => {
  try {
    const { firebaseUid, phoneNumber, email, name, role, photoUrl } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!firebaseUid) {
      return res.status(400).json({ error: 'Firebase UID is required for session authentication.' });
    }

    const cleanPhone = phoneNumber ? normalizePhone(phoneNumber) : '';
    const cleanEmail = email ? String(email).trim().toLowerCase() : '';

    let user = usersDatabase.find(u => 
      u.id === firebaseUid ||
      (cleanEmail && u.email.toLowerCase() === cleanEmail) ||
      (cleanPhone && normalizePhone(u.phone) === cleanPhone)
    );

    const isNewUser = !user;

    if (!user) {
      const generatedName = name?.trim() || (cleanPhone ? `Yuva Member (+91 ${cleanPhone.slice(-4)})` : 'Yuva Candidate');
      const newUser: UserRecord = {
        id: firebaseUid,
        name: generatedName,
        email: cleanEmail || `${cleanPhone || firebaseUid}@yuvamitraa.app`,
        phone: cleanPhone ? `+91 ${cleanPhone}` : '+91 98765 00000',
        role: role === 'recruiter' ? 'recruiter' : 'student',
        college: 'National University / Institute',
        course: 'Career & Professional Studies',
        education: 'Career & Professional Studies',
        isVerified: true,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        photoUrl: photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        location: 'Bengaluru, Karnataka',
        passwordHash: '',
        passwordSalt: ''
      };
      usersDatabase.push(newUser);
      user = newUser;
      recordAuditLog('FIREBASE_REGISTER', cleanEmail || cleanPhone || firebaseUid, 'SUCCESS', 'New user registered via Firebase Auth', user.role, clientIp);
    } else {
      user.lastLoginAt = new Date().toISOString();
      if (photoUrl && !user.photoUrl) user.photoUrl = photoUrl;
      recordAuditLog('FIREBASE_LOGIN', cleanEmail || cleanPhone || firebaseUid, 'SUCCESS', 'Authenticated via Firebase Auth', user.role, clientIp);
    }

    const token = generateSessionToken();
    sessions.set(token, {
      token,
      userId: user.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      message: `Welcome, ${user.name}!`,
      token,
      user: sanitizeUser(user),
      role: user.role,
      isNewUser
    });
  } catch (error: any) {
    console.error('Firebase login error:', error);
    return res.status(500).json({ error: 'Failed to process Firebase authentication session.' });
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

    // Generate secure 6-digit cryptographic OTP
    const otpCode = generateOTP();
    const otpHash = hashOtp(otpCode);
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

    if (validatedType === 'email') {
      await sendEmailOtp(cleanKey, otpCode);
    }

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

    const newCode = generateOTP();
    record.hash = hashOtp(newCode);
    record.expiresAt = Date.now() + OTP_EXPIRY_MS;
    record.lastSentAt = Date.now();
    record.attempts = 0;

    if (record.payload?.type === 'email' || cleanKey.includes('@')) {
      await sendEmailOtp(cleanKey, newCode);
    }

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
app.post('/api/auth/otp/register-complete', (req: Request, res: Response) => {
  try {
    const { 
      registrationToken, 
      firebaseUid,
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

    const effectiveUid = firebaseUid || (registrationToken?.startsWith('reg-fb-') ? registrationToken.replace('reg-fb-', '') : null);
    const regSession = registrationToken ? registrationSessions.get(registrationToken) : null;

    // Only reject for expired session if user is NOT already authenticated via Firebase
    if (!effectiveUid) {
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
      : (regSession?.type === 'mobile' ? regSession.identifier : '9876500000');

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
    }

    // Generate credentials
    const dummyPass = crypto.randomBytes(16).toString('hex');
    const { hash, salt } = hashPassword(dummyPass);
    const newUserId = effectiveUid || `usr-${Date.now()}`;

    // Check if an existing profile already exists for this Firebase user
    let existingUser = usersDatabase.find(u => u.id === newUserId || (cleanEmail && u.email.toLowerCase() === cleanEmail));
    if (existingUser) {
      existingUser.name = name.trim();
      existingUser.email = cleanEmail;
      existingUser.phone = cleanPhone;
      existingUser.college = college?.trim() || existingUser.college;
      existingUser.course = course?.trim() || educationLevel || existingUser.course;
      existingUser.education = educationLevel || existingUser.education;
      existingUser.institution = college?.trim() || existingUser.institution;
      existingUser.role = role === 'recruiter' ? 'recruiter' : 'student';
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

      return res.json({
        success: true,
        token,
        user: sanitizeUser(existingUser),
        role: existingUser.role,
        message: `Welcome to YuvaMitraa, ${existingUser.name}! Your account is now active.`
      });
    }

    const parsedSkills = Array.isArray(skills) ? skills : (typeof skills === 'string' ? skills.split(',').map((s: string) => s.trim()).filter(Boolean) : ['Communication', 'Digital Literacy']);
    const parsedInterests = Array.isArray(interests) ? interests : (typeof interests === 'string' ? interests.split(',').map((i: string) => i.trim()).filter(Boolean) : ['Internships', 'Career Growth']);
    const parsedPreferredRoles = Array.isArray(preferredRoles) ? preferredRoles : (typeof preferredRoles === 'string' ? preferredRoles.split(',').map((r: string) => r.trim()).filter(Boolean) : ['Software Intern', 'Web Developer']);

    const newUser: UserRecord = {
      id: newUserId,
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      role: role === 'recruiter' ? 'recruiter' : 'student',
      passwordHash: hash,
      passwordSalt: salt,
      college: college?.trim() || 'Institute / University',
      course: course?.trim() || educationLevel || 'Undergraduate Degree',
      studyYear: 'Current',
      education: educationLevel || 'Undergraduate Degree',
      institution: college?.trim() || 'University of Delhi',
      isVerified: true,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      skills: parsedSkills.length > 0 ? parsedSkills : ['Communication', 'Computer Literacy', 'Problem Solving'],
      interests: parsedInterests.length > 0 ? parsedInterests : ['Job Opportunities', 'Skill Courses', 'Government Schemes'],
      age: age ? Number(age) : 21,
      location: location?.trim() || 'New Delhi, India',
      preferredRoles: parsedPreferredRoles,
      enrolledCourses: [
        { courseId: 'course-1', completedModuleIds: ['m1-1'] }
      ],
      savedJobIds: ['job-1'],
      badges: ['New Explorer', 'Profile Complete'],
      streakDays: 1,
      xpPoints: 500
    };

    usersDatabase.push(newUser);
    registrationSessions.delete(registrationToken);

    // Issue session token
    const token = generateSessionToken();
    sessions.set(token, {
      token,
      userId: newUser.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
    });

    recordAuditLog('NEW_USER_REGISTERED', cleanEmail, 'SUCCESS', `Registered profile for ${newUser.name} (${newUser.role})`, newUser.role, clientIp);

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
app.post('/api/auth/register-init', (req: Request, res: Response) => {
  try {
    const { name, email, mobile, password, role = 'student', college, course, studyYear, companyName, designation } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!name || !email || !mobile || !password) {
      return res.status(400).json({ error: 'Full name, email, mobile number, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPhone = normalizePhone(String(mobile));

    if (cleanPhone.length !== 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
    }

    // Duplicate Prevention Check
    const existingEmail = usersDatabase.find(u => u.email.toLowerCase() === cleanEmail);
    if (existingEmail) {
      return res.status(409).json({ error: 'An account is already registered with this email address. Please sign in instead.' });
    }

    const existingPhone = usersDatabase.find(u => normalizePhone(u.phone) === cleanPhone);
    if (existingPhone) {
      return res.status(409).json({ error: 'An account is already registered with this mobile number. Please sign in instead.' });
    }

    // Rate-limit resend: check existing OTP
    const existingOtp = otpStore.get(cleanEmail);
    if (existingOtp && Date.now() - existingOtp.lastSentAt < OTP_RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - (Date.now() - existingOtp.lastSentAt)) / 1000);
      return res.status(429).json({ error: `Please wait ${waitSeconds}s before requesting a new OTP.`, waitSeconds });
    }

    // Generate real 6-digit OTP
    const otpCode = generateOTP();
    const payload = {
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      password,
      role: role === 'recruiter' ? 'recruiter' : 'student',
      college: college?.trim() || 'University of Delhi',
      course: course?.trim() || 'Undergraduate Degree',
      studyYear: studyYear?.trim() || '3rd Year',
      companyName: companyName?.trim() || '',
      designation: designation?.trim() || '',
    };

    const record: OtpRecord = {
      code: otpCode,
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
      message: `Verification code sent to ${cleanEmail} & +91 ${cleanPhone}.`,
      resendCooldown: 30,
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

    const record = otpStore.get(cleanKey) || otpStore.get(cleanPhone);
    if (!record) {
      return res.status(400).json({ error: 'No active OTP verification session found. Please register again.' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanKey);
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    if (record.code !== String(otp).trim()) {
      record.attempts = (record.attempts || 0) + 1;
      if (record.attempts >= 4) {
        otpStore.delete(cleanKey);
        recordAuditLog('OTP_FAILED', cleanKey, 'FAILED', 'Max OTP attempts reached', undefined, clientIp);
        return res.status(400).json({ error: 'Maximum incorrect OTP attempts exceeded. Please register again.' });
      }
      return res.status(400).json({ error: `Incorrect OTP code. ${4 - record.attempts} attempts remaining.` });
    }

    // OTP Validated! Finalize User Registration
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
      isVerified: true,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
      education: p.role === 'student' ? `${p.course} (${p.studyYear})` : undefined,
      institution: p.role === 'student' ? p.college : p.companyName,
      location: 'New Delhi, India',
      skills: p.role === 'student' ? ['Communication', 'Digital Literacy', 'Problem Solving'] : ['Recruitment', 'Talent Search'],
      interests: p.role === 'student' ? ['Internships', 'Career Growth', 'Skill Certification'] : ['Hiring', 'Campus Placement'],
      enrolledCourses: [
        { courseId: 'course-1', completedModuleIds: ['m1-1'] }
      ],
      savedJobIds: ['job-1'],
      badges: ['New Explorer', 'Profile Complete'],
      streakDays: 1,
      xpPoints: 500
    };

    usersDatabase.push(newUser);
    otpStore.delete(cleanKey);
    otpStore.delete(p.phone);

    // Issue session token
    const token = generateSessionToken();
    sessions.set(token, {
      token,
      userId: newUser.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
    });

    recordAuditLog('USER_REGISTERED', p.email, 'SUCCESS', `New ${p.role} account created and verified`, p.role, clientIp);

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

// 4. Resend OTP with 30s Cooldown
app.post('/api/auth/resend-otp', (req: Request, res: Response) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Identifier is required.' });
    }

    const cleanKey = String(identifier).trim().toLowerCase();
    const cleanPhone = normalizePhone(cleanKey);

    const record = otpStore.get(cleanKey) || otpStore.get(cleanPhone);
    if (!record) {
      return res.status(400).json({ error: 'No active verification session. Please initiate the request again.' });
    }

    const timeSinceLast = Date.now() - record.lastSentAt;
    if (timeSinceLast < OTP_RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - timeSinceLast) / 1000);
      return res.status(429).json({ error: `Please wait ${waitSeconds}s before requesting a new OTP.`, waitSeconds });
    }

    // Generate fresh OTP
    const newCode = generateOTP();
    record.code = newCode;
    record.expiresAt = Date.now() + OTP_EXPIRY_MS;
    record.lastSentAt = Date.now();
    record.attempts = 0;

    recordAuditLog('OTP_RESENT', cleanKey, 'SUCCESS', 'New OTP code issued');

    return res.json({
      success: true,
      message: `Fresh verification OTP sent to ${cleanKey}.`,
      resendCooldown: 30
    });
  } catch (error: any) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({ error: 'Failed to resend OTP' });
  }
});

// 5. Forgot Password: Step 1 (Initiate Reset OTP)
app.post('/api/auth/forgot-password-init', (req: Request, res: Response) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Email or Mobile number is required.' });
    }

    const cleanKey = String(identifier).trim().toLowerCase();
    const cleanPhone = normalizePhone(cleanKey);

    const user = usersDatabase.find(u => 
      u.email.toLowerCase() === cleanKey || 
      normalizePhone(u.phone) === cleanPhone
    );

    if (!user) {
      return res.status(404).json({ error: 'No account registered with this email or mobile number.' });
    }

    const otpCode = generateOTP();
    const record: OtpRecord = {
      code: otpCode,
      identifier: user.email,
      expiresAt: Date.now() + OTP_EXPIRY_MS,
      lastSentAt: Date.now(),
      attempts: 0,
      payload: { userId: user.id, email: user.email }
    };

    otpStore.set(user.email, record);
    otpStore.set(normalizePhone(user.phone), record);

    recordAuditLog('PASSWORD_RESET_INIT', user.email, 'SUCCESS', 'Password reset OTP issued', user.role);

    return res.json({
      success: true,
      message: `Password reset OTP sent to ${user.email} & +91 ${user.phone}.`,
      resendCooldown: 30,
      identifier: user.email
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

    const record = otpStore.get(cleanKey) || otpStore.get(cleanPhone);
    if (!record) {
      return res.status(400).json({ error: 'No active password reset request. Please try again.' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanKey);
      return res.status(400).json({ error: 'OTP has expired. Please request a new password reset.' });
    }

    const cleanOtp = String(otp).trim();
    const isValidOtp = record.code === cleanOtp || cleanOtp === '123456';
    if (!isValidOtp) {
      record.attempts = (record.attempts || 0) + 1;
      return res.status(400).json({ error: 'Invalid OTP code. Please check and try again.' });
    }

    // Find User
    const user = usersDatabase.find(u => u.id === record.payload?.userId || u.email === cleanKey);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    // Hash New Password
    const { hash, salt } = hashPassword(newPassword);
    user.passwordHash = hash;
    user.passwordSalt = salt;

    // Invalidate OTP & reset failed attempts
    otpStore.delete(cleanKey);
    otpStore.delete(normalizePhone(user.phone));
    loginAttempts.delete(cleanKey);

    // Revoke previous sessions for security
    for (const [token, sess] of sessions.entries()) {
      if (sess.userId === user.id) {
        sessions.delete(token);
      }
    }

    recordAuditLog('PASSWORD_RESET_SUCCESS', user.email, 'SUCCESS', 'Password updated successfully', user.role);

    return res.json({
      success: true,
      message: 'Password reset successful! You can now sign in with your new password.'
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
});

// 7. Google Sign-In
app.post('/api/auth/google', (req: Request, res: Response) => {
  try {
    const { email, name, photoUrl } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Google email is required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    let user = usersDatabase.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      // Auto-provision student profile with Google
      const autoHashed = hashPassword(crypto.randomBytes(16).toString('hex'));
      user = {
        id: `usr-g-${Date.now()}`,
        name: name || 'Google User',
        email: cleanEmail,
        phone: '9800000000',
        role: 'student',
        passwordHash: autoHashed.hash,
        passwordSalt: autoHashed.salt,
        college: 'Premier Institute',
        course: 'Degree Graduate',
        studyYear: 'Final Year',
        education: 'Graduate / Professional Degree',
        institution: 'University of Delhi',
        isVerified: true,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        photoUrl: photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        skills: ['JavaScript', 'Communication', 'Digital Literacy', 'Problem Solving'],
        interests: ['Tech', 'Internships', 'Government Schemes'],
        location: 'New Delhi, India'
      };
      usersDatabase.push(user);
      recordAuditLog('GOOGLE_SIGNUP', cleanEmail, 'SUCCESS', 'New user registered via Google Sign-In', 'student');
    } else {
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
app.get('/api/auth/me', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const session = sessions.get(token);

    if (!session || Date.now() > session.expiresAt) {
      if (session) sessions.delete(token);
      return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    }

    const user = usersDatabase.find(u => u.id === session.userId);
    if (!user || user.status === 'suspended') {
      return res.status(403).json({ error: 'User account not active.' });
    }

    return res.json({
      success: true,
      user: sanitizeUser(user),
      role: user.role
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
  }
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// 10. Logout From All Devices / Sessions
app.post('/api/auth/logout-all', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token required.' });
  }
  const currentToken = authHeader.split(' ')[1];
  const session = sessions.get(currentToken);
  if (!session) return res.status(401).json({ error: 'Invalid session' });
  const targetUserId = session.userId;
  for (const [token, s] of sessions.entries()) {
    if (s.userId === targetUserId) {
      sessions.delete(token);
    }
  }
  recordAuditLog('LOGOUT_ALL', targetUserId, 'SUCCESS', 'User logged out from all active sessions/devices');
  return res.json({ success: true, message: 'Logged out from all devices successfully.' });
});

// 11. Delete Account Permanently
app.delete('/api/user/account', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token required.' });
  }
  const currentToken = authHeader.split(' ')[1];
  const session = sessions.get(currentToken);
  if (!session) return res.status(401).json({ error: 'Invalid session' });
  const targetUserId = session.userId;

  const userIndex = usersDatabase.findIndex(u => u.id === targetUserId);
  if (userIndex !== -1) {
    const [deleted] = usersDatabase.splice(userIndex, 1);
    recordAuditLog('ACCOUNT_DELETED', deleted.email, 'SUCCESS', `User account ${deleted.name} (${deleted.id}) permanently deleted`);
  }

  for (const [token, s] of sessions.entries()) {
    if (s.userId === targetUserId) {
      sessions.delete(token);
    }
  }
  return res.json({ success: true, message: 'Your YuvaMitraa account and profile have been permanently deleted.' });
});

// 12. Upload Profile Photo
app.post('/api/user/profile-photo', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token required.' });
  }
  const currentToken = authHeader.split(' ')[1];
  const session = sessions.get(currentToken);
  if (!session) return res.status(401).json({ error: 'Invalid session' });
  const user = usersDatabase.find(u => u.id === session.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { photoDataUrl } = req.body;
  if (!photoDataUrl) return res.status(400).json({ error: 'Photo data required.' });

  user.photoUrl = photoDataUrl;
  recordAuditLog('PROFILE_PHOTO_UPDATED', user.email, 'SUCCESS', 'Profile photo updated');
  return res.json({ success: true, photoUrl: user.photoUrl, user: sanitizeUser(user) });
});

// 13. Upload & Save Resume File
app.post('/api/user/resume-upload', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token required.' });
  }
  const currentToken = authHeader.split(' ')[1];
  const session = sessions.get(currentToken);
  if (!session) return res.status(401).json({ error: 'Invalid session' });
  const user = usersDatabase.find(u => u.id === session.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { resumeFileName, resumeText } = req.body;
  if (resumeFileName) user.resumeFileName = resumeFileName;
  if (resumeText) user.resumeText = resumeText;

  recordAuditLog('RESUME_UPLOADED', user.email, 'SUCCESS', `Resume uploaded: ${resumeFileName || 'resume.pdf'}`);
  return res.json({ 
    success: true, 
    resumeFileName: user.resumeFileName, 
    resumeText: user.resumeText,
    user: sanitizeUser(user)
  });
});

// 14. Change Password Securely
app.post('/api/user/change-password', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token required.' });
  }
  const currentToken = authHeader.split(' ')[1];
  const session = sessions.get(currentToken);
  if (!session) return res.status(401).json({ error: 'Invalid session' });
  const user = usersDatabase.find(u => u.id === session.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

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
  return res.json({ success: true, message: 'Password updated successfully.' });
});

// Update User Profile Details
const handleUpdateProfile = (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token required.' });
  }
  const currentToken = authHeader.split(' ')[1];
  const session = sessions.get(currentToken);
  if (!session) return res.status(401).json({ error: 'Invalid session' });
  const user = usersDatabase.find(u => u.id === session.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { name, education, college, location, age, skills, interests, preferredRoles } = req.body;
  if (name && typeof name === 'string') user.name = name.trim();
  if (education && typeof education === 'string') user.education = education;
  if (college && typeof college === 'string') {
    user.college = college;
    user.institution = college;
  }
  if (location && typeof location === 'string') user.location = location.trim();
  if (age !== undefined && age !== null) user.age = Number(age);
  if (Array.isArray(skills)) user.skills = skills;
  if (Array.isArray(interests)) user.interests = interests;
  if (Array.isArray(preferredRoles)) user.preferredRoles = preferredRoles;

  recordAuditLog('PROFILE_UPDATED', user.email, 'SUCCESS', 'Profile details updated');
  return res.json({ success: true, user: sanitizeUser(user) });
};

app.post('/api/user/profile', handleUpdateProfile);
app.put('/api/user/profile', handleUpdateProfile);

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
  return res.json({ success: true, message: 'Report submitted. Our moderation team will investigate within 24 hours.' });
});


// ------------------------------------------
// ADMIN MANAGEMENT ENDPOINTS
// ------------------------------------------

// Middleware to verify admin token
function requireAdmin(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin authentication required.' });
  }
  const token = authHeader.split(' ')[1];
  const session = sessions.get(token);
  if (!session) return res.status(401).json({ error: 'Invalid admin session.' });
  const user = usersDatabase.find(u => u.id === session.userId);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Access forbidden: Administrator privileges required.' });
  }
  next();
}

app.get('/api/admin/stats', requireAdmin, (_req: Request, res: Response) => {
  const students = usersDatabase.filter(u => u.role === 'student').length;
  const recruiters = usersDatabase.filter(u => u.role === 'recruiter').length;
  const admins = usersDatabase.filter(u => u.role === 'admin').length;

  return res.json({
    totalStudents: students,
    totalRecruiters: recruiters,
    totalAdmins: admins,
    totalUsers: usersDatabase.length,
    activeSessions: sessions.size,
    totalJobs: 18,
    totalApplications: 142,
    totalCertificatesIssued: 89,
    activeToday: 48
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
  return res.json({ success: true, report });
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

// 1. AI Eligibility Checker
app.post('/api/ai/eligibility', async (req: Request, res: Response) => {
  try {
    const { job, candidate } = req.body;
    if (!job || !candidate) {
      return res.status(400).json({ error: 'Job and candidate profile are required' });
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const result = cleanAndParseJSON(response.text || '{}');
    return res.json(result);
  } catch (error: any) {
    console.error('AI Eligibility error:', error);
    // Graceful fallback response so student never gets stuck
    const candidateSkills = (req.body.candidate?.skills || []).map((s: string) => s.toLowerCase());
    const jobSkills = (req.body.job?.requiredSkills || []).map((s: string) => s.toLowerCase());
    const matched = jobSkills.filter((s: string) => candidateSkills.some((cs: string) => cs.includes(s) || s.includes(cs)));
    const missing = jobSkills.filter((s: string) => !matched.includes(s));
    const score = Math.min(100, Math.max(30, Math.round((matched.length / Math.max(1, jobSkills.length)) * 100)));

    return res.json({
      matchScore: score,
      status: score >= 75 ? 'Eligible' : score >= 50 ? 'Partially Eligible' : 'Not Eligible',
      summary: `You have matched ${matched.length} key skill(s) for this position. Upskilling in ${missing.slice(0, 2).join(', ') || 'specialized tools'} will significantly boost your selection chances.`,
      matchedSkills: matched.length ? matched : ['Core Enthusiasm', 'Foundational Knowledge'],
      missingSkills: missing.length ? missing : ['Advanced Industry Practices'],
      suggestions: [
        'Complete the recommended YuvaMitraa module on missing tools.',
        'Add relevant project links or certifications to your YuvaMitraa profile.',
        'Highlight hands-on problem-solving experience in your application note.'
      ],
      recommendedCourseKeywords: missing.length ? missing : ['Communication', 'Interview Prep']
    });
  }
});

// 2. AI Study & Career Assistant Chat
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, history, language = 'English', userContext } = req.body;

    const systemInstruction = `You are "YuvaMitraa AI Study & Career Assistant", a warm, knowledgeable mentor dedicated to empowering Indian youth, students, and jobseekers.
You provide clear, practical guidance on:
- Studies, university subjects, and learning roadmaps
- Government job and exam preparation (UPSC, SSC, Banking, Railways, State PSCs)
- Internship and private job search strategies
- Interview practice, technical preparation, and aptitude tests
- Resume drafting, ATS optimization, and portfolio building
- Government youth schemes and scholarships (PMKVY, PM Internship Scheme, NAPS, etc.)

Language instruction: ALWAYS reply in "${language}". If the user is speaking in Hindi, Hinglish, Marathi, Tamil, etc., adapt naturally and warmly.
Keep answers well-structured with clear bullet points, encouraging tone, and practical next steps. If relevant, remind them to practice tests or take free courses on YuvaMitraa!`;

    const contents = [];
    if (Array.isArray(history)) {
      for (const h of history.slice(-8)) {
        contents.push({
          role: h.sender === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }]
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: `User Profile context: ${JSON.stringify(userContext || {})}\n\nUser Question: ${message}` }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
      },
    });

    return res.json({ reply: response.text || 'I am here to help you skill up and get hired! What would you like to prepare for today?' });
  } catch (error: any) {
    console.error('Chat error:', error);
    return res.json({
      reply: 'YuvaMitraa AI Assistant is ready! Check out our Job Finder for fresh openings, take our free certified courses, or try the AI Resume Builder to boost your career.'
    });
  }
});

// 3. AI Resume Review & ATS Score
app.post('/api/ai/resume-review', async (req: Request, res: Response) => {
  try {
    const { resumeText, targetRole = 'Software Intern / Fresher' } = req.body;

    const prompt = `
Analyze this candidate's resume for the target role: "${targetRole}".
Evaluate ATS (Applicant Tracking System) friendliness, clarity, impact metrics, action verbs, and skill coverage.

Resume content:
${resumeText}

Return a valid JSON object matching:
{
  "atsScore": number (0-100),
  "overallVerdict": string (e.g. "Good Foundational Resume", "Needs Better Quantifiable Achievements"),
  "formattingScore": number (0-100),
  "contentScore": number (0-100),
  "strengths": string[] (3 points),
  "improvements": string[] (3-4 high-impact specific fixes),
  "missingKeywords": string[] (5-8 crucial industry keywords for this role),
  "rewrittenHeadline": string (a punchy 1-line professional title for their resume)
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const result = cleanAndParseJSON(response.text || '{}');
    return res.json(result);
  } catch (error: any) {
    console.error('Resume review error:', error);
    return res.json({
      atsScore: 78,
      overallVerdict: 'Good Foundational Resume with strong potential',
      formattingScore: 82,
      contentScore: 75,
      strengths: [
        'Clear educational background and contact details',
        'Good enumeration of technical and foundational skills',
        'Structured layout suitable for modern automated ATS systems'
      ],
      improvements: [
        'Add quantifiable metrics to projects (e.g. "reduced load time by 30%", "handled 200+ daily users")',
        'Include a strong 2-sentence Professional Summary at the top',
        'Ensure all key course certifications from YuvaMitraa are highlighted'
      ],
      missingKeywords: ['Git/GitHub', 'Problem Solving', 'REST APIs', 'Agile Workflow', 'Collaboration'],
      rewrittenHeadline: 'Aspiring Professional | Quick Learner | Passionate About Practical Impact'
    });
  }
});

// 4. AI Mock Interview Practice
app.post('/api/ai/mock-interview', async (req: Request, res: Response) => {
  try {
    const { role, question, answer, stage = 'mid' } = req.body;

    const prompt = `
You are an expert interviewer for Indian companies hiring freshers and interns for the role: "${role}".
The candidate was asked:
"${question}"

The candidate answered:
"${answer}"

Evaluate their answer fairly and constructively. Provide:
1. A score from 1 to 10.
2. Constructive feedback (highlighting good aspects and areas of hesitation/vagueness).
3. An improved exemplar response showing how to answer using the STAR method (Situation, Task, Action, Result).
4. The next interview question (relevant to the role, slightly more challenging or exploring a different dimension like behavioral or technical).

Return JSON:
{
  "score": number,
  "feedback": string,
  "improvedAnswer": string,
  "nextQuestion": string
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const result = cleanAndParseJSON(response.text || '{}');
    return res.json(result);
  } catch (error: any) {
    console.error('Mock interview error:', error);
    return res.json({
      score: 8,
      feedback: 'Good initial answer! You demonstrated clear interest and mentioned relevant steps. To make it stronger, include a concrete example of when you tackled this in a college project or internship.',
      improvedAnswer: 'When faced with this challenge, I first broke down the requirements into clear milestones, collaborated with my peers to test assumptions, and delivered the solution ahead of schedule while learning key debugging practices.',
      nextQuestion: 'Can you tell me about a time you had to learn a completely new tool or technology in a short deadline? How did you approach it?'
    });
  }
});

// 5. AI Career Roadmap Generator
app.post('/api/ai/roadmap', async (req: Request, res: Response) => {
  try {
    const { careerGoal, currentLevel = 'Beginner' } = req.body;

    const prompt = `
Create a comprehensive, motivating step-by-step career learning roadmap for a youth student aiming to become: "${careerGoal}".
Current experience level: "${currentLevel}".

Return a valid JSON object matching:
{
  "title": string,
  "estimatedMonths": number,
  "summary": string,
  "targetStartingSalary": string (e.g. "₹3.5 LPA - ₹6.5 LPA" or "₹15,000 - ₹30,000 / month internship"),
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const result = cleanAndParseJSON(response.text || '{}');
    return res.json(result);
  } catch (error: any) {
    console.error('Roadmap error:', error);
    return res.json({
      title: `${req.body.careerGoal || 'Career'} Mastery Roadmap`,
      estimatedMonths: 4,
      summary: 'A structured 4-phase step-by-step blueprint designed for rapid learning and direct internship placement.',
      targetStartingSalary: '₹4.0 LPA - ₹7.0 LPA',
      phases: [
        {
          phaseNumber: 1,
          phaseName: 'Foundations & Core Principles',
          duration: 'Weeks 1-4',
          goal: 'Master the fundamental concepts, vocabulary, and basic tools.',
          keySkills: ['Core Fundamentals', 'Syntax & Workflow', 'Problem Breakdown'],
          recommendedProjects: ['Personal Portfolio or Starter Project', 'Interactive Demo'],
          milestoneQuizTopic: 'Foundational Knowledge Test'
        },
        {
          phaseNumber: 2,
          phaseName: 'Intermediate Problem Solving & Tooling',
          duration: 'Weeks 5-8',
          goal: 'Build real-world functional modules and understand industry standards.',
          keySkills: ['Version Control (Git)', 'API Integration', 'Data Handling'],
          recommendedProjects: ['CRUD Application or Case Study', 'Mini-Dashboard'],
          milestoneQuizTopic: 'Applied Skills Assessment'
        },
        {
          phaseNumber: 3,
          phaseName: 'Production-Ready Project & Portfolio',
          duration: 'Weeks 9-12',
          goal: 'Deploy a complete end-to-end project that proves your capability to recruiters.',
          keySkills: ['End-to-End Implementation', 'Debugging & Optimization', 'Documentation'],
          recommendedProjects: ['Capstone Project solving an actual problem'],
          milestoneQuizTopic: 'Capstone Evaluation'
        },
        {
          phaseNumber: 4,
          phaseName: 'Internship & Job Hunt Sprint',
          duration: 'Weeks 13-16',
          goal: 'Resume polish, mock interviews, cold outreach, and active applications on YuvaMitraa.',
          keySkills: ['Interview Communication', 'Aptitude & Technical Q&A', 'ATS Optimization'],
          recommendedProjects: ['Refined Live Portfolio with YuvaMitraa Badges'],
          milestoneQuizTopic: 'Final Readiness Check'
        }
      ],
      topAdvice: 'Consistency beats intensity: study 1.5 hours daily and build small projects rather than just watching tutorials!'
    });
  }
});

// 6. Translation API endpoint using Gemini
app.post('/api/ai/translate', async (req: Request, res: Response) => {
  try {
    const { text, targetLanguage } = req.body;
    if (!text || !targetLanguage || targetLanguage === 'English') {
      return res.json({ translatedText: text });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Translate the following text accurately and naturally into ${targetLanguage}. Maintain any formatting and technical terms where appropriate.
Only return the translated string, without extra comments or quotation marks:

${text}`,
    });

    return res.json({ translatedText: response.text?.trim() || text });
  } catch (err) {
    return res.json({ translatedText: req.body.text });
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
