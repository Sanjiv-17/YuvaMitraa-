import {
  InternshipMatchBreakdown,
  InternshipRecommendation,
  Job,
  SkillGapCourseSuggestion,
  StudentRecommendationBundle,
  UserProfile,
} from '../types';

export interface UnifiedInternshipCandidate {
  id: string;
  jobId?: string;
  title: string;
  companyName: string;
  description: string;
  responsibilities?: string[];
  perks?: string[];
  category?: string;
  type?: string;
  requiredSkills: string[];
  eligibility: string;
  stipend: string;
  duration: string;
  workMode: 'Online' | 'Offline' | 'Hybrid';
  location: string;
  city?: string;
  applicationDeadline: string;
  applyUrl: string;
  sourceName: string;
  isVerified: boolean;
  isGovernmentSponsored?: boolean;
  verifiedStatus?: string;
}

const SKILL_ALIASES: Record<string, string[]> = {
  javascript: ['javascript', 'js', 'es6', 'es6+', 'ecmascript', 'vanilla js'],
  typescript: ['typescript', 'ts'],
  react: ['react', 'reactjs', 'react.js', 'react 19', 'hooks'],
  'tailwind css': ['tailwind', 'tailwindcss', 'tailwind css'],
  html: ['html', 'html5'],
  css: ['css', 'css3', 'scss', 'sass'],
  node: ['node', 'nodejs', 'node.js'],
  express: ['express', 'expressjs', 'express.js'],
  python: ['python', 'python3', 'py'],
  java: ['java', 'core java', 'java or c++', 'spring', 'spring boot'],
  c: ['c', 'c programming', 'c language'],
  'c++': ['c++', 'cpp', 'java or c++'],
  sql: ['sql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'dbms', 'mongodb / sql'],
  mongodb: ['mongodb', 'mongo', 'nosql', 'mongodb / sql'],
  pandas: ['pandas', 'numpy', 'data analysis', 'data wrangling'],
  fastapi: ['fastapi', 'flask', 'django', 'backend api'],
  git: ['git', 'github', 'version control'],
  'rest apis': ['rest', 'rest api', 'rest apis', 'restful', 'api integration', 'apis'],
  'ai/ml': ['ai', 'ml', 'ai/ml', 'artificial intelligence', 'machine learning', 'deep learning', 'nlp'],
  'llm prompts': ['llm', 'llms', 'llm prompts', 'prompt engineering', 'generative ai', 'genai', 'gemini', 'gemini api'],
  'data structures & algorithms': ['dsa', 'data structures', 'algorithms', 'data structures & algorithms', 'problem solving', 'coding'],
  'computer networks': ['computer networks', 'networking', 'tcp/ip', 'http'],
  figma: ['figma', 'ui/ux', 'ui design', 'ux design'],
  wireframing: ['wireframing', 'wireframes', 'prototyping', 'design systems'],
  'user research': ['user research', 'usability testing', 'ux research'],
  'social media marketing': ['social media', 'social media marketing', 'instagram', 'linkedin marketing', 'digital marketing'],
  'content writing': ['content writing', 'copywriting', 'blogging', 'script writing', 'report writing'],
  'seo basics': ['seo', 'seo basics', 'search engine optimization', 'keyword research'],
  canva: ['canva', 'graphic design', 'visual design'],
  analytics: ['analytics', 'google analytics', 'marketing analytics', 'data analysis'],
  'financial accounting': ['accounting', 'financial accounting', 'bookkeeping', 'balance sheet'],
  'tally prime': ['tally', 'tally prime', 'erp9'],
  'ms excel': ['excel', 'ms excel', 'microsoft excel', 'spreadsheets', 'ms office'],
  'ms office': ['ms office', 'microsoft office', 'ms word', 'powerpoint', 'ms excel'],
  'gst filing': ['gst', 'gst filing', 'taxation', 'income tax'],
  communication: ['communication', 'verbal communication', 'hindi/english communication', 'english/hindi', 'presentation skills', 'soft skills'],
  'email writing': ['email writing', 'business communication', 'corporate writing'],
  'customer empathy': ['customer empathy', 'customer support', 'customer success', 'crm', 'crm basics'],
  'basic computer literacy': ['basic computer literacy', 'computer basics', 'digital literacy', 'ms office', 'typing'],
  'community engagement': ['community engagement', 'public policy', 'public policy interest', 'field coordination', 'teamwork'],
  'analytical skills': ['analytical skills', 'critical thinking', 'problem solving', 'aptitude', 'reasoning'],
  'problem solving': ['problem solving', 'analytical skills', 'dsa', 'debugging'],
};

function normalizeToken(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function corpusContainsTerm(corpus: string, rawTerm: string): boolean {
  const term = normalizeToken(rawTerm);
  if (!corpus || !term) return false;
  const escaped = escapeRegExp(term);
  return new RegExp(`(?:^|[^a-z0-9+#.])${escaped}(?:[^a-z0-9+#.]|$)`, 'i').test(corpus);
}

const DOMAIN_SYNONYMS: Record<string, string[]> = {
  tech: [
    'tech', 'technology', 'software', 'frontend', 'backend', 'full-stack', 'fullstack',
    'web development', 'ai', 'ml', 'ai/ml', 'artificial intelligence', 'machine learning',
    'data science', 'data analytics', 'cloud', 'engineering', 'coding', 'programming',
    'computer science', 'react', 'python', 'java', 'node',
  ],
  design: ['design', 'ui/ux', 'ui', 'ux', 'figma', 'product design', 'graphic design', 'prototyping'],
  marketing: ['marketing', 'digital marketing', 'seo', 'social media', 'content writing', 'growth', 'branding'],
  finance: ['finance', 'fintech', 'accounting', 'tally', 'gst', 'audit', 'banking', 'taxation', 'financial'],
  operations: ['operations', 'customer success', 'support', 'crm', 'business operations'],
  government: ['government', 'govt', 'public policy', 'administration', 'youth', 'pm internship', 'social impact', 'civil'],
};

function resolveCanonicalTags(rawSkill: string): string[] {
  const norm = normalizeToken(rawSkill);
  if (!norm) return [];
  const matches = new Set<string>([norm]);

  // Split composite requirements like "Java or C++" or "MongoDB / SQL"
  const parts = norm.split(/\s*(?:\/|\bor\b|\||,|&)\s*/i).map(p => p.trim()).filter(Boolean);
  for (const part of parts) {
    matches.add(part);
  }

  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    for (const candidate of [norm, ...parts]) {
      const matched = aliases.some(alias => {
        if (candidate === alias) return true;
        // Word-boundary check only for multi-character tokens so 1-letter skills like 'c' never match 'react'/'css'
        if (alias.length >= 2 && candidate.length >= 2 && corpusContainsTerm(candidate, alias)) return true;
        if (candidate.length >= 3 && alias.length >= 3 && corpusContainsTerm(alias, candidate)) return true;
        return false;
      });
      if (matched) {
        matches.add(canonical);
        for (const a of aliases) matches.add(a);
      }
    }
  }
  return Array.from(matches);
}

function skillsOverlap(studentTags: Set<string>, studentCorpus: string, requiredSkill: string): boolean {
  const reqNorm = normalizeToken(requiredSkill);
  if (!reqNorm) return false;
  const reqVariants = resolveCanonicalTags(reqNorm);
  for (const variant of reqVariants) {
    if (studentTags.has(variant)) return true;
    for (const sTag of studentTags) {
      if (
        sTag === variant ||
        (sTag.length >= 4 && variant.length >= 4 && (corpusContainsTerm(variant, sTag) || corpusContainsTerm(sTag, variant)))
      ) {
        return true;
      }
    }
  }
  // Check longer keywords against resume / project text corpus strictly on word boundaries
  const coreWords = reqNorm.split(/\s*(?:\/|\bor\b)\s*/i).map(w => w.trim()).filter(w => w.length >= 2);
  return coreWords.some(word => corpusContainsTerm(studentCorpus, word));
}

const COURSE_CATALOG_MAPPING: Array<{
  keywords: string[];
  courseId: string;
  courseTitle: string;
  duration: string;
  provider: string;
  resourceUrl?: string;
}> = [
  {
    keywords: ['react', 'javascript', 'tailwind', 'html', 'css', 'frontend', 'web', 'rest api', 'rest apis', 'api', 'apis', 'git', 'github'],
    courseId: 'course-1',
    courseTitle: 'Modern Frontend Web Development with React & Tailwind',
    duration: '14 hrs',
    provider: 'YuvaMitraa Certified',
    resourceUrl: 'https://react.dev/learn',
  },
  {
    keywords: ['python', 'pandas', 'data', 'numpy', 'sql', 'analytics'],
    courseId: 'course-7',
    courseTitle: 'Python for Beginners & Practical Data Analysis',
    duration: '12 hrs',
    provider: 'YuvaMitraa Certified',
    resourceUrl: 'https://docs.python.org/3/tutorial/',
  },
  {
    keywords: ['llm', 'prompt', 'gemini', 'generative ai', 'genai', 'ai/ml', 'ai'],
    courseId: 'course-8',
    courseTitle: 'Generative AI & Prompt Engineering for Indian Industry',
    duration: '10 hrs',
    provider: 'YuvaMitraa Certified',
    resourceUrl: 'https://ai.google.dev/gemini-api/docs',
  },
  {
    keywords: ['machine learning', 'deep learning', 'ml', 'pytorch', 'scikit'],
    courseId: 'course-12',
    courseTitle: 'Machine Learning, Deep Learning & Predictive Modeling',
    duration: '16 hrs',
    provider: 'YuvaMitraa Certified',
    resourceUrl: 'https://scikit-learn.org/stable/getting_started.html',
  },
  {
    keywords: ['dsa', 'data structures', 'algorithms', 'problem solving', 'coding'],
    courseId: 'course-11',
    courseTitle: 'Data Structures, Algorithms & Coding Practice for Placements',
    duration: '18 hrs',
    provider: 'YuvaMitraa Certified',
    resourceUrl: 'https://nptel.ac.in/',
  },
  {
    keywords: ['java', 'spring', 'oop', 'backend', 'node', 'node.js', 'express', 'fastapi', 'mongodb'],
    courseId: 'course-10',
    courseTitle: 'Core Java Programming, OOP & Backend Engineering Foundations',
    duration: '15 hrs',
    provider: 'YuvaMitraa Certified',
    resourceUrl: 'https://developer.mozilla.org/en-US/docs/Learn_web_development',
  },
  {
    keywords: ['figma', 'ui', 'ux', 'wireframing', 'prototyping', 'design system'],
    courseId: 'course-5',
    courseTitle: 'UI/UX Design Masterclass with Figma',
    duration: '11 hrs',
    provider: 'YuvaMitraa Certified',
    resourceUrl: 'https://help.figma.com/hc/en-us/categories/360002051613',
  },
  {
    keywords: ['seo', 'social media', 'marketing', 'content writing', 'canva', 'digital marketing'],
    courseId: 'course-3',
    courseTitle: 'Digital Marketing, SEO & Social Media Growth',
    duration: '10 hrs',
    provider: 'YuvaMitraa Certified',
    resourceUrl: 'https://skillshop.withgoogle.com/',
  },
  {
    keywords: ['tally', 'gst', 'accounting', 'financial', 'excel'],
    courseId: 'course-4',
    courseTitle: 'Financial Accounting, Tally Prime & GST Basics',
    duration: '12 hrs',
    provider: 'YuvaMitraa Certified',
    resourceUrl: 'https://swayam.gov.in/',
  },
  {
    keywords: ['communication', 'email', 'english', 'hindi', 'presentation', 'customer', 'crm'],
    courseId: 'course-2',
    courseTitle: 'Business Communication & Workplace Presentation Skills',
    duration: '8 hrs',
    provider: 'YuvaMitraa Certified',
    resourceUrl: 'https://swayam.gov.in/',
  },
  {
    keywords: ['aptitude', 'reasoning', 'analytical', 'public policy', 'report writing', 'government'],
    courseId: 'course-6',
    courseTitle: 'General Aptitude, Reasoning & Current Affairs (Govt Exams)',
    duration: '16 hrs',
    provider: 'YuvaMitraa Certified',
    resourceUrl: 'https://swayam.gov.in/',
  },
  {
    keywords: ['cybersecurity', 'security', 'network', 'computer networks', 'basic computer literacy'],
    courseId: 'course-9',
    courseTitle: 'Cybersecurity Awareness & Digital Hygiene for Youth',
    duration: '8 hrs',
    provider: 'YuvaMitraa Certified',
    resourceUrl: 'https://infosecawareness.in/',
  },
];

export function suggestResourcesForMissingSkills(
  missingSkills: string[],
  internshipTitle?: string
): SkillGapCourseSuggestion[] {
  const suggestions: SkillGapCourseSuggestion[] = [];
  const seenCourseIds = new Set<string>();

  for (const skill of missingSkills) {
    const norm = normalizeToken(skill);
    if (!norm) continue;
    const match = COURSE_CATALOG_MAPPING.find(entry =>
      entry.keywords.some(kw => norm === kw || corpusContainsTerm(norm, kw) || corpusContainsTerm(kw, norm))
    );

    if (match) {
      if (!seenCourseIds.has(match.courseId)) {
        seenCourseIds.add(match.courseId);
        suggestions.push({
          skill,
          courseId: match.courseId,
          courseTitle: match.courseTitle,
          provider: match.provider,
          duration: match.duration,
          resourceUrl: match.resourceUrl,
          reason: `Builds ${skill} required for ${internshipTitle || 'this role'}`,
        });
      }
    } else {
      suggestions.push({
        skill,
        courseTitle: `${skill} Guided Skill Track (NPTEL / SWAYAM)`,
        provider: 'SWAYAM / NPTEL Open Resource',
        resourceUrl: `https://swayam.gov.in/explorer?searchText=${encodeURIComponent(skill)}`,
        reason: `Recommended self-paced study resource to bridge ${skill}`,
      });
    }
  }

  return suggestions.slice(0, 4);
}

export function jobToCandidate(job: Job): UnifiedInternshipCandidate {
  const locLower = (job.location || '').toLowerCase();
  const inferredMode: 'Online' | 'Offline' | 'Hybrid' =
    job.type === 'remote' || locLower.includes('remote') || locLower.includes('work from home')
      ? 'Online'
      : locLower.includes('hybrid')
      ? 'Hybrid'
      : 'Offline';

  return {
    id: job.id,
    jobId: job.id,
    title: job.title,
    companyName: job.company,
    description: job.description || '',
    responsibilities: job.responsibilities || [],
    perks: job.perks || [],
    category: job.category || 'Tech',
    type: job.type || 'internship',
    requiredSkills: job.requiredSkills || [],
    eligibility:
      job.eligibility ||
      (job.isGovernmentSponsored
        ? 'Students / Graduates eligible as per Govt Internship guidelines'
        : 'Undergraduate / Graduate students in relevant disciplines'),
    stipend: job.stipend || 'As per company norms',
    duration: job.duration || '3-6 Months',
    workMode: inferredMode,
    location: job.location || 'India',
    city: job.city,
    applicationDeadline: job.deadline || 'Rolling Applications',
    applyUrl: job.originalUrl || job.externalSourceUrl || '',
    sourceName: job.opportunitySource || 'Direct Employer',
    isVerified: Boolean(job.isVerified),
    isGovernmentSponsored: Boolean(job.isGovernmentSponsored),
    verifiedStatus: job.verificationStatus,
  };
}

export function getMatchTier(score: number): InternshipRecommendation['matchTier'] {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Very Good';
  if (score >= 65) return 'Good';
  if (score >= 50) return 'Moderate';
  return 'Low Match';
}

function isInternshipBeginnerFriendly(candidate: UnifiedInternshipCandidate): boolean {
  const combined = normalizeToken(
    `${candidate.title} ${candidate.description} ${candidate.eligibility} ${candidate.requiredSkills.join(' ')}`
  );
  if (
    combined.includes('beginner') ||
    combined.includes('trainee') ||
    combined.includes('fresher') ||
    combined.includes('junior') ||
    combined.includes('basic computer') ||
    combined.includes('crm basics') ||
    combined.includes('seo basics') ||
    combined.includes('fellow') ||
    combined.includes('first year') ||
    combined.includes('10th') ||
    candidate.isGovernmentSponsored
  ) {
    return true;
  }
  return (candidate.requiredSkills || []).length <= 3;
}

function isStudentBeginnerProfile(student: Partial<UserProfile>): boolean {
  const skillsCount = (student.skills || []).length;
  const year = normalizeToken(`${student.studyYear || ''} ${student.education || ''}`);
  const isEarlyYear =
    year.includes('1st') ||
    year.includes('2nd') ||
    year.includes('first') ||
    year.includes('second') ||
    year.includes('sem 1') ||
    year.includes('sem 2') ||
    year.includes('sem 3') ||
    year.includes('sem 4') ||
    year.includes('diploma') ||
    year.includes('12th');
  return skillsCount <= 2 || isEarlyYear;
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'and', 'the', 'for', 'with', 'into', 'from', 'that', 'this', 'your', 'will',
    'work', 'role', 'intern', 'internship', 'looking', 'build', 'using', 'based',
    'india', 'students', 'student', 'career', 'goal', 'goals', 'want', 'become',
    'learn', 'good', 'strong', 'skills', 'experience', 'opportunity', 'domain',
  ]);
  return normalizeToken(text)
    .split(/[^a-z0-9+#.]+/)
    .map(w => w.trim())
    .filter(w => w.length >= 2 && !stopWords.has(w));
}

export function scoreInternshipForStudent(
  student: Partial<UserProfile>,
  candidate: UnifiedInternshipCandidate
): InternshipRecommendation {
  const techSkills = (student.skills || []).filter(Boolean);
  const nonTechSkills = (student.nonTechnicalSkills || []).filter(Boolean);
  const projectTechs = (student.projects || []).flatMap(p => p.technologies || []);
  const allExplicitSkills = [...techSkills, ...nonTechSkills, ...projectTechs];

  const studentSkillTags = new Set<string>();
  for (const s of allExplicitSkills) {
    for (const v of resolveCanonicalTags(s)) {
      studentSkillTags.add(v);
    }
  }

  const projectText = (student.projects || [])
    .map(p => `${p.title} ${p.description} ${(p.technologies || []).join(' ')}`)
    .join(' ');
  const skillCorpus = normalizeToken(
    `${allExplicitSkills.join(' ')} ${projectText} ${(student.resumeText || '').slice(0, 8000)}`
  );

  // -----------------------------------------
  // 1. SKILLS MATCH (Weight: 40%)
  // -----------------------------------------
  const reqSkills = candidate.requiredSkills || [];
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const reqSkill of reqSkills) {
    if (skillsOverlap(studentSkillTags, skillCorpus, reqSkill)) {
      matchedSkills.push(reqSkill);
    } else {
      missingSkills.push(reqSkill);
    }
  }

  let skillsScore = 0;
  if (reqSkills.length > 0) {
    const ratio = matchedSkills.length / reqSkills.length;
    skillsScore = Math.round(ratio * 100);
    // Modest bonus for portfolio projects + verified resume content matching domain keywords
    if (matchedSkills.length > 0 && projectTechs.length > 0) {
      skillsScore = Math.min(100, skillsScore + 5);
    }
    // Check partial contextual alignment if 0 exact skills matched
    if (matchedSkills.length === 0 && skillCorpus.length > 5) {
      const descKeywords = extractKeywords(`${candidate.title} ${candidate.category || ''} ${candidate.description}`);
      const hits = descKeywords.filter(k => corpusContainsTerm(skillCorpus, k)).length;
      if (hits > 0) {
        skillsScore = Math.min(25, hits * 8);
      }
    }
  } else {
    skillsScore = allExplicitSkills.length > 0 ? 75 : 50;
  }

  // -----------------------------------------
  // 2. INTEREST MATCH (Weight: 25%)
  // -----------------------------------------
  const interests = (student.interests || []).filter(Boolean);
  const preferredDomain = String(student.preferredDomain || '').trim();
  const preferredRoles = (student.preferredRoles || []).filter(Boolean);
  const interestSourceTexts = [...interests, preferredDomain, ...preferredRoles].filter(Boolean);
  const interestKeywords = Array.from(new Set(interestSourceTexts.flatMap(extractKeywords)));
  const oppTopicCorpus = normalizeToken(
    `${candidate.title} ${candidate.category || ''} ${candidate.description} ${reqSkills.join(' ')} ${candidate.companyName}`
  );

  let interestScore = 0;
  if (interestSourceTexts.length > 0) {
    let phraseHits = 0;
    for (const phrase of interestSourceTexts) {
      const pNorm = normalizeToken(phrase);
      if (!pNorm) continue;
      if (corpusContainsTerm(oppTopicCorpus, pNorm)) {
        phraseHits += 2;
      } else {
        const variants = resolveCanonicalTags(pNorm);
        if (variants.some(v => v.length >= 2 && corpusContainsTerm(oppTopicCorpus, v))) {
          phraseHits += 1.5;
        }
      }
    }
    const wordHits = interestKeywords.filter(kw => corpusContainsTerm(oppTopicCorpus, kw)).length;
    const catNorm = normalizeToken(candidate.category || '');
    const catSynonyms = DOMAIN_SYNONYMS[catNorm] || [];
    const domainJoined = normalizeToken(interestSourceTexts.join(' '));
    const categoryBonus =
      catNorm &&
      (corpusContainsTerm(domainJoined, catNorm) ||
        catSynonyms.some(syn => corpusContainsTerm(domainJoined, syn)))
        ? 35
        : 0;

    const rawInterest = Math.round(
      Math.min(100, phraseHits * 30 + (wordHits / Math.max(1, Math.min(6, interestKeywords.length))) * 55 + categoryBonus)
    );
    interestScore = rawInterest;
  } else if (techSkills.length > 0) {
    // Infer baseline interest signal from primary technical skills if explicit interests aren't filled yet
    interestScore = Math.round(skillsScore * 0.55);
  }

  // -----------------------------------------
  // 3. EDUCATION MATCH (Weight: 20%)
  // -----------------------------------------
  const eduText = normalizeToken(
    `${student.education || ''} ${student.course || ''} ${student.branch || ''} ${student.studyYear || ''} ${student.institution || student.college || ''}`
  );
  const eligText = normalizeToken(`${candidate.eligibility} ${candidate.title} ${candidate.category || ''} ${candidate.description}`);

  let educationScore = 0;
  if (eduText) {
    const isTechEdu = /(b\.?tech|b\.?e\b|bca|mca|m\.?tech|bsc|m\.?sc|computer|cse|it\b|information technology|software|ai|data|engineering|ece|polytechnic)/.test(eduText);
    const isCommerceEdu = /(b\.?com|m\.?com|bba|mba|finance|commerce|economics|ca\b|accounting)/.test(eduText);
    const isDesignEdu = /(b\.?des|m\.?des|design|fine arts|multimedia|ui|ux|animation)/.test(eduText);
    const isMarketingEdu = /(bba|mba|marketing|mass comm|journalism|media|english|ba\b|arts)/.test(eduText);

    const cat = normalizeToken(candidate.category || '');
    const isUniversalElig =
      eligText.includes('all') ||
      eligText.includes('any graduate') ||
      eligText.includes('10th') ||
      eligText.includes('12th') ||
      eligText.includes('graduate') ||
      candidate.isGovernmentSponsored;

    if (cat === 'tech' && isTechEdu) {
      educationScore = 95;
    } else if (cat === 'finance' && isCommerceEdu) {
      educationScore = 95;
    } else if (cat === 'design' && (isDesignEdu || isTechEdu)) {
      educationScore = isDesignEdu ? 95 : 80;
    } else if ((cat === 'marketing' || cat === 'operations') && (isMarketingEdu || isCommerceEdu)) {
      educationScore = 90;
    } else if (cat === 'government' || isUniversalElig) {
      educationScore = 88;
    } else if (isTechEdu && (cat === 'operations' || cat === 'marketing')) {
      educationScore = 65;
    } else {
      const eduWords = extractKeywords(eduText);
      const overlapCount = eduWords.filter(w => eligText.includes(w)).length;
      educationScore = overlapCount > 0 ? Math.min(90, 55 + overlapCount * 15) : 50;
    }

    // Check explicit CGPA criteria if eligibility specifies a threshold (e.g. "CGPA >= 7.0")
    const cgpaMatch = eligText.match(/cgpa\s*(?:>=|>|minimum)?\s*(\d+(?:\.\d+)?)/);
    if (cgpaMatch && student.cgpa) {
      const minCgpa = parseFloat(cgpaMatch[1]);
      const studentCgpaVal = parseFloat(String(student.cgpa));
      if (!Number.isNaN(minCgpa) && !Number.isNaN(studentCgpaVal)) {
        if (studentCgpaVal < minCgpa) {
          educationScore = Math.max(30, educationScore - 35);
        } else {
          educationScore = Math.min(100, educationScore + 5);
        }
      }
    }
  } else {
    educationScore = 40;
  }

  // -----------------------------------------
  // 4. CAREER GOAL MATCH (Weight: 10%)
  // -----------------------------------------
  const careerGoalsText = String(student.careerGoals || '').trim();
  const goalCorpus = normalizeToken(`${careerGoalsText} ${preferredRoles.join(' ')} ${preferredDomain}`);
  const oppGoalSurface = normalizeToken(
    `${candidate.title} ${candidate.category || ''} ${candidate.description} ${(candidate.responsibilities || []).join(' ')} ${(candidate.perks || []).join(' ')} ${reqSkills.join(' ')}`
  );

  let careerGoalScore = 0;
  if (goalCorpus) {
    const goalWords = Array.from(new Set(extractKeywords(goalCorpus)));
    const expandedGoalWords = Array.from(
      new Set(goalWords.flatMap(w => resolveCanonicalTags(w)))
    );
    const hits = expandedGoalWords.filter(w => w.length >= 2 && corpusContainsTerm(oppGoalSurface, w));
    const roleMatch = preferredRoles.some(r => {
      const rNorm = normalizeToken(r);
      return rNorm && (corpusContainsTerm(oppGoalSurface, rNorm) || corpusContainsTerm(normalizeToken(candidate.title), rNorm));
    });
    const ratio = goalWords.length > 0 ? Math.min(1, hits.length / Math.max(2, goalWords.length)) : 0;
    careerGoalScore = Math.min(100, Math.round(ratio * 80 + (roleMatch ? 35 : 0)));
  } else {
    careerGoalScore = interestScore > 0 ? Math.round(interestScore * 0.6) : 35;
  }

  // -----------------------------------------
  // 5. LOCATION & WORK MODE MATCH (Weight: 5%)
  // -----------------------------------------
  const prefLoc = normalizeToken(student.preferredLocation || student.location || '');
  const modePref = student.workModePreference || 'Any';
  const oppLoc = normalizeToken(`${candidate.location} ${candidate.city || ''}`);
  const isOppRemote = candidate.workMode === 'Online' || oppLoc.includes('remote') || oppLoc.includes('anywhere') || oppLoc.includes('pan-india') || oppLoc.includes('national');

  let locScore = 50;
  if (isOppRemote) {
    locScore = modePref === 'Offline' ? 65 : 100;
  } else if (prefLoc && prefLoc !== 'india') {
    const prefParts = prefLoc.split(/[\s,]+/).filter(p => p.length >= 3);
    const cityMatch = prefParts.some(p => oppLoc.includes(p));
    if (cityMatch) {
      locScore = 100;
    } else if (modePref === 'Any' || modePref === 'Hybrid') {
      locScore = 45;
    } else {
      locScore = 25;
    }
  } else {
    locScore = 75;
  }

  let modeScore = 80;
  if (modePref === 'Online') {
    modeScore = candidate.workMode === 'Online' ? 100 : candidate.workMode === 'Hybrid' ? 65 : 25;
  } else if (modePref === 'Offline') {
    modeScore = candidate.workMode === 'Offline' ? 100 : candidate.workMode === 'Hybrid' ? 70 : 40;
  } else if (modePref === 'Hybrid') {
    modeScore = candidate.workMode === 'Hybrid' ? 100 : 75;
  } else {
    modeScore = 90;
  }

  const locationPreferenceScore = Math.round(locScore * 0.6 + modeScore * 0.4);

  // -----------------------------------------
  // WEIGHTED AGGREGATE SCORE (40 + 25 + 20 + 10 + 5 = 100%)
  // -----------------------------------------
  const weighted =
    skillsScore * 0.4 +
    interestScore * 0.25 +
    educationScore * 0.2 +
    careerGoalScore * 0.1 +
    locationPreferenceScore * 0.05;

  const matchScore = Math.max(0, Math.min(100, Math.round(weighted)));
  const beginnerFriendly = isInternshipBeginnerFriendly(candidate);
  const beginnerProfile = isStudentBeginnerProfile(student);

  const breakdown: InternshipMatchBreakdown = {
    skillsScore,
    interestScore,
    educationScore,
    careerGoalScore,
    locationPreferenceScore,
  };

  // Grounded deterministic match explanation
  const reasonParts: string[] = [];
  if (matchedSkills.length > 0) {
    reasonParts.push(`Matches ${matchedSkills.length}/${reqSkills.length} required skills (${matchedSkills.slice(0, 3).join(', ')})`);
  } else if (beginnerFriendly && beginnerProfile) {
    reasonParts.push('Beginner-friendly internship suited to help you build foundational industry skills');
  } else {
    reasonParts.push(`Aligned with your ${student.branch || student.course || student.education || 'academic'} background`);
  }

  if (preferredDomain && interestScore >= 60) {
    reasonParts.push(`aligns with your interest in ${preferredDomain}`);
  } else if (interests.length > 0 && interestScore >= 60) {
    reasonParts.push(`matches your interest in ${interests.slice(0, 2).join(' & ')}`);
  }

  if (locationPreferenceScore >= 85) {
    reasonParts.push(
      isOppRemote
        ? 'fits your flexible/remote work preference'
        : `available in your preferred location (${candidate.city || candidate.location})`
    );
  }

  if (missingSkills.length > 0) {
    reasonParts.push(`learning ${missingSkills.slice(0, 2).join(' & ')} will raise your eligibility further`);
  }

  const matchReason = `${reasonParts.join('; ')}.`;
  const suggestedResources = suggestResourcesForMissingSkills(missingSkills, candidate.title);

  // Determine explicit eligibility status and missing qualifications
  const eligibilityStatus: InternshipRecommendation['eligibilityStatus'] =
    matchScore >= 72 && (missingSkills.length <= 1 || skillsScore >= 65) && educationScore >= 55
      ? 'Eligible'
      : matchScore >= 48 || skillsScore >= 40 || beginnerFriendly
      ? 'Partially Eligible'
      : 'Needs Upskilling';

  const missingQualifications: string[] = [];
  if (missingSkills.length > 0) {
    missingQualifications.push(`Missing skills: ${missingSkills.slice(0, 4).join(', ')}`);
  }
  if (educationScore < 55) {
    missingQualifications.push(
      candidate.eligibility && candidate.eligibility.length > 8
        ? `Check academic eligibility: ${candidate.eligibility}`
        : 'Add your degree, branch, and graduation year to verify academic eligibility'
    );
  }
  if (!isOppRemote && locationPreferenceScore < 50 && candidate.location) {
    missingQualifications.push(`Location/mode requirement: ${candidate.workMode} in ${candidate.location}`);
  }

  return {
    internshipId: candidate.id,
    jobId: candidate.jobId || candidate.id,
    title: candidate.title,
    companyName: candidate.companyName,
    requiredSkills: reqSkills,
    eligibility: candidate.eligibility,
    stipend: candidate.stipend,
    duration: candidate.duration,
    workMode: candidate.workMode,
    location: candidate.location,
    applicationDeadline: candidate.applicationDeadline,
    applyUrl: candidate.applyUrl,
    sourceName: candidate.sourceName,
    isVerified: candidate.isVerified,
    matchScore,
    matchTier: getMatchTier(matchScore),
    eligibilityStatus,
    missingQualifications,
    breakdown,
    matchReason,
    matchedSkills,
    missingSkills,
    suggestedResources,
    isBeginnerFriendly: beginnerFriendly,
    generatedAt: new Date().toISOString(),
  };
}

