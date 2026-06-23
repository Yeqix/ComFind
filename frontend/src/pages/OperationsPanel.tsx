import { useEffect, useState } from 'react'
import {
  extractPdfFormulas,
  exportVectorRecords,
  getFormulaRelations,
  getOCRStatus,
  getVectorStatus,
  importConfirmedPdfFormulas,
  listAICallLogs,
  runEvaluation,
  syncVectorRecords,
  uploadFormulaOCR,
  type AICallLog,
  type EvaluationResponse,
  type OCRStatusResponse,
  type PDFFormulaCandidate,
  type VectorStatusResponse,
} from '../services/api'

export default function OperationsPanel() {
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null)
  const [vectorStatus, setVectorStatus] = useState<VectorStatusResponse | null>(null)
  const [ocrStatus, setOcrStatus] = useState<OCRStatusResponse | null>(null)
  const [logs, setLogs] = useState<AICallLog[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState('')
  const [ocrResult, setOcrResult] = useState('')
  const [pdfCandidates, setPdfCandidates] = useState<PDFFormulaCandidate[]>([])
  const [relationStats, setRelationStats] = useState<{ node_count: number; edge_count: number } | null>(null)

  useEffect(() => {
    refresh()
  }, [])

  const refresh = async () => {
    setLoading('refresh')
    setMessage('')
    try {
      const [evalData, vectorData, ocrData, logData, relationData] = await Promise.all([
        runEvaluation(5),
        getVectorStatus(),
        getOCRStatus(),
        listAICallLogs(20),
        getFormulaRelations(200),
      ])
      setEvaluation(evalData)
      setVectorStatus(vectorData)
      setOcrStatus(ocrData)
      setLogs(logData)
      setRelationStats({ node_count: relationData.node_count, edge_count: relationData.edge_count })
    } catch (err) {
      setMessage('加载运行状态失败')
    } finally {
      setLoading('')
    }
  }

  const handleVectorExport = async () => {
    setLoading('export')
    setMessage('')
    try {
      const data = await exportVectorRecords()
      setMessage(`已生成 ${data.count} 条 ${data.dimensions} 维向量记录`)
    } catch {
      setMessage('向量导出失败')
    } finally {
      setLoading('')
    }
  }

  const handleVectorSync = async () => {
    setLoading('sync')
    setMessage('')
    try {
      const data = await syncVectorRecords()
      setMessage(`${data.message}，同步数量 ${data.synced_count}`)
      await refresh()
    } catch {
      setMessage('pgvector 同步失败')
    } finally {
      setLoading('')
    }
  }

  const handleOCRUpload = async (file?: File) => {
    if (!file) return
    setLoading('ocr')
    setOcrResult('')
    try {
      const result = await uploadFormulaOCR(file)
      setOcrResult(result.latex || result.message)
    } catch {
      setOcrResult('OCR 上传失败')
    } finally {
      setLoading('')
    }
  }

  const handlePDFExtract = async (file?: File) => {
    if (!file) return
    setLoading('pdf')
    setMessage('')
    try {
      const result = await extractPdfFormulas(file)
      setPdfCandidates(result.candidates)
      setMessage(`PDF 抽取完成：${result.page_count} 页，候选 ${result.candidate_count} 条，疑似重复 ${result.duplicate_count} 条`)
    } catch {
      setMessage('PDF 抽取失败')
    } finally {
      setLoading('')
    }
  }

  const handlePDFImport = async () => {
    const candidates = pdfCandidates.filter((item) => !item.duplicate)
    if (candidates.length === 0) {
      setMessage('没有可导入的新候选公式')
      return
    }
    setLoading('pdf-import')
    try {
      const result = await importConfirmedPdfFormulas(candidates, 'pending')
      setMessage(`已导入 ${result.imported_count} 条，跳过 ${result.skipped_count} 条；新公式已进入待审核`)
      setPdfCandidates([])
      await refresh()
    } catch {
      setMessage('PDF 候选导入失败')
    } finally {
      setLoading('')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">运行监控</h2>
          <p className="mt-1 text-sm text-gray-500">查看评测、向量检索、LLM 调用和 OCR 状态</p>
        </div>
        <button onClick={refresh} className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm hover:bg-primary-700">
          {loading === 'refresh' ? '刷新中...' : '刷新'}
        </button>
      </div>

      {message && (
        <div className="rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {message}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="font-semibold text-gray-900">检索评测</h3>
          {evaluation ? (
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Metric label="样例数" value={evaluation.case_count} />
              <Metric label="失败数" value={evaluation.failed_count} />
              <Metric label="Top1" value={`${(evaluation.top1_accuracy * 100).toFixed(1)}%`} />
              <Metric label={`Recall@${evaluation.top_k}`} value={`${(evaluation.recall_at_k * 100).toFixed(1)}%`} />
              <Metric label="MRR" value={evaluation.mrr.toFixed(3)} />
              <Metric label="NDCG" value={evaluation.ndcg_at_k.toFixed(3)} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">暂无评测数据</p>
          )}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="font-semibold text-gray-900">向量检索</h3>
          {vectorStatus && (
            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <p>模式：{vectorStatus.ready ? 'pgvector' : '本地 token 向量'}</p>
              <p>维度：{vectorStatus.dimensions}</p>
              <p>Schema：{vectorStatus.schema_file_exists ? '已找到' : '缺失'}</p>
              <p>驱动：{vectorStatus.driver_available ? '可用' : '不可用'}</p>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={handleVectorExport} className="px-3 py-2 rounded border border-gray-300 text-sm hover:bg-gray-50">
              {loading === 'export' ? '导出中...' : '导出向量'}
            </button>
            <button onClick={handleVectorSync} className="px-3 py-2 rounded bg-gray-900 text-white text-sm hover:bg-gray-800">
              {loading === 'sync' ? '同步中...' : '同步 pgvector'}
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="font-semibold text-gray-900">OCR 输入</h3>
          <div className="mt-4 space-y-2 text-sm text-gray-600">
            <p>文本 fallback：{ocrStatus?.text_fallback ? '可用' : '不可用'}</p>
            <p>Mathpix：{ocrStatus?.mathpix_configured ? '已配置' : '未配置'}</p>
          </div>
          <input
            type="file"
            className="mt-4 block w-full text-sm text-gray-600"
            onChange={(event) => handleOCRUpload(event.target.files?.[0])}
          />
          {ocrResult && (
            <div className="mt-3 rounded bg-gray-50 p-3 text-sm text-gray-700 break-words">
              {ocrResult}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="font-semibold text-gray-900">PDF 导入流水线</h3>
          <p className="mt-2 text-sm text-gray-600">上传 PDF 或文本，先抽取候选公式，再导入为待审核公式。</p>
          <input
            type="file"
            accept=".pdf,.txt,.tex,.md,text/plain,application/pdf"
            className="mt-4 block w-full text-sm text-gray-600"
            onChange={(event) => handlePDFExtract(event.target.files?.[0])}
          />
          {pdfCandidates.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  可导入 {pdfCandidates.filter((item) => !item.duplicate).length} / {pdfCandidates.length} 条
                </span>
                <button
                  onClick={handlePDFImport}
                  className="px-3 py-2 rounded bg-gray-900 text-white text-sm hover:bg-gray-800"
                >
                  {loading === 'pdf-import' ? '导入中...' : '导入待审核'}
                </button>
              </div>
              <div className="max-h-48 space-y-2 overflow-auto text-sm">
                {pdfCandidates.slice(0, 8).map((item, index) => (
                  <div key={`${item.latex}-${index}`} className="rounded border border-gray-100 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-gray-800 break-all">{item.latex}</span>
                      <span className={item.duplicate ? 'text-yellow-700' : 'text-green-700'}>
                        {item.duplicate ? '重复' : '新公式'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">第 {item.source_page} 页 · {item.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="font-semibold text-gray-900">LLM 调用日志</h3>
          <div className="mt-4 max-h-72 space-y-2 overflow-auto text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500">暂无调用日志</p>
            ) : (
              logs.map((log, index) => (
                <div key={`${log.created_at}-${index}`} className="rounded border border-gray-100 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-gray-800">{log.purpose}</span>
                    <span className={log.success ? 'text-green-600' : 'text-red-600'}>
                      {log.success ? '成功' : '失败'}
                    </span>
                  </div>
                  <p className="mt-1 text-gray-500">{log.model || '-'} · {log.response_time_ms || 0} ms</p>
                  {log.error_detail && <p className="mt-1 text-red-600">{log.error_detail}</p>}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="font-semibold text-gray-900">公式关系图</h3>
          {relationStats ? (
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Metric label="节点" value={relationStats.node_count} />
              <Metric label="关系" value={relationStats.edge_count} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">暂无关系图数据</p>
          )}
        </section>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded bg-gray-50 px-3 py-2">
      <p className="text-gray-500">{label}</p>
      <p className="mt-1 font-semibold text-gray-900">{value}</p>
    </div>
  )
}
