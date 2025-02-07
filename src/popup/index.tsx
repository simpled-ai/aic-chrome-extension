import { createRoot } from 'react-dom/client';

const Popup = () => {
  return (
    <div style={{ padding: '20px', width: '300px' }}>
      <h1>AIC Chrome Extension</h1>
      <p>This extension adds a floating button to X (Twitter) and YouTube.</p>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<Popup />); 