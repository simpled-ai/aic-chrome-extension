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

  if (request.type === 'GET_VIDEO_SUMMARY') {
    getVideoSummary(request.videoId)
      .then(data => sendResponse({ data }))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Will respond asynchronously
  }

  if (request.type === 'CREATE_VIDEO_SUMMARY') {
    createVideoSummary(request.payload)
      .then(data => sendResponse({ data }))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Will respond asynchronously
  }

  if (request.type === 'SEND_RESEARCH_RESULT') {
    sendResearchResult(request.payload, request.apiKey)
      .then(sendResponse)
      .catch((error: Error) => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  }

  if (request.type === 'GET_ALL_RESEARCH_TOPICS') {
    getAllResearchTopics(request.apiKey)
      .then(sendResponse)
      .catch((error: Error) => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  }

  if (request.type === 'SAVE_CHATGPT_CONVERSATION') {
    saveChatGPTConversation(request.payload, request.apiKey)
      .then(sendResponse)
      .catch((error: Error) => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  }

  if (request.type === 'SEARCH_CONVERSATIONS') {
    searchConversations(request.payload, request.apiKey)
      .then(sendResponse)
      .catch((error: Error) => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  }

  if (request.type === 'GET_METADATA_FACETS') {
    getMetadataFacets(request.payload, request.apiKey)
      .then(sendResponse)
      .catch((error: Error) => sendResponse({ success: false, error: error.message }));
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

const getVideoSummary = async (videoId: string) => {
  const response = await fetch(`${API_BASE_URL}/summarizer/${videoId}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch video summary');
  }
  return response.json();
};

const createVideoSummary = async (payload: {
  videoId: string;
}) => {
  const response = await fetch(`${API_BASE_URL}/summarizer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to create video summary');
  }
  return response.json();
};

const sendResearchResult = async (
  payload: {
    metadata: {
      topic: string;
      author: string;
      source: string;
      documentId?: string;
    },
    collection_name: string;
    content: string;
  },
  apiKey: string
) => {
  try {
    // API endpoint - replace with your actual API URL
    const API_ENDPOINT = 'http://13.229.113.45:8080/api/import';
    
    // Send to API
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      return { success: true };
    } else {
      return { success: false, error: `API request failed` };
    }
  } catch (error) {
    return { success: false, error: `Error sending research result: ${error}` };
  }
};

const getAllResearchTopics = async (apiKey: string) => {
  try {
    // API endpoint - replace with your actual API URL
    const API_ENDPOINT = 'http://13.229.113.45:8080/api/documents/list';
    const payload = {
      "collection_name": 'aff_materials',
      "group_by": 'metadata.topic',
      "limit": 100,
      "offset": 0
    };

    // Send to API
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json().then(data => data['documents']);
      return { success: true, data };
    } else {
      return { success: false, error: `API request failed` };
    }
  } catch (error) {
    return { success: false, error: `Error sending research result: ${error}` };
  }
};

const saveChatGPTConversation = async (
  payload: {
    content: string;
    collection_name: string;
    metadata: {
      topic: string;
      author: string;
      source: string;
      category: string;
      created_at: string;
      conversation_type: string;
    };
  },
  apiKey: string
) => {
  try {
    // API endpoint for importing documents
    const API_ENDPOINT = 'http://13.229.113.45:8080/api/import';
    
    // Send to API
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorText = await response.text();
      return { success: false, error: `API request failed: ${errorText}` };
    }
  } catch (error) {
    return { success: false, error: `Error saving conversation: ${error}` };
  }
};

const searchConversations = async (
  payload: {
    query: string;
    collection_name: string;
    limit: number;
    threshold: number;
    search_type: string;
    filter?: string;
    hybrid_config?: {
      dense_weight: number;
      sparse_weight: number;
      fusion_method: string;
      rrf_k: number;
    };
  },
  apiKey: string
) => {
  try {    
    // API endpoint for searching documents
    const API_ENDPOINT = 'http://13.229.113.45:8080/api/search';
    
    // Send to API
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    } else {
      const errorText = await response.text();
      console.error('Background: API error response:', errorText);
      return { success: false, error: `API request failed (${response.status}): ${errorText}` };
    }
  } catch (error) {
    console.error('Background: Search error:', error);
    return { success: false, error: `Error searching conversations: ${error}` };
  }
};

const getMetadataFacets = async (
  payload: {
    collection_name: string;
    metadata_key: string;
    filter?: string;
  },
  apiKey: string
) => {
  try {    
    // API endpoint for getting metadata facets
    const API_ENDPOINT = 'http://localhost:8080/api/documents/metadata-facets';
    
    // Send to API
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    } else {
      const errorText = await response.text();
      console.error('Background: API error response:', errorText);
      return { success: false, error: `API request failed (${response.status}): ${errorText}` };
    }
  } catch (error) {
    console.error('Background: Metadata facets error:', error);
    return { success: false, error: `Error getting metadata facets: ${error}` };
  }
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
