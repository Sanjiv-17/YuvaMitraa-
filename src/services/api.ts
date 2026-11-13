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

export interface AIChatResponse {
  reply: string;
  suggestedQuestions?: string[];
  language?: string;
  relatedOpportunities?: string[];
}

export async function askStudyAssistantDetailed(
  message: string,
  history: { sender: string; text: string }[],
  language: string,
  userContext: Partial<UserProfile>
): Promise<AIChatResponse> {
  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, language, userContext }),
    });
    if (!res.ok) throw new Error('Chat failed');
    return await res.json();
  } catch (err) {
    console.warn('Study assistant chat fallback:', err);
    const isKannada = language === 'Kannada';
    return {
      reply: isKannada 
        ? `ನಮಸ್ಕಾರ! 🙏 ನಾನು ನಿಮ್ಮ ಯುವಮಿತ್ರ (YuvaMitraa) ಎಐ ಕರಿಯರ್ ಮೆಂಟರ್. ಇಂಟರ್ನ್‌ಶಿಪ್‌ಗಳು, ರೆಸ್ಯೂಮೆ ಸುಧಾರಣೆ, ಮತ್ತು ಕರಿಯರ್ ಮಾರ್ಗದರ್ಶನಕ್ಕಾಗಿ ನಾನು ಸಿದ್ಧನಾಗಿದ್ದೇನೆ. ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಕೇಳಿ!`
        : `Namaste! I am your YuvaMitraa AI Assistant. I can help you prepare for technical interviews, internship discovery, resume optimization, and career roadmaps in ${language}. Ask me anything!`,
      suggestedQuestions: isKannada ? [
        'ನನ್ನ ಪ್ರೊಫೈಲ್‌ಗೆ ಸೂಕ್ತವಾದ ಇಂಟರ್ನ್‌ಶಿಪ್‌ಗಳು ಯಾವುವು?',
        'ರೆಸ್ಯೂಮೆ ATS ಸ್ಕೋರ್ ಹೆಚ್ಚಿಸಲು 5 ಸಲಹೆಗಳು ನೀಡಿ',
        'ಟೆಕ್ನಿಕಲ್ ಇಂಟರ್ವ್ಯೂನಲ್ಲಿ ಸಾಮಾನ್ಯವಾಗಿ ಕೇಳುವ ಪ್ರಶ್ನೆಗಳು'
      ] : [
        'What internships match my profile?',
        'How can I improve my resume ATS score?',
        'Conduct a mock interview for me'
      ]
    };
  }
}

export async function askStudyAssistant(
  message: string,
  history: { sender: string; text: string }[],
  language: string,
  userContext: Partial<UserProfile>
): Promise<string> {
  const result = await askStudyAssistantDetailed(message, history, language, userContext);
  return result.reply;
}

export async function requestTtsAudio(text: string, language: string = 'English'): Promise<{ audioBase64?: string; useClientSynthesis?: boolean; format?: string }> {
  try {
    const res = await fetch('/api/ai/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language }),
    });
    if (!res.ok) return { useClientSynthesis: true };
    return await res.json();
  } catch {
    return { useClientSynthesis: true };
  }
}

export async function transcribeAudioApi(audioBase64: string, mimeType: string = 'audio/webm', language: string = 'English'): Promise<string> {
  try {
    const res = await fetch('/api/ai/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64, mimeType, language }),
    });
    if (!res.ok) throw new Error('Transcription failed');
    const data = await res.json();
    return data.text || '';
  } catch {
    return '';
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

export async function generateResumeFromProfile(userProfile: any, targetRole: string = 'Software Intern') {
  try {
    const res = await fetch('/api/ai/resume-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userProfile, targetRole }),
    });
    if (!res.ok) throw new Error('Failed to generate resume');
    return await res.json();
  } catch (err) {
    console.warn('Resume generation fallback:', err);
    return {
      headline: `${targetRole} Candidate`,
      atsTips: [
        'Use standard section headings: EDUCATION, TECHNICAL SKILLS, PROJECTS.',
        'Include numbers in your bullet points to demonstrate quantifiable impact.'
      ],
      resumeText: `${userProfile?.name || 'Candidate Name'}\n${userProfile?.email || 'email@domain.com'} | ${userProfile?.phone || '+91 XXXXX XXXXX'}\n\nEDUCATION\n${userProfile?.college || 'University / Institution'} - ${userProfile?.branch || 'Specialization'}\n\nSKILLS\n${(userProfile?.skills || ['JavaScript', 'React']).join(', ')}`
    };
  }
}

