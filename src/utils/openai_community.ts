import { ContentExtractResult } from '../types';

export const extractOpenAICommunityInfo = (url: string): ContentExtractResult => {
  console.log('Extracting OpenAI Community info from URL:', url);
  
  const result: ContentExtractResult = {
    id: null,
    platform: null,
    crawlType: null
  };

  // Check if it's an OpenAI Community URL
  if (url.match(/^https?:\/\/community\.openai\.com/)) {
    result.platform = 'OPENAI_COMMUNITY';
    
    // Handle OpenAI Community topic URL format: https://community.openai.com/t/topic-slug/thread-id
    // or https://community.openai.com/t/thread-id
    // We want the topic slug as the ID
    const topicMatch = url.match(/community\.openai\.com\/t\/([^/]+)(?:\/\d+)?/);
    if (topicMatch && topicMatch[1]) {
      // Check if the matched part is purely numeric (thread ID only format)
      if (!/^\d+$/.test(topicMatch[1])) {
          result.id = topicMatch[1];
          result.crawlType = 'CONTENT';
      } else {
          // If it's just the thread ID, we might need a different approach or consider it invalid for now
          console.log('Detected OpenAI Community URL with thread ID only, cannot extract topic slug:', url);
          // Optionally, you could try to extract the thread ID if needed: result.id = topicMatch[1];
      }
    }
  }

  console.log('Extracted OpenAI Community info:', result);
  return result;
}; 
