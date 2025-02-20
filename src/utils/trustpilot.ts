import { ContentExtractResult } from '../types';

export const extractTrustpilotInfo = (url: string): ContentExtractResult => {
  console.log('Extracting Trustpilot info from URL:', url);
  
  const result: ContentExtractResult = {
    id: null,
    platform: null,
    crawlType: null
  };

  // Check if it's a Trustpilot URL
  if (url.match(/^https?:\/\/(.*\.)?trustpilot\.com/)) {
    result.platform = 'TRUSTPILOT';
    
    // Check for company review page
    const companyMatch = url.match(/trustpilot\.com\/review\/([^?&#/]+)/);
    if (companyMatch) {
      result.id = companyMatch[1];
      result.crawlType = 'COMPANY';
    }
    // Check for individual review
    else if (url.includes('/reviews/')) {
      const reviewMatch = url.match(/\/reviews\/([^?&#]+)/);
      if (reviewMatch) {
        result.id = reviewMatch[1];
        result.crawlType = 'POST';
      }
    }
  }

  console.log('Extracted Trustpilot info:', result);
  return result;
}; 