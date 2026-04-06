// web/components/sidebar/MetaSidebar.tsx
'use client'

import { Input, Label } from '../ui/Input'
import { StarRating } from '../ui/StarRating'
import type { Scenario, Item } from '../../lib/schema'

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-가-힣]/g, '')
    .replace(/--+/g, '-')
    .slice(0, 64)
}

function newItem(): Item {
  return {
    id: `item-${Date.now()}`,
    name: '',
    description: '',
    usable_on: [],
  }
}

interface MetaSidebarProps {
  scenario: Partial<Scenario>
  onChange: (patch: Partial<Scenario>) => void
  style?: React.CSSProperties
}

export function MetaSidebar({ scenario, onChange, style }: MetaSidebarProps) {
  const items = scenario.items ?? []

  const handleTitleChange = (title: string) => {
    const patch: Partial<Scenario> = { title }
    if (!scenario.scenario_id) {
      patch.scenario_id = toSlug(title)
    }
    onChange(patch)
  }

  const updateItem = (index: number, patch: Partial<Item>) => {
    onChange({ items: items.map((it, i) => i === index ? { ...it, ...patch } : it) })
  }

  const deleteItem = (index: number) => {
    onChange({ items: items.filter((_, i) => i !== index) })
  }

  return (
    <div className="flex-shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col overflow-y-auto" style={style}>
      <div className="p-4 space-y-4">
        {/* 시나리오 메타 */}
        <div className="space-y-3">
          <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">시나리오 정보</h2>

          <div>
            <Label required>제목</Label>
            <Input
              placeholder="폐허가 된 연구소"
              value={scenario.title ?? ''}
              onChange={e => handleTitleChange(e.target.value)}
              className="text-xs"
            />
          </div>

          <div>
            <Label required>시나리오 ID</Label>
            <Input
              placeholder="abandoned-lab"
              value={scenario.scenario_id ?? ''}
              onChange={e => onChange({ scenario_id: e.target.value })}
              className="text-xs font-mono"
            />
          </div>

          <div>
            <Label>작가</Label>
            <Input
              placeholder="이름"
              value={scenario.author ?? ''}
              onChange={e => onChange({ author: e.target.value })}
              className="text-xs"
            />
          </div>

          <div>
            <Label>난이도</Label>
            <StarRating
              value={scenario.difficulty ?? null}
              onChange={v => onChange({ difficulty: v })}
            />
          </div>

          <div>
            <Label>예상 시간 (분)</Label>
            <Input
              type="number"
              min={1}
              placeholder="30"
              value={scenario.estimated_minutes ?? ''}
              onChange={e => onChange({ estimated_minutes: e.target.value ? parseInt(e.target.value) : null })}
              className="text-xs"
            />
          </div>
        </div>

        {/* 구분선 */}
        <div className="border-t border-zinc-800" />

        {/* 아이템 */}
        <div className="space-y-2">
          <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">아이템</h2>
          {items.map((item, i) => (
            <div key={item.id} className="bg-zinc-900 rounded border border-zinc-800 p-2 space-y-1">
              <div className="flex gap-1">
                <Input
                  value={item.name}
                  onChange={e => updateItem(i, { name: e.target.value })}
                  placeholder="이름"
                  className="text-xs flex-1"
                />
                <button
                  onClick={() => deleteItem(i)}
                  className="text-zinc-600 hover:text-red-400 text-xs px-1"
                >
                  ✕
                </button>
              </div>
              <Input
                value={item.description}
                onChange={e => updateItem(i, { description: e.target.value })}
                placeholder="설명"
                className="text-xs"
              />
              <Input
                value={item.id}
                onChange={e => updateItem(i, { id: e.target.value })}
                placeholder="item-id"
                className="text-[10px] font-mono"
              />
            </div>
          ))}
          <button
            onClick={() => onChange({ items: [...items, newItem()] })}
            className="text-xs text-zinc-500 hover:text-green-400 px-2 py-1 rounded border border-dashed border-zinc-800 hover:border-green-800 w-full"
          >
            + 아이템 추가
          </button>
        </div>
      </div>
    </div>
  )
}
