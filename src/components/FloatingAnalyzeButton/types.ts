import { Platform, CrawlType } from '../../types';
import React from 'react';

export interface AnalysisItem {
  platform: string;
  id: string;
  label: string;
  type: 'CONTENT' | 'PROFILE';
}

export interface ButtonProps {
  icon?: React.ReactNode;
  type?: 'default' | 'primary';
  style?: React.CSSProperties;
  tooltip?: string;
}

export interface ContentInfo {
  id: string | null;
  platform: Platform;
  crawlType: CrawlType | null;
} 
