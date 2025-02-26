import { ContentExtractResult } from '../types';

export const extractCourseraInfo = (url: string): ContentExtractResult => {
  console.log('Extracting Coursera info from URL:', url);
  
  const result: ContentExtractResult = {
    id: null,
    platform: null,
    crawlType: null
  };

  // Check if it's a Coursera URL
  if (url.match(/^https?:\/\/(.*\.)?coursera\.org/)) {
    result.platform = 'COURSERA';
    
    // Handle Coursera course URL format
    const courseMatch = url.match(/coursera\.org\/learn\/([^/?&#]+)/);
    if (courseMatch && courseMatch[1]) {
      result.id = courseMatch[1];
      result.crawlType = 'COURSE';
    }
  }

  console.log('Extracted Coursera info:', result);
  return result;
}; 