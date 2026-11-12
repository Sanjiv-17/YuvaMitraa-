import { 
  InternshipListing, 
  JobListing, 
  DataSyncLog, 
  SourceAdapterInfo, 
  VerifiedStatus 
} from '../../types';
import { IDataSourceAdapter, AdapterSyncResult } from './types';
import { AicteInternshipAdapter } from './adapters/AicteAdapter';
import { IndianApiJobsAdapter } from './adapters/IndianApiJobsAdapter';
import { NcsPortalAdapter } from './adapters/NcsAdapter';

export class SyncEngine {
  private static instance: SyncEngine;

  private adapters: Map<string, IDataSourceAdapter> = new Map();
  private enabledSources: Set<string> = new Set();
  
  // Storage caches
  private internships: Map<string, InternshipListing> = new Map();
  private jobs: Map<string, JobListing> = new Map();
  private syncLogs: DataSyncLog[] = [];

  // Interval timer
  private timer: NodeJS.Timeout | null = null;
  private isSyncing = false;

  private constructor() {
    this.registerAdapter(new AicteInternshipAdapter());
    this.registerAdapter(new IndianApiJobsAdapter());
    this.registerAdapter(new NcsPortalAdapter());
  }

  public static getInstance(): SyncEngine {
    if (!SyncEngine.instance) {
      SyncEngine.instance = new SyncEngine();
    }
    return SyncEngine.instance;
  }

  public registerAdapter(adapter: IDataSourceAdapter) {
    this.adapters.set(adapter.id, adapter);
    this.enabledSources.add(adapter.id);
  }

  /**
   * Start scheduled synchronization (Default: every 6 hours)
   */
  public startScheduledSync(intervalHours = 6) {
    if (this.timer) {
      clearInterval(this.timer);
    }

    const intervalMs = Math.max(1, intervalHours) * 60 * 60 * 1000;
    console.info(`[SyncEngine] Starting scheduled data refresh every ${intervalHours} hours.`);

    // Run initial sync asynchronously
    this.runSyncAll().catch((err) => {
      console.warn(`[SyncEngine] Initial sync error: ${err.message}`);
    });

    this.timer = setInterval(() => {
      this.runSyncAll().catch((err) => {
        console.warn(`[SyncEngine] Scheduled sync error: ${err.message}`);
      });
    }, intervalMs);
  }

  public stopScheduledSync() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Run synchronization across all enabled adapters
   */
  public async runSyncAll(): Promise<AdapterSyncResult[]> {
    if (this.isSyncing) {
      console.warn('[SyncEngine] Synchronization is already in progress.');
      return [];
    }

    this.isSyncing = true;
    const results: AdapterSyncResult[] = [];

    try {
      for (const [id, adapter] of this.adapters.entries()) {
        if (!this.enabledSources.has(id)) {
          continue;
        }

        try {
          const result = await this.syncSource(adapter);
          results.push(result);
        } catch (sourceErr: any) {
          const failedResult: AdapterSyncResult = {
            sourceName: adapter.name,
            sourceId: adapter.id,
            status: 'FAILED',
            fetchedCount: 0,
            insertedCount: 0,
            updatedCount: 0,
            duplicateCount: 0,
            expiredCount: 0,
            errorMessage: sourceErr.message || 'Unknown source execution error',
          };
          this.recordSyncLog(failedResult);
          results.push(failedResult);
        }
      }

      // Detect and mark expired listings across all collections
      this.detectAndMarkExpired();

    } finally {
      this.isSyncing = false;
    }

    return results;
  }

  /**
   * Synchronize an individual source adapter
   */
  public async syncSource(adapter: IDataSourceAdapter): Promise<AdapterSyncResult> {
    const rawResult = await adapter.fetchAndNormalize();
    let inserted = 0;
    let updated = 0;
    let duplicate = 0;

    // 1. Process Internships if returned
    if (rawResult.internships && rawResult.internships.length > 0) {
      for (const item of rawResult.internships) {
        const dedupeKey = this.buildDedupeKey(item.title, item.companyName, item.location);
        const existing = this.findInternshipByDedupeKey(dedupeKey);

        if (existing) {
          // Update existing item
          existing.updatedAt = new Date().toISOString();
          existing.lastVerifiedAt = item.lastVerifiedAt;
          existing.verifiedStatus = item.verifiedStatus;
          existing.stipend = item.stipend;
          existing.applicationDeadline = item.applicationDeadline;
          updated++;
          duplicate++;
        } else {
          this.internships.set(item.id, item);
          inserted++;
        }
      }
    }

    // 2. Process Jobs if returned
    if (rawResult.jobs && rawResult.jobs.length > 0) {
      for (const item of rawResult.jobs) {
        const dedupeKey = this.buildDedupeKey(item.title, item.companyName, item.location);
        const existing = this.findJobByDedupeKey(dedupeKey);

        if (existing) {
          existing.updatedAt = new Date().toISOString();
          existing.lastVerifiedAt = item.lastVerifiedAt;
          existing.verifiedStatus = item.verifiedStatus;
          existing.salary = item.salary;
          updated++;
          duplicate++;
        } else {
          this.jobs.set(item.id, item);
          inserted++;
        }
      }
    }

    const processedResult: AdapterSyncResult = {
      ...rawResult,
      insertedCount: inserted,
      updatedCount: updated,
      duplicateCount: duplicate,
    };

    this.recordSyncLog(processedResult);
    return processedResult;
  }

