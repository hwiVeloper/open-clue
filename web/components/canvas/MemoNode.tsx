// web/components/canvas/MemoNode.tsx
'use client'

import { memo, useState, useRef, useEffect, useCallback } from 'react'
import { type NodeProps, type Node } from '@xyflow/react'

const PRESET_COLORS = [
  '#fde047', '#4ade80', '#60a5fa', '#f87171', '#c084fc',
  '#fb923c', '#f472b6', '#22d3ee', '#a3e635', '#a1a1aa',
]

export type MemoNodeData = {
  text: string
  color: string
  width: number
  height: number
  onUpdate: (patch: { text?: string; color?: string; width?: number; height?: number }) => void
  onDelete: () => void
} & Record<string, unknown>

function MemoNodeComponent({ data }: NodeProps<Node<MemoNodeData>>) {
  const { text, color, width, height, onUpdate, onDelete } = data
  const [editing, setEditing] = useState(!text)
  const [showColors, setShowColors] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editing && textareaRef.current) textareaRef.current.focus()
  }, [editing])

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
      const newW = Math.max(120, startW + ev.clientX - startX)
      const newH = Math.max(60, startH + ev.clientY - startY)
      el.style.width = newW + 'px'
      el.style.height = newH + 'px'
    }
    const onUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      const finalW = Math.max(120, startW + ev.clientX - startX)
      const finalH = Math.max(60, startH + ev.clientY - startY)
      setTimeout(() => onUpdate({ width: finalW, height: finalH }), 0)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [width, height, onUpdate])

  return (
    <div
      ref={containerRef}
      className="rounded-lg shadow-lg select-none relative"
      style={{ backgroundColor: color + '20', borderLeft: `3px solid ${color}`, width, height }}
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
    >
      <div className="flex items-center justify-between px-2 py-1 gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); setShowColors(!showColors) }}
          className="w-3 h-3 rounded-full shrink-0 border border-white/30 hover:scale-125 transition-transform"
          style={{ backgroundColor: color }}
          title="색상 변경"
        />
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="text-[10px] text-zinc-500 hover:text-red-400 leading-none"
        >
          ✕
        </button>
      </div>

      {showColors && (
        <div className="flex flex-wrap gap-1 px-2 pb-1">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={(e) => { e.stopPropagation(); onUpdate({ color: c }); setShowColors(false) }}
              className="w-4 h-4 rounded-full border border-white/20 hover:scale-125 transition-transform"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}

      <div className="px-2 pb-2 overflow-auto absolute inset-x-0 bottom-0 top-[28px]">
        {editing ? (
          <textarea
            ref={textareaRef}
            className="w-full h-full bg-transparent text-white text-xs resize-none outline-none"
            value={text}
            onChange={e => onUpdate({ text: e.target.value })}
            onBlur={() => setEditing(false)}
            onKeyDown={e => { if (e.key === 'Escape') setEditing(false) }}
            placeholder="메모 입력..."
          />
        ) : (
          <div className="text-xs text-zinc-300 whitespace-pre-wrap min-h-[20px]">
            {text || <span className="text-zinc-600 italic">더블클릭하여 편집</span>}
          </div>
        )}
      </div>

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

export const MemoNode = memo(MemoNodeComponent)
