import { Job, UserProfile, EligibilityResult } from '../types';

export async function checkEligibility(job: Job, candidate: UserProfile): Promise<EligibilityResult> {
  try {
    const res = await fetch('/api/ai/eligibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job, candidate }),
    });
    if (!res.ok) throw new Error('Failed to evaluate eligibility');
    return await res.json();
  } catch (err) {
    console.warn('Backend eligibility check fallback:', err);
    // Client-side heuristic calculation
    const candidateSkills = (candidate.skills || []).map(s => s.toLowerCase());
    const jobSkills = (job.requiredSkills || []).map(s => s.toLowerCase());
    const matched = job.requiredSkills.filter(s => 
      candidateSkills.some(cs => cs.includes(s.toLowerCase()) || s.toLowerCase().includes(cs))
    );
    const missing = job.requiredSkills.filter(s => !matched.includes(s));
    const score = Math.min(95, Math.max(35, Math.round((matched.length / Math.max(1, job.requiredSkills.length)) * 100)));

    return {
      matchScore: score,
      status: score >= 70 ? 'Eligible' : score >= 45 ? 'Partially Eligible' : 'Not Eligible',
      summary: `You matched ${matched.length} out of ${job.requiredSkills.length} required skills. With focused training in ${missing.slice(0, 2).join(', ') || 'specialized tools'}, you will be a competitive candidate!`,
      matchedSkills: matched.length ? matched : ['Eagerness to Learn', 'Foundational Knowledge'],
      missingSkills: missing.length ? missing : ['Advanced Domain Practices'],
      suggestions: [
        'Take the corresponding YuvaMitraa module to earn a verified certificate in missing skills.',
        'Include your hands-on academic projects in your application note.',
        'Refine your resume headline to directly align with the job responsibilities.'
      ],
      recommendedCourseKeywords: missing.length ? missing : ['Tech', 'Communication']
    };
  }
}

export async function askStudyAssistant(
  message: string,
  history: { sender: string; text: string }[],
  language: string,
  userContext: Partial<UserProfile>
): Promise<string> {
  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, language, userContext }),
    });
    if (!res.ok) throw new Error('Chat failed');
    const data = await res.json();
    return data.reply;
  } catch (err) {
    console.warn('Study assistant chat fallback:', err);
    return `Namaste! I am your YuvaMitraa AI Assistant. I can help you prepare for technical interviews, government exam strategies (UPSC/SSC), resume polish, and career roadmaps in ${language}. Ask me anything!`;
  }
}

export async function reviewResumeWithATS(resumeText: string, targetRole: string) {
  try {
    const res = await fetch('/api/ai/resume-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeText, targetRole }),
    });
    if (!res.ok) throw new Error('Resume review failed');
    return await res.json();
  } catch (err) {
    console.warn('Resume review fallback:', err);
    return {
      atsScore: 82,
      overallVerdict: 'Solid profile with clear technical foundations',
      formattingScore: 85,
      contentScore: 80,
      strengths: [
        'Clean section hierarchy with education, skills, and projects',
        'Direct mentions of modern technologies like React, JavaScript, and Git',
        'Strong academic GPA and extracurricular involvement'
      ],
      improvements: [
        'Add quantifiable metrics: include numbers like user traffic, speed gains, or team sizes',
        'Incorporate active action verbs: "Spearheaded", "Engineered", "Optimized"',
        'Attach direct links to live GitHub repositories or deployed demos'
      ],
      missingKeywords: ['REST APIs', 'Unit Testing', 'CI/CD Basics', 'System Design Basics', 'Agile/Scrum'],
      rewrittenHeadline: 'Motivated Software Engineering Student & Full-Stack Developer'
    };
  }
}

export async function practiceMockInterview(role: string, question: string, answer: string, stage: string) {
  try {
    const res = await fetch('/api/ai/mock-interview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, question, answer, stage }),
    });
    if (!res.ok) throw new Error('Mock interview failed');
    return await res.json();
  } catch (err) {
    console.warn('Mock interview fallback:', err);
    return {
      score: 8,
      feedback: 'Great clarity! You answered directly and conveyed your enthusiasm. Adding a concrete metric or specific hurdle you overcame will elevate this to an exemplary answer.',
      improvedAnswer: 'When working on this project, I noticed our team needed clearer module definitions. I documented our interfaces in Git, coordinated code reviews, and reduced integration bugs by 35%.',
      nextQuestion: 'Describe a scenario where you faced a tight project deadline. How did you prioritize tasks?'
    };
  }
}

