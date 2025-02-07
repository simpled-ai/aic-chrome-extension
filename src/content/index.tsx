import { createRoot } from 'react-dom/client';
import { FloatButton } from 'antd';
import { CustomerServiceOutlined } from '@ant-design/icons';
import 'antd/dist/reset.css';

const FloatingButton = () => {
  const handleClick = () => {
    console.log('Button clicked!');
    // Add your button click logic here
  };

  return (
    <FloatButton
      icon={<CustomerServiceOutlined />}
      type="primary"
      onClick={handleClick}
      style={{
        right: 24,
        bottom: 24,
      }}
    />
  );
};

// Create container for the floating button
const container = document.createElement('div');
container.id = 'aic-extension-root';
document.body.appendChild(container);

// Render the floating button
const root = createRoot(container);
root.render(<FloatingButton />); 