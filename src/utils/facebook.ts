import { ContentExtractResult } from '../types';

export const extractFacebookInfo = (url: string): ContentExtractResult => {
  console.log('Extracting Facebook info from URL:', url);
  
  const result: ContentExtractResult = {
    id: null,
    platform: null,
    crawlType: null
  };

  // Check if it's a Facebook URL
  if (url.match(/^https?:\/\/(.*\.)?facebook\.com/)) {
    result.platform = 'FACEBOOK';
    
    // Check for group post
    const groupPostMatch = url.match(/facebook\.com\/groups\/[^/]+\/posts\/(\d+)/);
    if (groupPostMatch) {
      result.id = groupPostMatch[1];
      result.crawlType = 'POST';
    }
    // Check for regular post
    else if (url.includes('/posts/')) {
      const postMatch = url.match(/\/posts\/(\d+)/);
      if (postMatch) {
        result.id = postMatch[1];
        result.crawlType = 'POST';
      }
    }
    // Check for profile
    else if (!url.includes('/groups/')) {
      const profileMatch = url.match(/facebook\.com\/([^/?&#]+)/);
      if (profileMatch && !['groups', 'pages', 'marketplace', 'gaming', 'watch'].includes(profileMatch[1])) {
        result.id = profileMatch[1];
        result.crawlType = 'PROFILE';
      }
    }
  }

  console.log('Extracted Facebook info:', result);
  return result;
}; 