import React, { useState, useEffect } from 'react';
import { List, Button, Checkbox, Space, Tag, Typography, Empty, Progress, Card, Divider, Modal, AutoComplete } from 'antd';
import { SendOutlined, CheckCircleOutlined, ExclamationCircleOutlined, ReloadOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { scanForResearchResults, ResearchItem } from './utils';
import { getAllResearchTopics, sendResearchContent } from '../../services/api';
import TextArea from 'antd/es/input/TextArea';

const { Text, Paragraph, Title } = Typography;

interface ResearchProps {
  isVisible: boolean;
  onCancel: () => void;
  apiKey: string;
}

export const Research: React.FC<ResearchProps> = ({ isVisible, onCancel, apiKey }) => {
  const [researchItems, setResearchItems] = useState<ResearchItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendingProgress, setSendingProgress] = useState(0);
  // Modal detail state
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailItem, setDetailItem] = useState<ResearchItem>();
  const [detailTitle, setDetailTitle] = useState('');

  const [topicTitles, setTopicTitles] = useState<string[]>([]);
  useEffect(() => {
    if (isVisible) {
      getAllResearchTopics(apiKey).then((data: any) => {
        setTopicTitles(data.map((topic: {value: string}) => topic.value));
      });
    }
  }, [isVisible]);

  const topicOptions = topicTitles.map(topicValue => ({
    value: topicValue,
    label: topicValue
  }));

  const scanResearchResults = async () => {
    const scannedItems = await scanForResearchResults(apiKey);
    setResearchItems(scannedItems);
    setSelectedItems([]);
  };

  const handleSendSingle = async (item: ResearchItem) => {
    setIsSending(true);
    setSendingProgress(0);
    setResearchItems(prev => prev.map(research => 
      research.id === item.id ? { ...research, status: 'sending' } : research
    ));

    try {
      const result = await sendResearchContent(item.title, item.content, apiKey);
      if (result.success) {
        setResearchItems(prev => prev.map(research => 
          research.id === item.id ? { ...research, status: 'normal', isMatched: true } : research
        ));
        setSendingProgress(100);
        window.alert('Research sent successfully');
      } else {
        setResearchItems(prev => prev.map(research => 
          research.id === item.id ? { ...research, status: 'error', error: result.error } : research
        ));
        window.alert('Research sent failed');
      }
    } catch (error) {
      setResearchItems(prev => prev.map(research => 
        research.id === item.id ? { ...research, status: 'error', error: `Unknown error: ${error}` } : research
      ));
      window.alert('Research sent failed');
    } finally {
      setIsSending(false);
      setSendingProgress(0);
    }
  };

  const handleSendAll = async () => {
    setIsSending(true);
    setSendingProgress(0);

    const itemsToSend = selectedItems.length > 0 
      ? researchItems.filter(item => selectedItems.includes(item.id))
      : researchItems;
    if (itemsToSend.length === 0) {
      setIsSending(false);
      return;
    }

    for (let i = 0; i < itemsToSend.length; i++) {
      const item = itemsToSend[i];
      setResearchItems(prev => prev.map(research => 
        research.id === item.id ? { ...research, status: 'sending' } : research
      ));

      try {
        const result = await sendResearchContent(item.title, item.content, apiKey);
        if (result.success) {
          setResearchItems(prev => prev.map(research => 
            research.id === item.id ? { ...research, status: 'normal', isMatched: true } : research
          ));
        } else {
          setResearchItems(prev => prev.map(research => 
            research.id === item.id ? { ...research, status: 'error', error: result.error } : research
          ));
        }
      } catch (error) {
        setResearchItems(prev => prev.map(research => 
          research.id === item.id ? { ...research, status: 'error', error: `Unknown error: ${error}` } : research
        ));
      }

      // Update progress
      const progress = Math.round(((i + 1) / itemsToSend.length) * 100);
      setSendingProgress(progress);
    }

    window.alert('Send progress completed.');
    setIsSending(false);
    setSendingProgress(0);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(researchItems.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, itemId]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    }
  };
  
  // Scan for all research results when modal opens
  useEffect(() => {
    if (isVisible) {
      scanResearchResults();
    }
  }, [isVisible]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isVisible) return;
      
      // Ctrl+A or Cmd+A: Select all
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault();
        handleSelectAll(true);
      }
      
      // Ctrl+Enter or Cmd+Enter: Send selected/all
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        if (!isSending) {
          if(window.confirm('Are you sure you want to send all researchs? \nResearch with matched topic will be replaced. \nResearch with unmatched topic will be created.')) {
            handleSendAll();
          }
        }
      }
      
      // F5: Refresh
      if (event.key === 'F5') {
        event.preventDefault();
        scanResearchResults();
      }
      
      // Escape: Close modal
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, isSending, researchItems, selectedItems]);

  // check status
  const unMatchedItems = researchItems.filter(item => !item.isMatched);
  const matchedItems = researchItems.filter(item => item.isMatched);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Header Section */}
      <Card size="small">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Space>
            <Title level={5} style={{ margin: 0 }}>Recent Researches</Title>
            <Tag color="blue" style={{ margin: 0 }}>{researchItems.length} total</Tag>
            {researchItems.length > 0 && (
              <>
                <Tag color="orange" style={{ margin: 0 }}>{matchedItems.length} matched</Tag>
                <Tag color="green" style={{ margin: 0 }}>{unMatchedItems.length} unmatched</Tag>
              </>
            )}
          </Space>
          <Button 
            icon={<ReloadOutlined />}
            onClick={scanResearchResults}
            title="Scan for new research results"
            size="small"
          >
            Refresh
          </Button>
        </div>
      </Card>

      {/* Body Section */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {researchItems.length === 0 ? (
          <Empty 
            description={
              <div>
                <p>No research results found</p>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                  Make sure your research results are properly contained in the page
                </p>
              </div>
            }
          />
        ) : (
          <>
            {/* Selection Controls */}
              <Space style={{ width: '100%', justifyContent: 'space-between', padding: '8px 16px' }}>
                <Space>
                  <Checkbox
                    checked={selectedItems.length === researchItems.length && researchItems.length > 0}
                    indeterminate={selectedItems.length > 0 && selectedItems.length < researchItems.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  >
                    Select all ({researchItems.length})
                  </Checkbox>
                </Space>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Shortcuts: Ctrl+A (select all), Ctrl+Enter (send), F5 (refresh)
                </Text>
              </Space>

            {/* Research Items List */}
            <List
              dataSource={researchItems}
              renderItem={(item) => (
                <List.Item
                  style={{ 
                    backgroundColor: item.isMatched ? '#f6ffed' : 'white',
                    opacity: item.isMatched ? 0.8 : 1,
                    border: '1px solid #f0f0f0',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    padding: '16px'
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                      />
                    }
                    title={
                      <Space>
                        <Text strong style={{ fontSize: '14px', marginRight: '8px' }} title={item.title}>
                          {item.title}
                        </Text>
                        {item.isMatched ? (
                          <Tag color="orange" icon={<CheckCircleOutlined />}>Matched</Tag>
                        ):(
                          <Tag color="green" icon={<CloseCircleOutlined />}>Unmatched</Tag>
                        )}
                        {item.status === 'sending' && (
                          <Tag color="processing" icon={<ExclamationCircleOutlined />}>Sending...</Tag>
                        )}
                        {item.status === 'error' && (
                          <Tag color="error" icon={<ExclamationCircleOutlined />}>Error</Tag>
                        )}
                      </Space>
                    }
                    description={
                      <Paragraph
                        ellipsis={{ rows: 3, expandable: false }}
                        style={{ margin: 0, fontSize: '13px' }}
                        type="secondary"
                      >
                        {item.content}
                      </Paragraph>
                    }
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginLeft: '8px' }}>
                    <Button
                      type="primary"
                      size="small"
                      icon={<SendOutlined />}
                      loading={item.status === 'sending'}
                      onClick={() => {
                        if (window.confirm(`${item.isMatched ? 'This topic is already has a research. \nThis action will replace the existing research. \nAre you sure you want to send it?' : 'This action will create a new topic and research. \nAre you sure you want to send this research?'}`)) {
                            handleSendSingle(item)
                        }
                      }}
                      style={{ minWidth: '70px', marginBottom: 4 }}
                    >
                      Send
                    </Button>
                    <Button
                      size="small"
                      onClick={() => {
                        setDetailItem(item);
                        setDetailTitle(item.title);
                        setDetailModalVisible(true);
                      }}
                      disabled={item.status === 'sending'}
                    >
                      Detail
                    </Button>
                  </div>
                </List.Item>
              )}
            />

            {/* Progress Indicator */}
            {isSending && (
              <Card size="small" style={{ marginTop: 8 }}>
                <div style={{ textAlign: 'center' }}>
                  <Text>Sending research...</Text>
                  <Progress percent={sendingProgress} style={{ marginTop: 8 }} />
                </div>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Footer Section */}
      <Divider style={{ margin: '8px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button onClick={onCancel}>
          Close
        </Button>
        <Space>
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={isSending}
            onClick={() => {
              if (window.confirm('Are you sure you want to send all researchs? \nResearch with matched topic will be replaced. \nResearch with unmatched topic will be created.')) {
                handleSendAll();
              }
            }}
            disabled={researchItems.length === 0}
            size="large"
          >
            Send {selectedItems.length > 0 ? `${selectedItems.length} selected` : `all`}
          </Button>
        </Space>
      </div>

      {/* Detail Modal */}
      {detailModalVisible && (
        <Modal
          title={<span>Research Detail</span>}
          open={detailModalVisible}
          onCancel={() => setDetailModalVisible(false)}
          onOk={() => {
            if (detailTitle.trim()) {
              if (window.confirm('Are you sure you want to save this research?')) {
                setResearchItems(prev => prev.map(item => 
                  item.id === detailItem?.id 
                  ? {
                    ...item, 
                    title: detailTitle,
                    isMatched: topicTitles.includes(detailTitle)
                  }
                  : item
                ));
                setDetailModalVisible(false);
              }
            } else {
              window.alert('Invalid title! Please enter a valid title.');
            }
          }}
          okText="Save"
          cancelText="Close"
          destroyOnClose
          centered
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>Title: </Text>
              <AutoComplete
                placeholder="Choose from existing topics or add new..."
                value={detailTitle}
                onChange={setDetailTitle}
                options={topicOptions}
                autoFocus
                filterOption={(inputValue, option) =>
                  option?.value?.toLowerCase().includes(inputValue.toLowerCase()) || false
                }
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <Text strong>Status: </Text>
              {topicTitles.includes(detailTitle) ? (
                <Tag color="orange">Matched</Tag>
              ) : (
                <Tag color="green">Unmatched</Tag>
              )}
            </div>
            <div>
              <Text strong>Content: </Text>
              <TextArea
                disabled
                value={detailItem?.content}
                rows={10}
                showCount
              />
            </div>
            {detailItem?.status === 'error' && (
              <div>
                <Text strong>Error: </Text>
                <Paragraph style={{ whiteSpace: 'pre-line' }}>{detailItem?.error}</Paragraph>
              </div>
            )}
            <Divider style={{ marginBottom: '0px' }} />
          </Space>
        </Modal>
      )}
    </div>
  );
};
