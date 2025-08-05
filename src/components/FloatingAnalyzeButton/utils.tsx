import { ContentExtractResult, ContentProcessingStatus } from '../../types';
import { ContentInfo, ButtonProps } from './types';
import { extractTwitterInfo } from '../../utils/twitter';
import { extractYouTubeInfo } from '../../utils/youtube';
import { extractTrustpilotInfo } from '../../utils/trustpilot';
import { extractFacebookInfo } from '../../utils/facebook';
import { extractCourseraInfo } from '../../utils/coursera';
import { extractUdemyInfo } from '../../utils/udemy';
import { extractKlingAIInfo } from '../../utils/klingai';
import { extractOpenAICommunityInfo } from '../../utils/openai_community';
import { presetPalettes } from '@ant-design/colors';
import {
  PieChartOutlined,
  FrownOutlined,
  ApiOutlined,
  LoadingOutlined,
  SyncOutlined,
  ExportOutlined,
  SmileOutlined
} from '@ant-design/icons';
import {
  ALL_QUESTION_PATTERNS,
  ALL_ERROR_PATTERNS, VALIDATION_THRESHOLDS, ALL_PENDING_PATTERNS,
  OVERLAY
} from './constants';
import { getAllResearchTopics } from '../../services/api';

export interface ResearchItem {
  id: string;
  title: string;
  content: string;
  status: 'normal' | 'sending' | 'error';
  isMatched: boolean;
  documentId?: string;
  error?: string;
}

export interface Topic {
  id: number;
  status: 'pending' | 'researching' | 'completed' | 'error';
  prompt: string;
  title: string;
  description?: string;
  error?: string;
  hashs?: string[];
}

export const cleanText = ( text : string ) => {
  return text
    .replace(/\s*https?:\/\/[^\s]+\s*/g, ' ')
    .replace(/\s*www\.[^\s]+\s*/g, ' ')
    .replace(/\s*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\s*/g, ' ')
    .replace(/<[^>]*>/g, ' ') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Remove HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n') // Normalize multiple line breaks to max 2
    .replace(/^\s+|\s+$/g, '') // Remove leading/trailing whitespace
    .trim();
}

// Research related utility functions
export const generateContentHash = async (content: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  // Convert ArrayBuffer to hex string
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Load topics from localStorage or use default
export const loadTopicsFromStorage = (): Topic[] => {
  try {
    const saved = localStorage.getItem('aic-auto-research-topics');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validate the structure
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((topic: any) => ({
          id: topic.id,
          status: topic.status,
          prompt: topic.prompt,
          title: topic.title,
          description: topic.description,
          error: topic.error,
          hashs: topic.hashs
        }));
      }
    }
  } catch (error) {
    console.error('Error loading topics from localStorage:', error);
  }
  
  // Return default topics if no saved data
  return [];
};

// Save topics to localStorage whenever topics change
export const saveTopicsToStorage = (topicsToSave: Topic[]) => {
  try {
    localStorage.setItem('aic-auto-research-topics', JSON.stringify(topicsToSave));
  } catch (error) {
    console.error('Error saving topics to localStorage:', error);
  }
};

export const scanForResearchResults = async (apiKey: string): Promise<ResearchItem[]> => {
  const researchDivs = document.querySelectorAll('.deep-research-result');
  if (researchDivs.length === 0) return [];

  const items: ResearchItem[] = [];
  const topics = loadTopicsFromStorage();
  const existopic = await getAllResearchTopics(apiKey);
  const topicTitles = Array.isArray(existopic) ? existopic.map((documents: {metadata: {topic: string}}) => documents.metadata.topic) : [];
  const topicDocumentIds = Array.isArray(existopic) ? existopic.map((documents: {metadata: {document_id: string}}) => documents.metadata.document_id) : [];

  for (let index = 0; index < researchDivs.length; index++) {
    const div = researchDivs[index] as HTMLElement;
    let title = `Research ${index + 1}`;

    const content = div.innerText || div.outerText;
    if (!content) continue;

    const hash = await generateContentHash(content);

    const matchedTopic = topics.find(t => Array.isArray(t.hashs) && t.hashs.includes(hash));
    if (matchedTopic) {
      title = matchedTopic.title;
    } else {
      try {
        const titleElement = div.querySelector('h1');
        if (titleElement && titleElement.textContent && titleElement.textContent.trim()) {
          title = titleElement.textContent.trim();
        }
      } catch (error) {
        console.error('Error getting title from div:', error);
      }
    }

    items.push({
      id: `research-${index}`,
      title,
      content: cleanText(content),
      status: 'normal',
      isMatched: topicTitles.includes(title),
      documentId: topicTitles.includes(title) ? topicDocumentIds[topicTitles.indexOf(title)] : undefined,
    });
  }

  return items;
};