export async function enhanceResumeBullet(bulletPoint: string, targetRole: string = 'Software Intern') {
  try {
    const res = await fetch('/api/ai/resume-enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bulletPoint, targetRole }),
    });
    if (!res.ok) throw new Error('Failed to enhance bullet');
    return await res.json();
  } catch (err) {
    return {
      enhancedBullets: [
        `Engineered a responsive module for ${bulletPoint}, boosting performance by 30%.`,
        `Architected and deployed ${bulletPoint} using clean code practices and Git version control.`,
        `Collaborated with team to implement ${bulletPoint}, ensuring 100% mobile responsiveness.`
      ]
    };
  }
}

export async function practiceMockInterview(role: string, question: string, answer: string, stage: string, language: string = 'English') {
  try {
    const res = await fetch('/api/ai/mock-interview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, question, answer, stage, language }),
    });
    if (!res.ok) throw new Error('Mock interview failed');
    return await res.json();
  } catch (err) {
    console.warn('Mock interview fallback:', err);
    return {
      score: 8,
      scoreOutOf100: 82,
      feedback: 'Great clarity! You answered directly and conveyed your enthusiasm. Adding a concrete metric or specific hurdle you overcame will elevate this to an exemplary answer.',
      strengths: ['Direct communication', 'Clear conceptual foundation'],
      improvements: ['Include quantifiable metrics', 'Use the STAR method'],
      improvedAnswer: 'When working on this project, I noticed our team needed clearer module definitions. I documented our interfaces in Git, coordinated code reviews, and reduced integration bugs by 35%.',
      nextQuestion: 'Describe a scenario where you faced a tight project deadline. How did you prioritize tasks?'
    };
  }
}

export async function generateInterviewQuestion(role: string, stage: string, questionNumber: number = 1, language: string = 'English') {
  try {
    const res = await fetch('/api/ai/interview-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, stage, questionNumber, language }),
    });
    if (!res.ok) throw new Error('Failed to fetch interview question');
    return await res.json();
  } catch {
    return {
      question: `Could you give a brief introduction of yourself and explain your interest in ${role}?`,
      stage,
      expectedKeyPoints: ['Background overview', 'Key skills', 'Genuine motivation'],
      timeLimitSeconds: 90
    };
  }
}

