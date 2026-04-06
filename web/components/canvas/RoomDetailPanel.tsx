// web/components/canvas/RoomDetailPanel.tsx
'use client'

import { useState } from 'react'
import { Input, Textarea, Label } from '../ui/Input'
import type { Point, Room, Scenario, Action } from '../../lib/schema'

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
              const puzzleOnSuccess = point.puzzle?.on_success
              const puzzleMoveToAction = puzzleOnSuccess
                ? (Array.isArray(puzzleOnSuccess) ? puzzleOnSuccess : [puzzleOnSuccess]).find(a => a.type === 'move_to')
                : null
              const moveToRoom = (pointAction?.type === 'move_to'
                ? rooms.find(r => r.id === pointAction.value)
                : null) ?? (puzzleMoveToAction
                ? rooms.find(r => r.id === puzzleMoveToAction.value)
                : null)

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
                    <div>
                      <Label>액션</Label>
                      <select
                        className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white w-full"
                        value={point.action
                          ? (Array.isArray(point.action) ? point.action[0]?.type : point.action.type) ?? ''
                          : ''}
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
                    {!Array.isArray(point.action) && point.action?.type === 'move_to' && (
                      <div>
                        <Label>이동할 방</Label>
                        <select
                          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white w-full"
                          value={(point.action.value as string) ?? ''}
                          onChange={e => updatePoint(i, { action: { type: 'move_to', value: e.target.value } })}
                        >
                          <option value="">방 선택...</option>
                          {rooms.filter(r => r.id !== roomId).map(r => (
                            <option key={r.id} value={r.id}>{r.name || r.id}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {!Array.isArray(point.action) && point.action?.type === 'get_item' && (
                      <div>
                        <Label>아이템</Label>
                        <select
                          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white w-full"
                          value={(point.action.value as string) ?? ''}
                          onChange={e => updatePoint(i, { action: { type: 'get_item', value: e.target.value } })}
                        >
                          <option value="">아이템 선택...</option>
                          {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                        </select>
                      </div>
                    )}
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
                                }
                              : null,
                          })}
                          className="accent-green-500"
                        />
                        퍼즐 추가
                      </label>
                      {point.puzzle && (
                        <div className="mt-2 space-y-2 pl-3 border-l border-zinc-700">
                          {/* 퍼즐 타입 선택 */}
                          <div>
                            <Label>퍼즐 타입</Label>
                            <select
                              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white w-full"
                              value={point.puzzle.type}
                              onChange={e => updatePoint(i, { puzzle: { ...point.puzzle!, type: e.target.value as 'text_input' | 'key_sequence' | 'timer' } })}
                            >
                              <option value="text_input">텍스트 입력</option>
                              <option value="key_sequence">키 시퀀스</option>
                              <option value="timer">타이머</option>
                            </select>
                          </div>
                          <div>
                            <Label required>퍼즐 질문</Label>
                            <Textarea
                              value={point.puzzle.question}
                              onChange={e => updatePoint(i, { puzzle: { ...point.puzzle!, question: e.target.value } })}
                              placeholder={point.puzzle.type === 'key_sequence' ? '올바른 순서로 버튼을 누르시오.' : point.puzzle.type === 'timer' ? '제한 시간 안에 답을 입력하시오.' : '비밀번호는?'}
                              className="text-xs"
                            />
                          </div>
                          <div>
                            <Label required>정답</Label>
                            <Input
                              value={point.puzzle.answer_hash.startsWith('plain:') ? point.puzzle.answer_hash.slice(6) : point.puzzle.answer_hash}
                              onChange={e => updatePoint(i, { puzzle: { ...point.puzzle!, answer_hash: `plain:${e.target.value}` } })}
                              placeholder={point.puzzle.type === 'key_sequence' ? '↑↓←→' : '1234'}
                              className="text-xs"
                            />
                            {point.puzzle.type === 'key_sequence' && (
                              <p className="text-[10px] text-zinc-500 mt-0.5">시퀀스 정답을 텍스트로 입력 (SHA-256 해시로 변환됩니다)</p>
                            )}
                          </div>
                          <div>
                            <Label>힌트</Label>
                            <Input
                              value={point.puzzle.hint ?? ''}
                              onChange={e => updatePoint(i, { puzzle: { ...point.puzzle!, hint: e.target.value } })}
                              placeholder="숫자 4자리..."
                              className="text-xs"
                            />
                          </div>
                          {/* text_input / key_sequence: 최대 시도 */}
                          {(point.puzzle.type === 'text_input' || point.puzzle.type === 'key_sequence') && (
                            <div>
                              <Label>최대 시도</Label>
                              <Input
                                type="number"
                                min={1}
                                value={point.puzzle.max_attempts ?? ''}
                                onChange={e => updatePoint(i, { puzzle: { ...point.puzzle!, max_attempts: e.target.value ? parseInt(e.target.value) : null } })}
                                placeholder="무제한"
                                className="text-xs"
                              />
                            </div>
                          )}
                          {/* timer: 제한 시간 + 최대 시도 */}
                          {point.puzzle.type === 'timer' && (
                            <div>
                              <Label required>제한 시간(초)</Label>
                              <Input
                                type="number"
                                min={1}
                                value={point.puzzle.time_limit_seconds ?? ''}
                                onChange={e => updatePoint(i, { puzzle: { ...point.puzzle!, time_limit_seconds: e.target.value ? parseInt(e.target.value) : null } })}
                                placeholder="60"
                                className="text-xs"
                              />
                            </div>
                          )}
                          {point.puzzle.type === 'timer' && (
                            <div>
                              <Label>최대 시도</Label>
                              <Input
                                type="number"
                                min={1}
                                value={point.puzzle.max_attempts ?? ''}
                                onChange={e => updatePoint(i, { puzzle: { ...point.puzzle!, max_attempts: e.target.value ? parseInt(e.target.value) : null } })}
                                placeholder="무제한"
                                className="text-xs"
                              />
                            </div>
                          )}
                          {/* timer: 실패 메시지 */}
                          {point.puzzle.type === 'timer' && (
                            <div>
                              <Label>시간 초과 메시지</Label>
                              <Input
                                value={point.puzzle.fail_message ?? ''}
                                onChange={e => updatePoint(i, { puzzle: { ...point.puzzle!, fail_message: e.target.value || null } })}
                                placeholder="시간이 초과되었습니다!"
                                className="text-xs"
                              />
                            </div>
                          )}
                        </div>
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
