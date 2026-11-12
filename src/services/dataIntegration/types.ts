import { 
  InternshipListing, 
  JobListing, 
  DataSyncLog, 
  SourceAdapterInfo, 
  VerifiedStatus, 
  WorkMode, 
  EmploymentType 
} from '../../types';

export interface AdapterSyncResult {
  sourceName: string;
  sourceId: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'CONFIG_REQUIRED';
  fetchedCount: number;
  insertedCount: number;
  updatedCount: number;
  duplicateCount: number;
  expiredCount: number;
  errorMessage?: string;
  internships?: InternshipListing[];
  jobs?: JobListing[];
}

export interface IDataSourceAdapter {
  readonly id: string;
  readonly name: string;
  readonly type: 'internship' | 'job' | 'portal_gateway';
  readonly officialPortalUrl: string;
  readonly documentationUrl?: string;
  readonly description: string;

  isConfigured(): boolean;
  getInfo(totalListings?: number, lastSyncAt?: string): SourceAdapterInfo;
  fetchAndNormalize(): Promise<AdapterSyncResult>;
}
