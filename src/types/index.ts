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
}

export interface CrawlConfig {
  platform: 'TWITTER';
  crawlType: 'POST';
  targetId: string;
}

export interface CreateTaskPayload {
  type: 'CRAWL';
  priority: number;
  crawlConfig: CrawlConfig;
} 