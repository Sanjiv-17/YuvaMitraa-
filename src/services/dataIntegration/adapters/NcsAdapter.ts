import { IDataSourceAdapter, AdapterSyncResult } from '../types';
import { JobListing, SourceAdapterInfo } from '../../../types';

/**
 * National Career Service (NCS) Portal Adapter
 * Official Portal: https://www.ncs.gov.in/
 * Ministry of Labour and Employment, Government of India
 *
 * NOTE: NCS does not offer an open public REST API for third-party scrapers.
 * Official direct integration requires government department API-sharing approvals.
 * This adapter provides:
 * 1. Integration readiness for authorized NCS partner API tokens (NCS_API_KEY).
 * 2. If NCS_API_KEY is missing, gracefully skips this source without failing or generating fake jobs.
 */
export class NcsPortalAdapter implements IDataSourceAdapter {
  readonly id = 'ncs_portal';
  readonly name = 'National Career Service (NCS)';
  readonly type = 'portal_gateway' as const;
  readonly officialPortalUrl = 'https://www.ncs.gov.in/';
  readonly documentationUrl = 'https://www.ncs.gov.in/Pages/AboutUs.aspx';
  readonly description = 'National Career Service (NCS) is a Five Year Plan project by Ministry of Labour & Employment, Government of India, bridging jobseekers and employers.';

  private apiKey: string;
  private endpoint: string;

  constructor() {
    this.apiKey = process.env.NCS_API_KEY || '';
    this.endpoint = process.env.NCS_API_ENDPOINT || 'https://www.ncs.gov.in/api/v1/vacancies';
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

    // If NCS_API_KEY is not configured, skip this source gracefully
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
        errorMessage: 'NCS_API_KEY is an optional credential and not currently configured. Source skipped until authorized government credentials are provided. Official portal link: https://www.ncs.gov.in/',
        jobs: [],
      };
    }

    // Authorized API integration if government partner key is provisioned
    try {
      const response = await fetch(this.endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
          'User-Agent': 'YuvaMitraa-NCS-Partner/1.0',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return {
          sourceName: this.name,
          sourceId: this.id,
          status: response.status === 401 || response.status === 403 ? 'CONFIG_REQUIRED' : 'FAILED',
          fetchedCount: 0,
          insertedCount: 0,
          updatedCount: 0,
          duplicateCount: 0,
          expiredCount: 0,
          errorMessage: `NCS authorized endpoint returned HTTP ${response.status}: ${response.statusText}`,
          jobs: [],
        };
      }

      const data = await response.json();
      const items = Array.isArray(data) ? data : (data.vacancies || data.results || []);
      const normalized: JobListing[] = [];

      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        if (!item.title || (!item.organization && !item.ministry && !item.company)) continue;

        normalized.push({
          id: `ncs-api-${item.jobId || idx}`,
          title: String(item.title).trim(),
          companyName: String(item.organization || item.ministry || item.company || 'Public Sector Enterprise').trim(),
          description: String(item.description || 'Official government career opportunity via National Career Service.').trim(),
          requiredSkills: Array.isArray(item.skills) ? item.skills.map(String) : ['Aptitude', 'Domain Knowledge'],
          location: String(item.location || 'India').trim(),
          workMode: 'On-site',
          employmentType: 'Full-time',
          salary: String(item.salary || 'As per 7th CPC / Government Pay Scales').trim(),
          applyUrl: item.applyUrl || `${this.officialPortalUrl}?jobId=${encodeURIComponent(item.jobId || '')}`,
          sourceName: this.name,
          sourceUrl: this.officialPortalUrl,
          sourceId: String(item.jobId || `ncs-${idx}`),
          verifiedStatus: 'Verified',
          lastVerifiedAt: now,
          createdAt: item.postedDate || now,
          updatedAt: now,
        });
      }

      return {
        sourceName: this.name,
        sourceId: this.id,
        status: 'SUCCESS',
        fetchedCount: normalized.length,
        insertedCount: normalized.length,
        updatedCount: 0,
        duplicateCount: 0,
        expiredCount: 0,
        jobs: normalized,
      };
    } catch (err: any) {
      console.warn(`[NCS Adapter] Authorized API call error: ${err.message}. Source skipped.`);
      return {
        sourceName: this.name,
        sourceId: this.id,
        status: 'FAILED',
        fetchedCount: 0,
        insertedCount: 0,
        updatedCount: 0,
        duplicateCount: 0,
        expiredCount: 0,
        errorMessage: `NCS authorized endpoint connection failed: ${err.message}`,
        jobs: [],
      };
    }
  }
}
