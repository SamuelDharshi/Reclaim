'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { CategoryMetrics } from '@/lib/types'
import { formatINRCompact } from '@/lib/types'

interface FlowNode {
  key: string
  label: string
  value: number
  color: string
  y: number
  height: number
}

interface FlowLink {
  sourceY: number
  sourceHeight: number
  targetY: number
  targetHeight: number
  value: number
  color: string
}

const WIDTH = 900
const HEIGHT = 340
const COL_X = [40, 340, 640]
const NODE_WIDTH = 14
const GAP = 10

const OUTCOME_COLORS: Record<string, string> = {
  recovered: '#1F9D55',
  pending: '#F5A524',
  stopped: '#64748B',
}

function layoutColumn(items: { key: string; label: string; value: number; color: string }[], x: number) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1
  const usableHeight = HEIGHT - GAP * Math.max(items.length - 1, 0)
  let cursor = 0
  return items.map((item) => {
    const height = Math.max((item.value / total) * usableHeight, items.length > 0 ? 4 : 0)
    const node: FlowNode = { key: item.key, label: item.label, value: item.value, color: item.color, y: cursor, height }
    cursor += height + GAP
    return node
  })
}

function linkPath(x1: number, y1: number, h1: number, x2: number, y2: number, h2: number) {
  const midX = (x1 + x2) / 2
  return `M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}
          L${x2},${y2 + h2} C${midX},${y2 + h2} ${midX},${y1 + h1} ${x1},${y1 + h1} Z`
}

