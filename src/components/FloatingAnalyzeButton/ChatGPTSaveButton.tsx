import React, { useState } from 'react';
import { FloatButton, Modal, Input, Button, Space, Typography, message } from 'antd';
import { SaveOutlined } from '@ant-design/icons';

const { Text } = Typography;

export const ChatGPTSaveButton: React.FC = () => {
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [isKeyModalVisible, setIsKeyModalVisible] = useState(false);
  const [label, setLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState('');

  const extractLatestConversation = (): string => {
    try {
      // Find all assistant messages in the current conversation
      const assistantMessages = document.querySelectorAll('[data-message-author-role="assistant"]');
      const userMessages = document.querySelectorAll('[data-message-author-role="user"]');
      
      if (assistantMessages.length === 0) {
        return '';
      }

      let conversationText = '';
      
      // Get the latest conversation (last user message + last assistant response)
      if (userMessages.length > 0 && assistantMessages.length > 0) {
        const lastUserMessage = userMessages[userMessages.length - 1];
        const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
        
        const userText = lastUserMessage.textContent || (lastUserMessage as HTMLElement).innerText || '';
        const assistantText = lastAssistantMessage.textContent || (lastAssistantMessage as HTMLElement).innerText || '';
        
        conversationText = `User: ${userText}\n\nAssistant: ${assistantText}`;
      } else if (assistantMessages.length > 0) {
        // If only assistant message exists
        const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
        const assistantText = lastAssistantMessage.textContent || (lastAssistantMessage as HTMLElement).innerText || '';
        conversationText = `Assistant: ${assistantText}`;
      }

      return conversationText.trim();
    } catch (error) {
      console.error('Error extracting conversation:', error);
      return '';
    }
  };

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
      setIsSaveModalVisible(true);
    } else {
      message.error('Invalid API key!');
    }
  };

  const handleSave = async () => {
    if (!label.trim()) {
      message.error('Please enter a label for the conversation');
      return;
    }

    const conversation = extractLatestConversation();
    if (!conversation) {
      message.error('No conversation found to save');
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
              content: conversation,
              collection_name: 'ai_tools_materials',
              metadata: {
                topic: label.trim(),
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
        setIsSaveModalVisible(false);
        setLabel('');
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

  const handleSaveModalCancel = () => {
    setIsSaveModalVisible(false);
    setLabel('');
  };

  const handleKeyModalCancel = () => {
    setIsKeyModalVisible(false);
    setInputKey('');
  };

  const handleButtonClick = () => {
    if (apiKey) {
      setIsSaveModalVisible(true);
    } else {
      setIsKeyModalVisible(true);
    }
  };

  return (
    <>
      <FloatButton
        icon={<SaveOutlined />}
        onClick={handleButtonClick}
        tooltip="Save conversation to collection"
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

      {/* Save Conversation Modal */}
      <Modal
        title={
          <Space>
            <SaveOutlined />
            <span>Save ChatGPT Conversation</span>
          </Space>
        }
        open={isSaveModalVisible}
        onCancel={handleSaveModalCancel}
        footer={[
          <Button key="cancel" onClick={handleSaveModalCancel}>
            Cancel
          </Button>,
          <Button
            key="save"
            type="primary"
            onClick={handleSave}
            loading={isSaving}
            disabled={!label.trim()}
          >
            Save Conversation
          </Button>,
        ]}
        destroyOnClose
        centered
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>Conversation Label</Text>
            <Input
              placeholder="Enter a label for this conversation (e.g., 'Python Code Review', 'Marketing Strategy Discussion')"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onPressEnter={handleSave}
              autoFocus
            />
          </div>
          
          <div>
            <Text strong>Preview</Text>
            <div style={{ 
              maxHeight: '200px', 
              overflow: 'auto', 
              border: '1px solid #d9d9d9', 
              borderRadius: '6px', 
              padding: '8px',
              backgroundColor: '#fafafa',
              fontSize: '12px'
            }}>
              {(() => {
                const conversation = extractLatestConversation();
                return conversation || 'No conversation found';
              })()}
            </div>
          </div>

          <Text type="secondary" style={{ fontSize: '12px' }}>
            This will save the latest conversation to the ai_tools_materials collection. 
            The conversation will be automatically chunked and indexed for future reference.
          </Text>
        </Space>
      </Modal>
    </>
  );
};
