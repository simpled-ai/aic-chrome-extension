export const extractTweetId = (url: string): string | null => {
  console.log('Extracting tweet ID from URL:', url);
  const tweetRegex = /(twitter\.com|x\.com)\/\w+\/status\/(\d+)/;
  const match = url.match(tweetRegex);
  console.log('Regex match result:', match);
  const result = match ? match[2] : null;
  console.log('Extracted tweet ID:', result);
  return result;
}; 