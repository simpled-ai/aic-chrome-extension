import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { FloatButton, theme, Modal, DatePicker, Button, Checkbox, List, Spin } from 'antd';
import {
  PieChartOutlined,
  SmileOutlined,
  FrownOutlined,
  ExportOutlined,
  ApiOutlined,
  LoadingOutlined,
  SyncOutlined,
  PlusOutlined,
  TwitterOutlined,
  YoutubeOutlined,
  StarOutlined,
  FacebookOutlined,
} from '@ant-design/icons';
import { ContentProcessingStatus, Platform, CrawlType, ContentExtractResult } from '../types';
import { createTask, getTaskStatus, getAnalysisUrl, getAnalysisItems } from '../services/api';
import { extractTwitterInfo } from '../utils/twitter';
import { extractYouTubeInfo } from '../utils/youtube';
import { extractTrustpilotInfo } from '../utils/trustpilot';
import { extractFacebookInfo } from '../utils/facebook';
import { presetPalettes } from '@ant-design/colors';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const POLLING_INTERVAL = 5000; // 5 seconds

const PlatformIcons: Record<string, React.ReactNode> = {
  TWITTER: <TwitterOutlined style={{ color: '#1DA1F2' }} />,
  YOUTUBE: <YoutubeOutlined style={{ color: '#FF0000' }} />,
  TRUSTPILOT: <StarOutlined style={{ color: '#00B67A' }} />,
  FACEBOOK: <FacebookOutlined style={{ color: '#1877F2' }} />,
};

interface AnalysisItem {
  platform: string;
  id: string;
  label: string;
  type: 'CONTENT' | 'PROFILE';
}

interface ButtonProps {
  icon?: React.ReactNode;
  type?: 'default' | 'primary';
  style?: React.CSSProperties;
  tooltip?: string;
}

interface ContentInfo {
  id: string | null;
  platform: Platform;
  crawlType: CrawlType | null;
}

const extractContentInfo = (url: string): ContentInfo | null => {
  let result: ContentExtractResult | null = null;

  // Try each platform's extractor
  result = extractTwitterInfo(url);
  if (!result.platform) result = extractYouTubeInfo(url);
  if (!result.platform) result = extractTrustpilotInfo(url);
  if (!result.platform) result = extractFacebookInfo(url);

  console.log('Extracted content info:', result);

  if (result.platform === null) return null;

  return {
    id: result.id,
    platform: result.platform,
    crawlType: result.crawlType,
  };
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
  const [analysisItems, setAnalysisItems] = useState<AnalysisItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

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
    if (!contentInfo?.id || !contentInfo.platform || !contentInfo.crawlType || isError) return;

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

  // Load analysis items when modal opens
  useEffect(() => {
    if (isModalVisible) {
      setIsLoadingItems(true);
      getAnalysisItems()
        .then(items => {
          setAnalysisItems(items);
          // Check all items by default
          setSelectedItems(items.map(item => item.id));
        })
        .catch(error => {
          console.error('Error loading analysis items:', error);
        })
        .finally(() => {
          setIsLoadingItems(false);
        });
    }
  }, [isModalVisible]);

  const handleCreateReport = async () => {
    console.log('Creating report with:', { timeRange, selectedItems });
    if (!timeRange && selectedItems.length === 0) return;

    try {
      setIsCreatingReport(true);
      const [startTime, endTime] = timeRange ? timeRange : [undefined, undefined];
      const contentIds = selectedItems.filter(
        item => analysisItems.find(
          i => i.id === item
        )?.type === 'CONTENT'
      );
      const profileIds = selectedItems.filter(
        item => analysisItems.find(
          i => i.id === item
        )?.type === 'PROFILE'
      );
      const response = await createTask('', {
        type: 'ANALYZE',
        priority: 1,
        analyzeConfig: {
          contentIds: contentIds,
          profileIds: profileIds,
          startTime: startTime?.toISOString(),
          endTime: endTime?.toISOString(),
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

  const onCheckAllChange = (e: { target: { checked: boolean } }) => {
    setSelectedItems(e.target.checked ? analysisItems.map(item => item.id) : []);
  };

  return (
    <>
      <FloatButton.Group style={{ bottom: bottomInset }}>
        {contentInfo?.id &&
          contentInfo.platform &&
          contentInfo.crawlType &&
          <FloatButton
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
        title="Create Report"
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
            disabled={!timeRange && selectedItems.length === 0}
          >
            Create Report
          </Button>,
        ]}
        width={600}
      >
        <div style={{ marginTop: 16 }}>
          <RangePicker
            showTime
            format="YYYY-MM-DD HH:mm:ss"
            onChange={(dates) => setTimeRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
            style={{ width: '100%', marginBottom: 16 }}
          />

          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Select content to analyze:</span>
            <Checkbox
              checked={selectedItems.length === analysisItems.length}
              indeterminate={selectedItems.length > 0 && selectedItems.length < analysisItems.length}
              onChange={onCheckAllChange}
            >
              Select All
            </Checkbox>
          </div>
          
          {isLoadingItems ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Spin />
            </div>
          ) : (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <List
                size="small"
                dataSource={analysisItems}
                renderItem={(item) => (
                  <List.Item style={{ display: 'flex', alignItems: 'center' }}>
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems([...selectedItems, item.id]);
                        } else {
                          setSelectedItems(selectedItems.filter(id => id !== item.id));
                        }
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8,
                        flex: 1,
                        marginTop: 1.5,
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 8,
                          fontSize: 16
                        }}>
                          {PlatformIcons[item.platform]}
                        </div>
                        <div style={{ 
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '400px'
                        }}>
                          {item.label}
                        </div>
                      </div>
                    </Checkbox>
                  </List.Item>
                )}
              />
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}; 