// web/components/canvas/RoomNode.tsx
'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { Room } from '../../lib/schema'

export type RoomNodeData = {
  room: Room
  isStart: boolean
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  onSetStart: () => void
} & Record<string, unknown>

function RoomNodeComponent({ data }: NodeProps<Node<RoomNodeData>>) {
  const { room, isStart, isSelected, onSelect, onDelete, onSetStart } = data

  return (
    <div
      onClick={onSelect}
      className={`
        relative bg-zinc-900 border-2 rounded-lg p-3 min-w-[140px] cursor-pointer select-none
        transition-all duration-150
        ${isSelected
          ? 'border-green-400 shadow-lg shadow-green-900/40'
          : isStart
          ? 'border-green-700 hover:border-green-500'
          : 'border-zinc-700 hover:border-zinc-500'
        }
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-zinc-600 border-2 border-zinc-500 hover:bg-green-500"
      />

      {isStart && (
        <div className="absolute -top-2.5 left-2 bg-green-500 text-black text-[10px] font-bold px-1.5 rounded-full">
          START
        </div>
      )}

      <div className="text-sm font-semibold text-white truncate max-w-[160px]">
        {room.name || '(이름 없음)'}
      </div>

      <div className="text-xs text-zinc-500 mt-1">
        {room.points.length}개 포인트
      </div>
      {(room.npcs?.length ?? 0) > 0 && (
        <div className="text-xs text-purple-400 mt-0.5">
          {room.npcs!.length}명 NPC
        </div>
      )}

      <div className="flex gap-1 mt-2">
        {!isStart && (
          <button
            onClick={e => { e.stopPropagation(); onSetStart() }}
            className="text-[10px] text-zinc-500 hover:text-green-400 px-1 py-0.5 rounded hover:bg-zinc-800"
            title="시작 방으로 지정"
          >
            ★ 시작
          </button>
        )}
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="text-[10px] text-zinc-600 hover:text-red-400 px-1 py-0.5 rounded hover:bg-zinc-800 ml-auto"
          title="방 삭제"
        >
          ✕
        </button>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-zinc-600 border-2 border-zinc-500 hover:bg-green-500"
      />
    </div>
  )
}

export const RoomNode = memo(RoomNodeComponent)
