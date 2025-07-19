import React, { useState, useEffect } from 'react';
import { List, Button, Checkbox, Space, Tag, Typography, Empty, Progress, Card, Divider } from 'antd';
import { SendOutlined, CheckCircleOutlined, ExclamationCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { scanForResearchResults, saveResearchSentStatus } from './utils';
import { sendResearchContent } from '../../services/api';

const { Text, Paragraph, Title } = Typography;

interface ResearchItem {
  id: string;
  element: HTMLElement;
  title: string;
  content: string;
  isSent: boolean;
  isSending: boolean;
  htmlHash: string;
}

interface ResearchProps {
  isVisible: boolean;
  onCancel: () => void;
}

export const Research: React.FC<ResearchProps> = ({ isVisible, onCancel }) => {
  const [researchItems, setResearchItems] = useState<ResearchItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [sendingAll, setSendingAll] = useState(false);
  const [sendingProgress, setSendingProgress] = useState(0);

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
      
      const currentUnsentItems = researchItems.filter(item => !item.isSent);
      
      // Ctrl+A or Cmd+A: Select all
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault();
        handleSelectAll(true);
      }
      
      // Ctrl+Enter or Cmd+Enter: Send selected/all
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        if (!sendingAll && currentUnsentItems.length > 0) {
          handleSendAll();
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
  }, [isVisible, sendingAll, researchItems, selectedItems]);

  const scanResearchResults = () => {
    const scannedItems = scanForResearchResults();
    
    const items: ResearchItem[] = scannedItems.map(item => ({
      ...item,
      isSending: false
    }));

    setResearchItems(items);
    setSelectedItems([]);
  };

  const handleSendSingle = async (item: ResearchItem) => {
    setResearchItems(prev => 
      prev.map(research => 
        research.id === item.id ? { ...research, isSending: true } : research
      )
    );
    try {
      const result = await sendResearchContent(item.title, item.element.innerText || item.element.outerText);
      
      if (result.success) {
        saveResearchSentStatus(item.htmlHash);
        setResearchItems(prev => 
          prev.map(research => 
            research.id === item.id ? { ...research, isSent: true, isSending: false } : research
          )
        );
      } else {
        setResearchItems(prev => 
          prev.map(research => 
            research.id === item.id ? { ...research, isSending: false } : research
          )
        );
      }
    } catch (error) {
      setResearchItems(prev => 
        prev.map(research => 
          research.id === item.id ? { ...research, isSending: false } : research
        )
      );
    }
  };

  const handleSendAll = async () => {
    setSendingAll(true);
    setSendingProgress(0);
    const itemsToSend = selectedItems.length > 0 
      ? researchItems.filter(item => selectedItems.includes(item.id) && !item.isSent)
      : researchItems.filter(item => !item.isSent);

    if (itemsToSend.length === 0) {
      setSendingAll(false);
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const totalItems = itemsToSend.length;

    for (let i = 0; i < itemsToSend.length; i++) {
      const item = itemsToSend[i];
      
      setResearchItems(prev => 
        prev.map(research => 
          research.id === item.id ? { ...research, isSending: true } : research
        )
      );

      try {
        const result = await sendResearchContent(item.title, item.element.textContent || item.element.outerHTML);
        
        if (result.success) {
          successCount++;
          saveResearchSentStatus(item.htmlHash);
          setResearchItems(prev => 
            prev.map(research => 
              research.id === item.id ? { ...research, isSent: true, isSending: false } : research
            )
          );
        } else {
          errorCount++;
          setResearchItems(prev => 
            prev.map(research => 
              research.id === item.id ? { ...research, isSending: false } : research
            )
          );
        }
      } catch (error) {
        errorCount++;
        setResearchItems(prev => 
          prev.map(research => 
            research.id === item.id ? { ...research, isSending: false } : research
          )
        );
      }

      // Update progress
      const progress = Math.round(((i + 1) / totalItems) * 100);
      setSendingProgress(progress);

      // Add small delay to prevent overwhelming the server
      if (i < itemsToSend.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setSendingAll(false);
    setSendingProgress(0);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(researchItems.filter(item => !item.isSent).map(item => item.id));
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

  const unsentItems = researchItems.filter(item => !item.isSent);
  const sentItems = researchItems.filter(item => item.isSent);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Header Section */}
      <Card size="small">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Space>
            <Title level={5} style={{ margin: 0 }}>Research Results</Title>
            <Tag color="blue" style={{ margin: 0 }}>{researchItems.length} total</Tag>
            {researchItems.length > 0 && (
              <>
                <Tag color="green" style={{ margin: 0 }}>{sentItems.length} sent</Tag>
                <Tag color="orange" style={{ margin: 0 }}>{unsentItems.length} pending</Tag>
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
                    checked={selectedItems.length === unsentItems.length && unsentItems.length > 0}
                    indeterminate={selectedItems.length > 0 && selectedItems.length < unsentItems.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  >
                    Select all unsent ({unsentItems.length})
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
                    backgroundColor: item.isSent ? '#f6ffed' : 'white',
                    opacity: item.isSent ? 0.8 : 1,
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
                        disabled={item.isSent}
                      />
                    }
                    title={
                      <Space>
                        <Text strong={!item.isSent} style={{ fontSize: '14px' }}>
                          {item.title}
                        </Text>
                        {item.isSent && (
                          <Tag color="green" icon={<CheckCircleOutlined />}>
                            Sent
                          </Tag>
                        )}
                        {item.isSending && (
                          <Tag color="processing" icon={<ExclamationCircleOutlined />}>
                            Sending...
                          </Tag>
                        )}
                      </Space>
                    }
                    description={
                      <Paragraph
                        ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}
                        style={{ margin: 0, fontSize: '13px' }}
                        type={item.isSent ? "secondary" : undefined}
                      >
                        {item.content}
                      </Paragraph>
                    }
                  />
                  <div>
                    <Button
                      type={item.isSent ? "default" : "primary"}
                      size="small"
                      icon={<SendOutlined />}
                      loading={item.isSending}
                      disabled={item.isSent}
                      onClick={() => handleSendSingle(item)}
                      style={{ 
                        minWidth: '70px',
                        marginLeft: 8
                      }}
                    >
                      {item.isSent ? 'Sent' : 'Send'}
                    </Button>
                  </div>
                </List.Item>
              )}
            />

            {/* Progress Indicator */}
            {sendingAll && (
              <Card size="small" style={{ marginTop: 8 }}>
                <div style={{ textAlign: 'center' }}>
                  <Text>Sending research results...</Text>
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
            loading={sendingAll}
            onClick={handleSendAll}
            disabled={unsentItems.length === 0}
            size="large"
          >
            Send {selectedItems.length > 0 ? `${selectedItems.length} selected` : `${unsentItems.length} unsent`}
          </Button>
        </Space>
      </div>
    </div>
  );
};
