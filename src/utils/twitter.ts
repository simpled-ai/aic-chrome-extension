import { ContentExtractResult } from '../types';

export const extractTwitterInfo = (url: string): ContentExtractResult => {
  console.log('Extracting Twitter info from URL:', url);
  
  const result: ContentExtractResult = {
    id: null,
    platform: null,
    crawlType: null
  };

  // Check if it's a Twitter URL
  if (url.match(/^https?:\/\/(.*\.)?(twitter\.com|x\.com)/)) {
    result.platform = 'TWITTER';
    
    // Check for tweet
    const tweetMatch = url.match(/\/status\/(\d+)/);
    if (tweetMatch) {
      result.id = tweetMatch[1];
      result.crawlType = 'POST';
    }
    // Check for profile
    else if (url.match(/twitter\.com\/[^/]+$/) || url.match(/x\.com\/[^/]+$/)) {
      const username = url.split('/').pop();
      if (username && !['home', 'explore', 'notifications', 'messages'].includes(username)) {
        result.id = username;
        result.crawlType = 'PROFILE';
      }
    }
  }

  console.log('Extracted Twitter info:', result);
  return result;
}; 