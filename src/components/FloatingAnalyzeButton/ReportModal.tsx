import React, { useState, useEffect } from 'react';
import { Modal, DatePicker, Button, Checkbox, List, Spin } from 'antd';
import dayjs from 'dayjs';
import { AnalysisItem } from './types';
import { PlatformIcons } from './PlatformIcons';
import { getAnalysisItems, createTask, getAnalysisUrl } from '../../services/api';

const { RangePicker } = DatePicker;

interface ReportModalProps {
  isVisible: boolean;
  onCancel: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isVisible, onCancel }) => {
  const [timeRange, setTimeRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [isCreatingReport, setIsCreatingReport] = useState(false);
  const [analysisItems, setAnalysisItems] = useState<AnalysisItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [checkAll, setCheckAll] = useState(false);

  // Load analysis items when modal opens
  useEffect(() => {
    if (isVisible) {
      setIsLoadingItems(true);
      getAnalysisItems()
        .then(items => {
          setAnalysisItems(items);
          // Check all items by default
          setSelectedItems(items.map(item => item.id));
          setCheckAll(true);
        })
        .catch(error => {
          console.error('Error loading analysis items:', error);
        })
        .finally(() => {
          setIsLoadingItems(false);
        });
    }
  }, [isVisible]);

  const handleCreateReport = async () => {
    console.log('Creating report with:', { timeRange, selectedItems });
    if (!timeRange && selectedItems.length === 0) return;

    try {
      setIsCreatingReport(true);
      const [startTime, endTime] = timeRange ? timeRange : [undefined, undefined];
      const contentIds = selectedItems.filter(
        item => analysisItems.find(
          i => i.id === item
        )?.type === 'CONTENT'
      );
      const profileIds = selectedItems.filter(
        item => analysisItems.find(
          i => i.id === item
        )?.type === 'PROFILE'
      );
      const response = await createTask('', {
        type: 'ANALYZE',
        priority: 1,
        analyzeConfig: {
          contentIds: contentIds,
          profileIds: profileIds,
          startTime: startTime?.toISOString(),
          endTime: endTime?.toISOString(),
        },
      });

      window.open(getAnalysisUrl(response.data.id), '_blank');
      onCancel();
    } catch (error) {
      console.error('Error creating report:', error);
    } finally {
      setIsCreatingReport(false);
    }
  };

  const onCheckAllChange = (e: { target: { checked: boolean } }) => {
    setCheckAll(e.target.checked);
    setSelectedItems(e.target.checked ? analysisItems.map(item => item.id) : []);
  };

  return (
    <Modal
      title="Create Report"
      open={isVisible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key="create"
          type="primary"
          loading={isCreatingReport}
          onClick={handleCreateReport}
          disabled={!timeRange && selectedItems.length === 0}
        >
          Create Report
        </Button>,
      ]}
      width={600}
    >
      <div style={{ marginTop: 16 }}>
        <RangePicker
          showTime
          format="YYYY-MM-DD HH:mm:ss"
          onChange={(dates) => setTimeRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
          style={{ width: '100%', marginBottom: 16 }}
        />

        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Select content to analyze:</span>
          <Checkbox
            checked={checkAll}
            indeterminate={selectedItems.length > 0 && selectedItems.length < analysisItems.length}
            onChange={onCheckAllChange}
          >
            Select All
          </Checkbox>
        </div>
        
        {isLoadingItems ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin />
          </div>
        ) : (
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <List
              size="small"
              dataSource={analysisItems}
              renderItem={(item) => (
                <List.Item style={{ display: 'flex', alignItems: 'center' }}>
                  <Checkbox
                    checked={selectedItems.includes(item.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedItems([...selectedItems, item.id]);
                      } else {
                        setSelectedItems(selectedItems.filter(id => id !== item.id));
                      }
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                      flex: 1,
                      marginTop: 1.5,
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 8,
                        fontSize: 16
                      }}>
                        {PlatformIcons[item.platform]}
                      </div>
                      <div style={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '400px'
                      }}>
                        {item.label}
                      </div>
                    </div>
                  </Checkbox>
                </List.Item>
              )}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}; 
