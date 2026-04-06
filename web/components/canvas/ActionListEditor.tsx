// web/components/canvas/ActionListEditor.tsx
'use client'

import type { Action, Scenario } from '../../lib/schema'

interface ActionListEditorProps {
  value: Action | Action[] | null | undefined
  onChange: (v: Action | Action[] | null) => void
  rooms: NonNullable<Scenario['rooms']>
  items: NonNullable<Scenario['items']>
  label?: string
}

function toArray(v: Action | Action[] | null | undefined): Action[] {
  if (!v) return []
  return Array.isArray(v) ? v : [v]
}

function fromArray(arr: Action[]): Action | Action[] | null {
  if (arr.length === 0) return null
  if (arr.length === 1) return arr[0]
  return arr
}

function newAction(): Action {
  return { type: 'game_clear', value: null }
}

function ActionRow({
  action,
  onChange,
  onDelete,
  rooms,
  items,
}: {
  action: Action
  onChange: (a: Action) => void
  onDelete: () => void
  rooms: NonNullable<Scenario['rooms']>
  items: NonNullable<Scenario['items']>
}) {
  const selectCls = 'bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white'

  return (
    <div className="flex gap-1 items-center">
      <select
        className={selectCls}
        value={action.type}
        onChange={e => onChange({ type: e.target.value as Action['type'], value: null })}
      >
        <option value="get_item">아이템 획득</option>
        <option value="set_flag">플래그 설정</option>
        <option value="move_to">방 이동</option>
        <option value="game_clear">게임 클리어</option>
      </select>

      {action.type === 'move_to' && (
        <select
          className={`${selectCls} flex-1`}
          value={(action.value as string) ?? ''}
          onChange={e => onChange({ ...action, value: e.target.value })}
        >
          <option value="">방 선택...</option>
          {rooms.map(r => (
            <option key={r.id} value={r.id}>{r.name || r.id}</option>
          ))}
        </select>
      )}

      {action.type === 'get_item' && (
        <select
          className={`${selectCls} flex-1`}
          value={(action.value as string) ?? ''}
          onChange={e => onChange({ ...action, value: e.target.value })}
        >
          <option value="">아이템 선택...</option>
          {items.map(it => (
            <option key={it.id} value={it.id}>{it.name || it.id}</option>
          ))}
        </select>
      )}

      {action.type === 'set_flag' && (
        <input
          className={`${selectCls} flex-1 font-mono`}
          placeholder='{"door_open": true}'
          value={action.value ? JSON.stringify(action.value) : ''}
          onChange={e => {
            try { onChange({ ...action, value: JSON.parse(e.target.value) }) }
            catch { onChange({ ...action, value: e.target.value }) }
          }}
        />
      )}

      {action.type === 'game_clear' && (
        <span className="text-xs text-zinc-500 flex-1">— 클리어 조건</span>
      )}

      <button
        onClick={onDelete}
        className="text-zinc-600 hover:text-red-400 text-xs px-1 shrink-0"
      >✕</button>
    </div>
  )
}

export function ActionListEditor({ value, onChange, rooms, items, label }: ActionListEditorProps) {
  const actions = toArray(value)

  const update = (idx: number, a: Action) => {
    const next = actions.map((x, i) => i === idx ? a : x)
    onChange(fromArray(next))
  }

  const remove = (idx: number) => {
    const next = actions.filter((_, i) => i !== idx)
    onChange(fromArray(next))
  }

  const add = () => onChange(fromArray([...actions, newAction()]))

  return (
    <div className="space-y-1">
      {label && <div className="text-[10px] text-zinc-400 mb-1">{label}</div>}
      {actions.map((a, i) => (
        <ActionRow
          key={i}
          action={a}
          onChange={act => update(i, act)}
          onDelete={() => remove(i)}
          rooms={rooms}
          items={items}
        />
      ))}
      <button
        onClick={add}
        className="text-xs text-zinc-500 hover:text-blue-400 px-2 py-1 rounded border border-dashed border-zinc-700 hover:border-blue-700 w-full"
      >
        + 액션 추가
      </button>
    </div>
  )
}
