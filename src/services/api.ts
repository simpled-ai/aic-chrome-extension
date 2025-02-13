import { CreateTaskResponse, TaskStatusResponse, CreateTaskPayload } from '../types';

const ANALYSIS_BASE_URL = 'https://intranet.aic.academy/aic-admin/analysis';

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