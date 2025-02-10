import { CreateTaskResponse, TaskStatusResponse, CreateTaskPayload } from '../types';

const ANALYSIS_BASE_URL = 'http://localhost:3001/analysis';

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

export const createTask = async (tweetId: string, payload?: CreateTaskPayload): Promise<CreateTaskResponse> => {
  const defaultPayload: CreateTaskPayload = {
    type: 'CRAWL',
    priority: 0,
    crawlConfig: {
      platform: 'TWITTER',
      crawlType: 'POST',
      targetId: tweetId,
    },
  };

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { 
        type: 'CREATE_TASK', 
        tweetId,
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

export const getAnalysisUrl = (tweetId: string): string => {
  return `${ANALYSIS_BASE_URL}/${tweetId}`;
}; 