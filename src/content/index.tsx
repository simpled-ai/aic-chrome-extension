import { createRoot } from 'react-dom/client';
import { ConfigProvider, theme } from 'antd';
import 'antd/dist/reset.css';
import { FloatingAnalyzeButton, SummaryDisplay } from '../components';

// Declare the global window property for TypeScript
declare global {
  interface Window {
    udemyCourseId?: string;
  }
}

console.log('Content script loaded');

// Create container for the floating button
const container = document.createElement('div');
container.id = 'aic-extension-root';
document.body.appendChild(container);

console.log('Container created:', container);

// For Udemy courses, extract the course ID from the DOM and store it in a global variable
if (window.location.href.includes('udemy.com/course/')) {
  // Create a custom event to communicate with the FloatingAnalyzeButton component
  const setupUdemyCourseIdExtraction = () => {
    // Try to get the course ID from the data attribute
    const courseId = document.body.getAttribute('data-clp-course-id');
    
    if (courseId) {
      console.log('Found Udemy course ID:', courseId);
      
      // Store the ID in a global variable that can be accessed by the FloatingAnalyzeButton
      window.udemyCourseId = courseId;
      
      // Dispatch a custom event to notify the FloatingAnalyzeButton
      const event = new CustomEvent('udemyCourseIdExtracted', { detail: { courseId } });
      document.dispatchEvent(event);
    } else {
      // If the ID is not found immediately, try again after a short delay
      // This handles cases where the page might not be fully loaded yet
      setTimeout(setupUdemyCourseIdExtraction, 1000);
    }
  };
  
  // Start the extraction process
  setupUdemyCourseIdExtraction();
  
  // Also set up a MutationObserver to detect if the body attribute changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'data-clp-course-id') {
        const courseId = document.body.getAttribute('data-clp-course-id');
        if (courseId) {
          console.log('Udemy course ID changed:', courseId);
          window.udemyCourseId = courseId;
          const event = new CustomEvent('udemyCourseIdExtracted', { detail: { courseId } });
          document.dispatchEvent(event);
        }
      }
    });
  });
  
  observer.observe(document.body, { attributes: true });
}

// Listen for YouTube summary render events
document.addEventListener('renderYouTubeSummary', ((event: CustomEvent) => {
  const { summary, rootElement } = event.detail;
  
  if (summary && rootElement) {
    const summaryRoot = createRoot(rootElement);
    summaryRoot.render(
      <ConfigProvider
        theme={{
          algorithm: theme.defaultAlgorithm,
        }}
      >
        <SummaryDisplay summary={summary} />
      </ConfigProvider>
    );
  }
}) as EventListener);

// Render the floating button
const root = createRoot(container);
root.render(
  <ConfigProvider
    theme={{
      algorithm: theme.defaultAlgorithm,
    }}
  >
    <>
      <FloatingAnalyzeButton />
    </>
  </ConfigProvider>
);

console.log('Button rendered'); 