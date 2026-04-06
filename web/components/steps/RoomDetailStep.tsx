// web/components/steps/RoomDetailStep.tsx
'use client'

import { useState } from 'react'
import { Button } from '../ui/Button'
import { Input, Textarea, Label } from '../ui/Input'
import type { Point, Item, Room, Scenario, Action } from '../../lib/schema'

interface RoomDetailStepProps {
  scenario: Partial<Scenario>
  roomId: string
  onChange: (patch: Partial<Scenario>) => void
  onBack: () => void
}

function newPoint(): Point {
  return {
    id: `point-${Date.now()}`,
    name: '',
    description: '',
    hidden: false,
  }
}

function newItem(): Item {
  return {
    id: `item-${Date.now()}`,
    name: '',
    description: '',
    usable_on: [],
  }
}

export function RoomDetailStep({ scenario, roomId, onChange, onBack }: RoomDetailStepProps) {
  const rooms = scenario.rooms ?? []
  const room = rooms.find(r => r.id === roomId)
  const [expandedPoint, setExpandedPoint] = useState<string | null>(null)

  if (!room) return <div className="text-red-400">방을 찾을 수 없습니다.</div>

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
  const updateItem = (index: number, patch: Partial<Item>) => {
    onChange({ items: items.map((it, i) => i === index ? { ...it, ...patch } : it) })
  }
  const deleteItem = (index: number) => {
    onChange({ items: items.filter((_, i) => i !== index) })
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onBack}>← 방 목록</Button>
        <h2 className="text-lg font-semibold text-white">{room.name || '(이름 없음)'} 편집</h2>
      </div>

      {/* 포인트 목록 */}
      <div>
        <h3 className="text-sm font-medium text-zinc-300 mb-3">조사 지점 (Inspect Points)</h3>
        <div className="space-y-2">
          {room.points.map((point, i) => (
            <div key={point.id} className="bg-zinc-900 border border-zinc-700 rounded">
              <div className="flex items-center gap-2 p-3">
                <span className="text-xs text-zinc-600 font-mono">{point.id}</span>
                <Input
                  placeholder="지점 이름"
                  value={point.name}
                  onChange={e => updatePoint(i, { name: e.target.value })}
                  className="flex-1"
                />
                <Button variant="ghost" onClick={() => setExpandedPoint(expandedPoint === point.id ? null : point.id)}>
                  {expandedPoint === point.id ? '접기' : '상세'}
                </Button>
                <Button variant="danger" onClick={() => deletePoint(i)}>×</Button>
              </div>

              {expandedPoint === point.id && (
                <div className="border-t border-zinc-700 p-3 space-y-3">
                  <div>
                    <Label>설명</Label>
                    <Input value={point.description} onChange={e => updatePoint(i, { description: e.target.value })} placeholder="지점 설명" />
                  </div>
                  <div>
                    <Label>관찰 텍스트 (inspect 시 출력)</Label>
                    <Textarea value={point.observation ?? ''} onChange={e => updatePoint(i, { observation: e.target.value })} placeholder="자세히 살펴보니..." />
                  </div>

                  {/* 액션 타입 선택 */}
                  <div>
                    <Label>액션</Label>
                    <select
                      className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white w-full"
                      value={point.action ? (Array.isArray(point.action) ? point.action[0]?.type : point.action.type) ?? '' : ''}
                      onChange={e => {
                        const t = e.target.value as Action['type']
                        if (!t) { updatePoint(i, { action: null }); return }
                        updatePoint(i, { action: { type: t, value: null } })
                      }}
                    >
                      <option value="">없음</option>
                      <option value="get_item">아이템 획득</option>
                      <option value="move_to">방 이동</option>
                      <option value="set_flag">플래그 설정</option>
                      <option value="game_clear">게임 클리어</option>
                    </select>
                  </div>

                  {/* move_to 값 */}
                  {!Array.isArray(point.action) && point.action?.type === 'move_to' && (
                    <div>
                      <Label>이동할 방 ID</Label>
                      <Input
                        value={(point.action.value as string) ?? ''}
                        onChange={e => updatePoint(i, { action: { type: 'move_to', value: e.target.value } })}
                        placeholder="room-xxx"
                      />
                    </div>
                  )}

                  {/* get_item 값 */}
                  {!Array.isArray(point.action) && point.action?.type === 'get_item' && (
                    <div>
                      <Label>아이템 ID</Label>
                      <select
                        className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white w-full"
                        value={(point.action.value as string) ?? ''}
                        onChange={e => updatePoint(i, { action: { type: 'get_item', value: e.target.value } })}
                      >
                        <option value="">아이템 선택...</option>
                        {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                      </select>
                    </div>
                  )}

                  {/* 퍼즐 */}
                  <div>
                    <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!point.puzzle}
                        onChange={e => updatePoint(i, {
                          puzzle: e.target.checked
                            ? { type: 'text_input', question: '', answer_hash: 'plain:', hint: null, max_attempts: null, time_limit_seconds: null, fail_message: null, on_success: { type: 'game_clear', value: null } }
                            : null
                        })}
                        className="accent-green-500"
                      />
                      퍼즐 추가
                    </label>
                    {point.puzzle && (
                      <div className="mt-2 space-y-2 pl-4 border-l border-zinc-700">
                        <div>
                          <Label required>퍼즐 질문</Label>
                          <Textarea value={point.puzzle.question} onChange={e => updatePoint(i, { puzzle: { ...point.puzzle!, question: e.target.value } })} placeholder="비밀번호는?" />
                        </div>
                        <div>
                          <Label required>정답 (plain: 접두사 자동 처리)</Label>
                          <Input
                            value={point.puzzle.answer_hash.startsWith('plain:') ? point.puzzle.answer_hash.slice(6) : point.puzzle.answer_hash}
                            onChange={e => updatePoint(i, { puzzle: { ...point.puzzle!, answer_hash: `plain:${e.target.value}` } })}
                            placeholder="1234"
                          />
                        </div>
                        <div>
                          <Label>힌트</Label>
                          <Input value={point.puzzle.hint ?? ''} onChange={e => updatePoint(i, { puzzle: { ...point.puzzle!, hint: e.target.value } })} placeholder="숫자 4자리..." />
                        </div>
                        <div>
                          <Label>최대 시도 횟수</Label>
                          <Input type="number" min={1} value={point.puzzle.max_attempts ?? ''} onChange={e => updatePoint(i, { puzzle: { ...point.puzzle!, max_attempts: e.target.value ? parseInt(e.target.value) : null } })} placeholder="무제한" />
                        </div>
                        <div>
                          <Label>제한 시간 (초)</Label>
                          <Input type="number" min={1} value={point.puzzle.time_limit_seconds ?? ''} onChange={e => updatePoint(i, { puzzle: { ...point.puzzle!, time_limit_seconds: e.target.value ? parseInt(e.target.value) : null } })} placeholder="없음" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <Button variant="secondary" onClick={() => updateRoom({ points: [...room.points, newPoint()] })} className="mt-3">
          + 지점 추가
        </Button>
      </div>

      {/* 아이템 */}
      <div>
        <h3 className="text-sm font-medium text-zinc-300 mb-3">아이템 관리</h3>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={item.id} className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded p-3">
              <span className="text-xs text-zinc-600 font-mono shrink-0">{item.id}</span>
              <Input value={item.name} onChange={e => updateItem(i, { name: e.target.value })} placeholder="아이템 이름" />
              <Input value={item.description} onChange={e => updateItem(i, { description: e.target.value })} placeholder="설명" />
              <Button variant="danger" onClick={() => deleteItem(i)}>×</Button>
            </div>
          ))}
        </div>
        <Button variant="secondary" onClick={() => onChange({ items: [...items, newItem()] })} className="mt-3">
          + 아이템 추가
        </Button>
      </div>
    </div>
  )
}
