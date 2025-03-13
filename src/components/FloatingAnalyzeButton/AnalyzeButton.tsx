import React, { useState, useCallback } from 'react';
import { FloatButton, theme } from 'antd';
import { MailOutlined, DownloadOutlined } from '@ant-design/icons';
import { presetPalettes } from '@ant-design/colors';
import { ContentProcessingStatus } from '../../types';
import { ContentInfo } from './types';
import { getButtonProps } from './utils';
import { createTask, getAnalysisUrl, getEmailDownloadUrl } from '../../services/api';

interface AnalyzeButtonProps {
  contentInfo: ContentInfo;
  status: ContentProcessingStatus;
  isError: boolean;
  pollStatus: (id: string) => Promise<void>;
}

export const AnalyzeButton: React.FC<AnalyzeButtonProps> = ({
  contentInfo,
  status,
  isError,
  pollStatus
}) => {
  const { token } = theme.useToken();
  const [isHovered, setIsHovered] = useState(false);
  const [isEmailButtonHovered, setIsEmailButtonHovered] = useState(false);

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
    }
  }, [contentInfo, isError, status, pollStatus]);

  const buttonProps = getButtonProps(status, isError, isHovered, token);

  return (
    <>
      <FloatButton
        {...buttonProps}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      {status === 'ANALYZED' && (
        <FloatButton
          icon={isEmailButtonHovered ? <DownloadOutlined /> : <MailOutlined />}
          tooltip={'Download emails'}
          style={{ 
            backgroundColor: presetPalettes.blue[2],
            color: token.colorTextLightSolid,
          }}
          onMouseEnter={() => setIsEmailButtonHovered(true)}
          onMouseLeave={() => setIsEmailButtonHovered(false)}
          onClick={() => {
            if (contentInfo?.id) {
              window.open(getEmailDownloadUrl(contentInfo.id), '_blank');
            }
          }}
        />
      )}
    </>
  );
}; 