export function computeProfileSignature(student: Partial<UserProfile>): string {
  const payload = [
    student.id || '',
    student.name || '',
    student.education || '',
    student.course || '',
    student.branch || '',
    student.studyYear || '',
    student.cgpa || '',
    student.location || '',
    student.preferredLocation || '',
    student.workModePreference || 'Any',
    student.preferredDomain || '',
    student.careerGoals || '',
    [...(student.skills || [])].map(normalizeToken).sort().join('|'),
    [...(student.nonTechnicalSkills || [])].map(normalizeToken).sort().join('|'),
    [...(student.interests || [])].map(normalizeToken).sort().join('|'),
    [...(student.preferredRoles || [])].map(normalizeToken).sort().join('|'),
    String((student.resumeText || '').length),
  ].join('::');

  // Lightweight deterministic FNV-1a 32-bit hex signature + length
  let hash = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `sig-${(hash >>> 0).toString(16)}-${payload.length}`;
}

export function rankInternshipsForStudent(
  student: Partial<UserProfile>,
  candidates: UnifiedInternshipCandidate[],
  limit: number = 12
): {
  recommendations: InternshipRecommendation[];
  overallMissingSkills: string[];
  topSkillGapResources: SkillGapCourseSuggestion[];
  beginnerFriendlyCount: number;
  profileSignature: string;
} {
  // Filter to verified/active non-expired internship-compatible opportunities & deduplicate
  const todayIso = new Date().toISOString().split('T')[0];
  const seen = new Set<string>();
  const validCandidates: UnifiedInternshipCandidate[] = [];

  for (const c of candidates) {
    if (c.verifiedStatus === 'Expired' || c.verifiedStatus === 'Rejected' || c.verifiedStatus === 'rejected') {
      continue;
    }
    const deadlineStr = String(c.applicationDeadline || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(deadlineStr) && deadlineStr < todayIso) {
      continue;
    }
    const key = `${normalizeToken(c.title)}::${normalizeToken(c.companyName)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    validCandidates.push(c);
  }

  const scored = validCandidates.map(c => scoreInternshipForStudent(student, c));
  const beginnerStudent = isStudentBeginnerProfile(student);

  scored.sort((a, b) => {
    // Primary sort: highest weighted matchScore descending
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    // Tie-breaker for beginner students: prioritize beginner-friendly internships
    if (beginnerStudent && a.isBeginnerFriendly !== b.isBeginnerFriendly) {
      return a.isBeginnerFriendly ? -1 : 1;
    }
    return b.matchedSkills.length - a.matchedSkills.length;
  });

  const topRecommendations = scored.slice(0, Math.max(1, limit));

  // Aggregate most frequent missing skills across top matches for Skill Gap Analysis
  const missingCounts = new Map<string, { label: string; count: number }>();
  for (const rec of topRecommendations) {
    for (const ms of rec.missingSkills) {
      const key = normalizeToken(ms);
      if (!key) continue;
      const existing = missingCounts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        missingCounts.set(key, { label: ms, count: 1 });
      }
    }
  }

  const overallMissingSkills = Array.from(missingCounts.values())
    .sort((a, b) => b.count - a.count)
    .map(item => item.label)
    .slice(0, 8);

  const topSkillGapResources = suggestResourcesForMissingSkills(
    overallMissingSkills,
    topRecommendations[0]?.title
  );

  const beginnerFriendlyCount = topRecommendations.filter(r => r.isBeginnerFriendly).length;
  const profileSignature = computeProfileSignature(student);

  return {
    recommendations: topRecommendations,
    overallMissingSkills,
    topSkillGapResources,
    beginnerFriendlyCount,
    profileSignature,
  };
}

export function buildRecommendationBundle(
  student: Partial<UserProfile>,
  candidates: UnifiedInternshipCandidate[],
  limit: number = 12
): StudentRecommendationBundle {
  const ranked = rankInternshipsForStudent(student, candidates, limit);
  return {
    userId: student.id || 'guest',
    profileSignature: ranked.profileSignature,
    recommendations: ranked.recommendations,
    overallMissingSkills: ranked.overallMissingSkills,
    topSkillGapResources: ranked.topSkillGapResources,
    beginnerFriendlyCount: ranked.beginnerFriendlyCount,
    updatedAt: new Date().toISOString(),
  };
}
