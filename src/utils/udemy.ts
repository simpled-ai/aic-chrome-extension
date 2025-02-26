import { ContentExtractResult } from '../types';

export const extractUdemyInfo = (url: string): ContentExtractResult => {
  console.log('Extracting Udemy info from URL:', url);
  
  const result: ContentExtractResult = {
    id: null,
    platform: null,
    crawlType: null
  };

  // Check if it's a Udemy URL
  if (url.match(/^https?:\/\/(.*\.)?udemy\.com/)) {
    result.platform = 'UDEMY';
    
    // For Udemy, we need to extract the course ID from the DOM
    if (url.match(/udemy\.com\/course\//)) {
      result.crawlType = 'COURSE';
      
      // Try to get the course ID from the global variable set by the content script
      if (typeof window !== 'undefined' && window.udemyCourseId) {
        result.id = window.udemyCourseId;
      } else {
        // Fallback to using the URL path as a temporary ID
        const coursePathMatch = url.match(/udemy\.com\/course\/([^/?&#]+)/);
        if (coursePathMatch && coursePathMatch[1]) {
          result.id = coursePathMatch[1];
        }
      }
    }
  }

  console.log('Extracted Udemy info:', result);
  return result;
}; 