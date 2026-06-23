import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface Formula {
  id: string
  title: string
  latex: string
  formula_type?: string
  category: string
  tags: string[]
  description?: string
  conditions?: string
  aliases?: string[]
  references: string[]
  difficulty?: string
  proof_sketch?: string
  application_scenarios?: string[]
  source?: string
  source_page?: number
  review_status?: 'pending' | 'approved' | 'rejected'
  reviewed_at?: string
  review_notes?: string
  relation_ids?: string[]
  related_formula_ids?: string[]
  import_batch_id?: string
}

export interface SearchResult extends Formula {
  similarity: number
  matchReason?: string
  match_reason?: string
  structural_score?: number
  semantic_score?: number
  normalized_score?: number
  equivalence_score?: number
  vector_score?: number
  equivalence_reason?: string
  reasoning_steps?: string[]
}

export interface SearchResponse {
  results: SearchResult[]
  normalizedFormula: string
  typeInfo?: string
}

export interface CreateFormulaRequest {
  title: string
  latex: string
  formula_type?: string
  category: string
  tags: string[]
  description?: string
  conditions?: string
  aliases?: string[]
  references: string[]
  difficulty?: string
  proof_sketch?: string
  application_scenarios?: string[]
  source?: string
  source_page?: number
  review_status?: 'pending' | 'approved' | 'rejected'
  review_notes?: string
  relation_ids?: string[]
  related_formula_ids?: string[]
  import_batch_id?: string
}

export async function searchFormulas(formula: string): Promise<SearchResponse> {
  const { data } = await api.post('/search', { formula, inputType: 'latex' })
  return data
}

export async function getFormula(id: string): Promise<Formula> {
  const { data } = await api.get(`/formulas/${id}`)
  return data
}

export async function getRelatedFormulas(id: string, limit: number = 6): Promise<Formula[]> {
  const { data } = await api.get(`/formulas/${id}/related`, { params: { limit } })
  return data
}

export async function createFormula(formula: CreateFormulaRequest): Promise<Formula> {
  const { data } = await api.post('/admin/formulas', formula)
  return data
}

export async function updateFormula(id: string, formula: CreateFormulaRequest): Promise<Formula> {
  const { data } = await api.put(`/admin/formulas/${id}`, formula)
  return data
}

export async function reviewFormula(
  id: string,
  reviewStatus: 'pending' | 'approved' | 'rejected',
  reviewNotes?: string
): Promise<Formula> {
  const { data } = await api.post(`/admin/formulas/${id}/review`, {
    review_status: reviewStatus,
    review_notes: reviewNotes,
  })
  return data
}

export interface AutofillResponse {
  success: boolean
  data: {
    title: string
    category: string
    tags: string[]
    description: string
    conditions: string
    references: string[]
    confidence: number
    method: 'rule' | 'ai'
  }
  validation: {
    is_valid: boolean
    issues: string[]
    suggestions: string[]
  }
}

export async function autofillFormula(latex: string): Promise<AutofillResponse> {
  const { data } = await api.post('/ai/autofill', { latex })
  return data
}

export async function validateFormula(latex: string): Promise<{ success: boolean; validation: AutofillResponse['validation'] }> {
  const { data } = await api.post('/ai/validate', { latex })
  return data
}

export async function parseFormula(formula: string): Promise<{
  success: boolean
  normalized?: string
  type?: string
  variables?: string[]
  hints?: string[]
}> {
  const { data } = await api.post('/parse', { formula, inputType: 'latex' })
  return data
}

// ==========================================
// AI 增强搜索 API
// ==========================================

export interface AISearchResult extends Formula {
  similarity: number
  match_reason: string
  matchReason?: string
  structural_score?: number
  semantic_score?: number
  normalized_score?: number
  equivalence_score?: number
  vector_score?: number
  equivalence_reason?: string
  reasoning_steps?: string[]
}

export interface AISearchResponse {
  results: AISearchResult[]
  normalized_formula: string
  type_info: string
  ai_enhanced: boolean
  ai_available: boolean
  reasoning_mode?: string
}

export async function aiEnhancedSearch(
  formula: string,
  useAI: boolean = true,
  topK: number = 10,
  configId?: string
): Promise<AISearchResponse> {
  const { data } = await api.post('/search/ai-enhanced', {
    formula,
    use_ai: useAI,
    top_k: topK,
    config_id: configId,
  })
  return data
}

// ==========================================
// AI 配置管理 API
// ==========================================

export interface AIConfig {
  id: string
  name: string
  provider: 'openai' | 'anthropic' | 'azure' | 'gemini' | 'custom'
  api_key: string
  api_key_masked: string
  api_url?: string
  model: string
  remark?: string
  enabled: boolean
  created_at: string
  updated_at: string
}

export type AIProvider = AIConfig['provider']

export interface AIConfigFormData {
  name: string
  provider: AIProvider
  api_key: string
  api_url: string
  model: string
  remark: string
  enabled: boolean
}

export async function listAIConfigs(): Promise<AIConfig[]> {
  const { data } = await api.get('/admin/ai-configs')
  return data.configs || []
}

export async function getAIConfig(configId: string): Promise<AIConfig> {
  const { data } = await api.get(`/admin/ai-configs/${configId}`)
  return data
}

export async function createAIConfig(config: AIConfigFormData): Promise<AIConfig> {
  const { data } = await api.post('/admin/ai-configs', config)
  return data
}

export async function updateAIConfig(configId: string, config: Partial<AIConfigFormData>): Promise<AIConfig> {
  const { data } = await api.put(`/admin/ai-configs/${configId}`, config)
  return data
}

