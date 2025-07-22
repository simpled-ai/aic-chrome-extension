import React, { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, Space, Typography, Tag, Progress, Divider, Modal, Tooltip, AutoComplete } from 'antd';
import { PlusOutlined, DeleteOutlined, PlayCircleOutlined, StopOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons';
import {
  handleRequest,
  Topic,
  loadTopicsFromStorage,
  saveTopicsToStorage,
} from './utils';
import { OVERLAY } from './constants';
import { getAllResearchTopics } from '../../services/api';

const { TextArea } = Input;
const { Text, Title } = Typography;

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

const researchPrompt = (topic: {title: string, description?: string}) => `Bạn là một chuyên gia nội dung xây dựng video cho TikTok và Youtube Shorts.
Hãy nghiên cứu sâu và hệ thống lại dấu hiệu, triệu chứng, các bằng chứng khoa học, số liệu, khảo sát thực tế và insight từ các nguồn đáng tin cậy – với mục tiêu viết một kịch bản video chuyên gia chia sẻ kiến thức y khoa/nghiên cứu/cảnh báo sức khỏe có khả năng viral, có tính nhân văn và chốt CTA về ${topic.title}.
Yêu cầu:
${topic.description}.
Trả lời theo định dạng nghiên cứu.
Chủ đề này tách biệt với các chủ đề trước nếu có.`;

interface AutoResearchProps {
  isVisible: boolean;
  onCancel: () => void;
  apiKey: string;
}

export const AutoResearch: React.FC<AutoResearchProps> = ({ isVisible, onCancel, apiKey }) => {
  const [topics, setTopics] = useState<Topic[]>(loadTopicsFromStorage);
  const [isRunning, setIsRunning] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isViewMode, setIsViewMode] = useState<boolean>(false);
  const [currentTopicId, setCurrentTopicId] = useState<number | null>(null);
  // Use ref for running control to avoid closure issues
  const isRunningRef = useRef(false);

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

  const saveTopic = (prompt: string, title: string, description?: string, id?: number) => {
    if (id !== undefined) {
      // Edit existing topic
      updateTopics(prev => prev.map(topic => 
        topic.id === id 
          ? { 
              ...topic, 
              prompt: prompt.trim(),
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
        prompt: prompt.trim(),
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
        const result = await handleRequest(topic.title, topic.prompt, isRunningRef);
        
        if (result.success) {
          // Update status to sent since handleResearchResponse already sent it
          updateTopics(prev => prev.map(r => r.id === topic.id ? { ...r, status: 'completed', error: undefined } : r));
          if (typeof result.hash === 'string') {
            updateTopics(prev => prev.map(r => r.id === topic.id ? { ...r, hashs: [...(r.hashs || []), result.hash as string] } : r));
          }
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
          isViewMode={isViewMode}
          onCancel={() => {
            setIsModalVisible(false);
            setIsViewMode(false);
            setCurrentTopicId(null);
          }}
          onSave={saveTopic}
          existingTopics={topics}
          currentTopicId={currentTopicId}
          apiKey={apiKey}
        />
      )}
    </>
  );
};

const TopicModal = ({
  isVisible = false,
  isViewMode = false,
  onCancel,
  onSave,
  existingTopics,
  currentTopicId,
  apiKey,
}: {
  isVisible: boolean;
  isViewMode: boolean;
  onCancel: () => void;
  onSave: (prompt: string, title: string, description?: string, id?: number) => void;
  existingTopics: Topic[];
  currentTopicId: number | null;
  apiKey: string;
}) => {
  const currentTopic = existingTopics.find(t => t.id === currentTopicId) || null;
  const [topics, setTopics] = useState<string[]>([]);
  useEffect(() => {
    if (isVisible) {
      getAllResearchTopics(apiKey).then((data: any) => {
        setTopics(data.map((topic: {value: string}) => topic.value));
      });
    }
  }, [isVisible]);

  const initialDescription = `- Dành cho nhóm người nữ trên 40 tuổi
- Tất cả thông tin y khoa phải có dẫn nguồn uy tín (như WHO, PubMed, Cleveland Clinic...)`;

  const [topic, setTopic] = useState<{prompt: string, title: string, description?: string}>({ 
    prompt: currentTopic 
            ? currentTopic.prompt || researchPrompt({title: currentTopic.title, description: currentTopic.description}) 
            : '',
    title: currentTopic?.title || '',
    description: currentTopic?.description || initialDescription
  });
  const descriptionInputRef = useRef<any>(null);

  const [tempPrompt, setTempPrompt] = useState<string>(
    currentTopic 
    ? currentTopic.prompt || researchPrompt({title: currentTopic.title, description: currentTopic.description}) 
    : '',
  );
  const [isEditingPrompt, setIsEditingPrompt] = useState<boolean>(false);

  const handleTitleChange = (value: string) => {
    setTopic(prev => ({ ...prev, title: value, prompt: researchPrompt({title: value, description: prev.description}) }));
    setTempPrompt(researchPrompt({title: value, description: topic.description}));
  };

  const handleDescriptionChange = (value: string) => {
    setTopic(prev => ({ ...prev, description: value || undefined, prompt: researchPrompt({title: prev.title, description: value || undefined}) }));
    setTempPrompt(researchPrompt({title: topic.title, description: value || undefined}));
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (descriptionInputRef.current) {
        descriptionInputRef.current.focus();
      }
    }
  };

  // Prepare options for AutoComplete
  const topicOptions = topics.map(topicValue => ({
    value: topicValue,
    label: topicValue
  }));

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
          onClick={() => {
            if (!currentTopic && existingTopics.find(t => t.title === topic.title)) {
              window.alert('Topic already exists');
            } else {
              onSave(topic.prompt, topic.title, topic.description, currentTopic?.id);
            }
          }}
          disabled={!topic.title.trim() || !topic.prompt.trim() || isViewMode}
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
        <AutoComplete
          placeholder="Choose from existing topics or add new..."
          value={topic.title}
          onChange={handleTitleChange}
          onKeyDown={handleTitleKeyDown}
          disabled={isViewMode}
          options={topicOptions}
          filterOption={(inputValue, option) =>
            option?.value?.toLowerCase().includes(inputValue.toLowerCase()) || false
          }
          style={{ width: '100%' }}
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
        {/* Prompt */}
        {topic.title.trim() && (<>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <Text type="secondary">
              This prompt will be used to research the topic. 
            </Text>
            <Button
              size="small"
              onClick={() => {
                setTopic(prev => ({ ...prev, prompt: tempPrompt }));
                setIsEditingPrompt(!isEditingPrompt);
              }}
              disabled={!tempPrompt.trim() || isViewMode}
            >
              {isEditingPrompt ? 'Save' : 'Edit'}
            </Button>
          </div>
          <TextArea
            placeholder="Add prompt..."
            value={tempPrompt}
            onChange={(e) => setTempPrompt(e.target.value)}
            disabled={isViewMode || !isEditingPrompt}
            rows={5}
          />
          <Divider style={{ margin: '0px' }}/>
        </>)}
        <Text type="secondary" style={{ fontSize: '12px' }}>
          Add topics you want to research automatically. Each topic will be processed by ChatGPT.
        </Text>
      </Space>
    </Modal>
  );
};
