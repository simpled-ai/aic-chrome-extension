import React, { useState, useEffect } from 'react';
import {
  Card,
  Input,
  Button,
  Space,
  Typography,
  List,
  Tag,
  Spin,
  Empty,
  Divider,
  message,
  Modal,
  Select
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  CalendarOutlined,
  UserOutlined,
  TagOutlined,
  CopyOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title, Paragraph } = Typography;
const { Search } = Input;

interface SearchResult {
  chunk_id: string;
  text: string;
  metadata: {
    topic?: string;
    pain?: string;
    author?: string;
    source?: string;
    category?: string;
    created_at?: string;
    conversation_type?: string;
    document_id?: string;
  };
  rank?: number;
  score: number;
}

interface ConversationSearchProps {
  apiKey: string;
  onClose?: () => void;
}

export const ConversationSearch: React.FC<ConversationSearchProps> = ({ apiKey }) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [painFacets, setPainFacets] = useState<string[]>([]);
  const [selectedPain, setSelectedPain] = useState<string | null>(null);
  const [isLoadingFacets, setIsLoadingFacets] = useState(false);
  
  // Default search configuration
  const defaultSearchConfig = {
    searchType: 'hybrid',
    limit: 10,
    threshold: 0,
    denseWeight: 0,
    sparseWeight: 0,
    fusionMethod: 'rrf',
    rrfK: 1
  };

  // Fetch pain facets on component mount
  useEffect(() => {
    const fetchPainFacets = async () => {
      setIsLoadingFacets(true);
      try {
        const response = await new Promise<{ success: boolean; data?: any; error?: string }>((resolve) => {
          chrome.runtime.sendMessage(
            {
              type: 'GET_METADATA_FACETS',
              payload: {
                collection_name: 'ai_tools_materials',
                metadata_key: 'pain'
              },
              apiKey
            },
            (response) => {
              resolve(response);
            }
          );
        });
        
        if (response.success && response.data) {
          // The API returns facet_values array
          const pains = response.data.facet_values || [];
          setPainFacets(pains);
        } else {
          console.error('Failed to fetch guidebook topic facets:', response.error);
          message.error('Failed to load guidebook topic points');
        }
      } catch (error) {
        console.error('Error fetching guidebook topic facets:', error);
        message.error('Failed to load guidebook topic points');
      } finally {
        setIsLoadingFacets(false);
      }
    };

    if (apiKey) {
      fetchPainFacets();
    }
  }, [apiKey]);



  const handleSearch = async () => {
    if (!query.trim()) {
      message.error('Please enter a search query');
      return;
    }

    setIsSearching(true);
    try {
      const payload = {
        query: query.trim(),
        collection_name: 'ai_tools_materials',
        limit: defaultSearchConfig.limit,
        threshold: defaultSearchConfig.threshold,
        search_type: defaultSearchConfig.searchType,
        ...(selectedPain && {
          filter: {
            "must": [{
              "key": "metadata.pain",
              "match": {
                "value": selectedPain
              }
            }]
          }
        }),
        hybrid_config: {
          dense_weight: defaultSearchConfig.denseWeight,
          sparse_weight: defaultSearchConfig.sparseWeight,
          fusion_method: defaultSearchConfig.fusionMethod,
          rrf_k: defaultSearchConfig.rrfK
        }
      };
      
      const response = await new Promise<{ success: boolean; data?: any; error?: string }>((resolve) => {
        chrome.runtime.sendMessage(
          {
            type: 'SEARCH_CONVERSATIONS',
            payload,
            apiKey
          },
          (response) => {
            resolve(response);
          }
        );
      });
      
      if (response.success && response.data) {        
        // Handle different possible response structures
        let results = [];
        if (response.data.results) {
          results = response.data.results;
        } else if (response.data.documents) {
          results = response.data.documents;
        } else if (Array.isArray(response.data)) {
          results = response.data;
        }
        
        setSearchResults(results);
        
        if (results.length === 0) {
          message.info('No conversations found matching your query');
        } else {
          message.success(`Found ${results.length} conversation(s)`);
        }
      } else {
        console.error('Search failed:', response.error);
        message.error(response.error || 'Search failed');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      message.error('Search failed. Please try again.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };


  const handleViewResult = (result: SearchResult) => {
    setSelectedResult(result);
    setIsViewModalVisible(true);
  };

  // Shared function to copy text to clipboard and append to ChatGPT input
  const copyTextToChatGPT = async (text: string) => {
    try {
      // Copy to clipboard first
      await navigator.clipboard.writeText(text);
      
      // Find ChatGPT input field
      const chatInput = document.querySelector('#prompt-textarea') as HTMLTextAreaElement | HTMLElement;
      if (!chatInput) {
        return;
      }

      // Get existing text and append new text
      let existingText = '';
      if (chatInput.tagName === 'TEXTAREA') {
        existingText = (chatInput as HTMLTextAreaElement).value;
        const newText = existingText + (existingText ? '\n\n' : '') + text;
        (chatInput as HTMLTextAreaElement).value = newText;
        chatInput.dispatchEvent(new Event('input', { bubbles: true }));
        chatInput.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        existingText = chatInput.textContent || '';
        const newText = existingText + (existingText ? '\n\n' : '') + text;
        chatInput.textContent = newText;
        chatInput.dispatchEvent(new Event('input', { bubbles: true }));
        chatInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      // Focus on the input
      chatInput.focus();
    } catch (error) {
      console.error('Failed to copy text to ChatGPT:', error);
      throw error;
    }
  };

  const handleCopyToChat = async (result: SearchResult) => {
    try {
      const textToCopy = result.text || 'No content available';
      await copyTextToChatGPT(textToCopy);
      alert('Chunk text copied to chat and clipboard');
    } catch (error) {
      console.error('Error copying to chat:', error);
      alert('Failed to copy to chat');
    }
  };

  const handleCopyFullDocument = async (result: SearchResult) => {
    try {
      const documentId = result.metadata?.document_id;
      if (!documentId) {
        message.error('Document ID not available');
        return;
      }

      // Show loading message
      const hideLoading = message.loading('Fetching full document...', 0);
      
      // Fetch full document
      const response = await new Promise<{ success: boolean; data?: any; error?: string }>((resolve) => {
        chrome.runtime.sendMessage(
          {
            type: 'GET_FULL_DOCUMENT',
            collection_name: 'ai_tools_materials',
            document_id: documentId,
            apiKey
          },
          (response) => {
            resolve(response);
          }
        );
      });

      hideLoading();

      if (response.success && response.data) {
        const fullText = response.data.full_text || response.data.content || 'No full text available';
        await copyTextToChatGPT(fullText);
        alert('Full document copied to chat and clipboard');
      } else {
        console.error('Failed to fetch full document:', response.error);
        alert(response.error || 'Failed to fetch full document');
      }
    } catch (error) {
      console.error('Error copying full document:', error);
      alert('Error copying full document');
    }
  };


  const formatDate = (dateString: string) => {
    return dayjs(dateString).format('YYYY-MM-DD HH:mm');
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'green';
    if (score >= 0.6) return 'orange';
    return 'red';
  };

  return (
         <div style={{ padding: '1.25rem', maxWidth: '75rem', margin: '0 auto' }}>
       <Card>
         <Title level={2}>Search Conversations</Title>
         <Paragraph type="secondary">
           Search through your saved ChatGPT conversations using semantic, keyword, or hybrid search.
         </Paragraph>
       </Card>

       {/* Search Bar */}
       <Card style={{ marginTop: '1rem' }}>
         <Space direction="vertical" style={{ width: '100%', gap: '1rem' }}>
           {/* Pain Filter */}
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <Typography.Text strong>Guidebook Topic:</Typography.Text>
             <Select
               placeholder="All guidebook topic"
               style={{ minWidth: '200px', cursor: 'pointer' }}
               value={selectedPain}
               onChange={setSelectedPain}
               allowClear
               loading={isLoadingFacets}
               showSearch
               filterOption={(input, option) =>
                 (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
               }
               options={painFacets.map(pain => ({ value: pain, label: pain }))}
               dropdownStyle={{ cursor: 'pointer' }}
             />
             {painFacets.length > 0 && (
               <Typography.Text type="secondary" style={{ fontSize: '0.75rem' }}>
                 ({painFacets.length} guidebook topics available)
               </Typography.Text>
             )}
           </div>
           
           {/* Search Input */}
           <Space.Compact style={{ width: '100%' }}>
             <Search
               placeholder="Enter your search query (e.g., 'Python code', 'Marketing strategy')"
               value={query}
               onChange={(e) => setQuery(e.target.value)}
               onSearch={handleSearch}
               enterButton={
                 <Button 
                   type="primary" 
                   icon={<SearchOutlined />}
                   loading={isSearching}
                 >
                   Search
                 </Button>
               }
               size="large"
             />
           </Space.Compact>
         </Space>
       </Card>


             {/* Search Results */}
       <Card style={{ marginTop: '1rem' }}>
        <Title level={4}>Search Results</Title>
        
                 {isSearching ? (
           <div style={{ textAlign: 'center', padding: '2.5rem' }}>
             <Spin size="large" />
             <div style={{ marginTop: '1rem' }}>Searching conversations...</div>
           </div>
        ) : searchResults.length > 0 ? (
                     <List
             dataSource={searchResults}
             style={{ padding: '1rem' }}
             renderItem={(result) => (
               <List.Item
                 actions={[
                   <Button
                     key="view"
                     type="link"
                     icon={<EyeOutlined />}
                     onClick={() => handleViewResult(result)}
                   >
                     View
                   </Button>,
                   <Button
                     key="copy"
                     type="link"
                     icon={<CopyOutlined />}
                     onClick={() => handleCopyToChat(result)}
                   >
                     Copy to Chat
                   </Button>,
                   <Button
                     key="copyFull"
                     type="link"
                     icon={<FileTextOutlined />}
                     onClick={() => handleCopyFullDocument(result)}
                     disabled={!result.metadata?.document_id}
                   >
                     Copy document full text
                   </Button>
                 ]}
                                   style={{ 
                    alignItems: 'flex-start',
                    padding: '1.5rem 0',
                    marginBottom: '1rem',
                    borderBottom: '1px solid #f0f0f0',
                    borderRadius: '0.5rem',
                    backgroundColor: '#fafafa'
                  }}
               >
                                                  {/* Topic and Score - Main Title Row */}
                 <div style={{ 
                   display: 'flex', 
                   alignItems: 'center', 
                   gap: '0.75rem', 
                   flexWrap: 'wrap',
                   marginBottom: '1rem'
                 }}>
                   <Text strong style={{ 
                     fontSize: '1.1rem',
                     lineHeight: '1.4',
                     wordBreak: 'break-word',
                     flex: '1 1 auto',
                     minWidth: '12.5rem'
                   }}>
                     {result.metadata?.pain || 'No guidebook topic'}
                   </Text>
                   <Tag color={getScoreColor(result.score)} style={{ 
                     whiteSpace: 'nowrap',
                     flexShrink: 0,
                     fontSize: '0.875rem'
                   }}>
                     Score: {(result.score * 100).toFixed(1)}%
                   </Tag>
                 </div>

                 {/* Metadata Tags - Author, Category, Date, Rank */}
                 <div style={{ 
                   display: 'flex', 
                   flexWrap: 'wrap', 
                   gap: '0.5rem', 
                   marginBottom: '1rem',
                   alignItems: 'center'
                 }}>
                   <Tag icon={<UserOutlined />} color="blue" style={{ 
                     whiteSpace: 'nowrap',
                     flexShrink: 0
                   }}>
                     {result.metadata?.author || 'Unknown'}
                   </Tag>
                   <Tag icon={<TagOutlined />} color="green" style={{ 
                     whiteSpace: 'nowrap',
                     flexShrink: 0
                   }}>
                     {result.metadata?.category || 'Uncategorized'}
                   </Tag>
                   {result.metadata?.created_at && (
                     <Tag icon={<CalendarOutlined />} color="purple" style={{ 
                       whiteSpace: 'nowrap',
                       flexShrink: 0
                     }}>
                       {formatDate(result.metadata.created_at)}
                     </Tag>
                   )}
                   {result.rank && (
                     <Tag color="orange" style={{ 
                       whiteSpace: 'nowrap',
                       flexShrink: 0
                     }}>
                       Rank: {result.rank}
                     </Tag>
                   )}
                 </div>

                 {/* Content Preview */}
                 <Paragraph 
                   ellipsis={{ rows: 2 }} 
                   style={{ 
                     wordBreak: 'break-word',
                     lineHeight: '1.6',
                     color: '#666',
                     fontSize: '0.875rem',
                     margin: 0
                   }}
                 >
                   {result.text ? result.text.substring(0, 200) + '...' : 'No content preview available'}
                 </Paragraph>
              </List.Item>
            )}
          />
        ) : (
          <Empty description="No conversations found" />
        )}
      </Card>


      {/* View Result Modal */}
      <Modal
        title={`Conversation: ${selectedResult?.metadata?.pain || 'No guidebook topic'}`}
        open={isViewModalVisible}
        onCancel={() => setIsViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsViewModalVisible(false)}>
            Close
          </Button>
        ]}
width="50rem"
      >
        {selectedResult && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <Space wrap>
                <Tag icon={<UserOutlined />} color="blue">
                  {selectedResult.metadata?.author || 'Unknown'}
                </Tag>
                <Tag icon={<TagOutlined />} color="green">
                  {selectedResult.metadata?.category || 'Uncategorized'}
                </Tag>
                {selectedResult.metadata?.created_at && (
                  <Tag icon={<CalendarOutlined />} color="purple">
                    {formatDate(selectedResult.metadata.created_at)}
                  </Tag>
                )}
                <Tag color={getScoreColor(selectedResult.score)}>
                  Score: {(selectedResult.score * 100).toFixed(1)}%
                </Tag>
                {selectedResult.rank && (
                  <Tag color="orange">
                    Rank: {selectedResult.rank}
                  </Tag>
                )}
                {selectedResult.chunk_id && (
                  <Tag color="gray">
                    Chunk: {selectedResult.chunk_id}
                  </Tag>
                )}
              </Space>
            </div>
            
            <Divider />
            
            <div style={{ 
              maxHeight: '25rem', 
              overflow: 'auto', 
              padding: '1rem',
              backgroundColor: '#fafafa',
              borderRadius: '0.375rem',
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace'
            }}>
              {selectedResult.text || 'No content available'}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
