// 类型定义导出
export interface Formula {
  id: string;
  title: string;
  latex: string;
  category: string;
  tags: string[];
  description?: string;
  conditions?: string;
  references: string[];
}

export interface SearchResult extends Formula {
  similarity: number;
  matchReason?: string;
}