  /**
   * Record entry in dataSyncLogs
   */
  private recordSyncLog(res: AdapterSyncResult) {
    const logItem: DataSyncLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sourceName: res.sourceName,
      lastSyncAt: new Date().toISOString(),
      status: res.status,
      fetchedCount: res.fetchedCount,
      insertedCount: res.insertedCount,
      updatedCount: res.updatedCount,
      duplicateCount: res.duplicateCount,
      errorMessage: res.errorMessage,
    };

    this.syncLogs.unshift(logItem);
    // Keep max 200 logs
    if (this.syncLogs.length > 200) {
      this.syncLogs.pop();
    }
  }

  /**
   * Detect and mark past listings as Expired
   */
  private detectAndMarkExpired() {
    const today = new Date().toISOString().split('T')[0];

    for (const [id, item] of this.internships.entries()) {
      if (item.applicationDeadline && item.applicationDeadline < today) {
        if (item.verifiedStatus !== 'Expired') {
          item.verifiedStatus = 'Expired';
          item.updatedAt = new Date().toISOString();
        }
      }
    }
  }

  private buildDedupeKey(title: string, company: string, location: string): string {
    return `${title.toLowerCase().trim()}::${company.toLowerCase().trim()}::${location.toLowerCase().trim()}`;
  }

  private findInternshipByDedupeKey(key: string): InternshipListing | undefined {
    for (const item of this.internships.values()) {
      if (this.buildDedupeKey(item.title, item.companyName, item.location) === key) {
        return item;
      }
    }
    return undefined;
  }

  private findJobByDedupeKey(key: string): JobListing | undefined {
    for (const item of this.jobs.values()) {
      if (this.buildDedupeKey(item.title, item.companyName, item.location) === key) {
        return item;
      }
    }
    return undefined;
  }

  // Public Query APIs
  public getInternships(options?: {
    keyword?: string;
    location?: string;
    workMode?: string;
    includeExpired?: boolean;
  }): InternshipListing[] {
    let list = Array.from(this.internships.values());

    if (!options?.includeExpired) {
      list = list.filter(i => i.verifiedStatus !== 'Expired' && i.verifiedStatus !== 'Rejected');
    }

    if (options?.keyword) {
      const q = options.keyword.toLowerCase();
      list = list.filter(i => 
        i.title.toLowerCase().includes(q) ||
        i.companyName.toLowerCase().includes(q) ||
        i.skills.some(s => s.toLowerCase().includes(q))
      );
    }

    if (options?.location && options.location !== 'All') {
      const loc = options.location.toLowerCase();
      list = list.filter(i => i.location.toLowerCase().includes(loc));
    }

    if (options?.workMode && options.workMode !== 'All') {
      list = list.filter(i => i.workMode.toLowerCase() === options.workMode?.toLowerCase());
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getJobs(options?: {
    keyword?: string;
    location?: string;
    employmentType?: string;
    workMode?: string;
    includeExpired?: boolean;
  }): JobListing[] {
    let list = Array.from(this.jobs.values());

    if (!options?.includeExpired) {
      list = list.filter(j => j.verifiedStatus !== 'Expired' && j.verifiedStatus !== 'Rejected');
    }

    if (options?.keyword) {
      const q = options.keyword.toLowerCase();
      list = list.filter(j => 
        j.title.toLowerCase().includes(q) ||
        j.companyName.toLowerCase().includes(q) ||
        j.requiredSkills.some(s => s.toLowerCase().includes(q))
      );
    }

    if (options?.location && options.location !== 'All') {
      const loc = options.location.toLowerCase();
      list = list.filter(j => j.location.toLowerCase().includes(loc));
    }

    if (options?.workMode && options.workMode !== 'All') {
      list = list.filter(j => j.workMode.toLowerCase() === options.workMode?.toLowerCase());
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getSourcesStatus(): SourceAdapterInfo[] {
    const infos: SourceAdapterInfo[] = [];

    for (const [id, adapter] of this.adapters.entries()) {
      const lastLog = this.syncLogs.find(l => l.sourceName === adapter.name);
      let count = 0;
      if (adapter.type === 'internship') {
        count = Array.from(this.internships.values()).filter(i => i.sourceName === adapter.name).length;
      } else {
        count = Array.from(this.jobs.values()).filter(j => j.sourceName === adapter.name).length;
      }

      const info = adapter.getInfo(count, lastLog?.lastSyncAt || new Date().toISOString());
      info.enabled = this.enabledSources.has(id);
      if (lastLog?.status === 'FAILED') {
        info.status = 'FAILED';
      }
      infos.push(info);
    }

    return infos;
  }

  public getSyncLogs(limit = 50): DataSyncLog[] {
    return this.syncLogs.slice(0, limit);
  }

  public toggleSource(sourceId: string, enabled: boolean): boolean {
    if (!this.adapters.has(sourceId)) {
      return false;
    }
    if (enabled) {
      this.enabledSources.add(sourceId);
    } else {
      this.enabledSources.delete(sourceId);
    }
    return true;
  }

  public async triggerManualSync(sourceId?: string): Promise<AdapterSyncResult[]> {
    if (sourceId) {
      const adapter = this.adapters.get(sourceId);
      if (!adapter) throw new Error(`Adapter "${sourceId}" not found`);
      const res = await this.syncSource(adapter);
      this.detectAndMarkExpired();
      return [res];
    }
    return await this.runSyncAll();
  }
}
