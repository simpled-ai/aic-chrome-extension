import React, { useState, useEffect, useRef } from 'react';
import { YouTubeVideoInfo } from './types';
import { SummarizeButton } from './SummarizeButton';
import { getVideoSummary, VideoSummary } from '../../services/api';
import { SummaryDisplay } from './SummaryDisplay';

export const YouTubeSummarizer: React.FC = () => {
  const [videoInfo, setVideoInfo] = useState<YouTubeVideoInfo | null>(null);
  const [summary, setSummary] = useState<VideoSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showButton, setShowButton] = useState(false);
  const lastCheckedVideoId = useRef<string | null>(null);

  // Extract video information from the page
  useEffect(() => {
    const extractVideoInfo = () => {
      // Only run on YouTube video pages
      if (!window.location.hostname.includes('youtube.com') || 
          !window.location.pathname.startsWith('/watch')) {
        return;
      }

      // Extract video ID from URL
      const urlParams = new URLSearchParams(window.location.search);
      const videoId = urlParams.get('v');
      
      if (!videoId) return;

      // Only check for existing summary if the video ID has changed
      if (videoId !== lastCheckedVideoId.current) {
        lastCheckedVideoId.current = videoId;

        // Set video info with just the ID
        setVideoInfo({ videoId });

        // Check if summary already exists
        checkExistingSummary(videoId);
      }
    };

    const checkExistingSummary = async (videoId: string) => {
      setIsLoading(true);
      try {
        const summaryData = await getVideoSummary(videoId);
        setSummary(summaryData);
        setShowButton(false);
        // Ensure we render the summary immediately
        setTimeout(() => insertSummaryIntoPage(summaryData), 100);
      } catch (error) {
        console.log('No existing summary found, showing button');
        setShowButton(true);
        // Clear any existing summary
        setSummary(null);
        removeSummaryFromPage();
      } finally {
        setIsLoading(false);
      }
    };

    // Initial extraction
    extractVideoInfo();

    // Set up observer for YouTube's SPA navigation
    const observer = new MutationObserver(() => {
      // Check if URL has changed
      const urlParams = new URLSearchParams(window.location.search);
      const currentVideoId = urlParams.get('v');
      
      if (currentVideoId && currentVideoId !== lastCheckedVideoId.current) {
        extractVideoInfo();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleSummaryCreated = async () => {
    if (!videoInfo) return;
    
    try {
      const summaryData = await getVideoSummary(videoInfo.videoId);
      setSummary(summaryData);
      setShowButton(false);
      insertSummaryIntoPage(summaryData);
    } catch (error) {
      console.error('Error fetching created summary:', error);
    }
  };

  // Function to insert summary into the page
  const insertSummaryIntoPage = (summaryData: VideoSummary) => {
    // Find the element to insert after (below the video title)
    const targetElement = document.querySelector('#above-the-fold');
    if (!targetElement) return;

    // Create container for summary
    let summaryContainer = document.getElementById('aic-youtube-summary');
    if (!summaryContainer) {
      summaryContainer = document.createElement('div');
      summaryContainer.id = 'aic-youtube-summary';
      targetElement.after(summaryContainer);
    }

    // Render summary component into container
    const root = document.createElement('div');
    summaryContainer.innerHTML = '';
    summaryContainer.appendChild(root);
    
    // We'll use a custom event to communicate with the content script
    const event = new CustomEvent('renderYouTubeSummary', { 
      detail: { 
        summary: summaryData,
        rootElement: root
      } 
    });
    document.dispatchEvent(event);
  };

  // Function to remove summary from the page
  const removeSummaryFromPage = () => {
    const summaryContainer = document.getElementById('aic-youtube-summary');
    if (summaryContainer) {
      summaryContainer.innerHTML = '';
    }
  };

  // Insert summary display into the page when summary changes
  useEffect(() => {
    if (summary) {
      insertSummaryIntoPage(summary);
    } else {
      removeSummaryFromPage();
    }
  }, [summary]);

  // Only show on YouTube video pages and when we have video info
  if (!videoInfo || !window.location.hostname.includes('youtube.com') || 
      !window.location.pathname.startsWith('/watch') || 
      isLoading) {
    return null;
  }

  return (
    <>
      {showButton && (
				<SummarizeButton 
					videoInfo={videoInfo} 
					onSummaryCreated={handleSummaryCreated} 
				/>
      )}
    </>
  );
}; 
export { SummaryDisplay };