import { createRoot } from 'react-dom/client';
import 'antd/dist/reset.css';

const Popup = () => {
  return (
    <div style={{ padding: '20px', width: '300px' }}>
      <h1>AIC Chrome Extension</h1>
      <p>This extension adds a floating button to X (Twitter), YouTube, Facebook, Trustpilot, Coursera, Udemy, and Klingai.</p>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<Popup />); 