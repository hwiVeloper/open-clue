// web/components/canvas/GroupNode.tsx
'use client'

import { memo, useState, useRef, useCallback } from 'react'
import { type NodeProps, type Node } from '@xyflow/react'

export type GroupNodeData = {
  label: string
  width: number
  height: number
  color: string
  onUpdate: (patch: { label?: string; width?: number; height?: number; color?: string }) => void
  onDelete: () => void
} & Record<string, unknown>

function GroupNodeComponent({ data }: NodeProps<Node<GroupNodeData>>) {
  const { label, width, height, color, onUpdate, onDelete } = data
  const [editing, setEditing] = useState(false)
  const resizingRef = useRef(false)
  const startRef = useRef({ x: 0, y: 0, w: 0, h: 0 })

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    resizingRef.current = true
    startRef.current = { x: e.clientX, y: e.clientY, w: width, h: height }

    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return
      const newW = Math.max(150, startRef.current.w + ev.clientX - startRef.current.x)
      const newH = Math.max(100, startRef.current.h + ev.clientY - startRef.current.y)
      onUpdate({ width: newW, height: newH })
    }
    const onUp = () => {
      resizingRef.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [width, height, onUpdate])

  return (
    <div
      className="rounded-lg border-2 border-dashed relative"
      style={{
        width,
        height,
        borderColor: color + '80',
        backgroundColor: color + '08',
      }}
    >
      {/* 라벨 */}
      <div className="absolute -top-3 left-3 flex items-center gap-1">
        {editing ? (
          <input
            className="bg-zinc-800 text-white text-xs px-2 py-0.5 rounded outline-none border border-zinc-600"
            value={label}
            onChange={e => onUpdate({ label: e.target.value })}
            onBlur={() => setEditing(false)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditing(false) }}
            autoFocus
          />
        ) : (
          <span
            className="text-xs font-medium px-2 py-0.5 rounded cursor-pointer"
            style={{ backgroundColor: color + '30', color: color }}
            onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
          >
            {label || '그룹'}
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="text-[10px] text-zinc-600 hover:text-red-400 px-1"
        >
          ✕
        </button>
      </div>

      {/* 리사이즈 핸들 */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
        onMouseDown={onResizeStart}
      >
        <svg viewBox="0 0 16 16" className="w-full h-full text-zinc-600 hover:text-zinc-400">
          <path d="M14 14L8 14M14 14L14 8M14 14L6 6" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </div>
    </div>
  )
}

export const GroupNode = memo(GroupNodeComponent)