export async function generateCareerRoadmap(careerGoal: string, currentLevel: string, language: string = 'English') {
  try {
    const res = await fetch('/api/ai/roadmap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ careerGoal, currentLevel, language }),
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

export async function generatePersonalizedLearningPlan(targetSkillOrRole: string, weeklyHours: number = 10, language: string = 'English', userSkills: string[] = []) {
  try {
    const res = await fetch('/api/ai/learning-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetSkillOrRole, weeklyHours, language, userSkills }),
    });
    if (!res.ok) throw new Error('Failed to generate learning plan');
    return await res.json();
  } catch (err) {
    return {
      planTitle: `${targetSkillOrRole} Accelerator Plan`,
      weeklyCommitment: `${weeklyHours} Hours/Week`,
      weeks: [
        {
          weekNumber: 1,
          focusArea: 'Foundations & Tooling',
          learningObjectives: ['Master basics and set up local dev environment', 'Start Git tracking'],
          recommendedYuvaCourses: ['Core Fundamentals'],
          handsOnTask: 'Complete 3 coding challenges',
          hoursEstimate: weeklyHours
        }
      ],
      capstoneProjectIdea: 'Portfolio Capstone Showcase',
      successMetric: 'Earn YuvaMitraa skill certificate'
    };
  }
}

export async function fetchPersonalizedRecommendations(studentProfile: any) {
  try {
    const res = await fetch('/api/external/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentProfile }),
    });
    if (!res.ok) throw new Error('Recommendations request failed');
    const data = await res.json();
    return data.recommendations || [];
  } catch {
    return [];
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
  role?: 'student' | 'recruiter' | 'experienced';
  currentRole?: string;
  yearsOfExperience?: string;
  college?: string;
  institution?: string;
  companyName?: string;
  cinOrRegistrationNumber?: string;
  course?: string;
  location?: string;
  firebaseUid?: string;
  idToken?: string;
}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (payload.idToken) headers['Authorization'] = `Bearer ${payload.idToken}`;
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const err: any = new Error(data.error || 'Registration failed');
    if (data.code) err.code = data.code;
    throw err;
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
  role: 'student' | 'recruiter' | 'experienced';
  college?: string;
  course?: string;
  studyYear?: string;
  companyName?: string;
  designation?: string;
  currentRole?: string;
  yearsOfExperience?: string;
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
  idToken?: string;
  phoneNumber?: string;
  email?: string;
  name?: string;
  role?: string;
  photoUrl?: string;
  currentRole?: string;
  yearsOfExperience?: string;
}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (payload.idToken) headers['Authorization'] = `Bearer ${payload.idToken}`;

  const res = await fetch('/api/auth/firebase-login', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const err: any = new Error(data.error || 'Failed to authenticate Firebase session');
    if (data.code) err.code = data.code;
    throw err;
  }
  return data;
}

export async function verifyAdminClaimApi(idToken: string) {
  const res = await fetch('/api/auth/admin-verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ idToken }),
  });
  const data = await res.json();
  if (!res.ok) {
    const err: any = new Error(data.error || 'Unauthorized admin access');
    if (data.code) err.code = data.code;
    throw err;
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

// ------------------------------------------
// Real-World Ecosystem Client APIs
// ------------------------------------------

// 1. Opportunities APIs
export async function fetchOpportunitiesApi(params?: { category?: string; type?: string; search?: string; collegeId?: string; creatorId?: string; showAll?: boolean }) {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.type) query.set('type', params.type);
  if (params?.search) query.set('search', params.search);
  if (params?.collegeId) query.set('collegeId', params.collegeId);
  if (params?.creatorId) query.set('creatorId', params.creatorId);
  if (params?.showAll) query.set('showAll', 'true');

  const res = await fetch(`/api/opportunities?${query.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch opportunities');
  return data;
}

export async function postOpportunityApi(token: string | null, payload: any) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('/api/opportunities', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to post opportunity');
  return data;
}

export async function verifyOpportunityApi(token: string, jobId: string, action: 'approve' | 'reject', evidenceNotes?: string) {
  const res = await fetch(`/api/opportunities/${jobId}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ action, evidenceNotes })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to verify opportunity');
  return data;
}

