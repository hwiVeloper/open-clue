// web/components/canvas/PointRequirementsEditor.tsx
'use client'

import { Input } from '../ui/Input'
import type { Requirements, Scenario } from '../../lib/schema'

interface PointRequirementsEditorProps {
  value: Requirements | null | undefined
  onChange: (v: Requirements | null) => void
  items: Scenario['items']
  allPointIds: string[]  // 다른 방의 퍼즐 포인트 ID 목록
}

const empty: Requirements = { item_id: null, flag: null, solved_puzzle: null }
const selectCls = 'bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white w-full'

export function PointRequirementsEditor({
  value,
  onChange,
  items,
  allPointIds,
}: PointRequirementsEditorProps) {
  const req = value ?? empty

  const set = (patch: Partial<Requirements>) => {
    const next = { ...req, ...patch }
    const isEmpty = !next.item_id && !next.flag && !next.solved_puzzle
    onChange(isEmpty ? null : next)
  }

  return (
    <div className="space-y-2 p-2 bg-zinc-950 border border-red-900/40 rounded">
      <div className="text-[10px] text-red-400 font-medium">🔒 잠금 조건 <span className="text-zinc-600">(없으면 항상 접근 가능)</span></div>

      {/* 아이템 소지 */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={!!req.item_id}
          disabled={items.length === 0}
          onChange={e => set({ item_id: e.target.checked ? (items[0]?.id ?? '') : null })}
          className="accent-red-500 shrink-0 disabled:opacity-40"
        />
        <span className={`text-xs shrink-0 ${items.length === 0 ? 'text-zinc-600' : 'text-zinc-400'}`}>
          아이템 필요{items.length === 0 ? ' (아이템 없음)' : ''}
        </span>
        {req.item_id !== null && req.item_id !== undefined && (
          <select
            className={selectCls}
            value={req.item_id}
            onChange={e => set({ item_id: e.target.value })}
          >
            <option value="">아이템 선택...</option>
            {items.map(it => (
              <option key={it.id} value={it.id}>{it.name || it.id}</option>
            ))}
          </select>
        )}
      </div>

      {/* 플래그 조건 */}
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={!!req.flag}
          onChange={e => set({ flag: e.target.checked ? {} : null })}
          className="accent-red-500 shrink-0 mt-1"
        />
        <span className="text-xs text-zinc-400 shrink-0 mt-1">플래그 조건</span>
        {req.flag !== null && req.flag !== undefined && (
          <Input
            className="text-[10px] font-mono flex-1"
            placeholder='{"door_open": true}'
            value={JSON.stringify(req.flag)}
            onChange={e => {
              try { set({ flag: JSON.parse(e.target.value) }) }
              catch { /* 파싱 실패 시 무시 */ }
            }}
          />
        )}
      </div>

      {/* 퍼즐 완료 */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={!!req.solved_puzzle}
          disabled={allPointIds.length === 0}
          onChange={e => set({ solved_puzzle: e.target.checked ? (allPointIds[0] ?? '') : null })}
          className="accent-red-500 shrink-0 disabled:opacity-40"
        />
        <span className={`text-xs shrink-0 ${allPointIds.length === 0 ? 'text-zinc-600' : 'text-zinc-400'}`}>
          퍼즐 완료 후{allPointIds.length === 0 ? ' (퍼즐 없음)' : ''}
        </span>
        {req.solved_puzzle !== null && req.solved_puzzle !== undefined && (
          <select
            className={selectCls}
            value={req.solved_puzzle}
            onChange={e => set({ solved_puzzle: e.target.value })}
          >
            <option value="">포인트 선택...</option>
            {allPointIds.map(id => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}
