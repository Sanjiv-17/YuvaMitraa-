import { EmploymentType, Job } from '../../types';

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  bull: '•',
  hellip: '...',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  trade: '™',
  reg: '®',
  copy: '©',
  euro: '€',
  pound: '£',
  inr: '₹',
};

export function decodeHtmlEntities(input: string): string {
  if (!input) return '';
  let text = String(input);
  // Decode up to 2 passes for double-encoded payloads (e.g. &lt;p&gt;)
  for (let pass = 0; pass < 2; pass++) {
    const next = text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (full, entity) => {
      const lower = entity.toLowerCase();
      if (lower.startsWith('#x')) {
        const cp = parseInt(lower.slice(2), 16);
        return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : full;
      }
      if (lower.startsWith('#')) {
        const cp = parseInt(lower.slice(1), 10);
        return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : full;
      }
      return NAMED_ENTITIES[lower] ?? full;
    });
    if (next === text) break;
    text = next;
  }
  return text;
}

export function stripHtmlToText(rawHtml: string, maxLength = 2400): string {
  if (!rawHtml) return '';
  let text = decodeHtmlEntities(rawHtml);
  text = text
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|section|article|h[1-6]|tr)\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '\n• ')
    .replace(/<\/\s*li\s*>/gi, '')
    .replace(/<[^>]+>/g, ' ');

  text = decodeHtmlEntities(text)
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (maxLength > 0 && text.length > maxLength) {
    return `${text.slice(0, maxLength - 3).trim()}...`;
  }
  return text;
}

const KNOWN_SKILLS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'React', pattern: /\b(react|reactjs|react\.js)\b/i },
  { label: 'TypeScript', pattern: /\btypescript\b/i },
  { label: 'JavaScript', pattern: /\b(javascript|ecmascript)\b/i },
  { label: 'Python', pattern: /\bpython\b/i },
  { label: 'Java', pattern: /\bjava\b(?!script)/i },
  { label: 'Node.js', pattern: /\b(node\.?js|nodejs)\b/i },
  { label: 'SQL', pattern: /\b(sql|mysql|postgresql|postgres|sqlite)\b/i },
  { label: 'HTML', pattern: /\bhtml5?\b/i },
  { label: 'CSS', pattern: /\bcss3?\b/i },
  { label: 'Tailwind CSS', pattern: /\btailwind\b/i },
  { label: 'Git', pattern: /\b(git|github|gitlab)\b/i },
  { label: 'Docker', pattern: /\bdocker\b/i },
  { label: 'Kubernetes', pattern: /\bkubernetes\b/i },
  { label: 'AWS', pattern: /\baws\b|amazon web services/i },
  { label: 'AI/ML', pattern: /\b(machine learning|deep learning|artificial intelligence|llm|generative ai|nlp|ai\/ml)\b/i },
  { label: 'Data Analysis', pattern: /\b(data analysis|data analytics|pandas|power bi|tableau|excel)\b/i },
  { label: 'UI/UX', pattern: /\b(ui\/ux|figma|wireframing|product design|ux design)\b/i },
  { label: 'Digital Marketing', pattern: /\b(digital marketing|seo|social media|content marketing|copywriting)\b/i },
  { label: 'REST APIs', pattern: /\b(rest api|restful|graphql)\b/i },
  { label: 'Finance', pattern: /\b(accounting|financial analysis|bookkeeping|tally|taxation)\b/i },
  { label: 'Communication', pattern: /\bcommunication\b/i },
];

