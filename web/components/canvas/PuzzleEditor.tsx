// web/components/canvas/PuzzleEditor.tsx
'use client'

import { Input, Textarea, Label } from '../ui/Input'
import { ActionListEditor } from './ActionListEditor'
import type { Puzzle, Scenario } from '../../lib/schema'

interface PuzzleEditorProps {
  value: Puzzle
  onChange: (p: Puzzle) => void
  rooms: Scenario['rooms']
  items: Scenario['items']
}

const TABS = [
  { type: 'text_input', label: '✏️ 텍스트' },
  { type: 'key_sequence', label: '🔢 시퀀스' },
  { type: 'timer', label: '⏱️ 타이머' },
] as const

export function PuzzleEditor({ value, onChange, rooms, items }: PuzzleEditorProps) {
  const p = value
  const update = (patch: Partial<Puzzle>) => onChange({ ...p, ...patch })

  return (
    <div className="space-y-2 pl-3 border-l border-zinc-700">
      {/* 타입 탭 */}
      <div className="flex gap-1">
        {TABS.map(tab => (
          <button
            key={tab.type}
            onClick={() => update({
              type: tab.type,
              answer_hash: tab.type === 'key_sequence' ? '' : (p.answer_hash || 'plain:'),
              keys: p.keys ?? [],
              sequence: p.sequence ?? [],
            })}
            className={`text-[10px] px-2 py-1 rounded border transition-colors ${
              p.type === tab.type
                ? 'bg-zinc-700 border-zinc-500 text-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 공통: 퍼즐 질문 */}
      <div>
        <Label required>퍼즐 질문</Label>
        <Textarea
          value={p.question}
          onChange={e => update({ question: e.target.value })}
          placeholder="비밀번호는?"
          className="text-xs"
        />
      </div>

      {/* text_input 전용 */}
      {p.type === 'text_input' && (
        <div>
          <Label required>정답</Label>
          <Input
            value={p.answer_hash.startsWith('plain:') ? p.answer_hash.slice(6) : p.answer_hash}
            onChange={e => update({ answer_hash: `plain:${e.target.value}` })}
            placeholder="1234"
            className="text-xs"
          />
        </div>
      )}

      {/* key_sequence 전용 */}
      {p.type === 'key_sequence' && (
        <div className="space-y-2">
          <div>
            <Label required>버튼 레이블 <span className="text-zinc-600 font-normal">(쉼표로 구분)</span></Label>
            <Input
              value={(p.keys ?? []).join(', ')}
              onChange={e => update({
                keys: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
              })}
              placeholder="↑, ↓, ←, →"
              className="text-xs font-mono"
            />
          </div>
          <div>
            <Label required>정답 순서 <span className="text-zinc-600 font-normal">(버튼 클릭으로 추가)</span></Label>
            <div className="flex flex-wrap gap-1 mb-1">
              {(p.keys ?? []).map((k, ki) => (
                <button
                  key={ki}
                  onClick={() => update({ sequence: [...(p.sequence ?? []), k] })}
                  className="text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5 hover:border-blue-600 hover:text-blue-400"
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 text-xs text-zinc-400 bg-zinc-900 rounded px-2 py-1 min-h-[28px]">
              {(p.sequence ?? []).length === 0
                ? <span className="text-zinc-600">위 버튼을 클릭해 순서를 구성하세요</span>
                : (p.sequence ?? []).map((s, si) => (
                    <span key={si} className="bg-zinc-700 rounded px-1">{s}</span>
                  ))
              }
              {(p.sequence ?? []).length > 0 && (
                <button
                  onClick={() => update({ sequence: (p.sequence ?? []).slice(0, -1) })}
                  className="ml-auto text-zinc-600 hover:text-red-400 text-[10px]"
                >✕ 마지막 삭제</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* timer 전용 */}
      {p.type === 'timer' && (
        <div className="space-y-2">
          <div>
            <Label required>정답</Label>
            <Input
              value={p.answer_hash.startsWith('plain:') ? p.answer_hash.slice(6) : p.answer_hash}
              onChange={e => update({ answer_hash: `plain:${e.target.value}` })}
              placeholder="1234"
              className="text-xs"
            />
          </div>
          <div>
            <Label required>제한 시간 (초)</Label>
            <Input
              type="number"
              min={1}
              value={p.time_limit_seconds ?? ''}
              onChange={e => update({ time_limit_seconds: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="30"
              className="text-xs"
            />
          </div>
          <div>
            <Label>시간 초과 메시지</Label>
            <Input
              value={p.fail_message ?? ''}
              onChange={e => update({ fail_message: e.target.value || null })}
              placeholder="시간이 다 됐다!"
              className="text-xs"
            />
          </div>
        </div>
      )}

      {/* 공통: 힌트, 최대 시도 */}
      <div>
        <Label>힌트</Label>
        <Input
          value={p.hint ?? ''}
          onChange={e => update({ hint: e.target.value || null })}
          placeholder="숫자 4자리..."
          className="text-xs"
        />
      </div>

      {p.type !== 'timer' && (
        <div>
          <Label>최대 시도 횟수</Label>
          <Input
            type="number"
            min={1}
            value={p.max_attempts ?? ''}
            onChange={e => update({ max_attempts: e.target.value ? parseInt(e.target.value) : null })}
            placeholder="무제한"
            className="text-xs"
          />
        </div>
      )}

      {/* 성공 시 액션 */}
      <div>
        <Label required>성공 시 액션</Label>
        <ActionListEditor
          value={p.on_success}
          onChange={v => update({ on_success: v ?? { type: 'game_clear', value: null } })}
          rooms={rooms}
          items={items}
        />
      </div>
    </div>
  )
}
