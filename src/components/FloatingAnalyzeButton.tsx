import React, { useEffect, useState, useCallback } from 'react';
import { FloatButton, theme } from 'antd';
import {
  PieChartOutlined,
  SmileOutlined,
  FrownOutlined,
  ExportOutlined,
  ApiOutlined,
  LoadingOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { ContentProcessingStatus } from '../types';
import { createTask, getTaskStatus, getAnalysisUrl } from '../services/api';
import { extractTweetId } from '../utils/twitter';
import { presetPalettes } from '@ant-design/colors';

const POLLING_INTERVAL = 5000; // 5 seconds

interface ButtonProps {
  icon?: React.ReactNode;
  type?: 'default' | 'primary';
  style?: React.CSSProperties;
  tooltip?: string;
}

const getButtonProps = (
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

export const FloatingAnalyzeButton: React.FC = () => {
  const { token } = theme.useToken();
  const [status, setStatus] = useState<ContentProcessingStatus>('NONE');
  const [isError, setIsError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [tweetId, setTweetId] = useState<string | null>(null);
  const [lastUrl, setLastUrl] = useState<string>(window.location.href);

  // Initial URL check
  useEffect(() => {
    const currentUrl = window.location.href;
    console.log('Initial URL check:', currentUrl);
    const extractedId = extractTweetId(currentUrl);
    console.log('Initial extracted ID:', extractedId);
    if (extractedId) {
      setTweetId(extractedId);
    }
  }, []); // Run only once on mount

  const pollStatus = useCallback(async (id: string) => {
    try {
      // Check if chrome.runtime is still available
      if (!chrome.runtime?.id) {
        console.log('Extension context invalidated, reloading page...');
        window.location.reload();
        return;
      }

      const response = await getTaskStatus(id);
      setStatus(response.data.status);
      setIsError(false);
    } catch (error) {
      console.error('Error polling status:', error);
      if ((error as Error).message === 'Extension context invalidated.') {
        // If the extension context is invalidated, reload the page
        window.location.reload();
        return;
      }
      setIsError(true);
    }
  }, []);

  const handleClick = useCallback(async () => {
    if (!tweetId || isError) return;

    try {
      // Check if chrome.runtime is still available
      if (!chrome.runtime?.id) {
        console.log('Extension context invalidated, reloading page...');
        window.location.reload();
        return;
      }

      if (status === 'NONE') {
        await createTask(tweetId);
        await pollStatus(tweetId);
      } else if (status === 'ANALYZED') {
        window.open(getAnalysisUrl(tweetId), '_blank');
      }
    } catch (error) {
      console.error('Error handling click:', error);
      if ((error as Error).message === 'Extension context invalidated.') {
        window.location.reload();
        return;
      }
      setIsError(true);
    }
  }, [tweetId, isError, status, pollStatus]);

  // URL change effect
  useEffect(() => {
    const updateTweetId = () => {
      const currentUrl = window.location.href;
      console.log('Checking URL change:', { currentUrl, lastUrl });
      if (currentUrl !== lastUrl) {
        console.log('URL changed from', lastUrl, 'to', currentUrl);
        setLastUrl(currentUrl);
        const extractedId = extractTweetId(currentUrl);
        console.log('Extracted ID:', extractedId, 'Current tweetId:', tweetId);
        if (extractedId !== tweetId) {
          console.log('Setting new tweet ID:', extractedId);
          setTweetId(extractedId);
          setStatus('NONE');
          setIsError(false);
        }
      }
    };

    const pushState = history.pushState;
    const replaceState = history.replaceState;

    history.pushState = function() {
      pushState.apply(history, arguments as any);
      updateTweetId();
    };

    history.replaceState = function() {
      replaceState.apply(history, arguments as any);
      updateTweetId();
    };

    window.addEventListener('popstate', updateTweetId);

    const observer = new MutationObserver(() => {
      updateTweetId();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    updateTweetId();

    return () => {
      window.removeEventListener('popstate', updateTweetId);
      observer.disconnect();
      history.pushState = pushState;
      history.replaceState = replaceState;
    };
  }, [lastUrl, tweetId]);

  // Polling effect
	useEffect(() => {
		console.log('tweetId', tweetId);
    if (!tweetId) return;

    let intervalId: NodeJS.Timeout;
    
    const startPolling = () => {
      pollStatus(tweetId);
      intervalId = setInterval(() => {
        if (chrome.runtime?.id) {
          pollStatus(tweetId);
        } else {
          clearInterval(intervalId);
          window.location.reload();
        }
      }, POLLING_INTERVAL);
    };

    startPolling();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [tweetId, pollStatus]);

  if (!tweetId) return null;

  const buttonProps = getButtonProps(status, isError, isHovered, token);

  return (
    <FloatButton
      {...buttonProps}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...buttonProps.style,
        right: 24,
        bottom: 24 + 122,
      }}
    />
  );
}; 