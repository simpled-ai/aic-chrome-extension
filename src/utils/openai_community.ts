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
    // We want the numeric thread-id as the ID
    const topicMatch = url.match(/community\.openai\.com\/t\/(?:[^/]+\/)?(\d+)/);
    if (topicMatch && topicMatch[1]) {
        result.id = topicMatch[1]; // Assign the captured thread-id
        result.crawlType = 'CONTENT';
    }
  }

  console.log('Extracted OpenAI Community info:', result);
  return result;
}; 
