import React from 'react';
import {
  TwitterOutlined,
  YoutubeOutlined,
  StarOutlined,
  FacebookOutlined,
  ReadOutlined,
  BookOutlined
} from '@ant-design/icons';

export const PlatformIcons: Record<string, React.ReactNode> = {
  TWITTER: <TwitterOutlined style={{ color: '#1DA1F2' }} />,
  YOUTUBE: <YoutubeOutlined style={{ color: '#FF0000' }} />,
  TRUSTPILOT: <StarOutlined style={{ color: '#00B67A' }} />,
  FACEBOOK: <FacebookOutlined style={{ color: '#1877F2' }} />,
  COURSERA: <ReadOutlined style={{ color: '#2A73CC' }} />,
  UDEMY: <BookOutlined style={{ color: '#A435F0' }} />,
}; 
