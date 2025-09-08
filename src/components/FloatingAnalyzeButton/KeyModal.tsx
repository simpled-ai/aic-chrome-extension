import React, { useState } from 'react';
import { Modal, Input, Button, Typography, Divider } from 'antd';
import { ChatGPTModal } from './ChatGPTModal';

const { Text } = Typography;

interface KeyModalProps {
    isVisible: boolean;
    onCancel: () => void;
}

export const KeyModal: React.FC<KeyModalProps> = ({ isVisible, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState('');

  const validateKey = async (inputKey: string) => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const valid = await validateKey(inputKey.trim());
    if (valid) {
      setApiKey(inputKey.trim());
    } else {
      window.alert('Invalid key!');
    }
  };

  if (apiKey) {
    return <ChatGPTModal isVisible={isVisible} onCancel={onCancel} apiKey={apiKey} />
  }

  return (
    <Modal 
        open={isVisible}
        title="Enter your API key"
        footer={[
            <Button 
                key="cancel"
                onClick={onCancel}
            >
                Cancel
            </Button>,
            <Button
                key="submit"
                type="primary"
                onClick={() => {
                    if (!inputKey.trim()) {
                    window.alert('Please enter your API key');
                    } else {
                    handleSubmit();
                    }
                }}
                loading={loading}
                disabled={!inputKey.trim()}
            >
                Submit
            </Button>,
        ]}
        onCancel={onCancel}
        centered
    >
        <Input.Password
            placeholder="Enter your API key"
            value={inputKey}
            onChange={e => setInputKey(e.target.value)}
            onPressEnter={handleSubmit}
            disabled={loading}
        />
        <Text>
            This is your API key.
        </Text>
        <Divider style={{ marginBottom: '0px'}}/>
    </Modal>
  );
};