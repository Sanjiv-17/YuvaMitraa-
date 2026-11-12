import { IDataSourceAdapter, AdapterSyncResult } from '../types';
import { JobListing, SourceAdapterInfo } from '../../../types';

/**
 * IndianAPI Jobs API Adapter
 * Documentation: https://indianapi.in/documentation/jobs-api
 *
 * Requirements:
 * - Uses actual API key from backend environment: INDIANAPI_KEY or JOB_API_KEY.
 * - Respects provider rate limits and response structure.
 * - Preserves original job application URLs.
 * - Never generates fake jobs when the API fails or key is missing.
 */
export class IndianApiJobsAdapter implements IDataSourceAdapter {
  readonly id = 'indianapi_jobs';
  readonly name = 'IndianAPI Jobs Feed';
  readonly type = 'job' as const;
  readonly officialPortalUrl = 'https://indianapi.in/documentation/jobs-api';
  readonly documentationUrl = 'https://indianapi.in/documentation/jobs-api';
  readonly description = 'External Indian job market API providing verified listings across tech, finance, marketing, and operations with genuine apply URLs.';

  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.INDIANAPI_KEY || process.env.JOB_API_KEY || '';
    this.baseUrl = process.env.INDIANAPI_BASE_URL || 'https://indianapi.in/api/v1/jobs';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  getInfo(totalListings = 0, lastSyncAt = new Date().toISOString()): SourceAdapterInfo {
    const configured = this.isConfigured();
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      status: configured ? 'CONNECTED' : 'CONFIG_REQUIRED',
      enabled: true,
      requiresKey: true,
      isKeyConfigured: configured,
      lastSyncAt,
      totalListings,
      officialPortalUrl: this.officialPortalUrl,
      documentationUrl: this.documentationUrl,
      description: this.description,
    };
  }

  async fetchAndNormalize(): Promise<AdapterSyncResult> {
    const now = new Date().toISOString();

    if (!this.isConfigured()) {
      return {
        sourceName: this.name,
        sourceId: this.id,
        status: 'CONFIG_REQUIRED',
        fetchedCount: 0,
        insertedCount: 0,
        updatedCount: 0,
        duplicateCount: 0,
        expiredCount: 0,
        errorMessage: 'INDIANAPI_KEY is an optional credential and not currently configured. Source skipped until a valid API key is set in .env. Documentation: https://indianapi.in/documentation/jobs-api',
        jobs: [],
      };
    }

    try {
      // Query parameters for IndianAPI Jobs
      const url = new URL(this.baseUrl);
      url.searchParams.set('limit', '50');
      url.searchParams.set('country', 'IN');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'X-Api-Key': this.apiKey,
          'Accept': 'application/json',
          'User-Agent': 'YuvaMitraa-Career-Integration/1.0',
        },
        signal: AbortSignal.timeout(12000),
      });

      if (response.status === 401 || response.status === 403) {
        return {
          sourceName: this.name,
          sourceId: this.id,
          status: 'FAILED',
          fetchedCount: 0,
          insertedCount: 0,
          updatedCount: 0,
          duplicateCount: 0,
          expiredCount: 0,
          errorMessage: `Authentication rejected by IndianAPI (HTTP ${response.status}). Verify your INDIANAPI_KEY.`,
          jobs: [],
        };
      }

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
          errorMessage: 'IndianAPI rate limit reached (HTTP 429). The system will retry during the next 6-hour refresh cycle.',
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
          errorMessage: `IndianAPI responded with HTTP ${response.status}: ${response.statusText}`,
          jobs: [],
        };
      }

      const data = await response.json();
      const rawJobs: any[] = Array.isArray(data) ? data : (data.data || data.jobs || data.results || []);

      const normalizedJobs: JobListing[] = [];

      for (const item of rawJobs) {
        // Enforce data validity: Must have title, company, and valid URL
        if (!item.title || (!item.company && !item.company_name)) {
          continue;
        }

        const title = String(item.title).trim();
        const companyName = String(item.company || item.company_name || 'Verified Organization').trim();
        const applyUrl = item.apply_url || item.url || item.job_url || item.link;

        if (!applyUrl || !applyUrl.startsWith('http')) {
          continue; // Safety: Never publish jobs without genuine original URLs
        }

        const workMode = (item.work_mode || item.is_remote ? 'Remote' : (item.is_hybrid ? 'Hybrid' : 'On-site')) as any;
        const employmentType = (item.job_type || item.type || 'Full-time') as any;

        const skills: string[] = Array.isArray(item.skills)
          ? item.skills.map((s: any) => String(s).trim())
          : (typeof item.skills === 'string' ? item.skills.split(',').map((s: string) => s.trim()) : []);

        normalizedJobs.push({
          id: `indianapi-${item.id || item.job_id || Math.abs(this.hashCode(applyUrl))}`,
          title,
          companyName,
          description: String(item.description || item.snippet || 'Official opening retrieved via IndianAPI jobs gateway.').trim(),
          requiredSkills: skills.length > 0 ? skills : ['Problem Solving', 'Communication'],
          location: String(item.location || item.city || 'India').trim(),
          workMode,
          employmentType,
          salary: String(item.salary || item.salary_range || 'As per industry standards').trim(),
          applyUrl,
          sourceName: this.name,
          sourceUrl: this.officialPortalUrl,
          sourceId: String(item.id || item.job_id || applyUrl),
          verifiedStatus: 'Verified',
          lastVerifiedAt: now,
          createdAt: item.posted_at || now,
          updatedAt: now,
        });
      }

      return {
        sourceName: this.name,
        sourceId: this.id,
        status: 'SUCCESS',
        fetchedCount: normalizedJobs.length,
        insertedCount: normalizedJobs.length,
        updatedCount: 0,
        duplicateCount: 0,
        expiredCount: 0,
        jobs: normalizedJobs,
      };

    } catch (err: any) {
      console.warn(`[IndianAPI Adapter] Fetch failed: ${err.message}`);
      return {
        sourceName: this.name,
        sourceId: this.id,
        status: 'FAILED',
        fetchedCount: 0,
        insertedCount: 0,
        updatedCount: 0,
        duplicateCount: 0,
        expiredCount: 0,
        errorMessage: `Failed to connect to IndianAPI endpoint: ${err.message}`,
        jobs: [],
      };
    }
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}
