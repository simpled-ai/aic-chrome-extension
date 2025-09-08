import React, { useState, useEffect } from 'react';
import { FloatButton, Modal, Input, Button, Space, Typography, message, Tabs, Select } from 'antd';
import { SaveOutlined, SearchOutlined } from '@ant-design/icons';
import { ConversationSearch } from './ConversationSearch';

const { Text } = Typography;

export const ChatGPTSaveButton: React.FC = () => {
  const [isMainModalVisible, setIsMainModalVisible] = useState(false);
  const [isKeyModalVisible, setIsKeyModalVisible] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');
  const [painTopicOptions, setPainTopicOptions] = useState<Array<{value: string, label: string, pain: string, topic: string}>>([]);
  const [conversationContent, setConversationContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isLoadingFacets, setIsLoadingFacets] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState('');
  const [activeTab, setActiveTab] = useState('save');

  const extractLatestConversation = (): string => {
    try {
      // Find all assistant messages in the current conversation
      const assistantMessages = document.querySelectorAll('[data-message-author-role="assistant"]');
      const userMessages = document.querySelectorAll('[data-message-author-role="user"]');
      
      if (assistantMessages.length === 0) {
        return '';
      }

      let conversationText = '';
      
      // Get only the latest assistant response
      if (assistantMessages.length > 0) {
        const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
        const assistantText = lastAssistantMessage.textContent || (lastAssistantMessage as HTMLElement).innerText || '';
        conversationText = assistantText;
      }

      return conversationText.trim();
    } catch (error) {
      console.error('Error extracting conversation:', error);
      return '';
    }
  };

  const refreshConversationContent = () => {
    const conversation = extractLatestConversation();
    setConversationContent(conversation);
  };

  // Populate conversation content when save tab is active or modal opens
  useEffect(() => {
    if (isMainModalVisible && activeTab === 'save') {
      refreshConversationContent();
    }
  }, [isMainModalVisible, activeTab]);

  // Fetch pain facets and their associated topics
  useEffect(() => {
    const fetchPainTopicCombinations = async () => {
      if (!apiKey) return;
      
      setIsLoadingFacets(true);
      try {
        // First, fetch all pain facets
        const painResponse = await new Promise<{ success: boolean; data?: any; error?: string }>((resolve) => {
          chrome.runtime.sendMessage(
            {
              type: 'GET_METADATA_FACETS',
              payload: {
                collection_name: 'ai_tools_materials',
                metadata_key: 'pain'
              },
              apiKey
            },
            (response) => {
              resolve(response);
            }
          );
        });
        
        if (!painResponse.success || !painResponse.data) {
          console.error('Failed to fetch pain facets:', painResponse.error);
          message.error('Failed to load pain points');
          return;
        }

        const pains = painResponse.data.facet_values || [];
        const options: Array<{value: string, label: string, pain: string, topic: string}> = [];

        // For each pain, fetch topics that contain this pain
        for (const pain of pains) {
          const topicResponse = await new Promise<{ success: boolean; data?: any; error?: string }>((resolve) => {
            chrome.runtime.sendMessage(
              {
                type: 'GET_METADATA_FACETS',
                payload: {
                  collection_name: 'ai_tools_materials',
                  metadata_key: 'topic',
                  filter: {
                    "must": [{
                      "key": "metadata.pain",
                      "match": {
                        "value": pain
                      }
                    }]
                  }
                },
                apiKey
              },
              (response) => {
                resolve(response);
              }
            );
          });

          if (topicResponse.success && topicResponse.data) {
            const topics = topicResponse.data.facet_values || [];
            // Create an option for each pain-topic combination
            topics.forEach((topic: string) => {
              options.push({
                value: `${pain}|||${topic}`, // Use ||| as separator
                label: `${pain} - ${topic}`,
                pain: pain,
                topic: topic
              });
            });
          }
        }

        setPainTopicOptions(options);
      } catch (error) {
        console.error('Error fetching pain-topic combinations:', error);
        message.error('Failed to load pain-topic combinations');
      } finally {
        setIsLoadingFacets(false);
      }
    };

    fetchPainTopicCombinations();
  }, [apiKey]);

  const validateKey = async (inputKey: string) => {
    setIsValidating(true);
    try {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'GET_ALL_RESEARCH_TOPICS', apiKey: inputKey },
          (response) => {
            if (response.error) {
              resolve(false);
            } else {
              resolve(true);
            }
          }
        );
      });
    } catch {
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleKeySubmit = async () => {
    const valid = await validateKey(inputKey.trim());
    if (valid) {
      setApiKey(inputKey.trim());
      setIsKeyModalVisible(false);
      setIsMainModalVisible(true);
    } else {
      message.error('Invalid API key!');
    }
  };

  const handleSave = async () => {
    if (!selectedOption.trim()) {
      message.error('Please select a guidebook topic');
      return;
    }

    // Extract pain and topic from selected option
    const [pain, topic] = selectedOption.split('|||');
    if (!pain || !topic) {
      message.error('Invalid selection format');
      return;
    }

    if (!conversationContent.trim()) {
      message.error('No conversation content to save');
      return;
    }

    setIsSaving(true);

    try {
      // Send message to background script to save the conversation
      const response = await new Promise<{ success: boolean; error?: string }>((resolve) => {
        chrome.runtime.sendMessage(
          {
            type: 'SAVE_CHATGPT_CONVERSATION',
            payload: {
              content: conversationContent.trim(),
              collection_name: 'ai_tools_materials',
              metadata: {
                topic: topic.trim(),
                pain: pain.trim(),
                author: 'user',
                source: 'chatgpt_conversation',
                category: 'ai_tools',
                created_at: new Date().toISOString(),
                conversation_type: 'chatgpt'
              }
            },
            apiKey: apiKey!
          },
          (response) => {
            resolve(response);
          }
        );
      });

      if (response.success) {
        message.success('Conversation saved successfully!');
        setSelectedOption('');
        setConversationContent('');
      } else {
        message.error(response.error || 'Failed to save conversation');
      }
    } catch (error) {
      console.error('Error saving conversation:', error);
      message.error('Failed to save conversation. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMainModalCancel = () => {
    setIsMainModalVisible(false);
    setSelectedOption('');
    setConversationContent('');
    setActiveTab('save');
  };

  const handleKeyModalCancel = () => {
    setIsKeyModalVisible(false);
    setInputKey('');
  };

  const handleButtonClick = () => {
    if (apiKey) {
      setIsMainModalVisible(true);
    } else {
      setIsKeyModalVisible(true);
    }
  };

  const tabItems = [
    {
      key: 'save',
      label: (
        <Space>
          <SaveOutlined />
          <span>Save Conversation</span>
        </Space>
      ),
      children: (
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>Guidebook Topic</Text>
            <Select
              placeholder="Select a guidebook topic"
              style={{ width: '100%' }}
              value={selectedOption}
              onChange={setSelectedOption}
              allowClear
              loading={isLoadingFacets}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={painTopicOptions}
              autoFocus={activeTab === 'save'}
            />
            {painTopicOptions.length > 0 && (
              <Text type="secondary" style={{ fontSize: '0.75rem' }}>
                ({painTopicOptions.length} pain-topic combinations available)
              </Text>
            )}
          </div>
          
          <div>
            <Text strong>Preview</Text>
            <Input.TextArea
              value={conversationContent}
              onChange={(e) => setConversationContent(e.target.value)}
              placeholder="Conversation content will appear here. You can edit it before saving."
              rows={8}
              style={{
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                lineHeight: '1.2'
              }}
            />
          </div>

          <Text type="secondary" style={{ fontSize: '0.75rem' }}>
            This will save the latest conversation to the ai_tools_materials collection. 
            The conversation will be automatically chunked and indexed for future reference.
          </Text>
          
          <div style={{ textAlign: 'right', marginTop: '1rem' }}>
            <Button
              type="primary"
              onClick={handleSave}
              loading={isSaving}
              disabled={!selectedOption.trim()}
              icon={<SaveOutlined />}
            >
              Save Conversation
            </Button>
          </div>
        </Space>
      )
    },
    {
      key: 'search',
      label: (
        <Space>
          <SearchOutlined />
          <span>Search Conversations</span>
        </Space>
      ),
      children: (
        <ConversationSearch 
          apiKey={apiKey!} 
          onClose={() => setIsMainModalVisible(false)}
        />
      )
    }
  ];

  return (
    <>
      <FloatButton
        icon={<SaveOutlined />}
        onClick={handleButtonClick}
        tooltip="Manage conversations"
      />

      {/* API Key Modal */}
      <Modal 
        open={isKeyModalVisible}
        title="Enter your API key"
        footer={[
          <Button key="cancel" onClick={handleKeyModalCancel}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={() => {
              if (!inputKey.trim()) {
                message.error('Please enter your API key');
              } else {
                handleKeySubmit();
              }
            }}
            loading={isValidating}
            disabled={!inputKey.trim()}
          >
            Submit
          </Button>,
        ]}
        onCancel={handleKeyModalCancel}
        centered
        destroyOnClose
      >
        <Input.Password
          placeholder="Enter your API key"
          value={inputKey}
          onChange={(e) => setInputKey(e.target.value)}
          onPressEnter={handleKeySubmit}
          disabled={isValidating}
        />
        <Text>
          This is your API key.
        </Text>
      </Modal>

      {/* Main Modal with Tabs */}
      <Modal
        title="ChatGPT Conversation Manager"
        open={isMainModalVisible}
        onCancel={handleMainModalCancel}
        footer={null}
width="75rem"
        destroyOnClose
        centered
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
        />
      </Modal>
    </>
  );
 };
