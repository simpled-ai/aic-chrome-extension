import React, { useState } from 'react';
import { Modal, Space, Tabs } from 'antd';
import { SendOutlined, RobotOutlined, SearchOutlined } from '@ant-design/icons';
import { Research } from './Research';
import { AutoResearch } from './AutoResearch';

interface ChatGPTModalProps {
  isVisible: boolean;
  onCancel: () => void;
  apiKey: string;
}

export const ChatGPTModal: React.FC<ChatGPTModalProps> = ({ isVisible, onCancel, apiKey }) => {
  const [activeTab, setActiveTab] = useState('auto-research');

  console.log('key', apiKey);
  const tabItems = [
    {
      key: 'auto-research',
      label: (
        <Space>
          <RobotOutlined />
          <span>Auto Research</span>
        </Space>
      ),
      children: <AutoResearch isVisible={isVisible} onCancel={onCancel} apiKey={apiKey} />
    },
    {
      key: 'research',
      label: (
        <Space>
          <SearchOutlined />
          <span>Send Research</span>
        </Space>
      ),
      children: <Research isVisible={isVisible} onCancel={onCancel} apiKey={apiKey} />
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <SendOutlined />
          <span>AI Research Assistant</span>
        </Space>
      }
      open={isVisible}
      onCancel={onCancel}
      width={800}
      footer={null}
      centered
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
      />
    </Modal>
  );
};
