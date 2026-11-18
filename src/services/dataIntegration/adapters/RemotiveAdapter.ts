import { IDataSourceAdapter, AdapterSyncResult } from '../types';
import { InternshipListing, JobListing, SourceAdapterInfo } from '../../../types';
import {
  extractSkillsFromTagsAndText,
  inferCategoryFromMetadata,
  normalizeEmploymentType,
  safeExternalIsoDate,
  stripHtmlToText,
} from '../textUtils';

/**
 * Remotive Public Remote Jobs API Adapter
 * Endpoint: https://remotive.com/api/remote-jobs
 *
 * Terms & Compliance:
 * - No API key required.
 * - Explicitly attributes "Remotive" as the source and links back to the original Remotive job URL.
 * - Respects Remotive's advisory limit (max ~4 fetches/day, cached via SyncEngine every 6 hours).
 * - Preserves salary ONLY when explicitly returned by Remotive (never fabricated).
 */
export class RemotiveAdapter implements IDataSourceAdapter {
  readonly id = 'remotive_jobs';
  readonly name = 'Remotive';
  readonly type = 'job' as const;
  readonly officialPortalUrl = 'https://remotive.com/';
  readonly documentationUrl = 'https://remotive.com/api-documentation';
  readonly description =
    'Public zero-key remote opportunities feed from Remotive covering Software Development, AI, Data, Design, Marketing, and Operations with mandatory Remotive source attribution.';

  private get endpoint(): string {
    return (process.env.REMOTIVE_API_URL || 'https://remotive.com/api/remote-jobs?limit=60').trim();
  }

  isConfigured(): boolean {
    return true;
  }

  getInfo(totalListings = 0, lastSyncAt = new Date().toISOString()): SourceAdapterInfo {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      status: 'CONNECTED',
      enabled: true,
      requiresKey: false,
      isKeyConfigured: true,
      lastSyncAt,
      totalListings,
      officialPortalUrl: this.officialPortalUrl,
      documentationUrl: this.documentationUrl,
      description: this.description,
    };
  }

  async fetchAndNormalize(): Promise<AdapterSyncResult> {
    const now = new Date().toISOString();

    try {
      const response = await fetch(this.endpoint, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'YuvaMitraa-Career-Portal/1.0',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (response.status === 429) {
        return {
          sourceName: this.name,
          sourceId: this.id,
          status: 'FAILED',
          fetchedCount: 0,
          insertedCount: 0,
          updatedCount: 0,
          duplicateCount: 0,
          expiredCount: 0,
          errorMessage: 'Remotive API rate limit reached (HTTP 429). Cached results preserved; retrying next 6h cycle.',
          internships: [],
          jobs: [],
        };
      }

      if (!response.ok) {
        return {
          sourceName: this.name,
          sourceId: this.id,
          status: 'FAILED',
          fetchedCount: 0,
          insertedCount: 0,
          updatedCount: 0,
          duplicateCount: 0,
          expiredCount: 0,
          errorMessage: `Remotive API returned HTTP ${response.status}: ${response.statusText}`,
          internships: [],
          jobs: [],
        };
      }

      const payload = await response.json();
      const rawJobs: any[] = Array.isArray(payload?.jobs) ? payload.jobs : [];

      const internships: InternshipListing[] = [];
      const jobs: JobListing[] = [];

      for (const item of rawJobs.slice(0, 60)) {
        const title = String(item?.title || '').trim();
        const companyName = String(item?.company_name || '').trim();
        const applyUrl = String(item?.url || '').trim();

        // Remotive terms require linking directly back to the Remotive job URL
        if (!title || !companyName || !applyUrl.startsWith('http')) {
          continue;
        }

        const rawId = item?.id ?? Math.abs(this.hashCode(applyUrl));
        const rawCategory = String(item?.category || '').trim();
        const rawJobType = String(item?.job_type || '').trim();
        const rawTags: string[] = Array.isArray(item?.tags) ? item.tags.map(String) : [];
        const description = stripHtmlToText(String(item?.description || ''), 2000) || `${title} remote role at ${companyName}. View listing on Remotive.`;
        const rawLocation = String(item?.candidate_required_location || '').trim();
        const location = rawLocation ? `Remote (${rawLocation})` : 'Remote (Worldwide)';
        const salary = String(item?.salary || '').trim(); // Empty string if Remotive omitted salary
        const companyLogo = String(item?.company_logo_url || item?.company_logo || '').trim() || undefined;

        const skills = extractSkillsFromTagsAndText(rawTags, title, description);
        const category = inferCategoryFromMetadata(rawTags, rawCategory, title, description);
        const employmentType = normalizeEmploymentType(title, [], rawJobType);
        const createdAt = safeExternalIsoDate(item?.publication_date);

        if (employmentType === 'Internship') {
          internships.push({
            id: `remotive-${rawId}`,
            title,
            companyName,
            companyLogo,
            category,
            description,
            eligibility: rawLocation ? `Remote eligible: ${rawLocation}` : 'Remote eligible',
            skills: skills.length > 0 ? skills : rawTags.slice(0, 6),
            location,
            workMode: 'Remote',
            duration: 'Remote Internship',
            stipend: salary,
            applicationDeadline: '',
            applyUrl,
            sourceName: this.name,
            sourceUrl: applyUrl,
            sourceId: String(rawId),
            verifiedStatus: 'Verified',
            lastVerifiedAt: now,
            createdAt,
            updatedAt: now,
            isGovernmentScheme: false,
          });
        } else {
          jobs.push({
            id: `remotive-${rawId}`,
            title,
            companyName,
            companyLogo,
            category,
            description,
            requiredSkills: skills.length > 0 ? skills : rawTags.slice(0, 6),
            location,
            workMode: 'Remote',
            employmentType,
            salary,
            applyUrl,
            sourceName: this.name,
            sourceUrl: applyUrl,
            sourceId: String(rawId),
            verifiedStatus: 'Verified',
            lastVerifiedAt: now,
            createdAt,
            updatedAt: now,
          });
        }
      }

      const totalFetched = internships.length + jobs.length;
      return {
        sourceName: this.name,
        sourceId: this.id,
        status: 'SUCCESS',
        fetchedCount: totalFetched,
        insertedCount: totalFetched,
        updatedCount: 0,
        duplicateCount: 0,
        expiredCount: 0,
        internships,
        jobs,
      };
    } catch (err: any) {
      const msg = err?.message || 'Unknown Remotive connection error';
      console.warn(`[Remotive Adapter] Fetch failed: ${msg}`);
      return {
        sourceName: this.name,
        sourceId: this.id,
        status: 'FAILED',
        fetchedCount: 0,
        insertedCount: 0,
        updatedCount: 0,
        duplicateCount: 0,
        expiredCount: 0,
        errorMessage: `Remotive API fetch failed: ${msg}`,
        internships: [],
        jobs: [],
      };
    }
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}
