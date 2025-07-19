import React, { useState } from 'react';
import { Modal, Space, Tabs } from 'antd';
import { SendOutlined, RobotOutlined, SearchOutlined } from '@ant-design/icons';
import { Research } from './Research';
import { AutoResearch } from './AutoResearch';

interface ChatGPTModalProps {
  isVisible: boolean;
  onCancel: () => void;
}

export const ChatGPTModal: React.FC<ChatGPTModalProps> = ({ isVisible, onCancel }) => {
  const [activeTab, setActiveTab] = useState('auto-research');

  const tabItems = [
    {
      key: 'auto-research',
      label: (
        <Space>
          <RobotOutlined />
          <span>Auto Research</span>
        </Space>
      ),
      children: <AutoResearch isVisible={isVisible} onCancel={onCancel} />
    },
    {
      key: 'research',
      label: (
        <Space>
          <SearchOutlined />
          <span>Manual Research</span>
        </Space>
      ),
      children: <Research isVisible={isVisible} onCancel={onCancel} />
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
