import { ContentExtractResult, ContentProcessingStatus } from '../../types';
import { ContentInfo, ButtonProps } from './types';
import { extractTwitterInfo } from '../../utils/twitter';
import { extractYouTubeInfo } from '../../utils/youtube';
import { extractTrustpilotInfo } from '../../utils/trustpilot';
import { extractFacebookInfo } from '../../utils/facebook';
import { extractCourseraInfo } from '../../utils/coursera';
import { extractUdemyInfo } from '../../utils/udemy';
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

export const extractContentInfo = (url: string): ContentInfo | null => {
  let result: ContentExtractResult | null = null;

  // Try each platform's extractor
  result = extractTwitterInfo(url);
  if (!result.platform) result = extractYouTubeInfo(url);
  if (!result.platform) result = extractTrustpilotInfo(url);
  if (!result.platform) result = extractFacebookInfo(url);
  if (!result.platform) result = extractCourseraInfo(url);
  if (!result.platform) result = extractUdemyInfo(url);

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