export function SankeyDiagram({ categories }: { categories: CategoryMetrics[] }) {
  const active = categories.filter((c) => c.totalEvents > 0)

  const { sourceNode, categoryNodes, outcomeNodes, links } = useMemo(() => {
    if (active.length === 0) {
      return { sourceNode: null, categoryNodes: [], outcomeNodes: [], links: [] as FlowLink[] }
    }

    const catItems = active.map((c) => ({
      key: c.type,
      label: c.label,
      value: c.totalAtRisk + c.totalRecovered + c.totalStopped,
      color: '#0D94FB',
    }))
    const categoryNodes = layoutColumn(catItems, COL_X[1])

    const totalValue = catItems.reduce((s, i) => s + i.value, 0)
    const sourceNode: FlowNode = {
      key: 'source',
      label: 'All Revenue Events',
      value: totalValue,
      color: '#0D94FB',
      y: 0,
      height: HEIGHT,
    }

    const recovered = active.reduce((s, c) => s + c.totalRecovered, 0)
    const pending = active.reduce((s, c) => s + c.totalAtRisk, 0)
    const stopped = active.reduce((s, c) => s + c.totalStopped, 0)
    const outcomeItems = [
      { key: 'recovered', label: 'Recovered', value: recovered, color: OUTCOME_COLORS.recovered },
      { key: 'pending', label: 'Pending', value: pending, color: OUTCOME_COLORS.pending },
      { key: 'stopped', label: 'Stopped', value: stopped, color: OUTCOME_COLORS.stopped },
    ].filter((o) => o.value > 0)
    const outcomeNodes = layoutColumn(outcomeItems, COL_X[2])

    const links: FlowLink[] = []

    // source -> categories
    let srcCursor = 0
    for (const cat of categoryNodes) {
      links.push({
        sourceY: srcCursor,
        sourceHeight: cat.height,
        targetY: cat.y,
        targetHeight: cat.height,
        value: cat.value,
        color: 'rgba(13,148,251,0.25)',
      })
      srcCursor += cat.height
    }

    // categories -> outcomes (recovered/pending/stopped), value-proportional split within each category band
    for (const catMeta of active) {
      const catNode = categoryNodes.find((n) => n.key === catMeta.type)
      if (!catNode) continue
      const parts = [
        { key: 'recovered', value: catMeta.totalRecovered },
        { key: 'pending', value: catMeta.totalAtRisk },
        { key: 'stopped', value: catMeta.totalStopped },
      ].filter((p) => p.value > 0)
      const partTotal = parts.reduce((s, p) => s + p.value, 0) || 1
      let localCursor = catNode.y
      for (const part of parts) {
        const outcomeNode = outcomeNodes.find((n) => n.key === part.key)
        if (!outcomeNode) continue
        const h = (part.value / partTotal) * catNode.height
        links.push({
          sourceY: localCursor,
          sourceHeight: h,
          targetY: outcomeNode.y,
          targetHeight: h,
          value: part.value,
          color:
            part.key === 'recovered'
              ? 'rgba(31,157,85,0.3)'
              : part.key === 'pending'
              ? 'rgba(245,165,36,0.28)'
              : 'rgba(100,116,139,0.28)',
        })
        localCursor += h
      }
    }

    return { sourceNode, categoryNodes, outcomeNodes, links }
  }, [active])

  if (!sourceNode) {
    return (
      <div className="flex items-center justify-center h-[280px] text-muted text-sm">
        No revenue events yet. Click &ldquo;Run Batch&rdquo; to ingest from Razorpay.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT + 40}`} width="100%" style={{ minWidth: 640 }}>
        <g transform="translate(0, 10)">
          {/* source -> category links */}
          {categoryNodes.map((cat, i) => {
            const link = links[i]
            return (
              <motion.path
                key={`s-${cat.key}`}
                d={linkPath(
                  COL_X[0] + NODE_WIDTH,
                  link.sourceY,
                  link.sourceHeight,
                  COL_X[1],
                  link.targetY,
                  link.targetHeight
                )}
                fill={link.color}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
              />
            )
          })}

          {/* category -> outcome links */}
          {links.slice(categoryNodes.length).map((link, i) => (
            <motion.path
              key={`c-${i}`}
              d={linkPath(
                COL_X[1] + NODE_WIDTH,
                link.sourceY,
                link.sourceHeight,
                COL_X[2],
                link.targetY,
                link.targetHeight
              )}
              fill={link.color}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 + i * 0.05 }}
            />
          ))}

          {/* source node */}
          <rect
            x={COL_X[0]}
            y={sourceNode.y}
            width={NODE_WIDTH}
            height={sourceNode.height}
            rx={4}
            fill={sourceNode.color}
          />
          <text x={COL_X[0] - 8} y={sourceNode.height / 2} textAnchor="end" fill="#E2E8F0" fontSize="12" fontWeight={600}>
            Total At Risk
          </text>
          <text x={COL_X[0] - 8} y={sourceNode.height / 2 + 16} textAnchor="end" fill="#94A3B8" fontSize="11">
            {formatINRCompact(sourceNode.value)}
          </text>

          {/* category nodes */}
          {categoryNodes.map((n) => (
            <g key={n.key}>
              <rect x={COL_X[1]} y={n.y} width={NODE_WIDTH} height={n.height} rx={4} fill={n.color} />
              <text x={COL_X[1] + NODE_WIDTH + 10} y={n.y + n.height / 2 - 2} fill="#E2E8F0" fontSize="12" fontWeight={600}>
                {n.label}
              </text>
              <text x={COL_X[1] + NODE_WIDTH + 10} y={n.y + n.height / 2 + 14} fill="#94A3B8" fontSize="11">
                {formatINRCompact(n.value)}
              </text>
            </g>
          ))}

          {/* outcome nodes */}
          {outcomeNodes.map((n) => (
            <g key={n.key}>
              <rect x={COL_X[2]} y={n.y} width={NODE_WIDTH} height={n.height} rx={4} fill={n.color} />
              <text x={COL_X[2] + NODE_WIDTH + 10} y={n.y + n.height / 2 - 2} fill="#E2E8F0" fontSize="12" fontWeight={600}>
                {n.label}
              </text>
              <text x={COL_X[2] + NODE_WIDTH + 10} y={n.y + n.height / 2 + 14} fill="#94A3B8" fontSize="11">
                {formatINRCompact(n.value)}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}
