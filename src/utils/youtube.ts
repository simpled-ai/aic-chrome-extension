export const extractVideoId = (url: string): string | null => {
  console.log('Extracting video ID from URL:', url);
  
  // Handle various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^?&"'>]+)/,
    /youtube\.com\/watch.*[?&]v=([^&"'>]+)/,
    /youtube\.com\/shorts\/([^?&"'>]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      console.log('Extracted video ID:', match[1]);
      return match[1];
    }
  }

  console.log('No video ID found');
  return null;
}; 