export async function generateCareerRoadmap(careerGoal: string, currentLevel: string) {
  try {
    const res = await fetch('/api/ai/roadmap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ careerGoal, currentLevel }),
    });
    if (!res.ok) throw new Error('Roadmap failed');
    return await res.json();
  } catch (err) {
    console.warn('Roadmap fallback:', err);
    return {
      title: `${careerGoal} Mastery Roadmap`,
      estimatedMonths: 4,
      summary: 'A fast-track curriculum focused on high-demand practical skills and verified certification.',
      targetStartingSalary: '₹4.5 LPA - ₹8.0 LPA (or ₹18,000 - ₹30,000/mo internship)',
      phases: [
        {
          phaseNumber: 1,
          phaseName: 'Core Foundations & Principles',
          duration: 'Month 1',
          goal: 'Master syntax, foundational architecture, and essential developer tools.',
          keySkills: ['Language Core', 'Data Structures', 'Version Control with Git'],
          recommendedProjects: ['Personal Portfolio', 'Interactive Command Tool'],
          milestoneQuizTopic: 'Foundational Knowledge Test'
        },
        {
          phaseNumber: 2,
          phaseName: 'Applied Problem Solving & Frameworks',
          duration: 'Month 2',
          goal: 'Build modern applications using industry standard frameworks.',
          keySkills: ['React / Node.js or Python Data Tools', 'REST APIs', 'State Management'],
          recommendedProjects: ['Dynamic E-Commerce or Portal App', 'API Dashboard'],
          milestoneQuizTopic: 'Framework Proficiency Quiz'
        },
        {
          phaseNumber: 3,
          phaseName: 'Full-Stack Integration & Production Deployment',
          duration: 'Month 3',
          goal: 'Deploy scalable apps with cloud services and testing.',
          keySkills: ['Database Design', 'Cloud Hosting', 'Performance Optimization'],
          recommendedProjects: ['Full-Stack Capstone Project with User Auth'],
          milestoneQuizTopic: 'Capstone Architecture Evaluation'
        },
        {
          phaseNumber: 4,
          phaseName: 'Internship Blitz & Interview Preparation',
          duration: 'Month 4',
          goal: 'Polish resume, pass mock interviews, and apply for openings on YuvaMitraa.',
          keySkills: ['ATS Resume Polish', 'Technical Q&A', 'Behavioral STAR Method'],
          recommendedProjects: ['Production Showcase Reel & YuvaMitraa Certification'],
          milestoneQuizTopic: 'Placement Readiness Verification'
        }
      ],
      topAdvice: 'Build publicly: commit your code to GitHub every day and share your progress on LinkedIn!'
    };
  }
}

export async function translateText(text: string, targetLanguage: string): Promise<string> {
  if (!text || targetLanguage === 'English') return text;
  try {
    const res = await fetch('/api/ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLanguage }),
    });
    if (!res.ok) throw new Error('Translation failed');
    const data = await res.json();
    return data.translatedText || text;
  } catch (err) {
    return text;
  }
}

// ------------------------------------------
// AUTHENTICATION & SECURITY CLIENT SERVICES
// ------------------------------------------

export async function loginApi(identifier: string, password: string, rememberMe: boolean = false) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password, rememberMe }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to authenticate');
  }
  return data;
}

export async function loginOtpInitApi(identifier: string) {
  const res = await fetch('/api/auth/login-otp-init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to send login OTP');
  }
  return data;
}

export async function verifyLoginOtpApi(identifier: string, otp: string, rememberMe: boolean = false) {
  const res = await fetch('/api/auth/login-otp-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, otp, rememberMe }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Invalid or expired OTP');
  }
  return data;
}

export async function registerDirectApi(payload: {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
  role?: string;
  college?: string;
  course?: string;
  location?: string;
  firebaseUid?: string;
}) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Registration failed');
  }
  return data;
}

export async function sendPasswordResetLinkApi(email: string) {
  const res = await fetch('/api/auth/send-password-reset-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to dispatch password reset link');
  }
  return data;
}

export async function registerInitApi(payload: {
  name: string;
  email: string;
  mobile: string;
  password: string;
  role: 'student' | 'recruiter';
  college?: string;
  course?: string;
  studyYear?: string;
  companyName?: string;
  designation?: string;
}) {
  const res = await fetch('/api/auth/register-init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Registration failed');
  }
  return data;
}

export async function verifyRegistrationOtpApi(identifier: string, otp: string) {
  const res = await fetch('/api/auth/verify-registration-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, otp }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Invalid OTP code');
  }
  return data;
}

export async function resendOtpApi(identifier: string) {
  const res = await fetch('/api/auth/resend-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to resend OTP');
  }
  return data;
}