export const extractContentInfo = (url: string): ContentInfo | null => {
  let result: ContentExtractResult | null = null;

  // Try each platform's extractor
  result = extractTwitterInfo(url);
  if (!result.platform) result = extractYouTubeInfo(url);
  if (!result.platform) result = extractTrustpilotInfo(url);
  if (!result.platform) result = extractFacebookInfo(url);
  if (!result.platform) result = extractCourseraInfo(url);
  if (!result.platform) result = extractUdemyInfo(url);
  if (!result.platform) result = extractKlingAIInfo(url);
  if (!result.platform) result = extractOpenAICommunityInfo(url);

  console.log('Extracted content info:', result);

  if (result.platform === null) return null;

  return {
    id: result.id,
    platform: result.platform,
    crawlType: result.crawlType,
  };
};

export const getButtonProps = (
  status: ContentProcessingStatus,
  isError: boolean,
  isHovered: boolean,
  token: any
): ButtonProps => {
  if (isError) {
    return {
      icon: <ApiOutlined />,
      style: { opacity: 0.5 },
      tooltip: 'Failed to connect to the server. Please contact the developer.',
    };
  }

  switch (status) {
    case 'NONE':
      return {
        icon: <PieChartOutlined />,
        tooltip: 'Analyze this content',
      };
    case 'CRAWLING':
      return {
        icon: <LoadingOutlined />,
        tooltip: 'Crawling...',
      };
    case 'CRAWLED':
    case 'ANALYZING':
      return {
        icon: <SyncOutlined spin />,
        style: { 
          backgroundColor: presetPalettes.gold[2],
          color: token.colorTextLightSolid,
        },
        tooltip: 'Analyzing...',
      };
    case 'ANALYZED':
      return {
        icon: isHovered ? <ExportOutlined /> : <SmileOutlined />,
        style: { 
          backgroundColor: presetPalettes.green[2],
          color: token.colorTextLightSolid,
        },
        tooltip: 'See analysis',
      };
    case 'FAILED':
      return {
        icon: <FrownOutlined />,
        style: { 
          backgroundColor: presetPalettes.red[2],
          color: token.colorTextLightSolid,
        },
        tooltip: 'Failed to analyze. Please contact the developer.',
      };
    default:
      return {
        icon: <PieChartOutlined />,
        type: 'primary',
        tooltip: 'Analyze this content',
      };
  }
}; 

