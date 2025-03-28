import { CreateTaskResponse, TaskStatusResponse, CreateTaskPayload } from '../types';

const ANALYSIS_BASE_URL = 'https://intranet.aic.academy/aic-admin/analysis';
const API_BASE_URL = 'https://intranet.aic.academy/web-crawler/api';

interface AnalysisItem {
  platform: string;
  id: string;
  label: string;
  type: 'CONTENT' | 'PROFILE';
}

interface AnalysisItemsResponse {
  success: boolean;
  data: AnalysisItem[];
  error?: string;
}

export interface VideoSummaryTopic {
  id: string;
  title: string;
  summary: string;
  startTime: number;
  endTime: number;
  summaryId: string;
  createdAt: string;
  updatedAt: string;
}

export interface VideoSummaryKeyPoint {
  id: string;
  content: string;
  timestamp: number;
  summaryId: string;
  createdAt: string;
  updatedAt: string;
}

export interface VideoSummaryQuote {
  id: string;
  content: string;
  speaker: string | null;
  timestamp: number;
  summaryId: string;
  createdAt: string;
  updatedAt: string;
}

export interface VideoSummaryLink {
  id: string;
  url: string;
  title: string | null;
  summaryId: string;
  createdAt: string;
  updatedAt: string;
}

export interface VideoSummary {
  id: string;
  videoId: string;
  title: string;
  overallSummary: string;
  finalThoughts: string;
  createdAt: string;
  updatedAt: string;
  topics: VideoSummaryTopic[];
  keyPoints: VideoSummaryKeyPoint[];
  quotes: VideoSummaryQuote[];
  links: VideoSummaryLink[];
}

export const getTaskStatus = async (tweetId: string): Promise<TaskStatusResponse> => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'GET_TASK_STATUS', tweetId },
      (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      }
    );
  });
};

export const createTask = async (targetId: string, payload?: CreateTaskPayload): Promise<CreateTaskResponse> => {
  const defaultPayload: CreateTaskPayload = {
    type: 'CRAWL',
    priority: 0,
    crawlConfig: {
      platform: 'TWITTER',
      crawlType: 'POST',
      targetId: targetId,
    },
  };

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { 
        type: 'CREATE_TASK', 
        targetId,
        payload: payload || defaultPayload,
      },
      (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      }
    );
  });
};

export const getAnalysisItems = async (): Promise<AnalysisItem[]> => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'GET_ANALYSIS_ITEMS' },
      (response: AnalysisItemsResponse) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.data);
        }
      }
    );
  });
};

export const getAnalysisUrl = (tweetId: string): string => {
  return `${ANALYSIS_BASE_URL}/${tweetId}`;
}; 

export const getEmailDownloadUrl = (tweetId: string): string => {
  return `${API_BASE_URL}/analysis/content/${tweetId}/csv?filter=email`;
};

export const getVideoSummary = async (videoId: string): Promise<VideoSummary> => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'GET_VIDEO_SUMMARY', videoId },
      (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.data);
        }
      }
    );
  });
};

export const createVideoSummary = async (videoId: string): Promise<VideoSummary> => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { 
        type: 'CREATE_VIDEO_SUMMARY', 
        payload: {
          videoId
        }
      },
      (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.data);
        }
      }
    );
  });
}; 