export async function deleteOpportunityApi(token: string, jobId: string) {
  const res = await fetch(`/api/opportunities/${jobId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete opportunity');
  return data;
}

// 2. Applications APIs
export async function fetchApplicationsApi(params?: { candidateEmail?: string; jobId?: string; collegeName?: string; status?: string }) {
  const query = new URLSearchParams();
  if (params?.candidateEmail) query.set('candidateEmail', params.candidateEmail);
  if (params?.jobId) query.set('jobId', params.jobId);
  if (params?.collegeName) query.set('collegeName', params.collegeName);
  if (params?.status) query.set('status', params.status);

  const res = await fetch(`/api/applications?${query.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch applications');
  return data;
}

export async function applyOpportunityApi(token: string | null, payload: { jobId: string; coverLetter?: string; matchScore?: number; candidateEmail?: string; candidateName?: string }) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('/api/applications/apply', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to submit application');
  return data;
}

export async function updateApplicationStatusApi(token: string | null, applicationId: string, payload: {
  status?: string;
  interviewDate?: string;
  interviewTime?: string;
  interviewMode?: string;
  interviewLinkOrVenue?: string;
  recruiterFeedback?: string;
  notes?: string;
}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`/api/applications/${applicationId}/status`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update application status');
  return data;
}

// 3. Colleges APIs
export async function fetchCollegesApi() {
  const res = await fetch('/api/colleges');
  const data = await res.json();
  if (!res.ok) throw new Error('Failed to fetch colleges');
  return data;
}

export async function registerCollegeApi(payload: any) {
  const res = await fetch('/api/colleges/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to register college');
  return data;
}

export async function fetchCollegeStudentsApi(collegeName?: string, collegeId?: string) {
  const query = new URLSearchParams();
  if (collegeName) query.set('collegeName', collegeName);
  if (collegeId) query.set('collegeId', collegeId);

  const res = await fetch(`/api/colleges/my-students?${query.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error('Failed to load college students');
  return data;
}

export async function fetchCollegeAnalyticsApi(collegeName?: string) {
  const query = new URLSearchParams();
  if (collegeName) query.set('collegeName', collegeName);

  const res = await fetch(`/api/colleges/analytics?${query.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error('Failed to load college analytics');
  return data;
}

// 4. Companies APIs
export async function fetchCompaniesApi() {
  const res = await fetch('/api/companies');
  const data = await res.json();
  if (!res.ok) throw new Error('Failed to fetch companies');
  return data;
}

// 5. Verification Center APIs (Admin)
export async function fetchPendingVerificationsApi(token: string) {
  const res = await fetch('/api/verification/pending', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch pending verifications');
  return data;
}

export async function actionVerificationApi(token: string, payload: {
  requestId?: string;
  entityType: 'college' | 'company' | 'opportunity';
  entityId: string;
  action: 'approve' | 'reject';
  notes?: string;
}) {
  const res = await fetch('/api/verification/action', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to take action on verification request');
  return data;
}

// 6. Notifications APIs
export async function fetchNotificationsApi(token?: string, role?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const query = role ? `?role=${role}` : '';

  const res = await fetch(`/api/notifications${query}`, { headers });
  const data = await res.json();
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return data;
}

export async function markNotificationReadApi(id: string) {
  const res = await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
  return await res.json();
}

// 7. Student Projects API
export async function saveStudentProjectApi(token: string, project: { id?: string; title: string; description: string; technologies: string[]; liveLink?: string; githubLink?: string }) {
  const res = await fetch('/api/user/project', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(project)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to save project');
  return data;
}

// ------------------------------------------
// External Data Integration & Recommendation APIs
// ------------------------------------------

export async function fetchExternalInternshipsApi(params?: { search?: string; source?: string; workMode?: string; isGovernment?: boolean }) {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.source) query.set('source', params.source);
  if (params?.workMode) query.set('workMode', params.workMode);
  if (params?.isGovernment !== undefined) query.set('isGovernment', String(params.isGovernment));

  const res = await fetch(`/api/external/internships?${query.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch external internships');
  return data;
}

export async function fetchExternalJobsApi(params?: { search?: string; location?: string; type?: string }) {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.location) query.set('location', params.location);
  if (params?.type) query.set('type', params.type);

  const res = await fetch(`/api/external/jobs?${query.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch external jobs');
  return data;
}

export async function fetchIntegrationSourcesApi(token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('/api/external/sources', { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch integration sources');
  return data;
}

export async function fetchSyncLogsApi(token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('/api/external/sync-logs', { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch data sync logs');
  return data;
}

export async function triggerDataSyncApi(token: string, sourceId?: string) {
  const res = await fetch('/api/external/sync/trigger', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ sourceId })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to trigger data sync');
  return data;
}

export async function toggleIntegrationSourceApi(token: string, sourceId: string, enabled: boolean) {
  const res = await fetch(`/api/external/sources/${sourceId}/toggle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ enabled })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update integration source');
  return data;
}

export async function fetchPersonalizedRecommendationsApi(studentProfile: any, limit: number = 6) {
  const res = await fetch('/api/external/recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentProfile, limit })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch personalized recommendations');
  return data;
}