// GPT AUTO RESEARCH
// Start deep research mode
export const startDeepResearchMode = async () => {
  try {
    document.body.appendChild(OVERLAY);
    
    // Check if deep research mode is already active
    const mode = document.querySelector('[data-testid="active-system-hint-pill"]') as HTMLButtonElement;
    if (mode && (mode.textContent === "Nghiên cứu" || mode.textContent === "Research")) {
      return { success: true };
    }
    
    // Click menu button to open dropdown
    const menuButton = document.querySelector('button[id="system-hint-button"]') as HTMLButtonElement;
    if (menuButton && (menuButton.textContent === "Công cụ" || menuButton.textContent === "Tools")) {
      try {
        // Focus and Enter key
        menuButton.focus();
        const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
        menuButton.dispatchEvent(enterEvent);
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        return { success: false };
      }
    } else {
      return { success: false };
    }

    // Find deep research button in the menu
    const menuContainer = document.querySelector('[role="menu"]') as HTMLElement;
    if (menuContainer) {
      menuContainer.focus();
      
      // Find the deep research button
      const deepResearchButton = Array.from(document.querySelectorAll('[role="menuitemradio"]')).find(
        element => element.textContent === "Nghiên cứu sâu"
                || element.textContent === "Nghiên cứu chuyên sâu"
                || element.textContent === "Deep research"
      ) as HTMLElement;
      if (deepResearchButton) {
        deepResearchButton.click();
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        return { success: false };
      }
    } else {
      return { success: false };
    }

    return { success: true };
    
  } finally {
    // Always remove overlay when done
    try {
      const existingOverlay = document.getElementById('deep-research-overlay');
      if (existingOverlay) {
        existingOverlay.remove();
      }
    } catch (error) {
      return { success: false, error: 'Error removing overlay' };
    }
  }
};

