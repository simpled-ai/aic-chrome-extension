import React, { useEffect, useState, useCallback } from 'react';
import { FloatButton, theme, Modal, DatePicker, Button } from 'antd';
import {
  PieChartOutlined,
  SmileOutlined,
  FrownOutlined,
  ExportOutlined,
  ApiOutlined,
  LoadingOutlined,
  SyncOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { ContentProcessingStatus, Platform, CrawlType } from '../types';
import { createTask, getTaskStatus, getAnalysisUrl } from '../services/api';
import { extractTweetId } from '../utils/twitter';
import { extractVideoId } from '../utils/youtube';
import { presetPalettes } from '@ant-design/colors';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const POLLING_INTERVAL = 5000; // 5 seconds

interface ButtonProps {
  icon?: React.ReactNode;
  type?: 'default' | 'primary';
  style?: React.CSSProperties;
  tooltip?: string;
}

interface ContentInfo {
  id: string;
  platform: Platform;
  crawlType: CrawlType;
}

const extractContentInfo = (url: string): ContentInfo | null => {
  // Try Twitter first
  const tweetId = extractTweetId(url);
  if (tweetId) {
    return {
      id: tweetId,
      platform: 'TWITTER',
      crawlType: 'POST',
    };
  }

  // Try YouTube
  const videoId = extractVideoId(url);
  if (videoId) {
    return {
      id: videoId,
      platform: 'YOUTUBE',
      crawlType: 'VIDEO',
    };
  }

  return null;
};

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
  const [contentInfo, setContentInfo] = useState<ContentInfo | null>(null);
  const [lastUrl, setLastUrl] = useState<string>(window.location.href);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [timeRange, setTimeRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [isCreatingReport, setIsCreatingReport] = useState(false);

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

  const handleClick = useCallback(async () => {
    if (!contentInfo || isError) return;

    try {
      if (!chrome.runtime?.id) {
        console.log('Extension context invalidated, reloading page...');
        window.location.reload();
        return;
      }

      if (status === 'NONE') {
        await createTask(contentInfo.id, {
          type: 'CRAWL',
          priority: 1,
          crawlConfig: {
            platform: contentInfo.platform,
            crawlType: contentInfo.crawlType,
            targetId: contentInfo.id,
          },
        });
        await pollStatus(contentInfo.id);
      } else if (status === 'ANALYZED') {
        window.open(getAnalysisUrl(contentInfo.id), '_blank');
      }
    } catch (error) {
      console.error('Error handling click:', error);
      if ((error as Error).message === 'Extension context invalidated.') {
        window.location.reload();
        return;
      }
      setIsError(true);
    }
  }, [contentInfo, isError, status, pollStatus]);

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
    if (!contentInfo?.id) return;

    let intervalId: NodeJS.Timeout;
    
    const startPolling = () => {
      pollStatus(contentInfo.id);
      intervalId = setInterval(() => {
        if (chrome.runtime?.id) {
          pollStatus(contentInfo.id);
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

  const handleCreateReport = async () => {
    if (!timeRange) return;

    try {
      setIsCreatingReport(true);
      const [startTime, endTime] = timeRange;
      const response = await createTask('', {
        type: 'ANALYZE',
        priority: 1,
        analyzeConfig: {
          contentIds: [],
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
      });

      window.open(getAnalysisUrl(response.data.id), '_blank');
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error creating report:', error);
    } finally {
      setIsCreatingReport(false);
    }
  };

  const buttonProps = getButtonProps(status, isError, isHovered, token);

  const bottomInset = contentInfo?.platform === 'TWITTER' ? 122 + 24 : 24;

  return (
    <>
      <FloatButton.Group style={{ bottom: bottomInset }}>
        {contentInfo && <FloatButton
          {...buttonProps}
          onClick={handleClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        />}
        <FloatButton
          icon={<PlusOutlined />}
          onClick={() => setIsModalVisible(true)}
          tooltip="Create report"
        />
      </FloatButton.Group>

      <Modal
        title="Create Time Range Report"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="create"
            type="primary"
            loading={isCreatingReport}
            onClick={handleCreateReport}
            disabled={!timeRange}
          >
            Create Report
          </Button>,
        ]}
      >
        <div style={{ marginTop: 16 }}>
          <RangePicker
            showTime
            format="YYYY-MM-DD HH:mm:ss"
            onChange={(dates) => setTimeRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
            style={{ width: '100%' }}
          />
        </div>
      </Modal>
    </>
  );
}; 