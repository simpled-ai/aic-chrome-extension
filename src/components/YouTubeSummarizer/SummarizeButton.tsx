import React, { useState } from 'react';
import { FloatButton, theme } from 'antd';
import { FileTextOutlined, LoadingOutlined } from '@ant-design/icons';
import { presetPalettes } from '@ant-design/colors';
import { YouTubeVideoInfo } from './types';
import { createVideoSummary } from '../../services/api';

interface SummarizeButtonProps {
  videoInfo: YouTubeVideoInfo;
  onSummaryCreated: () => void;
}

export const SummarizeButton: React.FC<SummarizeButtonProps> = ({ 
  videoInfo, 
  onSummaryCreated 
}) => {
  const { token } = theme.useToken();
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      await createVideoSummary(videoInfo.videoId);
      onSummaryCreated();
    } catch (error) {
      console.error('Error creating video summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FloatButton
      icon={isLoading ? <LoadingOutlined /> : <FileTextOutlined />}
      tooltip={isLoading ? 'Summarizing...' : 'Summarize this video'}
      style={{ 
        backgroundColor: isLoading 
          ? presetPalettes.gold[2] 
          : isHovered 
            ? presetPalettes.blue[4] 
            : presetPalettes.blue[2],
        color: token.colorTextLightSolid,
      }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    />
  );
}; 