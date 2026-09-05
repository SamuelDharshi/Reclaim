'use client'

import { create } from 'zustand'
import type { AnalyticsSummary, GuardrailConfig, BatchProgress } from './types'

interface ReclaimEvent {
  id: string
  type: string
  amount: number
  status: string
  detectedAt: string
  resolvedAt: string | null
  razorpayRefId: string | null
  customerId: string | null
  customerEmail: string | null
  rootCause: {
    category: string
    confidence: number
    ruleFired: string
    proposedAction: string
  } | null
  interventions: {
    id: string
    proposedAction: string
    channel: string | null
    requiresHuman: boolean
    decidedAt: string
    actions: {
      id: string
      mcpToolCalled: string
      result: string | null
      executedAt: string
    }[]
  }[]
  auditEntries: {
    id: string
    actor: string
    decision: string
    reason: string
    prevHash: string
    hash: string
    createdAt: string
  }[]
}

interface ReclaimStore {
  // Events
  events: ReclaimEvent[]
  eventsLoading: boolean
  fetchEvents: () => Promise<void>

  // Analytics
  analytics: AnalyticsSummary | null
  analyticsLoading: boolean
  fetchAnalytics: () => Promise<void>

  // Guardrail config
  guardrailConfig: GuardrailConfig | null
  guardrailLoading: boolean
  fetchGuardrailConfig: () => Promise<void>
  updateGuardrailConfig: (config: Partial<GuardrailConfig>) => Promise<void>

  // Batch run state
  batchRunning: boolean
  batchProgress: BatchProgress[]
  runBatch: () => Promise<void>
  clearBatchProgress: () => void

  // Merchant
  merchantId: string | null
  merchantName: string | null
  fetchMerchant: () => Promise<void>
}

export const useReclaimStore = create<ReclaimStore>((set, get) => ({
  // Events
  events: [],
  eventsLoading: false,
  fetchEvents: async () => {
    set({ eventsLoading: true })
    try {
      const res = await fetch('/api/events')
      const data = await res.json()
      set({ events: data.events ?? [] })
    } catch (err) {
      console.error('fetchEvents error:', err)
    } finally {
      set({ eventsLoading: false })
    }
  },

  // Analytics
  analytics: null,
  analyticsLoading: false,
  fetchAnalytics: async () => {
    set({ analyticsLoading: true })
    try {
      const res = await fetch('/api/analytics')
      const data = await res.json()
      set({ analytics: data })
    } catch (err) {
      console.error('fetchAnalytics error:', err)
    } finally {
      set({ analyticsLoading: false })
    }
  },

  // Guardrail config
  guardrailConfig: null,
  guardrailLoading: false,
  fetchGuardrailConfig: async () => {
    set({ guardrailLoading: true })
    try {
      const res = await fetch('/api/guardrails/config')
      const data = await res.json()
      set({ guardrailConfig: data.config })
    } catch (err) {
      console.error('fetchGuardrailConfig error:', err)
    } finally {
      set({ guardrailLoading: false })
    }
  },
  updateGuardrailConfig: async (config) => {
    try {
      const res = await fetch('/api/guardrails/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const data = await res.json()
      set({ guardrailConfig: data.config })
    } catch (err) {
      console.error('updateGuardrailConfig error:', err)
    }
  },

  // Batch run
  batchRunning: false,
  batchProgress: [],
  clearBatchProgress: () => set({ batchProgress: [] }),
  runBatch: async () => {
    set({ batchRunning: true, batchProgress: [] })

    const addProgress = (step: string, count?: number) => {
      set((state) => ({
        batchProgress: [
          ...state.batchProgress,
          { step, count, timestamp: new Date().toISOString() },
        ],
      }))
    }

    try {
      // Step 1: Ingest
      addProgress('Connecting to Razorpay API...')
      const ingestRes = await fetch('/api/ingest/batch', { method: 'POST' })
      const ingestData = await ingestRes.json()
      addProgress(`Ingested ${ingestData.ingested ?? 0} new events from Razorpay`, ingestData.ingested)

      // Step 2: Diagnose
      addProgress('Running root-cause diagnosis...')
      const diagnoseRes = await fetch('/api/diagnose', { method: 'POST' })
      const diagnoseData = await diagnoseRes.json()
      addProgress(`Diagnosed ${diagnoseData.diagnosed ?? 0} events`, diagnoseData.diagnosed)

      // Step 3: Guardrails
      addProgress('Evaluating guardrail policies...')
      const guardrailRes = await fetch('/api/guardrails', { method: 'POST' })
      const guardrailData = await guardrailRes.json()
      addProgress(
        `Guardrails: ${guardrailData.approved ?? 0} approved, ${guardrailData.blocked ?? 0} blocked`,
      )

      // Step 4: Execute
      addProgress('Executing recovery actions...')
      const executeRes = await fetch('/api/execute', { method: 'POST' })
      const executeData = await executeRes.json()
      addProgress(
        `Executed ${executeData.executed ?? 0} actions (${executeData.succeeded ?? 0} succeeded)`,
      )

      addProgress('Batch complete. Refreshing dashboard...')

      // Refresh data
      await get().fetchEvents()
      await get().fetchAnalytics()
    } catch (err) {
      console.error('runBatch error:', err)
      addProgress(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      set({ batchRunning: false })
    }
  },

  // Merchant
  merchantId: null,
  merchantName: null,
  fetchMerchant: async () => {
    try {
      const res = await fetch('/api/merchant')
      const data = await res.json()
      set({ merchantId: data.id, merchantName: data.name })
    } catch (err) {
      console.error('fetchMerchant error:', err)
    }
  },
}))
