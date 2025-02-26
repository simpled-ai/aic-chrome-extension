import { CreateTaskPayload, TaskStatusResponse, CreateTaskResponse } from '../types';

const API_BASE_URL = 'https://intranet.aic.academy/web-crawler/api';

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_TASK_STATUS') {
    getTaskStatus(request.tweetId)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true; // Will respond asynchronously
  }

  if (request.type === 'CREATE_TASK') {
    createTask(request.payload)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true; // Will respond asynchronously
  }

  if (request.type === 'GET_ANALYSIS_ITEMS') {
    getAnalysisItems()
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true; // Will respond asynchronously
  }
});

const getTaskStatus = async (tweetId: string): Promise<TaskStatusResponse> => {
  const response = await fetch(`${API_BASE_URL}/tasks/${tweetId}/status`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch task status');
  }
  return response.json();
};

const createTask = async (payload: CreateTaskPayload): Promise<CreateTaskResponse> => {
  const response = await fetch(`${API_BASE_URL}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to create task');
  }
  return response.json();
};

const getAnalysisItems = async () => {
  const response = await fetch(`${API_BASE_URL}/analysis/items`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch analysis items');
  }
  return response.json();
};

// Listen for when a tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if the URL matches Twitter/X, YouTube, Facebook, Coursera, or Udemy
    if (
      tab.url.match(/^https?:\/\/(.*\.)?(twitter\.com|x\.com|youtube\.com|facebook\.com|coursera\.org|udemy\.com)/)
    ) {
      console.log('Matching site detected:', tab.url);
    }
  }
}); 