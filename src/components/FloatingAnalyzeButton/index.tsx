import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FloatButton } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { ContentProcessingStatus } from '../../types';
import { ContentInfo } from './types';
import { extractContentInfo } from './utils';
import { getTaskStatus } from '../../services/api';
import { AnalyzeButton } from './AnalyzeButton';
import { ReportModal } from './ReportModal';

const POLLING_INTERVAL = 5000; // 5 seconds

export const FloatingAnalyzeButton: React.FC = () => {
  const [status, setStatus] = useState<ContentProcessingStatus>('NONE');
  const [isError, setIsError] = useState(false);
  const [contentInfo, setContentInfo] = useState<ContentInfo | null>(null);
  const [lastUrl, setLastUrl] = useState<string>(window.location.href);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Listen for Udemy course ID extraction event
  useEffect(() => {
    const handleUdemyCourseIdExtracted = (event: CustomEvent) => {
      const { courseId } = event.detail;
      console.log('Received Udemy course ID:', courseId);
      
      // Update the content info if we're on a Udemy page
      if (window.location.href.includes('udemy.com/course/') && contentInfo?.platform === 'UDEMY') {
        setContentInfo({
          ...contentInfo,
          id: courseId
        });
      }
    };
    
    // Add event listener
    document.addEventListener('udemyCourseIdExtracted', handleUdemyCourseIdExtracted as EventListener);
    
    // Clean up
    return () => {
      document.removeEventListener('udemyCourseIdExtracted', handleUdemyCourseIdExtracted as EventListener);
    };
  }, [contentInfo]);

  // Initial URL check
  useEffect(() => {
    const currentUrl = window.location.href;
    console.log('Initial URL check:', currentUrl);
    const info = extractContentInfo(currentUrl);
    console.log('Initial content info:', info);
    if (info) {
      setContentInfo(info);
    }
  }, []); // Run only once on mount

  const pollStatus = useCallback(async (id: string) => {
    try {
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
        window.location.reload();
        return;
      }
      setIsError(true);
    }
  }, []);

  // URL change effect
  useEffect(() => {
    const updateContentInfo = () => {
      const currentUrl = window.location.href;
      console.log('Checking URL change:', { currentUrl, lastUrl });
      if (currentUrl !== lastUrl) {
        console.log('URL changed from', lastUrl, 'to', currentUrl);
        setLastUrl(currentUrl);
        const info = extractContentInfo(currentUrl);
        console.log('Extracted content info:', info);
        if (info?.id !== contentInfo?.id) {
          console.log('Setting new content info:', info);
          setContentInfo(info);
          setStatus('NONE');
          setIsError(false);
        }
      }
    };

    const pushState = history.pushState;
    const replaceState = history.replaceState;

    history.pushState = function() {
      pushState.apply(history, arguments as any);
      updateContentInfo();
    };

    history.replaceState = function() {
      replaceState.apply(history, arguments as any);
      updateContentInfo();
    };

    window.addEventListener('popstate', updateContentInfo);

    const observer = new MutationObserver(() => {
      updateContentInfo();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    updateContentInfo();

    return () => {
      window.removeEventListener('popstate', updateContentInfo);
      observer.disconnect();
      history.pushState = pushState;
      history.replaceState = replaceState;
    };
  }, [lastUrl, contentInfo]);

  // Polling effect
  useEffect(() => {
    if (!contentInfo || contentInfo.id === null) return;

    let intervalId: NodeJS.Timeout;
    
    const startPolling = () => {
      pollStatus(contentInfo.id!);
      intervalId = setInterval(() => {
        if (chrome.runtime?.id) {
          pollStatus(contentInfo.id!);
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
  }, [contentInfo, pollStatus]);

  const bottomInset = useMemo(() => {
    switch (contentInfo?.platform) {
      case 'TWITTER':
        return 122 + 24;
      case 'FACEBOOK':
        return 450 + 24;
      default:
        return 24;
    }
  }, [contentInfo]);

  return (
    <>
      <FloatButton.Group style={{ bottom: bottomInset }}>
        {contentInfo?.id &&
          contentInfo.platform &&
          contentInfo.crawlType && (
            <AnalyzeButton
              contentInfo={contentInfo}
              status={status}
              isError={isError}
              pollStatus={pollStatus}
            />
          )}
        <FloatButton
          icon={<PlusOutlined />}
          onClick={() => setIsModalVisible(true)}
          tooltip="Create report"
        />
      </FloatButton.Group>

      <ReportModal
        isVisible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
      />
    </>
  );
}; 