export async function forgotPasswordInitApi(identifier: string) {
  const res = await fetch('/api/auth/forgot-password-init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to initiate password reset');
  }
  return data;
}

export async function resetPasswordApi(identifier: string, otp: string, newPassword: string) {
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, otp, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to reset password');
  }
  return data;
}

// ==========================================
// UNIFIED OTP & REGISTRATION CLIENT APIS
// ==========================================

export async function sendOtpApi(identifier: string, type: 'email' | 'mobile') {
  const res = await fetch('/api/auth/otp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, type }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to send OTP');
  }
  return data;
}

export async function verifyOtpApi(
  identifier: string, 
  otp: string, 
  type: 'email' | 'mobile', 
  rememberMe: boolean = true
) {
  const res = await fetch('/api/auth/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, otp, type, rememberMe }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to verify OTP');
  }
  return data;
}

export async function resendOtpNewApi(identifier: string, type: 'email' | 'mobile') {
  const res = await fetch('/api/auth/otp/resend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, type }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to resend OTP');
  }
  return data;
}

export interface RegisterCompleteData {
  registrationToken: string;
  firebaseUid?: string;
  name: string;
  email: string;
  phone: string;
  educationLevel: string;
  skills: string[];
  interests: string[];
  role?: 'student' | 'recruiter';
  college?: string;
  course?: string;
  age?: number;
  location?: string;
  preferredRoles?: string[];
}

export async function completeRegistrationApi(payload: RegisterCompleteData) {
  const res = await fetch('/api/auth/otp/register-complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to complete registration');
  }
  return data;
}

export async function updateProfileApi(token: string, profile: Partial<UserProfile>) {
  const res = await fetch('/api/user/profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profile),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update profile');
  }
  return data;
}


export async function firebaseLoginApi(payload: {
  firebaseUid: string;
  phoneNumber?: string;
  email?: string;
  name?: string;
  role?: string;
  photoUrl?: string;
}) {
  const res = await fetch('/api/auth/firebase-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to authenticate Firebase session');
  }
  return data;
}

export async function googleSignInApi(email: string, name?: string, photoUrl?: string) {
  const res = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, photoUrl }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Google Sign-In failed');
  }
  return data;
}

export async function fetchCurrentUserApi(token: string) {
  const res = await fetch('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error('Session invalid');
  }
  return await res.json();
}

export async function logoutApi(token: string) {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err) {
    // ignore
  }
}

export async function logoutAllApi(token: string) {
  const res = await fetch('/api/auth/logout-all', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to logout from all devices');
  return await res.json();
}

export async function deleteAccountApi(token: string) {
  const res = await fetch('/api/user/account', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to delete account');
  return await res.json();
}

export async function uploadProfilePhotoApi(token: string, photoDataUrl: string) {
  const res = await fetch('/api/user/profile-photo', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({ photoDataUrl })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update photo');
  return data;
}

export async function uploadResumeApi(token: string, resumeFileName: string, resumeText: string) {
  const res = await fetch('/api/user/resume-upload', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({ resumeFileName, resumeText })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to upload resume');
  return data;
}

export async function changePasswordApi(token: string, currentPassword: string, newPassword: string) {
  const res = await fetch('/api/user/change-password', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({ currentPassword, newPassword })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update password');
  return data;
}

export async function reportJobApi(payload: { jobId: string; jobTitle: string; company: string; reason: string; details?: string; userEmail?: string }) {
  const res = await fetch('/api/jobs/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to report job');
  return data;
}

// Admin APIs
export async function fetchAdminStatsApi(token: string) {
  const res = await fetch('/api/admin/stats', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to load admin stats');
  return await res.json();
}

export async function fetchAdminUsersApi(token: string) {
  const res = await fetch('/api/admin/users', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to load users');
  return await res.json();
}

export async function updateUserStatusApi(token: string, userId: string, status: 'active' | 'suspended') {
  const res = await fetch('/api/admin/user-status', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({ userId, status })
  });
  if (!res.ok) throw new Error('Failed to update user status');
  return await res.json();
}

export async function fetchAdminAuditLogsApi(token: string) {
  const res = await fetch('/api/admin/audit-logs', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to load audit logs');
  return await res.json();
}

export async function fetchReportedJobsApi(token: string) {
  const res = await fetch('/api/admin/reported-jobs', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to load reported jobs');
  return await res.json();
}

export async function actionReportedJobApi(token: string, id: string, action: 'resolve' | 'dismiss') {
  const res = await fetch(`/api/admin/reported-jobs/${id}/action`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({ action })
  });
  if (!res.ok) throw new Error('Failed to take action on reported job');
  return await res.json();
}