export const handleRequest = async ( topic: string, prompt: string, isRunningRef: React.RefObject<boolean> ):Promise<{
  success: boolean;
  error?: string;
  hash?: string;
}> => {
  try {
    // Start deep research mode
    const activateDeepResearchMode = await startDeepResearchMode();
    if (!activateDeepResearchMode.success) {
      return { success: false, error: 'Cannot activate deep research mode' };
    }

    // Get current message count to detect new response
    const currentMessages = (document.querySelectorAll('[data-message-author-role="assistant"]')).length;
      
    const chatInput = document.querySelector('#prompt-textarea') as HTMLTextAreaElement | HTMLElement;
    if (!chatInput) {
      return { success: false, error: 'Cannot find ChatGPT input field. Please make sure ChatGPT is loaded properly and try refreshing the page.' };
    }
    // Input the research prompt
    try {
      if (chatInput.tagName === 'TEXTAREA') {
        (chatInput as HTMLTextAreaElement).value = prompt;
        chatInput.dispatchEvent(new Event('input', { bubbles: true }));
        chatInput.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        chatInput.textContent = prompt;
        chatInput.dispatchEvent(new Event('input', { bubbles: true }));
        chatInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } catch (error) {
      return { success: false, error: 'Failed to input text into ChatGPT field' };
    }

    // Wait a bit for the input to register
    await new Promise(resolve => setTimeout(resolve, 500));

    // Find send button
    const sendButton = document.querySelector('button[data-testid="send-button"]') as HTMLButtonElement;
    if (!sendButton || sendButton.disabled) {
      return { success: false, error: 'Error send button. Please try manually sending the message.' };
    }

    if (!isRunningRef.current) {
      return { success: false, error: 'Research cancelled by user' };
    }

    // Click send button
    try {
      sendButton.click();
    } catch (error) {
      return { success: false, error: 'Failed to click send button' };
    }
    
    // Wait for GPT response (without hard timeout) and return the response
    const responseResult = await handleResponse(currentMessages, isRunningRef);
    if (!responseResult.success) {
      return { success: false, error: responseResult.error };
    }
    const { validationResult } = responseResult;

    // Handle different response types
    switch (validationResult.responseType) {
      case 'question':
        const questionPrompt = `Hãy lựa chọn những điều bạn cho là tốt nhất và cần thiết để tìm hiểu về chủ đề: ${topic}.`;
        return await handleRequest(topic, questionPrompt, isRunningRef);
        
      case 'error':
        return { success: false, error: `GPT Error: ${validationResult.reason}` };

      case 'research':
        return { success: true, hash: responseResult.hash };
        
      case 'normal':
        const normalTextPrompt = `Tôi cần bạn tìm hiểu về chủ đề: ${topic}, và trả lời theo định dạng nghiên cứu.`;
        return await handleRequest(topic, normalTextPrompt, isRunningRef);
        
      default:
        return { success: false, error: `Unclear response from GPT: ${validationResult.reason}` };
    }
  } catch (error) {
    return { success: false, error: `Error occurred during research: ${error}` };
  }
}

// Validate if the GPT response is a proper research result (supports Vietnamese)
export const validateResponse = (responseContent: string): { 
  responseType: 'question' | 'pending' | 'error' | 'normal' | 'research';
  reason?: string;
} => {
  const content = responseContent.replace(/<[^>]*>/g, '').trim();

  // 1. CHECK FOR QUESTIONS (highest priority)
  let questionScore = 0;
  for (const pattern of ALL_QUESTION_PATTERNS) {
    if (pattern.test(content)) { questionScore += 1 }
  }
  questionScore += (content.match(/\?/g) || []).length;
  
  if (questionScore >= VALIDATION_THRESHOLDS.QUESTION_SCORE_THRESHOLD) {
    return { 
      responseType: 'question', 
      reason: 'GPT is asking for clarification or more information',
    };
  }

  // 2. CHECK FOR PENDING (second priority)
  let pendingScore = 0;
  for (const pattern of ALL_PENDING_PATTERNS) {
    if (pattern.test(content)) { pendingScore += 1 }
  }
  if (pendingScore >= VALIDATION_THRESHOLDS.PENDING_SCORE_THRESHOLD) {
    return { 
      responseType: 'pending', 
      reason: 'GPT is waiting for more information or processing',
    };
  }
  

  // 3. CHECK FOR ERRORS (second priority)
  let errorScore = 0;
  for (const pattern of ALL_ERROR_PATTERNS) {
    if (pattern.test(content)) { errorScore += 1 }
  }
  if (errorScore >= VALIDATION_THRESHOLDS.ERROR_SCORE_THRESHOLD) {
    return { 
      responseType: 'error', 
      reason: 'GPT returned an error message or limitation notice',
    };
  }
  
  // 4. DEFAULT TO NORMAL
  return { 
    responseType: 'normal', 
    reason: 'Response is normal text',
  };
};

// Handle response from GPT
const handleResponse = async ( msgCount: number, isRunningRef: React.RefObject<boolean> ):Promise<{
  success: boolean;
  error?: string;
  validationResult?: any;
  hash?: string;
}> => {
  // Wait for streaming to complete with timeout and cancellation support
  await new Promise(resolve => setTimeout(resolve, 500));
  const timeout = 3600000;
  const startTime = Date.now();
  while (Date.now() - startTime < timeout && isRunningRef.current) {
    if (document.querySelector('[data-testid="stop-button"]')) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      break;
    }
  }
  if (Date.now() - startTime >= timeout) {
    return { success: false, error: `GPT response timeout after 1 hour` };
  }

  if (!isRunningRef.current) {
    return { success: false, error: 'Research cancelled by user' };
  }
  
  // Check for new message
  const newMessages = document.querySelectorAll('[data-message-author-role="assistant"]');
  if (newMessages.length > msgCount) {
    const latestResponse = newMessages[newMessages.length - 1];
    const responseContent = latestResponse.textContent || latestResponse.innerHTML;
    if (responseContent) {
      const deepResearch = latestResponse.querySelector('.deep-research-result') as HTMLElement;
      const deepResearchContent = deepResearch?.innerText || deepResearch?.outerText;
      if (deepResearchContent) {
        // Send the research result directly
        try {
          const hash = await generateContentHash(deepResearchContent);
          return {
            success: true,
            validationResult: {
              responseType: 'research',
              reason: 'Response is research content',
            },
            hash,
          };
        } catch (error) {
          return { success: false, error: `Error occurred during sending research content: ${error}` };
        }
      }
      
      // Validate the response
      const validationResult = validateResponse(responseContent);
      if (validationResult.responseType === 'pending') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return await handleResponse(msgCount + 1, isRunningRef);
      }
      return { success: true, validationResult };
    }
  }
  if (!isRunningRef.current) {
    return { success: false, error: 'Research cancelled by user' };
  }
  return { success: false, error: 'No new message detected' };
};
