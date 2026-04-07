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
  const containerRef = useRef<HTMLDivElement>(null)

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    const startW = width
    const startH = height
    const el = containerRef.current

    const onMove = (ev: MouseEvent) => {
      if (!el) return
      const newW = Math.max(150, startW + ev.clientX - startX)
      const newH = Math.max(100, startH + ev.clientY - startY)
      el.style.width = newW + 'px'
      el.style.height = newH + 'px'
    }
    const onUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      const finalW = Math.max(150, startW + ev.clientX - startX)
      const finalH = Math.max(100, startH + ev.clientY - startY)
      setTimeout(() => onUpdate({ width: finalW, height: finalH }), 0)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [width, height, onUpdate])

  return (
    <div
      ref={containerRef}
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
        className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize nopan nodrag"
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
