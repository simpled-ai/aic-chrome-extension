export const extractCompanyDomain = (url: string): string | null => {
  console.log('Extracting company domain from URL:', url);
  
  // Handle Trustpilot review URL format
  // e.g., https://www.trustpilot.com/review/www.facebook.com
  const pattern = /trustpilot\.com\/review\/([^/?&#]+)/;
  const match = url.match(pattern);
  
  if (match && match[1]) {
    console.log('Extracted company domain:', match[1]);
    return match[1];
  }

  console.log('No company domain found');
  return null;
}; 