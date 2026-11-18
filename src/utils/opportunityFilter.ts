import { Job, UserProfile } from '../types';

function cleanToken(v?: string): string {
  return String(v || '').toLowerCase().trim();
}

export function isRemoteOrGlobalLocation(
  location?: string,
  type?: string,
  source?: string
): boolean {
  const loc = cleanToken(location);
  const src = cleanToken(source);
  if (type === 'remote') return true;
  if (src.includes('remotive')) return true;
  return (
    loc.includes('remote') ||
    loc.includes('worldwide') ||
    loc.includes('anywhere') ||
    loc.includes('pan-india') ||
    loc.includes('pan india') ||
    loc.includes('work from home') ||
    loc.includes('europe') ||
    loc.includes('germany') ||
    loc.includes('usa') ||
    loc.includes('canada') ||
    loc.includes('uk') ||
    loc.includes('global') ||
    loc === 'india' ||
    loc === 'location not specified'
  );
}

const EDUCATION_CATEGORY_MAP: Array<{ pattern: RegExp; categories: string[] }> = [
  {
    pattern: /(b\.?tech|b\.?e\b|bca|mca|m\.?tech|bsc|m\.?sc|computer|cse|it\b|information technology|software|ai|data|engineering|ece|polytechnic|diploma)/i,
    categories: ['tech', 'design', 'operations'],
  },
  {
    pattern: /(b\.?com|m\.?com|bba|mba|finance|commerce|economics|accounting|ca\b)/i,
    categories: ['finance', 'marketing', 'operations'],
  },
  {
    pattern: /(b\.?des|m\.?des|design|fine arts|multimedia|ui|ux|animation)/i,
    categories: ['design', 'marketing', 'tech'],
  },
  {
    pattern: /(ba\b|arts|mass comm|journalism|marketing|media|english|public policy)/i,
    categories: ['marketing', 'operations', 'government'],
  },
];

export interface ProfileFilterMatch {
  matches: boolean;
  relevanceScore: number;
  matchedCriteria: string[];
}

export function hasStudentProfileSignals(student?: Partial<UserProfile> | null): boolean {
  if (!student) return false;
  return Boolean(
    (student.skills && student.skills.length > 0) ||
      (student.nonTechnicalSkills && student.nonTechnicalSkills.length > 0) ||
      (student.interests && student.interests.length > 0) ||
      (student.preferredRoles && student.preferredRoles.length > 0) ||
      (student.preferredDomain && student.preferredDomain.trim()) ||
      (student.education && student.education.trim()) ||
      (student.course && student.course.trim()) ||
      (student.branch && student.branch.trim()) ||
      (student.preferredLocation && student.preferredLocation.trim()) ||
      (student.location && student.location.trim() && cleanToken(student.location) !== 'india')
  );
}

/**
 * Evaluates an opportunity (job or internship) against a student's
 * skills, education, interests, and location preferences.
 */
export function matchJobWithStudentProfile(
  job: Pick<
    Job,
    | 'title'
    | 'company'
    | 'category'
    | 'type'
    | 'location'
    | 'city'
    | 'requiredSkills'
    | 'eligibility'
    | 'description'
    | 'opportunitySource'
  >,
  student?: Partial<UserProfile> | null
): ProfileFilterMatch {
  if (!student || !hasStudentProfileSignals(student)) {
    return { matches: true, relevanceScore: 50, matchedCriteria: [] };
  }

  const jobCorpus = cleanToken(
    `${job.title} ${job.category} ${job.description} ${job.eligibility || ''} ${(job.requiredSkills || []).join(' ')}`
  );
  const jobSkillsLower = (job.requiredSkills || []).map(cleanToken).filter(Boolean);
  const jobLoc = cleanToken(`${job.location} ${job.city || ''}`);
  const jobCat = cleanToken(job.category);

  let score = 0;
  const matchedCriteria: string[] = [];

  // 1. Skills match
  const studentSkills = [
    ...(student.skills || []),
    ...(student.nonTechnicalSkills || []),
  ]
    .map(cleanToken)
    .filter(Boolean);

  if (studentSkills.length > 0) {
    const matchedSkills = studentSkills.filter(
      (sk) =>
        jobSkillsLower.some((js) => js.includes(sk) || sk.includes(js)) ||
        (sk.length >= 2 && jobCorpus.includes(sk))
    );
    if (matchedSkills.length > 0) {
      score += Math.min(45, matchedSkills.length * 18);
      matchedCriteria.push(`Skills (${matchedSkills.slice(0, 2).join(', ')})`);
    }
  }

  // 2. Interests & preferred domain match
  const interestTokens = [
    ...(student.interests || []),
    ...(student.preferredRoles || []),
    student.preferredDomain || '',
  ]
    .flatMap((v) => String(v || '').split(/[,/|]+/))
    .map(cleanToken)
    .filter((t) => t.length >= 2);

  if (interestTokens.length > 0) {
    const matchedInterests = interestTokens.filter(
      (tok) => jobCorpus.includes(tok) || jobCat.includes(tok)
    );
    if (matchedInterests.length > 0) {
      score += Math.min(25, matchedInterests.length * 15);
      matchedCriteria.push(`Interests (${matchedInterests[0]})`);
    }
  }

  // 3. Education & branch match
  const eduText = cleanToken(
    `${student.education || ''} ${student.course || ''} ${student.branch || ''}`
  );
  if (eduText) {
    const eduEntry = EDUCATION_CATEGORY_MAP.find((entry) => entry.pattern.test(eduText));
    const eduKeywords = eduText
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 3 && !['btech', 'degree', 'year', 'student', 'pursuing'].includes(w));
    const eduMatched =
      (eduEntry && eduEntry.categories.includes(jobCat)) ||
      eduKeywords.some((kw) => jobCorpus.includes(kw)) ||
      cleanToken(job.eligibility).includes('all') ||
      cleanToken(job.eligibility).includes('student') ||
      cleanToken(job.eligibility).includes('graduate');

    if (eduMatched) {
      score += 20;
      matchedCriteria.push('Education');
    }
  }

  // 4. Location & work mode preference match
  const prefLoc = cleanToken(student.preferredLocation || student.location || '');
  const modePref = student.workModePreference || 'Any';
  const isRemote = job.type === 'remote' || jobLoc.includes('remote') || jobLoc.includes('worldwide');
  const locTokens = prefLoc
    .split(/[\s,]+/)
    .filter((p) => p.length >= 3 && p !== 'india');

  const cityHit = locTokens.some((tok) => jobLoc.includes(tok));
  const remoteHit =
    isRemote &&
    (modePref === 'Online' ||
      modePref === 'Any' ||
      jobLoc.includes('india') ||
      jobLoc.includes('worldwide'));
  const indiaHit =
    (prefLoc === 'india' || prefLoc.includes('india')) &&
    (jobLoc.includes('india') || isRemote);

  if (cityHit || remoteHit || indiaHit) {
    score += 10;
    matchedCriteria.push(cityHit ? 'Preferred Location' : 'Remote / Eligible Location');
  }

  // Determine match threshold: if student has skills or interests, require at least one core signal match
  // (Skills, Interests, or Location+Education); otherwise allow education/location matches.
  const hasCoreSignal =
    studentSkills.length > 0 || interestTokens.length > 0;
  const matches = hasCoreSignal
    ? score >= 15
    : matchedCriteria.length > 0;

  return {
    matches,
    relevanceScore: Math.min(100, score),
    matchedCriteria,
  };
}
