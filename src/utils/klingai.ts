import { ContentExtractResult } from '../types';

export const extractKlingAIInfo = (url: string): ContentExtractResult => {
  console.log('Extracting KlingAI info from URL:', url);
  
  const result: ContentExtractResult = {
    id: null,
    platform: null,
    crawlType: null
  };

  // Check if it's a KlingAI URL
  if (url.match(/^https?:\/\/(.*\.)?app\.klingai\.com/)) {
    result.platform = 'KLINGAI';
    
    // Extract workId from the URL query parameter
    const urlParams = new URLSearchParams(new URL(url).search);
    const workId = urlParams.get('workId');
    
    if (workId) {
      result.id = workId;
      result.crawlType = 'CONTENT';
    }
  }

  console.log('Extracted KlingAI info:', result);
  return result;
}; 
