// web/components/canvas/RoomDetailPanel.tsx
'use client'

import { useState } from 'react'
import { Input, Textarea, Label } from '../ui/Input'
import type { Point, Room, Scenario } from '../../lib/schema'
import { ActionListEditor } from './ActionListEditor'
import { PointRequirementsEditor } from './PointRequirementsEditor'
import { PuzzleEditor } from './PuzzleEditor'

interface RoomDetailPanelProps {
  scenario: Partial<Scenario>
  roomId: string
  onChange: (patch: Partial<Scenario>) => void
  onClose: () => void
}

function newPoint(): Point {
  return {
    id: `point-${Date.now()}`,
    name: '',
    description: '',
    hidden: false,
  }
}

export function RoomDetailPanel({ scenario, roomId, onChange, onClose }: RoomDetailPanelProps) {
  const rooms = scenario.rooms ?? []
  const room = rooms.find(r => r.id === roomId)
  const [expandedPoint, setExpandedPoint] = useState<string | null>(null)

  if (!room) return null

  const updateRoom = (patch: Partial<Room>) => {
    onChange({ rooms: rooms.map(r => r.id === roomId ? { ...r, ...patch } : r) })
  }

  const updatePoint = (index: number, patch: Partial<Point>) => {
    const next = room.points.map((p, i) => i === index ? { ...p, ...patch } : p)
    updateRoom({ points: next })
  }

  const deletePoint = (index: number) => {
    updateRoom({ points: room.points.filter((_, i) => i !== index) })
  }

  const items = scenario.items ?? []
  // 다른 방 포함 모든 포인트 ID (solved_puzzle 드롭다운용)
  const allPointIds = (scenario.rooms ?? []).flatMap(r => r.points.map(p => p.id))

  return (
    <div className="absolute top-0 right-0 h-full w-[380px] bg-zinc-950 border-l border-zinc-800 flex flex-col z-10 shadow-2xl">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
        <div className="flex-1 min-w-0">
          <input
            className="bg-transparent text-white font-semibold text-sm w-full focus:outline-none border-b border-transparent focus:border-zinc-600"
            value={room.name}
            onChange={e => updateRoom({ name: e.target.value })}
            placeholder="방 이름"
          />
          <input
            className="bg-transparent text-zinc-500 text-xs w-full mt-0.5 focus:outline-none"
            value={room.description}
            onChange={e => updateRoom({ description: e.target.value })}
            placeholder="방 설명"
          />
        </div>
        <button
          onClick={onClose}
          className="text-zinc-600 hover:text-zinc-300 text-lg leading-none px-1"
          title="닫기"
        >
          ✕
        </button>
      </div>

      {/* 포인트 목록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
            조사 지점
          </h3>
          <div className="space-y-2">
            {room.points.map((point, i) => {
              const pointAction = !Array.isArray(point.action) ? point.action : null
              const moveToRoom = pointAction?.type === 'move_to'
                ? rooms.find(r => r.id === pointAction.value)
                : null

              return (
              <div key={point.id} className="bg-zinc-900 border border-zinc-800 rounded">
                <div className="flex items-center gap-2 p-2">
                  <div className="flex-1 min-w-0">
                    <Input
                      placeholder="지점 이름"
                      value={point.name}
                      onChange={e => updatePoint(i, { name: e.target.value })}
                      className="text-xs w-full"
                    />
                    {moveToRoom && (
                      <div className="text-[10px] text-blue-400 mt-0.5 pl-1 truncate">
                        → {moveToRoom.name || moveToRoom.id}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setExpandedPoint(expandedPoint === point.id ? null : point.id)}
                    className="text-xs text-zinc-500 hover:text-zinc-300 px-1 shrink-0"
                  >
                    {expandedPoint === point.id ? '접기' : '상세'}
                  </button>
                  <button
                    onClick={() => deletePoint(i)}
                    className="text-zinc-600 hover:text-red-400 text-xs px-1 shrink-0"
                  >
                    ✕
                  </button>
                </div>

                {expandedPoint === point.id && (
                  <div className="border-t border-zinc-800 p-2 space-y-2">
                    <div>
                      <Label>설명</Label>
                      <Input
                        value={point.description}
                        onChange={e => updatePoint(i, { description: e.target.value })}
                        placeholder="지점 설명"
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <Label>관찰 텍스트</Label>
                      <Textarea
                        value={point.observation ?? ''}
                        onChange={e => updatePoint(i, { observation: e.target.value })}
                        placeholder="자세히 살펴보니..."
                        className="text-xs"
                      />
                    </div>
                    {/* 잠금 조건 */}
                    <div>
                      <Label>잠금 조건</Label>
                      <PointRequirementsEditor
                        value={point.requirements}
                        onChange={v => updatePoint(i, { requirements: v })}
                        items={items}
                        allPointIds={allPointIds.filter(id => id !== point.id)}
                      />
                    </div>

                    {/* 복합 액션 */}
                    <div>
                      <Label>액션</Label>
                      <ActionListEditor
                        value={point.action}
                        onChange={v => updatePoint(i, { action: v })}
                        rooms={rooms.filter(r => r.id !== roomId)}
                        items={items}
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!point.puzzle}
                          onChange={e => updatePoint(i, {
                            puzzle: e.target.checked
                              ? {
                                  type: 'text_input',
                                  question: '',
                                  answer_hash: 'plain:',
                                  hint: null,
                                  max_attempts: null,
                                  time_limit_seconds: null,
                                  fail_message: null,
                                  on_success: { type: 'game_clear', value: null },
                                  keys: [],
                                  sequence: [],
                                }
                              : null,
                          })}
                          className="accent-green-500"
                        />
                        퍼즐 추가
                      </label>
                      {point.puzzle && (
                        <PuzzleEditor
                          value={point.puzzle}
                          onChange={puz => updatePoint(i, { puzzle: puz })}
                          rooms={rooms.filter(r => r.id !== roomId)}
                          items={items}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          </div>
          <button
            onClick={() => updateRoom({ points: [...room.points, newPoint()] })}
            className="mt-2 text-xs text-zinc-500 hover:text-green-400 px-2 py-1 rounded border border-dashed border-zinc-700 hover:border-green-700 w-full"
          >
            + 지점 추가
          </button>
        </div>
      </div>
    </div>
  )
}
