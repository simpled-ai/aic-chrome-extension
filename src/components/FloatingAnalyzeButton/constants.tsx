// Validation patterns for GPT response classification

// ==================== ENGLISH PATTERNS ====================

export const ENGLISH_QUESTION_PATTERNS = [
  /could you clarify/i,
  /what do you mean by/i,
  /can you provide more/i,
  /i need more information/i,
  /please specify/i,
  /could you be more specific/i,
  /what exactly/i,
  /which aspect/i,
  /are you looking for/i,
  /can you tell me more about/i,
  /what kind of/i,
  /which type of/i,
  /\?\s*$/m, // Ends with question mark
];

export const ENGLISH_ERROR_PATTERNS = [
  /i'm sorry, but/i,
  /i cannot/i,
  /i don't have/i,
  /i'm unable to/i,
  /error/i,
  /something went wrong/i,
  /try again/i,
  /access.*denied/i,
  /not available/i,
  /can't access/i,
];

export const ENGLISH_PENDING_PATTERNS = [
  /i'll/i,
  /i'll get back to you/i,
  /i'll let you know/i,
  /i'll send you an update/i,
  /i'll send you a report/i,
];

// ==================== VIETNAMESE PATTERNS ====================

export const VIETNAMESE_QUESTION_PATTERNS = [
  /nào?/i,
  /gì?/i,
  /không?/i,
  /có không?/i,
  /là gì/i,
  /kiểu gì/i,
  /loại gì/i,
  /cái gì/i,
  /loại nào/i,
  /cái nào/i,
  /kiểu nào/i,
  /bao nhiêu/i,
  /cung cấp thêm/i,
  /biết thêm/i,
  /bạn hãy/i,
  /bạn muốn/i,
  /bạn có muốn/i,
];

export const VIETNAMESE_ERROR_PATTERNS = [
  /xin lỗi/i,
  /tôi không thể/i,
  /tôi không có/i,
  /tôi không được phép/i,
  /có gì đó không đúng/i,
  /thử lại/i,
  /rất tiếc/i,
  /không thể thực hiện/i,
  /hệ thống lỗi/i,
  /không có quyền truy cập/i,
  /không khả dụng/i,
];

export const VIETNAMESE_PENDING_PATTERNS = [
  /Mình sẽ/i,
  /mình sẽ/i,
  /Tôi sẽ/i,
  /tôi sẽ/i,

  /Mình sẽ quay lại/i,
  /mình sẽ quay lại/i,
  /Tôi sẽ quay lại/i,
  /tôi sẽ quay lại/i,

  /Mình sẽ gửi lại/i,
  /mình sẽ gửi lại/i,
  /Tôi sẽ gửi lại/i,
  /tôi sẽ gửi lại/i,

  /Mình sẽ tiến hành/i,
  /mình sẽ tiến hành/i,
  /Tôi sẽ tiến hành/i,
  /tôi sẽ tiến hành/i,

  /Mình sẽ bắt đầu/i,
  /mình sẽ bắt đầu/i,
  /Tôi sẽ bắt đầu/i,
  /tôi sẽ bắt đầu/i,

  /Mình sẽ cập nhật/i,
  /mình sẽ cập nhật/i,
  /Tôi sẽ cập nhật/i,
  /tôi sẽ cập nhật/i,

  /Mình sẽ tìm hiểu/i,
  /mình sẽ tìm hiểu/i,
  /Tôi sẽ tìm hiểu/i,
  /tôi sẽ tìm hiểu/i,

  /Mình sẽ tìm kiếm/i,
  /mình sẽ tìm kiếm/i,
  /Tôi sẽ tìm kiếm/i,
  /tôi sẽ tìm kiếm/i,

  /thông báo khi hoàn thành/i,
];

// ==================== COMBINED PATTERNS ====================

export const ALL_QUESTION_PATTERNS = [
  ...ENGLISH_QUESTION_PATTERNS,
  ...VIETNAMESE_QUESTION_PATTERNS,
];

export const ALL_ERROR_PATTERNS = [
  ...ENGLISH_ERROR_PATTERNS,
  ...VIETNAMESE_ERROR_PATTERNS,
];

export const ALL_PENDING_PATTERNS = [
  ...ENGLISH_PENDING_PATTERNS,
  ...VIETNAMESE_PENDING_PATTERNS,
];

// ==================== VALIDATION THRESHOLDS ====================

export const VALIDATION_THRESHOLDS = {
  QUESTION_SCORE_THRESHOLD: 2,
  ERROR_SCORE_THRESHOLD: 2,
  PENDING_SCORE_THRESHOLD: 2,
} as const;

// ==================== OVERLAY ====================
export const OVERLAY = document.createElement('div');
OVERLAY.id = 'deep-research-overlay';
OVERLAY.style.cssText = `
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 999999;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  font-weight: bold;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
  backdrop-filter: blur(2px);
`;
OVERLAY.innerHTML = `
  <div style="text-align: center;">
    <div style="margin-bottom: 10px;">🔬 Extension is running...</div>
    <div style="font-size: 14px; opacity: 0.8;">Please wait a moment, do not interact with the page</div>
  </div>
`;