export function extractSkillsFromTagsAndText(rawTags: unknown, title: string, description: string): string[] {
  const skills: string[] = [];
  const seen = new Set<string>();

  const pushSkill = (value: string) => {
    const clean = value.trim();
    if (!clean || clean.length > 40) return;
    const key = clean.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    skills.push(clean);
  };

  if (Array.isArray(rawTags)) {
    for (const tag of rawTags) {
      if (typeof tag === 'string') {
        const clean = tag.trim();
        // Skip pure region/remote labels when used as skills
        if (clean && !/^(remote|dach|emea|europe|usa|worldwide)$/i.test(clean)) {
          pushSkill(clean);
        }
      }
    }
  }

  if (skills.length < 4) {
    const corpus = `${title} ${description.slice(0, 1800)}`;
    for (const item of KNOWN_SKILLS) {
      if (item.pattern.test(corpus)) {
        pushSkill(item.label);
      }
      if (skills.length >= 6) break;
    }
  }

  return skills.slice(0, 8);
}

export function inferCategoryFromMetadata(
  tags: string[],
  rawCategory: string,
  title: string,
  description: string
): Job['category'] {
  const combined = `${rawCategory} ${title} ${tags.join(' ')} ${description.slice(0, 400)}`.toLowerCase();

  if (/(ui\/ux|figma|graphic design|product design|visual design|illustrator|motion design)/.test(combined)) {
    return 'Design';
  }
  if (/(marketing|seo|social media|copywrit|content creator|growth|brand|sales|advertising)/.test(combined)) {
    return 'Marketing';
  }
  if (/(finance|accounting|bookkeeping|payroll|audit|tax|fintech|banking|treasury)/.test(combined)) {
    return 'Finance';
  }
  if (/(healthcare|medical|clinical|nursing|pharma)/.test(combined)) {
    return 'Healthcare';
  }
  if (/(government|public policy|ministry|civic)/.test(combined)) {
    return 'Government';
  }
  if (/(customer support|customer success|customer service|operations|virtual assistant|hr |recruiter|admin assistant|office assistant)/.test(combined)) {
    return 'Operations';
  }
  return 'Tech';
}

export function isInternshipOrTraineeListing(
  title: string,
  jobTypes: string[] = [],
  jobTypeStr = ''
): boolean {
  const combined = `${title} ${jobTypes.join(' ')} ${jobTypeStr}`.toLowerCase();
  return /\b(intern|internship|praktikum|werkstudent|working student|student college|trainee|apprentice|fellowship)\b/.test(
    combined
  );
}

export function normalizeEmploymentType(
  title: string,
  jobTypes: string[] = [],
  rawJobType = ''
): EmploymentType {
  if (isInternshipOrTraineeListing(title, jobTypes, rawJobType)) {
    return 'Internship';
  }
  const combined = `${jobTypes.join(' ')} ${rawJobType}`.toLowerCase();
  if (/part[\s_-]?time/.test(combined)) return 'Part-time';
  if (/contract|freelance/.test(combined)) return 'Contract';
  return 'Full-time';
}

export function parseCompensationAmount(rawSalary?: string): number {
  if (!rawSalary) return 0;
  const cleaned = String(rawSalary).replace(/,/g, '');
  const match = cleaned.match(/(\d+(?:\.\d+)?)\s*(k)?/i);
  if (!match) return 0;
  let num = parseFloat(match[1]);
  if (Number.isNaN(num)) return 0;
  if (match[2] && match[2].toLowerCase() === 'k') {
    num *= 1000;
  }
  return Math.round(num);
}

export function safeExternalIsoDate(rawValue: unknown): string {
  const nowMs = Date.now();
  const maxReasonableMs = nowMs + 7 * 24 * 60 * 60 * 1000;
  if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
    const ms = rawValue > 1e12 ? rawValue : rawValue * 1000;
    if (ms > 1577836800000 && ms <= maxReasonableMs) {
      return new Date(ms).toISOString();
    }
    return new Date().toISOString();
  }
  if (typeof rawValue === 'string' && rawValue.trim()) {
    const parsed = Date.parse(rawValue);
    if (!Number.isNaN(parsed) && parsed > 1577836800000 && parsed <= maxReasonableMs) {
      return new Date(parsed).toISOString();
    }
  }
  return new Date().toISOString();
}
