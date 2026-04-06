// web/components/canvas/EdgeWithDelete.tsx
'use client'

import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react'

interface EdgeData extends Record<string, unknown> {
  pointName: string
  targetRoomName: string
  onDelete: () => void
}

export function EdgeWithDelete(props: EdgeProps) {
  const {
    id,
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    data,
    markerEnd,
    style,
  } = props

  const { pointName, targetRoomName, onDelete } = (data ?? {}) as EdgeData

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 rounded-full px-2.5 py-1 text-[11px] shadow-md">
            <span className="text-zinc-200 max-w-[80px] truncate">{pointName || '이동'}</span>
            <span className="text-zinc-600">→</span>
            <span className="text-zinc-400 max-w-[70px] truncate">{targetRoomName}</span>
            <button
              onClick={e => { e.stopPropagation(); onDelete() }}
              className="ml-0.5 text-zinc-600 hover:text-red-400 transition-colors leading-none"
              title="연결 삭제"
            >
              ✕
            </button>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
