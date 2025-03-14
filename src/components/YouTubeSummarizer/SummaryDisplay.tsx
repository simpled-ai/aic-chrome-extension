import React, { useState } from 'react';
import { Button, Collapse, Divider, List, Space, Tag, Tooltip, Typography } from 'antd';
import {
	BulbOutlined,
	ClockCircleOutlined,
	DownOutlined,
	LinkOutlined,
	MessageOutlined,
	UpOutlined,
} from '@ant-design/icons';
import { VideoSummary } from '../../services/api';

const { Title, Paragraph, Text } = Typography;
const { Panel } = Collapse;

interface SummaryDisplayProps {
  summary: VideoSummary;
}

export const SummaryDisplay: React.FC<SummaryDisplayProps> = ({ summary }) => {
  const [expanded, setExpanded] = useState(false);
  const [activeTopicKey, setActiveTopicKey] = useState<string | undefined>(undefined);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleTimeClick = (seconds: number) => {
    // Seek to the specific time in the YouTube video
    if (window.location.hostname.includes('youtube.com')) {
      const videoElement = document.querySelector('video');
      if (videoElement) {
        videoElement.currentTime = seconds;
        videoElement.play();
      }
    }
  };

  const handleCollapseChange = (key: string | string[]) => {
    // Ensure only one panel is active at a time by converting array to single value
    if (Array.isArray(key)) {
      // If multiple keys are active, use the last one clicked
      setActiveTopicKey(key.length > 0 ? key[key.length - 1] : undefined);
    } else {
      // If it's a single key or undefined, use it directly
      setActiveTopicKey(key);
    }
  };

  // Get the active topic index
  const getActiveTopicIndex = (): number | null => {
    if (!activeTopicKey) return null;
    return parseInt(activeTopicKey);
  };

  // Filter key points based on active topic
  const filteredKeyPoints = () => {
    const activeIndex = getActiveTopicIndex();
    if (activeIndex === null) {
      return summary.keyPoints;
    }
    
    const activeTopic = summary.topics[activeIndex];
    return summary.keyPoints.filter(point => 
      point.timestamp >= activeTopic.startTime && 
      point.timestamp <= activeTopic.endTime
    );
  };

  // Filter quotes based on active topic
  const filteredQuotes = () => {
    const activeIndex = getActiveTopicIndex();
    if (activeIndex === null) {
      return summary.quotes;
    }
    
    const activeTopic = summary.topics[activeIndex];
    return summary.quotes.filter(quote => 
      quote.timestamp >= activeTopic.startTime && 
      quote.timestamp <= activeTopic.endTime
    );
  };

  // Get the title of the active topic
  const getActiveTopicTitle = (): string => {
    const activeIndex = getActiveTopicIndex();
    return activeIndex !== null ? summary.topics[activeIndex].title : '';
  };

  return (
    <div style={{ 
      padding: '16px', 
      borderRadius: '8px',
      margin: '16px 0',
      border: '1px solid #e0e0e0'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <Title level={4} style={{ margin: 0 }}>Video Summary</Title>
        <Button 
          type="text" 
          icon={expanded ? <UpOutlined /> : <DownOutlined />}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </Button>
      </div>

      <Paragraph ellipsis={{ rows: expanded ? 100 : 3, expandable: false }}>
        {summary.overallSummary}
      </Paragraph>

      {expanded && (
        <>
          <Divider orientation="left">Topics</Divider>
          <Collapse 
            activeKey={activeTopicKey} 
            onChange={handleCollapseChange} 
            bordered={false}
            accordion={true}
          >
            {summary.topics.map((topic, index) => (
              <Panel 
                key={index.toString()} 
                header={
                  <Space>
                    <Text strong>{topic.title}</Text>
                    <Tag color="blue" onClick={(e) => {
                      e.stopPropagation(); // Prevent collapse toggle when clicking the tag
                      handleTimeClick(topic.startTime);
                    }}>
                      <ClockCircleOutlined /> {formatTime(topic.startTime)} - {formatTime(topic.endTime)}
                    </Tag>
                  </Space>
                }
              >
                <Paragraph>{topic.summary}</Paragraph>
              </Panel>
            ))}
          </Collapse>

          <Divider orientation="left">
            {getActiveTopicIndex() !== null 
              ? `Key Points (${getActiveTopicTitle()})` 
              : 'All Key Points'}
          </Divider>
          <List
            size="small"
            dataSource={filteredKeyPoints()}
            renderItem={item => (
              <List.Item>
                <Space>
                  <BulbOutlined />
                  <div>
                    {item.content}
                    <Tooltip title="Jump to this point">
                      <Tag 
                        color="green" 
                        style={{ marginLeft: 8, cursor: 'pointer' }}
                        onClick={() => handleTimeClick(item.timestamp)}
                      >
                        {formatTime(item.timestamp)}
                      </Tag>
                    </Tooltip>
                  </div>
                </Space>
              </List.Item>
            )}
            locale={{ emptyText: 'No key points for this topic' }}
          />

          {filteredQuotes().length > 0 && (
            <>
              <Divider orientation="left">
                {getActiveTopicIndex() !== null 
                  ? `Notable Quotes (${getActiveTopicTitle()})` 
                  : 'All Notable Quotes'}
              </Divider>
              <List
                size="small"
                dataSource={filteredQuotes()}
                renderItem={item => (
                  <List.Item>
                    <Space>
                      <MessageOutlined />
                      <div>
                        <Text italic>"{item.content}"</Text>
                        <Tooltip title="Jump to this point">
                          <Tag 
                            color="purple" 
                            style={{ marginLeft: 8, cursor: 'pointer' }}
                            onClick={() => handleTimeClick(item.timestamp)}
                          >
                            {formatTime(item.timestamp)}
                          </Tag>
                        </Tooltip>
                      </div>
                    </Space>
                  </List.Item>
                )}
                locale={{ emptyText: 'No quotes for this topic' }}
              />
            </>
          )}

          {summary.links.length > 0 && (
            <>
              <Divider orientation="left">Links</Divider>
              <List
                size="small"
                dataSource={summary.links}
                renderItem={item => (
                  <List.Item>
                    <Space>
                      <LinkOutlined />
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        {item.title || item.url}
                      </a>
                    </Space>
                  </List.Item>
                )}
              />
            </>
          )}

          <Divider />
          <Paragraph>
            <Text strong>Final Thoughts: </Text>
            {summary.finalThoughts}
          </Paragraph>
        </>
      )}
    </div>
  );
}; 