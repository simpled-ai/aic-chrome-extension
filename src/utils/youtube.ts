import { ContentExtractResult } from '../types';

export const extractYouTubeInfo = (url: string): ContentExtractResult => {
  console.log('Extracting YouTube info from URL:', url);
  
  const result: ContentExtractResult = {
    id: null,
    platform: null,
    crawlType: null
  };

  // Check if it's a YouTube URL
  if (url.match(/^https?:\/\/(.*\.)?youtube\.com/)) {
    result.platform = 'YOUTUBE';
    
    // Handle various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^?&"'>]+)/,
      /youtube\.com\/watch.*[?&]v=([^&"'>]+)/,
      /youtube\.com\/shorts\/([^?&"'>]+)/
    ];

    // Check for video
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        result.id = match[1];
        result.crawlType = 'VIDEO';
        break;
      }
    }

    // Check for channel
    if (!result.id) {
      const channelMatch = url.match(/youtube\.com\/(c|channel|user|@)\/([^?&"'>]+)/);
      if (channelMatch) {
        result.id = channelMatch[2];
        result.crawlType = 'PROFILE';
      }
    }
  }

  console.log('Extracted YouTube info:', result);
  return result;
}; 