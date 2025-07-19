import React, { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, Space, Typography, Tag, Progress, Divider, Modal, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, PlayCircleOutlined, StopOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons';
import {
  handleRequest,
} from './utils';
import { OVERLAY } from './constants';

const { TextArea } = Input;
const { Text, Title } = Typography;

interface Topic {
  id: number;
  status: 'pending' | 'researching' | 'completed' | 'error';
  title: string;
  description?: string;
  error?: string;
}

const getStatusColor = (status: Topic['status']) => {
  switch (status) {
    case 'pending': return 'orange';
    case 'researching': return 'processing';
    case 'completed': return 'blue';
    case 'error': return 'red';
    default: return 'default';
  }
};

const getStatusText = (status: Topic['status']) => {
  switch (status) {
    case 'pending': return 'Pending';
    case 'researching': return 'Researching...';
    case 'completed': return 'Completed';
    case 'error': return 'Failed';
    default: return 'Unknown';
  }
};

interface AutoResearchProps {
  isVisible: boolean;
  onCancel: () => void;
}

export const AutoResearch: React.FC<AutoResearchProps> = ({ isVisible, onCancel }) => {
  // Load topics from localStorage or use default
  const loadTopicsFromStorage = (): Topic[] => {
    try {
      const saved = localStorage.getItem('aic-auto-research-topics');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate the structure
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((topic: any) => ({
            id: topic.id,
            status: topic.status,
            title: topic.title,
            description: topic.description,
            error: topic.error
          }));
        }
      }
    } catch (error) {
      console.error('Error loading topics from localStorage:', error);
    }
    
    // Return default topics if no saved data
    return [];
  };

  const [topics, setTopics] = useState<Topic[]>(loadTopicsFromStorage);
  const [isRunning, setIsRunning] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isViewMode, setIsViewMode] = useState<boolean>(false);
  const [currentTopicId, setCurrentTopicId] = useState<number | null>(null);
  // Use ref for running control to avoid closure issues
  const isRunningRef = useRef(false);

  // Save topics to localStorage whenever topics change
  const saveTopicsToStorage = (topicsToSave: Topic[]) => {
    try {
      localStorage.setItem('aic-auto-research-topics', JSON.stringify(topicsToSave));
    } catch (error) {
      console.error('Error saving topics to localStorage:', error);
    }
  };

  // Custom setTopics that also saves to localStorage
  const updateTopics = (updater: (prev: Topic[]) => Topic[]) => {
    setTopics(prev => {
      const newTopics = updater(prev);
      saveTopicsToStorage(newTopics);
      return newTopics;
    });
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isVisible) {
      isRunningRef.current = false;
      setIsRunning(false);
      setCurrentProgress(0);
      setCurrentTopicIndex(0);
    }
  }, [isVisible]);

  const saveTopic = (title: string, description?: string, id?: number) => {
    if (id !== undefined) {
      // Edit existing topic
      updateTopics(prev => prev.map(topic => 
        topic.id === id 
          ? { 
              ...topic, 
              title: title.trim(), 
              description: description?.trim(),
              status: 'pending', // Reset status when editing
              error: undefined 
            }
          : topic
      ));
    } else {
      // Create new topic
      updateTopics(prev => [...prev, {
        id: topics.length,
        status: 'pending',
        title: title.trim(),
        description: description?.trim(),
      }]);
    }
    setIsModalVisible(false);
  };
  
  const removeTopic = (id: number) => {
    updateTopics(prev => prev.filter(topic => topic.id !== id));
  };

  const startAutoResearch = async () => {
    // Check if we're on ChatGPT page
    if (!window.location.hostname.includes('chatgpt.com') && !window.location.hostname.includes('chat.openai.com')) {
      console.error('❌ Please open ChatGPT web interface to use Auto Research feature. Current page:', window.location.hostname);
      return;
    }

    if (topics.length === 0) { return; }

    isRunningRef.current = true;
    setIsRunning(true);
    setCurrentProgress(0);
    setCurrentTopicIndex(0);

    const incompleteTopics = topics.filter(topic => topic.status !== 'completed');

    // Process each topic
    for (let i = 0; i < incompleteTopics.length; i++) {
      if (!isRunningRef.current) { break }
      const topic = incompleteTopics[i];
      setCurrentTopicIndex(i);
      
      // Update status to researching
      updateTopics(prev => prev.map(result => 
        result.id === topic.id ? { ...result, status: 'researching', error: undefined } : result
      ));

      try {
        // Perform actual research
        const researchPrompt = `Hãy nghiên cứu về chủ đề: ${topic.title}. Trong đó, tôi muốn: ${topic.description}. Trả lời theo định dạng nghiên cứu. Nếu có thể, hãy tìm kiếm thêm thông tin từ các nguồn khác nhau để đảm bảo độ chính xác và đầy đủ. Chủ đề này tách biệt với các chủ đề trước nếu có.`;
        const result = await handleRequest(topic.title, researchPrompt, isRunningRef);
        
        if (result.success) {
          // Update status to sent since handleResearchResponse already sent it
          updateTopics(prev => prev.map(r => r.id === topic.id ? { ...r, status: 'completed', error: undefined } : r));
        } else {
          updateTopics(prev => prev.map(r => r.id === topic.id ? { ...r, status: 'error', error: result.error } : r));
        }
      } catch (error) {
        updateTopics(prev => prev.map(r => 
          r.id === topic.id ? { ...r, status: 'error', error: `Research failed: ${error}` } : r
        ));
      }

      // Update progress
      const progress = Math.round(((i + 1) / incompleteTopics.length) * 100);
      setCurrentProgress(progress);
    }

    // Stop running, progress is 100%
    isRunningRef.current = false;
    setIsRunning(false);
  };

  const stopResearch = async () => {
    isRunningRef.current = false;
    setIsRunning(false);

    try {
      document.body.appendChild(OVERLAY);

      // Find stop button
      const stopButton = document.querySelector('button[data-testid="stop-button"]') as HTMLButtonElement;
      if (!stopButton || stopButton.disabled) { return }
      // Click stop button
      stopButton.click();

      // Wait a bit for potential confirmation dialog to appear
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Look for confirmation dialog
      const dialogs = document.querySelectorAll('div[role="dialog"]');
      if (dialogs.length > 0) {
        const confirmDialog = dialogs[dialogs.length - 1] as HTMLElement;
        if (confirmDialog.id && confirmDialog.id.startsWith('radix')) {
          const confirmButton = Array.from(confirmDialog.querySelectorAll('button')).find(
            button => button.textContent === "Dừng lại" || button.textContent === "Stop"
          ) as HTMLButtonElement;
          
          if (confirmButton) {
            confirmButton.click();
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
    } finally {
      // Always remove overlay when done
      try {
        const existingOverlay = document.getElementById('deep-research-overlay');
        if (existingOverlay) {
          existingOverlay.remove();
        }
      } catch (error) {
        console.error('Error removing overlay:', error);
      }
    }
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Header Section */}
        <Card size="small">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <Space>
              <Title level={5} style={{ margin: 0 }}>Auto Research</Title>
              <Tag color="blue" style={{ margin: 0 }}>{topics.length} topics</Tag>
              {topics.length > 0 && (
                <>
                  <Tag color="green" style={{ margin: 0 }}>{topics.filter(r => r.status === 'completed').length} completed</Tag>
                  <Tag color="red" style={{ margin: 0 }}>{topics.filter(r => r.status === 'error').length} failed</Tag>
                </>
              )}
            </Space>
            <Space>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => setIsModalVisible(true)}
                disabled={isRunning}
              >
                New Topic
              </Button>
              {topics.length > 0 && (
                <Button 
                  danger
                  onClick={() => {
                    if (window.confirm('Are you sure you want to clear all topics? This action cannot be undo.')) {
                      updateTopics(() => []);
                    }
                  }}
                  disabled={isRunning}
                >
                  Clear All
                </Button>
              )}
            </Space>
          </div>
        </Card>

        {/* Body Section */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* Topic Section */}
          <Card title="Research Topics" size="small" style={{ marginBottom: 8 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {!topics.length && (
                <Text type="secondary">No topics added yet. Please add a topic to start.</Text>
              )}
              {/* Existing Topics */}
              {topics.map((topic) => (
                <div key={topic.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <Space>
                    <Text strong>{topic.title}</Text>
                  </Space>
                  {topics.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Tooltip title={topic.error || ''}>
                        <Tag color={getStatusColor(topic.status)} style={{ marginRight: 0 }}>
                          {getStatusText(topic.status)}
                        </Tag>
                      </Tooltip>
                      <Tooltip title="View topic">
                        <Button
                          icon={<EyeOutlined />}
                          onClick={() => {
                            setCurrentTopicId(topic.id);
                            setIsViewMode(true);
                            setIsModalVisible(true);
                          }}
                        />
                      </Tooltip>
                      <Tooltip title="Edit topic">
                        <Button
                          icon={<EditOutlined />}
                          onClick={() => {
                            setCurrentTopicId(topic.id);
                            setIsModalVisible(true);
                          }}
                          disabled={isRunning}
                        />
                      </Tooltip>
                      <Tooltip title="Remove topic">
                        <Button
                          icon={<DeleteOutlined />}
                          onClick={() => {
                            if (window.confirm('Are you sure you want to remove this topic? This action cannot be undo.')) {
                              removeTopic(topic.id);
                            }
                          }}
                          disabled={isRunning}
                          danger
                        />
                      </Tooltip>
                    </div>
                  )}
                </div>
              ))}
            </Space>
          </Card>

          {/* Progress Section */}
          {isRunning && (
          <Card size="small" style={{ marginBottom: 8 }}>
              <div style={{ textAlign: 'center' }}>
                  <Text type="secondary">
                      Processing topic {currentTopicIndex + 1} of {topics.length}
                  </Text>
                  <Progress percent={currentProgress} style={{ marginTop: 8 }} />
              </div>
          </Card>
          )}
        </div>

        {/* Footer Section */}
        <Divider style={{ margin: '8px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button onClick={onCancel}>
            Close
          </Button>
          <Space>
            {!isRunning ? (
              <Button 
                type="primary" 
                icon={<PlayCircleOutlined />}
                onClick={() => {
                  if (window.confirm('Are you sure you want to start auto research?')) {
                    startAutoResearch();
                  }
                }}
                size="large"
                disabled={topics.length === 0}
              >
                Start Auto Research
              </Button>
            ) : (
              <Button 
                danger
                icon={<StopOutlined />}
                onClick={() => {
                  if (window.confirm('Are you sure you want to stop auto research?')) {
                    stopResearch();
                  }
                }}
                size="large"
              >
                Stop Research
              </Button>
            )}
          </Space>
        </div>
      </div>
      {isModalVisible && (
        <TopicModal
          isVisible={isModalVisible}
          onCancel={() => {
            setIsModalVisible(false);
            setIsViewMode(false);
            setCurrentTopicId(null);
          }}
          saveTopic={saveTopic}
          currentTopic={topics.find(t => t.id === currentTopicId) || null}
          isViewMode={isViewMode}
        />
      )}
    </>
  );
};

const TopicModal = ({
  isVisible,
  onCancel,
  saveTopic,
  currentTopic,
  isViewMode = false,
}: {
  isVisible: boolean;
  onCancel: () => void;
  saveTopic: (title: string, description?: string, id?: number) => void;
  currentTopic: Topic | null;
  isViewMode: boolean;
}) => {
  const [topic, setTopic] = useState<{title: string, description?: string}>({ 
    title: currentTopic?.title || '',
    description: currentTopic?.description
  });
  const descriptionInputRef = useRef<any>(null);

  const handleTitleChange = (value: string) => {
    setTopic(prev => ({ ...prev, title: value }));
  };

  const handleDescriptionChange = (value: string) => {
    setTopic(prev => ({ ...prev, description: value }));
  };

  const handleTitleEnter = (e: React.KeyboardEvent) => {
    e.preventDefault();
    if (descriptionInputRef.current) {
      descriptionInputRef.current.focus();
    }
  };

  return (
    <Modal
      title={
        <Space>
          <span>{currentTopic ? (isViewMode ? 'View Topic' : 'Edit Topic') : 'New Topic'}</span>
        </Space>
      }
      footer={[
        <Button 
          key="cancel"
          onClick={onCancel}
        >
          Cancel
        </Button>,
        <Button
          key="save"
          type="primary"
          onClick={() => saveTopic(topic.title, topic.description, currentTopic?.id)}
          disabled={!topic.title.trim() || isViewMode}
        >
          {currentTopic ? 'Update' : 'Save'}
        </Button>,
      ]}
      open={isVisible}
      onCancel={onCancel}
      keyboard={true}
      maskClosable={true}
      destroyOnClose={true}
      centered={true}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
          <Input
            placeholder="Add topic title..."
            value={topic.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            onPressEnter={handleTitleEnter}
            disabled={isViewMode}
            autoFocus
          />
          <TextArea
            ref={descriptionInputRef}
            placeholder="Add topic description..."
            value={topic.description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            disabled={isViewMode}
            rows={3}
            maxLength={500}
            showCount
          />
        <Divider style={{ marginBottom: '0px' }}/>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          Add topics you want to research automatically. Each topic will be processed by AI and results will be sent automatically.
        </Text>
      </Space>
    </Modal>
  );
};
