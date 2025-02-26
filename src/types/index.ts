export type ContentProcessingStatus =
  | 'NONE'
  | 'CRAWLING'
  | 'CRAWLED'
  | 'ANALYZING'
  | 'ANALYZED'
  | 'FAILED';

export interface TaskStatusResponse {
  success: boolean;
  data: {
    status: ContentProcessingStatus;
    taskId: string;
  };
}

export interface CreateTaskResponse {
  success: boolean;
  data: {
    id: string;
  };
}

export type Platform = 'TWITTER' | 'YOUTUBE' | 'TRUSTPILOT' | 'FACEBOOK' | 'COURSERA' | 'UDEMY';
export type CrawlType = 'POST' | 'VIDEO' | 'COMPANY' | 'PROFILE' | 'COURSE';

export interface ContentExtractResult {
  id: string | null;
  platform: Platform | null;
  crawlType: CrawlType | null;
}

export interface CrawlConfig {
  platform: Platform;
  crawlType: CrawlType;
  targetId: string;
}

export interface AnalyzeConfig {
  contentIds: string[];
  profileIds: string[];
  startTime?: string;
  endTime?: string;
}

export interface CreateTaskPayload {
  type: 'CRAWL' | 'ANALYZE';
  priority: number;
  crawlConfig?: CrawlConfig;
  analyzeConfig?: AnalyzeConfig;
} 