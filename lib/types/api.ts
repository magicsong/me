// LLM历史API响应类型
export interface LLMHistoryResponse {
  records: {
    id: number;
    requestHash: string;
    prompt: string;
    model: string;
    responseContent: string;
    responseThinking?: string | null;
    createdAt: string;
    userId?: string | null;
  }[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface LLMRecordDetailResponse {
  record: {
    id: number;
    requestHash: string;
    prompt: string;
    model: string;
    responseContent: string;
    responseThinking?: string | null;
    createdAt: string;
    userId?: string | null;
  } | null;
}