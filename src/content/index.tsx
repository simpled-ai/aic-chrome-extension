import { createRoot } from 'react-dom/client';
import { ConfigProvider, theme } from 'antd';
import 'antd/dist/reset.css';
import { FloatingAnalyzeButton } from '../components/FloatingAnalyzeButton';

console.log('Content script loaded');

// Create container for the floating button
const container = document.createElement('div');
container.id = 'aic-extension-root';
document.body.appendChild(container);

console.log('Container created:', container);

// Render the floating button
const root = createRoot(container);
root.render(
  <ConfigProvider
    theme={{
      algorithm: theme.defaultAlgorithm,
    }}
  >
    <FloatingAnalyzeButton />
  </ConfigProvider>
);

console.log('Button rendered'); 