export async function deleteAIConfig(configId: string): Promise<{ success: boolean; message: string }> {
  const { data } = await api.delete(`/admin/ai-configs/${configId}`)
  return data
}

export async function testAIConfig(configId: string, testPrompt?: string): Promise<{
  success: boolean
  message: string
  response_time_ms?: number
  error_detail?: string
}> {
  const { data } = await api.post(`/admin/ai-configs/${configId}/test`, {
    config_id: configId,
    test_prompt: testPrompt || 'Hello, this is a test.',
  })
  return data
}

export async function getActiveAIConfig(): Promise<AIConfig> {
  const { data } = await api.get('/admin/ai-configs/active')
  return data
}

export interface AIStatusResponse {
  available: boolean
  configs_count: number
  has_env_key: boolean
  message: string
}

export interface BatchExtractedFormula {
  latex: string
  type: string
  title: string
  category: string
  tags: string[]
  description: string
  conditions: string
  references: string[]
  confidence: number
  context: string
}

export interface BatchExtractResponse {
  success: boolean
  count: number
  formulas: BatchExtractedFormula[]
}

export async function checkAIStatus(): Promise<AIStatusResponse> {
  const { data } = await api.get('/ai/status')
  return data
}

export async function batchExtractFormulas(
  content: string,
  inputFormat: 'markdown' | 'latex' | 'auto' = 'auto'
): Promise<BatchExtractResponse> {
  const { data } = await api.post('/ai/batch-extract', {
    content,
    input_format: inputFormat,
  })
  return data
}

export interface EvaluationResponse {
  case_count: number
  top_k: number
  top1_accuracy: number
  recall_at_k: number
  precision_at_k: number
  mrr: number
  ndcg_at_k: number
  failed_count: number
  failed_cases: Array<Record<string, unknown>>
  cases: Array<Record<string, unknown>>
}

export async function runEvaluation(topK: number = 10): Promise<EvaluationResponse> {
  const { data } = await api.get('/admin/evaluation/run', { params: { top_k: topK } })
  return data
}

export interface VectorStatusResponse {
  configured: boolean
  driver_available: boolean
  schema_file: string
  schema_file_exists: boolean
  dimensions: number
  ready: boolean
  retrieval_mode?: string
  message: string
}

export async function getVectorStatus(): Promise<VectorStatusResponse> {
  const { data } = await api.get('/admin/vector/status')
  return data
}

export async function exportVectorRecords(): Promise<{
  count: number
  dimensions: number
  embedding_model: string
  records: Array<Record<string, unknown>>
}> {
  const { data } = await api.get('/admin/vector/export')
  return data
}

export async function syncVectorRecords(): Promise<{
  success: boolean
  synced_count: number
  message: string
}> {
  const { data } = await api.post('/admin/vector/sync')
  return data
}

export interface AICallLog {
  created_at: string
  provider?: string
  model?: string
  endpoint?: string
  config_id?: string
  purpose: string
  success: boolean
  response_time_ms?: number
  error_detail?: string | null
}

export async function listAICallLogs(limit: number = 50): Promise<AICallLog[]> {
  const { data } = await api.get('/admin/ai-call-logs', { params: { limit } })
  return data.logs || []
}

export interface OCRStatusResponse {
  text_fallback: boolean
  mathpix_configured: boolean
  supported_text_extensions: string[]
}

export async function getOCRStatus(): Promise<OCRStatusResponse> {
  const { data } = await api.get('/ai/ocr/status')
  return data
}

export async function uploadFormulaOCR(file: File): Promise<{
  success: boolean
  provider: string
  latex?: string | null
  raw_text: string
  message: string
  filename?: string
  content_type?: string
  extracted_formulas: BatchExtractedFormula[]
}> {
  const contentBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      resolve(result.includes(',') ? result.split(',')[1] : result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
  const { data } = await api.post('/ai/ocr-formula', {
    filename: file.name,
    content_type: file.type,
    content_base64: contentBase64,
  })
  return data
}

export interface PDFFormulaCandidate extends BatchExtractedFormula {
  normalized_expression: string
  source: string
  source_page: number
  duplicate: boolean
}

export interface PDFExtractResponse {
  success: boolean
  filename: string
  page_count: number
  candidate_count: number
  duplicate_count: number
  pages: Array<{ page: number; text: string }>
  candidates: PDFFormulaCandidate[]
}

export async function extractPdfFormulas(file: File): Promise<PDFExtractResponse> {
  const contentBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      resolve(result.includes(',') ? result.split(',')[1] : result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
  const { data } = await api.post('/admin/pdf/extract', {
    filename: file.name,
    content_type: file.type,
    content_base64: contentBase64,
  })
  return data
}

export async function importConfirmedPdfFormulas(
  formulas: PDFFormulaCandidate[],
  reviewStatus: 'pending' | 'approved' = 'pending'
): Promise<{
  success: boolean
  import_batch_id: string
  imported_count: number
  skipped_count: number
  imported: Formula[]
  skipped: Array<Record<string, unknown>>
}> {
  const { data } = await api.post('/admin/pdf/import-confirmed', {
    formulas,
    review_status: reviewStatus,
  })
  return data
}

export async function getFormulaRelations(limit: number = 200): Promise<{
  node_count: number
  edge_count: number
  nodes: Array<Record<string, unknown>>
  edges: Array<Record<string, unknown>>
}> {
  const { data } = await api.get('/admin/formula-relations', { params: { limit } })
  return data
}
