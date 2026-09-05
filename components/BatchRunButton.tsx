'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { useReclaimStore } from '@/lib/store'
import { formatTimestamp } from '@/lib/utils'

export function BatchRunButton() {
  const { batchRunning, batchProgress, runBatch, clearBatchProgress } = useReclaimStore()
  const [showStream, setShowStream] = useState(false)

  const handleRun = async () => {
    setShowStream(true)
    clearBatchProgress()
    await runBatch()
  }

  const isComplete = !batchRunning && batchProgress.length > 0
  const lastStep = batchProgress[batchProgress.length - 1]
  const hasError = lastStep?.step?.startsWith('Error:')

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Main button */}
      <motion.button
        id="run-batch-btn"
        onClick={handleRun}
        disabled={batchRunning}
        className="btn-primary flex items-center gap-3 px-8 py-4 text-base font-bold relative overflow-hidden"
        style={{
          fontSize: '16px',
          borderRadius: '14px',
          boxShadow: batchRunning
            ? 'none'
            : '0 0 30px rgba(13, 148, 251, 0.35), 0 8px 20px rgba(13, 148, 251, 0.2)',
          minWidth: '200px',
          justifyContent: 'center',
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Shimmer effect when idle */}
        {!batchRunning && (
          <motion.div
            className="absolute inset-0 rounded-xl"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
            }}
            animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        )}

        <AnimatePresence mode="wait">
          {batchRunning ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <Loader2 size={18} className="animate-spin" />
              <span>Running Batch...</span>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <Play size={18} fill="white" />
              <span>Run Batch</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <p className="text-muted text-xs text-center" style={{ maxWidth: '260px' }}>
        Ingests from Razorpay API → Diagnoses → Applies guardrails → Executes recovery
      </p>

      {/* Progress stream */}
      <AnimatePresence>
        {showStream && batchProgress.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="toast-stream w-full"
            style={{ maxWidth: '400px' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {batchRunning ? (
                  <div className="live-dot blue" />
                ) : hasError ? (
                  <XCircle size={12} color="#F87171" />
                ) : (
                  <CheckCircle size={12} color="#4CAF84" />
                )}
                <span className="text-subtle text-[11px] font-semibold uppercase tracking-wider">
                  {batchRunning ? 'Processing...' : hasError ? 'Completed with errors' : 'Complete'}
                </span>
              </div>
              {isComplete && (
                <button
                  onClick={() => { setShowStream(false); clearBatchProgress() }}
                  className="text-muted text-[10px] hover:text-white transition-colors"
                >
                  dismiss
                </button>
              )}
            </div>

            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
              {batchProgress.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="toast-stream-item"
                >
                  <span className="text-muted flex-shrink-0" style={{ fontSize: '10px' }}>
                    {formatTimestamp(item.timestamp)}
                  </span>
                  <span
                    className={item.step.startsWith('Error:') ? '' : ''}
                    style={{
                      color: item.step.startsWith('Error:')
                        ? '#F87171'
                        : i === batchProgress.length - 1 && !batchRunning
                        ? 'rgba(255,255,255,0.9)'
                        : 'rgba(255,255,255,0.6)',
                    }}
                  >
                    {item.step}
                  </span>
                </motion.div>
              ))}
              {batchRunning && (
                <motion.div
                  className="toast-stream-item"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >
                  <span className="text-muted text-[10px]">...</span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
