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
  CopyOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title, Paragraph } = Typography;
const { Search } = Input;

interface SearchResult {
  chunk_id: string;
  text: string;
  metadata: {
    topic?: string;
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
  const [topicFacets, setTopicFacets] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [isLoadingFacets, setIsLoadingFacets] = useState(false);
  
  // Default search configuration
  const defaultSearchConfig = {
    searchType: 'hybrid',
    limit: 10,
    threshold: 0.5,
    denseWeight: 0,
    sparseWeight: 0,
    fusionMethod: 'rrf',
    rrfK: 1
  };

  // Fetch topic facets on component mount
  useEffect(() => {
    const fetchTopicFacets = async () => {
      setIsLoadingFacets(true);
      try {
        const response = await new Promise<{ success: boolean; data?: any; error?: string }>((resolve) => {
          chrome.runtime.sendMessage(
            {
              type: 'GET_METADATA_FACETS',
              payload: {
                collection_name: 'ai_tools_materials',
                metadata_key: 'topic'
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
          const topics = response.data.facet_values || [];
          setTopicFacets(topics);
        } else {
          console.error('Failed to fetch topic facets:', response.error);
          message.error('Failed to load topics');
        }
      } catch (error) {
        console.error('Error fetching topic facets:', error);
        message.error('Failed to load topics');
      } finally {
        setIsLoadingFacets(false);
      }
    };

    if (apiKey) {
      fetchTopicFacets();
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
        ...(selectedTopic && {
          filter: {
            "must": [{
              "key": "metadata.topic",
              "match": {
                "value": selectedTopic
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

  const handleCopyToChat = async (result: SearchResult) => {
    try {
      const textToCopy = result.text || 'No content available';
      
      // Copy to clipboard first
      await navigator.clipboard.writeText(textToCopy);
      
      // Find ChatGPT input field using the same method as auto research
      const chatInput = document.querySelector('#prompt-textarea') as HTMLTextAreaElement | HTMLElement;
      if (!chatInput) {
        return;
      }

      // Input the text using the same method as auto research
      try {
        if (chatInput.tagName === 'TEXTAREA') {
          (chatInput as HTMLTextAreaElement).value = textToCopy;
          chatInput.dispatchEvent(new Event('input', { bubbles: true }));
          chatInput.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          chatInput.textContent = textToCopy;
          chatInput.dispatchEvent(new Event('input', { bubbles: true }));
          chatInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Focus on the input
        chatInput.focus();
      } catch (inputError) {
        console.error('Failed to input text into ChatGPT field:', inputError);
      }
    } catch (error) {
      console.error('Error copying to chat:', error);
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
           {/* Topic Filter */}
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <Typography.Text strong>Topic:</Typography.Text>
             <Select
               placeholder="All topics"
               style={{ minWidth: '200px' }}
               value={selectedTopic}
               onChange={setSelectedTopic}
               allowClear
               loading={isLoadingFacets}
               showSearch
               filterOption={(input, option) =>
                 (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
               }
               options={topicFacets.map(topic => ({ value: topic, label: topic }))}
             />
             {topicFacets.length > 0 && (
               <Typography.Text type="secondary" style={{ fontSize: '0.75rem' }}>
                 ({topicFacets.length} topics available)
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
                     {result.metadata?.topic || 'Untitled'}
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
        title={`Conversation: ${selectedResult?.metadata?.topic || 'Untitled'}`}
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
