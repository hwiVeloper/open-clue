// web/components/canvas/MemoNode.tsx
'use client'

import { memo, useState, useRef, useEffect } from 'react'
import { type NodeProps, type Node } from '@xyflow/react'

const PRESET_COLORS = [
  '#fde047', '#4ade80', '#60a5fa', '#f87171', '#c084fc',
  '#fb923c', '#f472b6', '#22d3ee', '#a3e635', '#a1a1aa',
]

export type MemoNodeData = {
  text: string
  color: string
  onUpdate: (patch: { text?: string; color?: string }) => void
  onDelete: () => void
} & Record<string, unknown>

function MemoNodeComponent({ data }: NodeProps<Node<MemoNodeData>>) {
  const { text, color, onUpdate, onDelete } = data
  const [editing, setEditing] = useState(!text)
  const [showColors, setShowColors] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [editing])

  return (
    <div
      className="rounded-lg shadow-lg min-w-[120px] max-w-[200px] select-none"
      style={{ backgroundColor: color + '20', borderLeft: `3px solid ${color}` }}
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

      <div className="px-2 pb-2">
        {editing ? (
          <textarea
            ref={textareaRef}
            className="w-full bg-transparent text-white text-xs resize-none outline-none min-h-[40px]"
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
    </div>
  )
}

export const MemoNode = memo(MemoNodeComponent)
