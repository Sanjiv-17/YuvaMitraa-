import { IDataSourceAdapter, AdapterSyncResult } from '../types';
import { InternshipListing, JobListing, SourceAdapterInfo } from '../../../types';
import {
  extractSkillsFromTagsAndText,
  inferCategoryFromMetadata,
  isInternshipOrTraineeListing,
  normalizeEmploymentType,
  safeExternalIsoDate,
  stripHtmlToText,
} from '../textUtils';

/**
 * Arbeitnow Public Job Board API Adapter
 * Endpoint: https://www.arbeitnow.com/api/job-board-api
 * - No API key required.
 * - Normalizes genuine job & internship/working-student listings with plain-text descriptions
 *   and preserves authentic application URLs.
 * - Never fabricates salary/stipend when omitted by the API.
 */
export class ArbeitnowAdapter implements IDataSourceAdapter {
  readonly id = 'arbeitnow_jobs';
  readonly name = 'Arbeitnow';
  readonly type = 'job' as const;
  readonly officialPortalUrl = 'https://www.arbeitnow.com/';
  readonly documentationUrl = 'https://www.arbeitnow.com/api';
  readonly description =
    'Public zero-key job & internship feed from Arbeitnow featuring ATS-sourced remote and hybrid engineering, student, and graduate roles with original apply URLs.';

  private get endpoint(): string {
    return (process.env.ARBEITNOW_API_URL || 'https://www.arbeitnow.com/api/job-board-api').trim();
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
          errorMessage: 'Arbeitnow rate limit reached (HTTP 429). Will retry automatically on next scheduled cycle.',
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
          errorMessage: `Arbeitnow API returned HTTP ${response.status}: ${response.statusText}`,
          internships: [],
          jobs: [],
        };
      }

      const payload = await response.json();
      const rawItems: any[] = Array.isArray(payload?.data) ? payload.data : [];

      const internships: InternshipListing[] = [];
      const jobs: JobListing[] = [];
      // Prioritize internships/student roles and remote/entry roles first, up to 60 authentic items
      const prioritized = [...rawItems].sort((a, b) => {
        const aScore =
          (isInternshipOrTraineeListing(String(a?.title || ''), Array.isArray(a?.job_types) ? a.job_types : []) ? 2 : 0) +
          (a?.remote ? 1 : 0);
        const bScore =
          (isInternshipOrTraineeListing(String(b?.title || ''), Array.isArray(b?.job_types) ? b.job_types : []) ? 2 : 0) +
          (b?.remote ? 1 : 0);
        return bScore - aScore;
      });

      for (const item of prioritized.slice(0, 60)) {
        const title = String(item?.title || '').trim();
        const companyName = String(item?.company_name || '').trim();
        const applyUrl = String(item?.url || '').trim();

        if (!title || !companyName || !applyUrl.startsWith('http')) {
          continue;
        }

        const slug = String(item?.slug || '').trim() || `an-${Math.abs(this.hashCode(applyUrl))}`;
        const rawJobTypes: string[] = Array.isArray(item?.job_types) ? item.job_types.map(String) : [];
        const rawTags: string[] = Array.isArray(item?.tags) ? item.tags.map(String) : [];
        const description = stripHtmlToText(String(item?.description || ''), 2000) || `${title} role at ${companyName}. View full details on Arbeitnow.`;
        const rawLoc = String(item?.location || '').trim();
        const isRemote = Boolean(item?.remote) || /\bremote\b/i.test(rawLoc);
        const location = rawLoc && !/^remote(\s+job)?$/i.test(rawLoc)
          ? (isRemote && !/remote/i.test(rawLoc) ? `${rawLoc} (Remote Available)` : rawLoc)
          : (isRemote ? 'Remote' : 'Location not specified');
        const workMode = isRemote ? 'Remote' : /\bhybrid\b/i.test(`${rawLoc} ${description}`) ? 'Hybrid' : 'On-site';

        const skills = extractSkillsFromTagsAndText(rawTags, title, description);
        const category = inferCategoryFromMetadata(rawTags, rawJobTypes.join(' '), title, description);
        const employmentType = normalizeEmploymentType(title, rawJobTypes);
        const createdAt = safeExternalIsoDate(item?.created_at);

        if (employmentType === 'Internship') {
          internships.push({
            id: `arbeitnow-${slug}`,
            title,
            companyName,
            category,
            description,
            eligibility: rawJobTypes.length > 0 ? rawJobTypes.join(', ') : 'Students & entry-level applicants',
            skills: skills.length > 0 ? skills : rawTags.slice(0, 5),
            location,
            workMode,
            duration: rawJobTypes.find((t) => /month|semester|term/i.test(t)) || 'Internship / Student Role',
            stipend: '', // Arbeitnow public API does not provide structured salary/stipend
            applicationDeadline: '',
            applyUrl,
            sourceName: this.name,
            sourceUrl: applyUrl,
            sourceId: slug,
            verifiedStatus: 'Verified',
            lastVerifiedAt: now,
            createdAt,
            updatedAt: now,
            isGovernmentScheme: false,
          });
        } else {
          jobs.push({
            id: `arbeitnow-${slug}`,
            title,
            companyName,
            category,
            description,
            requiredSkills: skills.length > 0 ? skills : rawTags.slice(0, 5),
            location,
            workMode,
            employmentType,
            salary: '', // Arbeitnow public API does not provide structured salary
            applyUrl,
            sourceName: this.name,
            sourceUrl: applyUrl,
            sourceId: slug,
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
      const msg = err?.message || 'Unknown Arbeitnow connection error';
      console.warn(`[Arbeitnow Adapter] Fetch failed: ${msg}`);
      return {
        sourceName: this.name,
        sourceId: this.id,
        status: 'FAILED',
        fetchedCount: 0,
        insertedCount: 0,
        updatedCount: 0,
        duplicateCount: 0,
        expiredCount: 0,
        errorMessage: `Arbeitnow API fetch failed: ${msg}`,
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
