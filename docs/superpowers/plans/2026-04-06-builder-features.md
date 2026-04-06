# Builder Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 방탈출 시나리오 빌더에 잠금 조건 UI, 복합 액션, 플래그 에디터, 퍼즐 타입 확장, NPC 시스템, 인트로/아웃트로, 멀티 프로젝트(IndexedDB), 허브 메타데이터를 추가하고, 엔진에서도 새 기능이 동작하도록 한다.

**Architecture:** Phase 1→2→3→4 순으로 진행. 각 Phase 내 빌더(web/) 먼저, 그 다음 엔진(engine/) 대응. 빌더는 신규 컴포넌트를 분리 파일로 추출해 RoomDetailPanel이 무한정 커지지 않도록 한다. Phase 4에서 localStorage → IndexedDB 전환 시 기존 초안은 자동 마이그레이션.

**Tech Stack:** Next.js (App Router, TypeScript), Tailwind CSS v4, Zod, @xyflow/react, IndexedDB(native API), Python 3.10+, Pydantic v2, Textual TUI, pytest

---

## File Map

### 신규 생성 (web/)
- `web/components/canvas/ActionListEditor.tsx` — 복합 액션 행 목록 편집 (Task 1)
- `web/components/canvas/PointRequirementsEditor.tsx` — 잠금 조건 UI (Task 2)
- `web/components/canvas/PuzzleEditor.tsx` — 퍼즐 타입별 편집 (Task 6)
- `web/components/canvas/NpcEditor.tsx` — NPC 목록 + 대사 편집 (Task 7)
- `web/lib/db.ts` — IndexedDB raw wrapper (Task 19)
- `web/lib/projects.ts` — 프로젝트 CRUD + localStorage 마이그레이션 (Task 19)

### 수정 (web/)
- `web/lib/schema.ts` — PuzzleSchema(keys/sequence), NpcLineSchema, NpcSchema, RoomSchema(npcs), ScenarioSchema(intro/outro) (Task 5)
- `web/components/canvas/RoomDetailPanel.tsx` — Phase 1 컴포넌트 연결, 탭 구조로 재편 (Tasks 3, 8)
- `web/components/sidebar/MetaSidebar.tsx` — 플래그 에디터, 인트로/아웃트로, 허브 메타 (Tasks 3, 7, 23)
- `web/components/canvas/RoomNode.tsx` — NPC 수 뱃지 (Task 7)
- `web/lib/store.ts` — IndexedDB 기반으로 전환 (Task 20)
- `web/app/page.tsx` — 프로젝트 목록 홈 (Task 21)
- `web/app/builder/page.tsx` — `?id=` 파라미터, 자동 저장 (Task 22)

### 수정 (engine/)
- `engine/clue/schema/models.py` — Puzzle(keys/sequence), NpcLine, Npc, Room(npcs), Scenario(intro/outro) (Tasks 10, 14)
- `engine/clue/schema/validator.py` — key_sequence 검증, NPC ID 중복/조건 검증 (Tasks 11, 16)
- `engine/clue/engine/mechanics.py` — key_sequence 비교, talk_to_npc() (Tasks 12, 15)
- `engine/clue/engine/state.py` — get_npc_lines() (Task 15)
- `engine/clue/engine/parser.py` — talk 명령 (Task 15)
- `engine/clue/ui/app.py` — key_sequence UI, timer 강제 종료, 인트로/아웃트로, NPC 표시/talk (Tasks 13, 17)
- `engine/tests/test_mechanics.py` — key_sequence, NPC 케이스 (Tasks 13, 18)
- `engine/tests/test_validator.py` — key_sequence, NPC 케이스 (Tasks 13, 18)

---

## Phase 1 — 게임 로직 기반 (빌더 UI)

### Task 1: ActionListEditor 컴포넌트

**Files:**
- Create: `web/components/canvas/ActionListEditor.tsx`

이 컴포넌트는 `Action | Action[] | null` 값을 받아 행 목록으로 편집하고 변경값을 콜백으로 반환한다. RoomDetailPanel의 point.action과 puzzle.on_success 양쪽에서 공유 사용.

- [ ] **Step 1: 파일 생성**

```tsx
// web/components/canvas/ActionListEditor.tsx
'use client'

import type { Action, Scenario } from '../../lib/schema'

interface ActionListEditorProps {
  value: Action | Action[] | null | undefined
  onChange: (v: Action | Action[] | null) => void
  rooms: Scenario['rooms']  // move_to 옵션용 (있을 때만)
  items: Scenario['items']  // get_item 옵션용
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
  rooms: Scenario['rooms']
  items: Scenario['items']
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
          {(rooms ?? []).map(r => (
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
          {(items ?? []).map(it => (
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
          rooms={rooms ?? []}
          items={items ?? []}
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
```

- [ ] **Step 2: 빌드 확인**

```bash
cd web && npm run build 2>&1 | tail -5
```
Expected: `✓ Compiled successfully` (ActionListEditor는 아직 import 안 됨)

---

### Task 2: PointRequirementsEditor 컴포넌트

**Files:**
- Create: `web/components/canvas/PointRequirementsEditor.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
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

export function PointRequirementsEditor({
  value,
  onChange,
  items,
  allPointIds,
}: PointRequirementsEditorProps) {
  const req = value ?? empty
  const selectCls = 'bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white w-full'

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
          onChange={e => set({ item_id: e.target.checked ? (items[0]?.id ?? '') : null })}
          className="accent-red-500 shrink-0"
        />
        <span className="text-xs text-zinc-400 shrink-0">아이템 필요</span>
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
          onChange={e => set({ solved_puzzle: e.target.checked ? (allPointIds[0] ?? '') : null })}
          className="accent-red-500 shrink-0"
        />
        <span className="text-xs text-zinc-400 shrink-0">퍼즐 완료 후</span>
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
```

- [ ] **Step 2: 빌드 확인**

```bash
cd web && npm run build 2>&1 | tail -5
```
Expected: `✓ Compiled successfully`

---

### Task 3: Phase 1 — RoomDetailPanel 통합 + MetaSidebar 플래그 에디터

**Files:**
- Modify: `web/components/canvas/RoomDetailPanel.tsx`
- Modify: `web/components/sidebar/MetaSidebar.tsx`

- [ ] **Step 1: RoomDetailPanel — import 및 헬퍼 추가**

`RoomDetailPanel.tsx` 상단 import를 다음으로 교체:

```tsx
import { useState } from 'react'
import { Input, Textarea, Label } from '../ui/Input'
import type { Point, Room, Scenario } from '../../lib/schema'
import { ActionListEditor } from './ActionListEditor'
import { PointRequirementsEditor } from './PointRequirementsEditor'
```

- [ ] **Step 2: RoomDetailPanel — allPointIds 계산 추가**

`updatePoint` 함수 아래에 추가:

```tsx
// 다른 방 포함 모든 포인트 ID (solved_puzzle 드롭다운용)
const allPointIds = (scenario.rooms ?? []).flatMap(r => r.points.map(p => p.id))
```

- [ ] **Step 3: RoomDetailPanel — 점 상세 섹션 교체**

기존 `expandedPoint === point.id` 블록 내부에서:

1. 기존 `<div>` 로 된 "액션" 섹션(단일 select) 전체를 삭제
2. 대신 아래 두 블록을 `관찰 텍스트` 다음에 삽입:

```tsx
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
```

3. 기존 point.action에 대한 `move_to`/`get_item` 개별 select 블록 두 개도 삭제.

- [ ] **Step 4: RoomDetailPanel — 퍼즐 on_success를 ActionListEditor로 교체**

기존 퍼즐 섹션에서 on_success 관련 UI가 없으므로 puzzle 체크박스 아래 기존 `div.space-y-2` 안에 추가:

퍼즐이 활성화된 블록(`point.puzzle &&`) 안, `time_limit_seconds` 입력 아래에 추가:

```tsx
<div>
  <Label required>성공 시 액션</Label>
  <ActionListEditor
    value={point.puzzle.on_success}
    onChange={v => updatePoint(i, { puzzle: { ...point.puzzle!, on_success: v ?? { type: 'game_clear', value: null } } })}
    rooms={rooms.filter(r => r.id !== roomId)}
    items={items}
  />
</div>
```

- [ ] **Step 5: MetaSidebar — 플래그 에디터 추가**

`MetaSidebar.tsx`에서 아이템 섹션(`{/* 아이템 */}`) 바로 위 구분선 앞에 다음 섹션 삽입:

```tsx
{/* 구분선 */}
<div className="border-t border-zinc-800" />

{/* 플래그 초기값 */}
<div className="space-y-2">
  <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">게임 플래그</h2>
  <div className="text-[10px] text-zinc-600">시나리오 시작 시 초기값</div>
  {Object.entries(scenario.flags ?? {}).map(([key, val]) => (
    <div key={key} className="flex gap-1 items-center">
      <Input
        value={key}
        onChange={e => {
          const flags = { ...(scenario.flags ?? {}) }
          delete flags[key]
          flags[e.target.value] = val
          onChange({ flags })
        }}
        placeholder="flag_key"
        className="text-[10px] font-mono flex-1"
      />
      <Input
        value={String(val)}
        onChange={e => {
          let parsed: unknown = e.target.value
          if (e.target.value === 'true') parsed = true
          else if (e.target.value === 'false') parsed = false
          else if (!isNaN(Number(e.target.value)) && e.target.value !== '') parsed = Number(e.target.value)
          onChange({ flags: { ...(scenario.flags ?? {}), [key]: parsed } })
        }}
        placeholder="true / false / 값"
        className="text-[10px] font-mono flex-1"
      />
      <button
        onClick={() => {
          const flags = { ...(scenario.flags ?? {}) }
          delete flags[key]
          onChange({ flags })
        }}
        className="text-zinc-600 hover:text-red-400 text-xs px-1"
      >✕</button>
    </div>
  ))}
  <button
    onClick={() => onChange({ flags: { ...(scenario.flags ?? {}), [`flag_${Date.now()}`]: false } })}
    className="text-xs text-zinc-500 hover:text-purple-400 px-2 py-1 rounded border border-dashed border-zinc-800 hover:border-purple-800 w-full"
  >
    + 플래그 추가
  </button>
</div>
```

- [ ] **Step 6: 빌드 확인 + 커밋**

```bash
cd web && npm run build 2>&1 | tail -8
```
Expected: `✓ Compiled successfully`

```bash
cd .. && git add web/components/canvas/ActionListEditor.tsx web/components/canvas/PointRequirementsEditor.tsx web/components/canvas/RoomDetailPanel.tsx web/components/sidebar/MetaSidebar.tsx
git commit -m "feat(builder): phase 1 — requirements UI, multi-action, flag editor"
```

---

## Phase 2 — 퍼즐 타입 확장 (빌더)

### Task 4: 빌더 스키마 확장 (Phase 2+3 공통)

**Files:**
- Modify: `web/lib/schema.ts`

- [ ] **Step 1: PuzzleSchema에 key_sequence 필드 추가**

`PuzzleSchema` 정의를 다음으로 교체:

```ts
export const PuzzleSchema = z.object({
  type: z.enum(['text_input', 'key_sequence', 'timer']).default('text_input'),
  question: z.string(),
  hint: z.string().optional().nullable(),
  answer_hash: z.string(),
  max_attempts: z.number().int().positive().optional().nullable(),
  time_limit_seconds: z.number().int().positive().optional().nullable(),
  fail_message: z.string().optional().nullable(),
  on_success: z.union([ActionSchema, z.array(ActionSchema)]),
  // key_sequence 전용
  keys: z.array(z.string()).default([]),
  sequence: z.array(z.string()).default([]),
})
```

- [ ] **Step 2: NpcLine, Npc 스키마 추가**

`PointSchema` 정의 위에 삽입:

```ts
export const NpcLineSchema = z.object({
  text: z.string(),
  condition: z.object({
    flag: z.record(z.string(), z.unknown()).optional().nullable(),
  }).optional().nullable(),
})

export const NpcSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  lines: z.array(NpcLineSchema).default([]),
})
```

- [ ] **Step 3: RoomSchema에 npcs 추가**

```ts
export const RoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  points: z.array(PointSchema).default([]),
  npcs: z.array(NpcSchema).default([]),
})
```

- [ ] **Step 4: ScenarioSchema에 intro_text, outro_text 추가**

```ts
export const ScenarioSchema = z.object({
  scenario_id: z.string(),
  version: z.string().default('1.0'),
  title: z.string(),
  author: z.string().optional().nullable(),
  difficulty: z.number().int().min(1).max(5).optional().nullable(),
  estimated_minutes: z.number().int().positive().optional().nullable(),
  start_room_id: z.string(),
  flags: z.record(z.string(), z.unknown()).default({}),
  intro_text: z.string().optional().nullable(),
  outro_text: z.string().optional().nullable(),
  items: z.array(ItemSchema).default([]),
  rooms: z.array(RoomSchema).min(1, '방이 최소 1개 있어야 합니다.'),
})
```

- [ ] **Step 5: 타입 export 추가**

파일 하단 타입 export 섹션에 추가:

```ts
export type NpcLine = z.infer<typeof NpcLineSchema>
export type Npc = z.infer<typeof NpcSchema>
```

- [ ] **Step 6: 빌드 확인**

```bash
cd web && npm run build 2>&1 | tail -8
```
Expected: `✓ Compiled successfully` (rooms에 npcs 기본값이 있으므로 기존 데이터 호환)

---

### Task 5: PuzzleEditor 컴포넌트

**Files:**
- Create: `web/components/canvas/PuzzleEditor.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
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
              answer_hash: tab.type === 'key_sequence' ? '' : p.answer_hash,
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
```

- [ ] **Step 2: RoomDetailPanel — PuzzleEditor 적용**

`RoomDetailPanel.tsx`에서:

1. import에 `PuzzleEditor` 추가:
```tsx
import { PuzzleEditor } from './PuzzleEditor'
```

2. 기존 `point.puzzle &&` 블록 전체(퍼즐 질문/정답/힌트/시도/시간 입력들)를 다음으로 교체:
```tsx
{point.puzzle && (
  <PuzzleEditor
    value={point.puzzle}
    onChange={puz => updatePoint(i, { puzzle: puz })}
    rooms={rooms.filter(r => r.id !== roomId)}
    items={items}
  />
)}
```

3. 퍼즐 체크박스의 기본값에 `keys`, `sequence` 추가:
```tsx
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
```

- [ ] **Step 3: 빌드 확인 + 커밋**

```bash
cd web && npm run build 2>&1 | tail -8
```
Expected: `✓ Compiled successfully`

```bash
cd .. && git add web/lib/schema.ts web/components/canvas/PuzzleEditor.tsx web/components/canvas/RoomDetailPanel.tsx
git commit -m "feat(builder): phase 2 — schema extension, PuzzleEditor with type tabs"
```

---

## Phase 3 — 스토리 & NPC (빌더)

### Task 6: NpcEditor 컴포넌트 + RoomNode 뱃지

**Files:**
- Create: `web/components/canvas/NpcEditor.tsx`
- Modify: `web/components/canvas/RoomNode.tsx`

- [ ] **Step 1: NpcEditor 생성**

```tsx
// web/components/canvas/NpcEditor.tsx
'use client'

import { Input, Textarea, Label } from '../ui/Input'
import type { Npc, NpcLine, Room, Scenario } from '../../lib/schema'

interface NpcEditorProps {
  room: Room
  scenario: Partial<Scenario>
  onUpdateRoom: (patch: Partial<Room>) => void
}

function newNpc(): Npc {
  return {
    id: `npc-${Date.now()}`,
    name: '',
    description: '',
    lines: [{ text: '', condition: null }],
  }
}

function newLine(): NpcLine {
  return { text: '', condition: null }
}

export function NpcEditor({ room, scenario, onUpdateRoom }: NpcEditorProps) {
  const npcs = room.npcs ?? []

  const updateNpc = (idx: number, patch: Partial<Npc>) => {
    onUpdateRoom({ npcs: npcs.map((n, i) => i === idx ? { ...n, ...patch } : n) })
  }

  const deleteNpc = (idx: number) => {
    onUpdateRoom({ npcs: npcs.filter((_, i) => i !== idx) })
  }

  const updateLine = (npcIdx: number, lineIdx: number, patch: Partial<NpcLine>) => {
    const lines = npcs[npcIdx].lines.map((l, i) => i === lineIdx ? { ...l, ...patch } : l)
    updateNpc(npcIdx, { lines })
  }

  const deleteLine = (npcIdx: number, lineIdx: number) => {
    updateNpc(npcIdx, { lines: npcs[npcIdx].lines.filter((_, i) => i !== lineIdx) })
  }

  const flagKeys = Object.keys(scenario.flags ?? {})

  return (
    <div className="space-y-3">
      {npcs.map((npc, ni) => (
        <div key={npc.id} className="bg-zinc-900 border border-purple-900/40 rounded p-2 space-y-2">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-purple-400">👤</span>
            <Input
              value={npc.name}
              onChange={e => updateNpc(ni, { name: e.target.value })}
              placeholder="NPC 이름"
              className="text-xs flex-1"
            />
            <button
              onClick={() => deleteNpc(ni)}
              className="text-zinc-600 hover:text-red-400 text-xs px-1"
            >✕</button>
          </div>
          <Input
            value={npc.description}
            onChange={e => updateNpc(ni, { description: e.target.value })}
            placeholder="외형 묘사"
            className="text-xs"
          />
          <Input
            value={npc.id}
            onChange={e => updateNpc(ni, { id: e.target.value })}
            placeholder="npc-id"
            className="text-[10px] font-mono"
          />

          {/* 대사 목록 */}
          <div className="space-y-1 pl-2 border-l border-purple-900/30">
            <div className="text-[10px] text-zinc-500">대사</div>
            {npc.lines.map((line, li) => (
              <div key={li} className="space-y-1 bg-zinc-950 rounded p-1.5">
                <div className="flex gap-1 items-center">
                  <Textarea
                    value={line.text}
                    onChange={e => updateLine(ni, li, { text: e.target.value })}
                    placeholder="대사 내용..."
                    className="text-xs flex-1"
                  />
                  <button
                    onClick={() => deleteLine(ni, li)}
                    className="text-zinc-600 hover:text-red-400 text-[10px] px-1 self-start"
                  >✕</button>
                </div>
                {/* 조건 (플래그) */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!line.condition?.flag}
                    onChange={e => updateLine(ni, li, {
                      condition: e.target.checked ? { flag: { [flagKeys[0] ?? 'flag']: true } } : null
                    })}
                    className="accent-purple-500"
                  />
                  <span className="text-[10px] text-zinc-500">플래그 조건</span>
                  {line.condition?.flag && (
                    <input
                      className="bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-[10px] font-mono flex-1"
                      placeholder='{"key": true}'
                      value={JSON.stringify(line.condition.flag)}
                      onChange={e => {
                        try { updateLine(ni, li, { condition: { flag: JSON.parse(e.target.value) } }) }
                        catch { /* 무시 */ }
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
            <button
              onClick={() => updateNpc(ni, { lines: [...npc.lines, newLine()] })}
              className="text-[10px] text-zinc-500 hover:text-purple-400 px-2 py-0.5 rounded border border-dashed border-zinc-800 hover:border-purple-800 w-full"
            >+ 대사 추가</button>
          </div>
        </div>
      ))}

      <button
        onClick={() => onUpdateRoom({ npcs: [...npcs, newNpc()] })}
        className="text-xs text-zinc-500 hover:text-purple-400 px-2 py-1 rounded border border-dashed border-zinc-800 hover:border-purple-800 w-full"
      >+ NPC 추가</button>
    </div>
  )
}
```

- [ ] **Step 2: RoomNode — NPC 수 뱃지 추가**

`RoomNode.tsx`에서 `{room.points.length}개 포인트` 줄 바로 아래에 추가:

```tsx
{(room.npcs?.length ?? 0) > 0 && (
  <div className="text-xs text-purple-400 mt-0.5">
    {room.npcs!.length}명 NPC
  </div>
)}
```

- [ ] **Step 3: RoomDetailPanel — NPC 탭 + 인트로/아웃트로 연결**

`RoomDetailPanel.tsx` 수정:

1. import에 추가:
```tsx
import { NpcEditor } from './NpcEditor'
```

2. `useState` 훅에 탭 상태 추가 (기존 `expandedPoint` 아래):
```tsx
const [tab, setTab] = useState<'points' | 'npcs'>('points')
```

3. 포인트 목록 `<div>` (`<div className="flex-1 overflow-y-auto p-4 space-y-4">`) 내부 최상단을 탭 버튼으로 대체:

```tsx
{/* 탭 */}
<div className="flex gap-1 mb-3">
  {(['points', 'npcs'] as const).map(t => (
    <button
      key={t}
      onClick={() => setTab(t)}
      className={`text-xs px-3 py-1 rounded border transition-colors ${
        tab === t
          ? 'bg-zinc-800 border-zinc-600 text-white'
          : 'bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300'
      }`}
    >
      {t === 'points' ? `📍 조사 지점 (${room.points.length})` : `👤 NPC (${(room.npcs ?? []).length})`}
    </button>
  ))}
</div>
```

4. 기존 포인트 목록 전체(`<div>` 조사 지점 h3부터 + 지점 추가 버튼까지)를 `{tab === 'points' && (...)}` 로 감싼다.

5. 닫는 `</div>` 직전에 NPC 탭 추가:
```tsx
{tab === 'npcs' && (
  <NpcEditor
    room={room}
    scenario={scenario}
    onUpdateRoom={updateRoom}
  />
)}
```

- [ ] **Step 4: MetaSidebar — 인트로/아웃트로 추가**

`MetaSidebar.tsx`에서 import에 `Textarea` 추가:
```tsx
import { Input, Textarea, Label } from '../ui/Input'
```

시나리오 정보 섹션 (`예상 시간` 입력 아래)에 추가:

```tsx
<div>
  <Label>인트로 텍스트</Label>
  <Textarea
    value={scenario.intro_text ?? ''}
    onChange={e => onChange({ intro_text: e.target.value || null })}
    placeholder="시나리오 시작 시 표시되는 배경 설명..."
    className="text-xs"
  />
</div>
<div>
  <Label>아웃트로 텍스트</Label>
  <Textarea
    value={scenario.outro_text ?? ''}
    onChange={e => onChange({ outro_text: e.target.value || null })}
    placeholder="클리어 시 표시되는 엔딩 메시지..."
    className="text-xs"
  />
</div>
```

- [ ] **Step 5: 빌드 확인 + 커밋**

```bash
cd web && npm run build 2>&1 | tail -8
```
Expected: `✓ Compiled successfully`

```bash
cd .. && git add web/components/canvas/NpcEditor.tsx web/components/canvas/RoomNode.tsx web/components/canvas/RoomDetailPanel.tsx web/components/sidebar/MetaSidebar.tsx
git commit -m "feat(builder): phase 3 — NPC editor, room tabs, intro/outro text"
```

---

## Phase 2+3 — 엔진 대응

### Task 7: 엔진 스키마 + 검증 (Phase E2)

**Files:**
- Modify: `engine/clue/schema/models.py`
- Modify: `engine/clue/schema/validator.py`

- [ ] **Step 1: models.py — Puzzle 필드 추가**

`Puzzle` 클래스에 필드 추가 (`on_success` 줄 위에):

```python
# key_sequence 전용
keys: list[str] = Field(default_factory=list)
sequence: list[str] = Field(default_factory=list)
```

- [ ] **Step 2: models.py — NpcLine, Npc 추가 + Room, Scenario 확장**

`Room` 클래스 위에 삽입:

```python
class NpcLine(BaseModel):
    text: str
    condition: dict | None = None  # {"flag": {"key": value}}

class Npc(BaseModel):
    id: str
    name: str
    description: str
    lines: list[NpcLine] = Field(default_factory=list)
```

`Room` 클래스에 필드 추가:
```python
npcs: list[Npc] = Field(default_factory=list)
```

`Scenario` 클래스에 필드 추가 (`flags` 아래):
```python
intro_text: str | None = None
outro_text: str | None = None
```

- [ ] **Step 3: validator.py — key_sequence 검증 추가**

`validate_scenario()` 내부 `if point.puzzle:` 블록 안에 추가:

```python
if point.puzzle:
    # key_sequence 전용 검증
    if point.puzzle.type == "key_sequence":
        if not point.puzzle.keys:
            errors.append(
                f"포인트 '{point.id}' key_sequence 퍼즐에 keys가 없습니다."
            )
        if not point.puzzle.sequence:
            errors.append(
                f"포인트 '{point.id}' key_sequence 퍼즐에 sequence가 없습니다."
            )
        key_set = set(point.puzzle.keys)
        for s in point.puzzle.sequence:
            if s not in key_set:
                errors.append(
                    f"포인트 '{point.id}' sequence 항목 '{s}'이(가) keys에 없습니다."
                )
```

- [ ] **Step 4: validator.py — NPC 검증 추가**

`seen_point_ids` 선언 아래에 추가:
```python
seen_npc_ids: set[str] = set()
flag_keys = set(scenario.flags.keys())
```

각 방 반복문 안(`for point in room.points:` 블록과 나란히)에 추가:

```python
for npc in room.npcs:
    if npc.id in seen_npc_ids:
        errors.append(f"NPC ID '{npc.id}'가 중복됩니다.")
    seen_npc_ids.add(npc.id)
    for line in npc.lines:
        if line.condition and line.condition.get("flag"):
            for fk in line.condition["flag"]:
                if fk not in flag_keys:
                    errors.append(
                        f"NPC '{npc.id}' 대사 조건 플래그 '{fk}'가 scenario.flags에 없습니다."
                    )
```

- [ ] **Step 5: 커밋**

```bash
cd engine && git add clue/schema/models.py clue/schema/validator.py
git commit -m "feat(engine): phase E2/E3 schema — key_sequence, NpcLine, Npc, intro/outro"
```

---

### Task 8: 엔진 mechanics — key_sequence + NPC 대화

**Files:**
- Modify: `engine/clue/engine/mechanics.py`

- [ ] **Step 1: key_sequence 정답 검증 함수 추가**

`verify_answer()` 함수 아래에 추가:

```python
def verify_sequence(user_input: str, puzzle_keys: list[str], expected: list[str]) -> bool:
    """
    사용자가 입력한 공백 구분 번호 목록을 키 인덱스로 변환해 expected와 비교.
    예: "1 3 1 4" + keys=["↑","↓","←","→"] → ["↑","←","↑","→"]
    """
    parts = user_input.strip().split()
    try:
        selected = [puzzle_keys[int(p) - 1] for p in parts]
    except (ValueError, IndexError):
        return False
    return selected == expected
```

- [ ] **Step 2: attempt_puzzle() — 타입 분기 추가**

기존 `attempt_puzzle()` 함수에서 `verify_answer` 호출 부분을 다음으로 교체:

```python
    # 타입별 정답 판정
    if puzzle.type == "key_sequence":
        correct = verify_sequence(user_input, puzzle.keys, puzzle.sequence)
    else:
        correct = verify_answer(user_input, puzzle.answer_hash)

    if correct:
```

(기존 `if verify_answer(user_input, puzzle.answer_hash):` 한 줄을 위 4줄로 교체)

- [ ] **Step 3: talk_to_npc() 함수 추가**

파일 하단에 추가:

```python
def talk_to_npc(npc: "Npc", state: GameState) -> list[str]:  # type: ignore[name-defined]
    """
    NPC 대화 실행. 조건에 맞는 대사 목록 반환.
    조건: line.condition이 None이거나 line.condition["flag"]의 모든 항목이 state.flags에 일치.
    빈 목록이면 "할 말이 없는 것 같다." 반환.
    """
    from clue.schema.models import Npc  # 순환 방지를 위해 지역 import
    lines: list[str] = []
    for line in npc.lines:
        if line.condition is None:
            lines.append(line.text)
        elif flag_cond := (line.condition.get("flag") or {}):
            if all(state.flags.get(k) == v for k, v in flag_cond.items()):
                lines.append(line.text)
    return lines if lines else ["할 말이 없는 것 같다."]
```

- [ ] **Step 4: 커밋**

```bash
cd engine && git add clue/engine/mechanics.py
git commit -m "feat(engine): key_sequence verification, talk_to_npc()"
```

---

### Task 9: 엔진 state.py + parser.py

**Files:**
- Modify: `engine/clue/engine/state.py`
- Modify: `engine/clue/engine/parser.py`

- [ ] **Step 1: state.py — visible_npcs() 메서드 추가**

`GameState` 클래스의 `visible_points()` 메서드 아래에 추가:

```python
def visible_npcs(self) -> list:
    """현재 방의 NPC 목록 반환."""
    return self.current_room().npcs

def get_npc_in_room(self, name_or_id: str) -> "Npc | None":  # type: ignore[name-defined]
    """이름 또는 ID로 현재 방의 NPC 검색 (대소문자 무시)."""
    target = name_or_id.lower()
    for npc in self.current_room().npcs:
        if npc.id.lower() == target or npc.name.lower() == target:
            return npc
    return None
```

- [ ] **Step 2: parser.py — talk 명령 추가**

`Command` 타입 리터럴에 `"talk"` 추가:

```python
Command = Literal[
    "look", "inspect", "use", "inv", "hint", "help", "quit", "talk", "unknown"
]
```

`_ALIASES` 딕셔너리에 추가:

```python
    # talk
    "talk": "talk",
    "t": "talk",
    "speak": "talk",
```

- [ ] **Step 3: 커밋**

```bash
cd engine && git add clue/engine/state.py clue/engine/parser.py
git commit -m "feat(engine): visible_npcs/get_npc_in_room, talk command"
```

---

### Task 10: 엔진 테스트 (Phase E2+E3)

**Files:**
- Modify: `engine/tests/test_mechanics.py`
- Modify: `engine/tests/test_validator.py`

- [ ] **Step 1: test_mechanics.py — key_sequence + NPC 케이스 추가**

파일 끝에 추가:

```python
# ── key_sequence 퍼즐 ────────────────────────────────────────────────────────

def _make_key_sequence_point(puzzle_id="pt-seq"):
    from clue.schema.models import Point, Puzzle
    return Point(
        id=puzzle_id,
        name="버튼판",
        description="버튼이 있다",
        puzzle=Puzzle(
            type="key_sequence",
            question="순서대로 누르세요",
            answer_hash="",  # key_sequence는 hash 불필요
            keys=["↑", "↓", "←", "→"],
            sequence=["↑", "←", "↑"],
            on_success={"type": "game_clear", "value": None},
        ),
    )


def test_key_sequence_correct(make_state):
    state = make_state()
    point = _make_key_sequence_point()
    ok, msg = attempt_puzzle(state, point, "1 3 1")  # ↑=1, ←=3
    assert ok is True


def test_key_sequence_wrong(make_state):
    state = make_state()
    point = _make_key_sequence_point()
    ok, msg = attempt_puzzle(state, point, "1 2 1")  # ↓ 대신 ←
    assert ok is False


def test_key_sequence_invalid_input(make_state):
    state = make_state()
    point = _make_key_sequence_point()
    ok, msg = attempt_puzzle(state, point, "abc")
    assert ok is False


# ── NPC 대화 ─────────────────────────────────────────────────────────────────

def test_talk_to_npc_unconditional(make_state):
    from clue.schema.models import Npc, NpcLine
    from clue.engine.mechanics import talk_to_npc
    npc = Npc(id="npc-1", name="박사", description="노인", lines=[
        NpcLine(text="안녕하세요.", condition=None),
    ])
    state = make_state()
    lines = talk_to_npc(npc, state)
    assert lines == ["안녕하세요."]


def test_talk_to_npc_flag_condition_met(make_state):
    from clue.schema.models import Npc, NpcLine
    from clue.engine.mechanics import talk_to_npc
    npc = Npc(id="npc-1", name="박사", description="노인", lines=[
        NpcLine(text="문이 열렸군요.", condition={"flag": {"door_open": True}}),
    ])
    state = make_state()
    state.flags["door_open"] = True
    lines = talk_to_npc(npc, state)
    assert lines == ["문이 열렸군요."]


def test_talk_to_npc_flag_condition_not_met(make_state):
    from clue.schema.models import Npc, NpcLine
    from clue.engine.mechanics import talk_to_npc
    npc = Npc(id="npc-1", name="박사", description="노인", lines=[
        NpcLine(text="문이 열렸군요.", condition={"flag": {"door_open": True}}),
    ])
    state = make_state()
    state.flags["door_open"] = False
    lines = talk_to_npc(npc, state)
    assert lines == ["할 말이 없는 것 같다."]
```

- [ ] **Step 2: test_validator.py — key_sequence + NPC 케이스 추가**

파일 끝에 추가:

```python
# ── key_sequence 검증 ────────────────────────────────────────────────────────

def test_key_sequence_missing_keys(base_scenario):
    from clue.schema.models import Point, Puzzle, Room
    s = base_scenario()
    s.rooms[0].points.append(Point(
        id="pt-seq",
        name="버튼판",
        description="버튼",
        puzzle=Puzzle(
            type="key_sequence",
            question="순서대로",
            answer_hash="",
            keys=[],         # 비어있음
            sequence=["↑"],
            on_success={"type": "game_clear", "value": None},
        ),
    ))
    errors = validate_scenario(s)
    assert any("keys" in e for e in errors)


def test_key_sequence_sequence_item_not_in_keys(base_scenario):
    from clue.schema.models import Point, Puzzle
    s = base_scenario()
    s.rooms[0].points.append(Point(
        id="pt-seq",
        name="버튼판",
        description="버튼",
        puzzle=Puzzle(
            type="key_sequence",
            question="순서대로",
            answer_hash="",
            keys=["↑", "↓"],
            sequence=["←"],  # keys에 없는 값
            on_success={"type": "game_clear", "value": None},
        ),
    ))
    errors = validate_scenario(s)
    assert any("sequence" in e for e in errors)


# ── NPC 검증 ─────────────────────────────────────────────────────────────────

def test_duplicate_npc_id(base_scenario):
    from clue.schema.models import Npc, NpcLine
    s = base_scenario()
    npc = Npc(id="npc-1", name="박사", description="노인", lines=[NpcLine(text="안녕")])
    s.rooms[0].npcs = [npc, npc]  # 동일 ID 두 번
    errors = validate_scenario(s)
    assert any("NPC ID" in e for e in errors)


def test_npc_line_condition_flag_not_in_flags(base_scenario):
    from clue.schema.models import Npc, NpcLine
    s = base_scenario()
    s.rooms[0].npcs = [Npc(
        id="npc-1", name="박사", description="노인",
        lines=[NpcLine(text="hi", condition={"flag": {"unknown_flag": True}})],
    )]
    errors = validate_scenario(s)
    assert any("unknown_flag" in e for e in errors)
```

- [ ] **Step 3: 테스트 실행**

```bash
cd engine && python -m pytest tests/ -v 2>&1 | tail -30
```
Expected: 모든 기존 테스트 pass + 신규 케이스 pass

- [ ] **Step 4: 커밋**

```bash
git add tests/test_mechanics.py tests/test_validator.py
git commit -m "test(engine): key_sequence and NPC test cases"
```

---

### Task 11: 엔진 app.py — key_sequence UI + timer 강제 종료 + 인트로/아웃트로 + NPC

**Files:**
- Modify: `engine/clue/ui/app.py`

> 이 파일은 788줄의 Textual TUI 앱이다. 먼저 파일 전체를 읽고 아래 변경 위치를 찾아 적용한다.

- [ ] **Step 1: app.py 읽기**

```bash
cd engine && wc -l clue/ui/app.py
```

파일을 읽고 다음 위치를 파악한다:
- `GameScreen` 클래스 내 퍼즐 모드 진입/처리 로직 (`inspect` 명령 처리 부분)
- `game_clear` 액션 처리 부분 (승리 화면)
- 게임 시작 직후 첫 방 진입 로직
- 방 정보 표시 로직 (look 명령 / 방 진입 시)

- [ ] **Step 2: 인트로 텍스트 표시**

게임 시작 직후 (`GameState.from_scenario()` 호출 이후) `scenario.intro_text`가 있으면 로그에 출력하는 코드 추가:

```python
# 인트로 텍스트 표시
if state.scenario.intro_text:
    self._log(state.scenario.intro_text, "log-info")
```

- [ ] **Step 3: 아웃트로 텍스트 표시**

`game_clear` 액션 처리 후 승리 화면 표시 부분에서, 기존 승리 메시지 출력 뒤에 추가:

```python
if state.scenario.outro_text:
    self._log(state.scenario.outro_text, "log-info")
```

- [ ] **Step 4: 방 정보에 NPC 표시**

look 명령 처리 또는 방 진입 시 방 설명을 출력하는 부분에서, 조사 지점 목록 출력 뒤에 추가:

```python
# NPC 목록 표시
npcs = state.visible_npcs()
if npcs:
    self._log("  [NPC]", "log-info")
    for npc in npcs:
        self._log(f"  👤 {npc.name} — {npc.description}", "log-normal")
    self._log('  tip: "talk <NPC이름>"으로 대화', "log-info")
```

- [ ] **Step 5: talk 명령 처리 추가**

`inspect` 명령 처리 블록(`elif cmd.command == "inspect":`) 다음에 추가:

```python
elif cmd.command == "talk":
    if not cmd.target:
        self._log("누구와 대화할까요? 예: talk 박사", "log-error")
    else:
        npc = state.get_npc_in_room(cmd.target)
        if npc is None:
            self._log(f"'{cmd.target}'을(를) 찾을 수 없습니다.", "log-error")
        else:
            self._log(f"[{npc.name}]", "log-puzzle")
            for line in talk_to_npc(npc, state):
                self._log(f'  "{line}"', "log-normal")
```

파일 상단 import에 `talk_to_npc` 추가:
```python
from clue.engine.mechanics import execute_actions, attempt_puzzle, can_attempt_puzzle, talk_to_npc
```

- [ ] **Step 6: key_sequence 퍼즐 UI**

퍼즐 모드 진입 시 (`puzzle.type`에 따라 다른 안내 제공):

퍼즐 질문 출력 부분 찾아서, 기존 출력 뒤에 추가:

```python
if point.puzzle.type == "key_sequence":
    keys_display = "  ".join(
        f"[{i+1}:{k}]" for i, k in enumerate(point.puzzle.keys)
    )
    self._log(f"버튼: {keys_display}", "log-info")
    self._log("번호를 공백으로 구분해 입력하세요. 예: 1 3 2", "log-info")
elif point.puzzle.type == "timer":
    self._log(f"⏱ 제한 시간: {point.puzzle.time_limit_seconds}초", "log-error")
```

- [ ] **Step 7: timer 퍼즐 만료 처리**

퍼즐 모드 중 타이머 카운트다운이 0에 도달했을 때의 콜백 위치를 찾는다. 현재 타이머 표시만 하고 있다면, 만료 시 다음 처리 추가:

```python
def _on_puzzle_timer_expired(self) -> None:
    """타이머 만료 — 퍼즐 모드 강제 종료."""
    if self._puzzle_point is None:
        return
    puzzle = self._puzzle_point.puzzle
    fail_msg = (puzzle.fail_message if puzzle else None) or "시간이 초과되었습니다."
    self._log(fail_msg, "log-error")
    self._log("다시 시도하려면 같은 지점을 조사하세요.", "log-info")
    self._puzzle_point = None  # 퍼즐 모드 종료
    # 입력 프롬프트 복원 (Textual 위젯에 따라 다름)
```

> 주의: 정확한 구현은 app.py의 기존 타이머/퍼즐 모드 구조에 따라 다를 수 있다. 파일을 읽고 기존 패턴을 따른다.

- [ ] **Step 8: help 명령에 talk 추가**

help 텍스트 출력 부분에 `talk <이름>` 항목 추가:
```python
self._log("  talk <이름>  — NPC와 대화", "log-info")
```

- [ ] **Step 9: 커밋**

```bash
cd engine && git add clue/ui/app.py
git commit -m "feat(engine): NPC talk, intro/outro display, key_sequence UI, timer expiry"
```

---

## Phase 4 — 멀티 프로젝트 & 허브 메타 (빌더)

### Task 12: IndexedDB 레이어

**Files:**
- Create: `web/lib/db.ts`
- Create: `web/lib/projects.ts`

- [ ] **Step 1: db.ts — IndexedDB raw wrapper 생성**

```ts
// web/lib/db.ts
// IndexedDB 순수 wrapper. 외부 라이브러리 없음.

const DB_NAME = 'openclue'
const DB_VERSION = 1
const STORE = 'projects'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = e => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function dbGetAll<T>(): Promise<T[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => reject(req.error)
  })
}

export async function dbGet<T>(id: string): Promise<T | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
}

export async function dbPut<T>(record: T): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(record)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function dbDelete(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
```

- [ ] **Step 2: projects.ts — 프로젝트 CRUD + HubMeta 타입 정의**

```ts
// web/lib/projects.ts
import type { Scenario } from './schema'
import type { NodePosition } from './store'
import { dbGetAll, dbGet, dbPut, dbDelete } from './db'

export interface HubMeta {
  synopsis?: string
  tags?: string[]
  visibility?: 'public' | 'private'
}

export interface ProjectRecord {
  id: string
  scenario: Partial<Scenario>
  nodePositions: Record<string, NodePosition>
  createdAt: number
  updatedAt: number
  hubMeta?: HubMeta
}

const LEGACY_KEY = 'openclue_builder_draft'

export async function listProjects(): Promise<ProjectRecord[]> {
  const all = await dbGetAll<ProjectRecord>()
  return all.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getProject(id: string): Promise<ProjectRecord | undefined> {
  return dbGet<ProjectRecord>(id)
}

export async function saveProject(project: ProjectRecord): Promise<void> {
  await dbPut({ ...project, updatedAt: Date.now() })
}

export async function deleteProject(id: string): Promise<void> {
  await dbDelete(id)
}

export function newProject(): ProjectRecord {
  const id = crypto.randomUUID()
  const now = Date.now()
  return {
    id,
    scenario: {
      scenario_id: '',
      version: '1.0',
      title: '',
      author: '',
      difficulty: null,
      estimated_minutes: null,
      start_room_id: '',
      flags: {},
      items: [],
      rooms: [],
    },
    nodePositions: {},
    createdAt: now,
    updatedAt: now,
  }
}

/** localStorage 초안이 있으면 IndexedDB로 마이그레이션하고 삭제 */
export async function migrateLegacyDraft(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(LEGACY_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    const project = newProject()
    project.scenario = parsed.scenario ?? project.scenario
    project.nodePositions = parsed.nodePositions ?? {}
    await saveProject(project)
    localStorage.removeItem(LEGACY_KEY)
    return project.id
  } catch {
    return null
  }
}
```

- [ ] **Step 3: 빌드 확인**

```bash
cd web && npm run build 2>&1 | tail -8
```
Expected: `✓ Compiled successfully`

---

### Task 13: store.ts 리팩터링 — IndexedDB 기반

**Files:**
- Modify: `web/lib/store.ts`

- [ ] **Step 1: store.ts 전체 교체**

```ts
// web/lib/store.ts
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Scenario } from './schema'
import { getProject, saveProject, type ProjectRecord } from './projects'

export type NodePosition = { x: number; y: number }

export type BuilderState = {
  project: ProjectRecord | null
  selectedRoomId: string | null
  overlay: 'verify' | 'export' | null
}

/** 빌더 외부에서 scenario/nodePositions에 접근하기 쉽도록 computed shortcut */
export function useBuilderStore(projectId: string | null) {
  const [state, setStateRaw] = useState<BuilderState>({
    project: null,
    selectedRoomId: null,
    overlay: null,
  })
  const [hydrated, setHydrated] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 초기 로드
  useEffect(() => {
    if (!projectId) { setHydrated(true); return }
    getProject(projectId).then(proj => {
      if (proj) setStateRaw(prev => ({ ...prev, project: proj }))
      setHydrated(true)
    })
  }, [projectId])

  // 디바운스 자동 저장 (1초)
  const scheduleSave = useCallback((project: ProjectRecord) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveProject(project), 1000)
  }, [])

  const setProject = useCallback((updater: (prev: ProjectRecord) => ProjectRecord) => {
    setStateRaw(prev => {
      if (!prev.project) return prev
      const next = updater(prev.project)
      scheduleSave(next)
      return { ...prev, project: next }
    })
  }, [scheduleSave])

  // scenario shortcut
  const scenario = state.project?.scenario ?? {} as Partial<Scenario>
  const nodePositions = state.project?.nodePositions ?? {}

  const updateScenario = useCallback((patch: Partial<Scenario>) => {
    setProject(p => ({ ...p, scenario: { ...p.scenario, ...patch } }))
  }, [setProject])

  const setNodePosition = useCallback((roomId: string, pos: NodePosition) => {
    setProject(p => ({ ...p, nodePositions: { ...p.nodePositions, [roomId]: pos } }))
  }, [setProject])

  const setSelectedRoom = useCallback((roomId: string | null) => {
    setStateRaw(prev => ({ ...prev, selectedRoomId: roomId }))
  }, [])

  const setOverlay = useCallback((overlay: BuilderState['overlay']) => {
    setStateRaw(prev => ({ ...prev, overlay }))
  }, [])

  const addRoom = useCallback((pos: NodePosition) => {
    const id = `room-${Date.now()}`
    setProject(p => ({
      ...p,
      scenario: {
        ...p.scenario,
        rooms: [
          ...(p.scenario.rooms ?? []),
          { id, name: '새 방', description: '', points: [], npcs: [] },
        ],
        start_room_id: (p.scenario.rooms?.length ?? 0) === 0 ? id : p.scenario.start_room_id,
      },
      nodePositions: { ...p.nodePositions, [id]: pos },
    }))
    return id
  }, [setProject])

  const deleteRoom = useCallback((roomId: string) => {
    setProject(p => {
      const rooms = (p.scenario.rooms ?? []).filter(r => r.id !== roomId)
      const positions = { ...p.nodePositions }
      delete positions[roomId]
      return {
        ...p,
        scenario: {
          ...p.scenario,
          rooms,
          start_room_id: p.scenario.start_room_id === roomId
            ? (rooms[0]?.id ?? '')
            : p.scenario.start_room_id,
        },
        nodePositions: positions,
      }
    })
    setStateRaw(prev => ({
      ...prev,
      selectedRoomId: prev.selectedRoomId === roomId ? null : prev.selectedRoomId,
    }))
  }, [setProject])

  const updateHubMeta = useCallback((patch: Partial<HubMeta>) => {
    setProject(p => ({ ...p, hubMeta: { ...p.hubMeta, ...patch } }))
  }, [setProject])

  // HubMeta import
  // store.ts 상단에 추가: import type { HubMeta } from './projects'

  return {
    state,
    hydrated,
    scenario,
    nodePositions,
    selectedRoomId: state.selectedRoomId,
    overlay: state.overlay,
    updateScenario,
    setNodePosition,
    setSelectedRoom,
    setOverlay,
    addRoom,
    deleteRoom,
    updateHubMeta,
  }
}
```

- [ ] **Step 2: builder/page.tsx — projectId + store 전환**

`web/app/builder/page.tsx` 전체를 다음 구조로 교체:

```tsx
// web/app/builder/page.tsx
'use client'

import { useMemo, useRef, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useBuilderStore } from '../../lib/store'
import { validateScenario } from '../../lib/validator'
import { ScenarioSchema } from '../../lib/schema'
import { RoomCanvas } from '../../components/canvas/RoomCanvas'
import { RoomDetailPanel } from '../../components/canvas/RoomDetailPanel'
import { MetaSidebar } from '../../components/sidebar/MetaSidebar'
import { Modal } from '../../components/ui/Modal'
import { VerifyStep } from '../../components/steps/VerifyStep'
import { ExportStep } from '../../components/steps/ExportStep'
import { Button } from '../../components/ui/Button'

function BuilderContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('id')

  const {
    state, hydrated,
    scenario, nodePositions,
    selectedRoomId, overlay,
    updateScenario, setNodePosition,
    setSelectedRoom, setOverlay,
    addRoom, deleteRoom,
    updateHubMeta,
  } = useBuilderStore(projectId)

  const [sidebarWidth, setSidebarWidth] = useState(256)
  const resizingRef = useRef(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(256)

  const handleSidebarResizeStart = useCallback((e: React.MouseEvent) => {
    resizingRef.current = true
    startXRef.current = e.clientX
    startWidthRef.current = sidebarWidth
    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return
      setSidebarWidth(Math.max(160, Math.min(480, startWidthRef.current + ev.clientX - startXRef.current)))
    }
    const onUp = () => {
      resizingRef.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [sidebarWidth])

  const errorCount = useMemo(() => {
    const parsed = ScenarioSchema.safeParse(scenario)
    if (!parsed.success) return parsed.error.issues.length
    return validateScenario(parsed.data).length
  }, [scenario])

  if (!hydrated) return null

  return (
    <div className="flex flex-col h-screen bg-zinc-950 overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-800 flex-shrink-0">
        <span className="text-xs text-zinc-500 font-mono mr-2">OpenClue Builder</span>
        <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          errorCount === 0
            ? 'bg-green-950 text-green-400 border border-green-800'
            : 'bg-red-950 text-red-400 border border-red-800'
        }`}>
          {errorCount === 0 ? '✓ 오류 없음' : `⚠ ${errorCount}개 오류`}
        </div>
        <div className="flex-1" />
        <Button variant="secondary" onClick={() => setOverlay('verify')} className="text-xs py-1 px-3">검증</Button>
        <Button onClick={() => setOverlay('export')} disabled={errorCount > 0} className="text-xs py-1 px-3">내보내기</Button>
        <a href="/" className="text-xs text-zinc-600 hover:text-zinc-400 ml-1">← 홈</a>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <MetaSidebar
          scenario={scenario}
          onChange={updateScenario}
          style={{ width: sidebarWidth }}
          hubMeta={state.project?.hubMeta}
          onHubMetaChange={updateHubMeta}
        />
        <div className="w-1 flex-shrink-0 cursor-col-resize bg-zinc-800 hover:bg-green-700 transition-colors duration-150" onMouseDown={handleSidebarResizeStart} />
        <div className="flex-1 relative">
          <RoomCanvas
            scenario={scenario}
            nodePositions={nodePositions}
            selectedRoomId={selectedRoomId}
            onUpdateScenario={updateScenario}
            onSetNodePosition={setNodePosition}
            onSelectRoom={setSelectedRoom}
            onAddRoom={addRoom}
            onDeleteRoom={deleteRoom}
          />
          {selectedRoomId && (
            <RoomDetailPanel
              scenario={scenario}
              roomId={selectedRoomId}
              onChange={updateScenario}
              onClose={() => setSelectedRoom(null)}
            />
          )}
        </div>
      </div>

      {overlay === 'verify' && (
        <Modal title="시나리오 검증" onClose={() => setOverlay(null)}>
          <VerifyStep scenario={scenario} onPrev={() => setOverlay(null)} onNext={() => setOverlay('export')} onGoToStep={() => setOverlay(null)} />
        </Modal>
      )}
      {overlay === 'export' && (
        <Modal title="내보내기" onClose={() => setOverlay(null)}>
          <ExportStep scenario={scenario} onPrev={() => setOverlay('verify')} onReset={() => router.push('/')} />
        </Modal>
      )}
    </div>
  )
}

export default function BuilderPage() {
  return (
    <Suspense fallback={null}>
      <BuilderContent />
    </Suspense>
  )
}
```

- [ ] **Step 3: 빌드 확인**

```bash
cd web && npm run build 2>&1 | tail -8
```
Expected: `✓ Compiled successfully`

---

### Task 14: 홈 화면 재설계

**Files:**
- Modify: `web/app/page.tsx`

- [ ] **Step 1: page.tsx 전체 교체**

파일 전체를 다음으로 교체:

```tsx
// web/app/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { listProjects, newProject, saveProject, deleteProject, migrateLegacyDraft, type ProjectRecord } from '../lib/projects'
import { ScenarioSchema } from '../lib/schema'

const ASCII_ART = `  ___                    ____ _
 / _ \\ _ __   ___ _ __  / ___| |_   _  ___
| | | | '_ \\ / _ \\ '_ \\| |   | | | | |/ _ \\
| |_| | |_) |  __/ | | | |___| | |_| |  __/
 \\___/| .__/ \\___|_| |_|\\____|_|\\__,_|\\___|
      |_|`

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function HomePage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    migrateLegacyDraft().then(() => listProjects()).then(ps => {
      setProjects(ps)
      setLoading(false)
    })
  }, [])

  const handleNew = async () => {
    const p = newProject()
    await saveProject(p)
    router.push(`/builder?id=${p.id}`)
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('이 프로젝트를 삭제할까요?')) return
    await deleteProject(id)
    setProjects(ps => ps.filter(p => p.id !== id))
  }

  const handleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        const parsed = ScenarioSchema.safeParse(data)
        if (!parsed.success) { alert('유효하지 않은 시나리오 파일입니다.'); return }
        const p = newProject()
        p.scenario = parsed.data
        await saveProject(p)
        router.push(`/builder?id=${p.id}`)
      } catch { alert('파일을 읽을 수 없습니다.') }
    }
    reader.readAsText(file)
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* 헤더 */}
        <div className="mb-10">
          <pre
            className="text-green-400 hidden sm:block text-left"
            style={{ fontFamily: '"Consolas","Courier New",Courier,monospace', fontSize: '14px', lineHeight: '1.2', letterSpacing: '0' }}
          >
            {ASCII_ART}
          </pre>
          <p className="text-zinc-500 text-sm mt-2">방탈출 시나리오 빌더</p>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={handleNew}
            className="bg-green-700 hover:bg-green-600 text-white text-sm px-4 py-2 rounded font-medium transition-colors"
          >
            + 새 시나리오 만들기
          </button>
          <label className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2 rounded cursor-pointer transition-colors">
            JSON 불러오기
            <input type="file" accept=".json" className="hidden" onChange={handleLoad} />
          </label>
        </div>

        {/* 프로젝트 목록 */}
        {loading ? (
          <div className="text-zinc-600 text-sm">불러오는 중...</div>
        ) : projects.length === 0 ? (
          <div className="text-zinc-600 text-sm text-center py-16">
            아직 시나리오가 없습니다.<br/>
            <span className="text-zinc-500">위 버튼으로 새 시나리오를 만들어보세요.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map(p => {
              const roomCount = p.scenario.rooms?.length ?? 0
              const itemCount = p.scenario.items?.length ?? 0
              return (
                <div
                  key={p.id}
                  onClick={() => router.push(`/builder?id=${p.id}`)}
                  className="flex items-start gap-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 rounded-lg px-4 py-3 cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-white truncate">
                      {p.scenario.title || '(제목 없음)'}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {p.scenario.scenario_id || '—'} · 방 {roomCount}개 · 아이템 {itemCount}개
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-zinc-600">{formatDate(p.updatedAt)}</div>
                    <div className="flex gap-2 mt-1 justify-end">
                      <button
                        onClick={e => handleDelete(e, p.id)}
                        className="text-[10px] text-zinc-600 hover:text-red-400 px-1"
                      >삭제</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: 빌드 확인**

```bash
cd web && npm run build 2>&1 | tail -8
```
Expected: `✓ Compiled successfully`

---

### Task 15: 허브 메타 — MetaSidebar 섹션

**Files:**
- Modify: `web/components/sidebar/MetaSidebar.tsx`

- [ ] **Step 1: MetaSidebar props에 허브 메타 추가**

```tsx
import type { HubMeta } from '../../lib/projects'

interface MetaSidebarProps {
  scenario: Partial<Scenario>
  onChange: (patch: Partial<Scenario>) => void
  style?: React.CSSProperties
  hubMeta?: HubMeta
  onHubMetaChange?: (patch: Partial<HubMeta>) => void
}
```

- [ ] **Step 2: 허브 메타 섹션 추가**

파일 맨 아래 닫는 `</div>` 직전에 추가:

```tsx
{/* 구분선 */}
<div className="border-t border-zinc-800" />

{/* 허브 업로드 정보 */}
<div className="space-y-2">
  <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">🌐 허브 정보</h2>
  <div className="text-[10px] text-zinc-600">허브 업로드 시 사용됩니다</div>

  <div>
    <Label>개요</Label>
    <Textarea
      value={hubMeta?.synopsis ?? ''}
      onChange={e => onHubMetaChange?.({ synopsis: e.target.value || undefined })}
      placeholder="한두 줄로 시나리오를 소개하세요..."
      className="text-xs"
    />
  </div>

  <div>
    <Label>태그</Label>
    <div className="flex flex-wrap gap-1 mb-1">
      {(hubMeta?.tags ?? []).map(tag => (
        <span key={tag} className="bg-zinc-800 text-blue-400 text-[10px] rounded-full px-2 py-0.5 flex items-center gap-1">
          {tag}
          <button
            onClick={() => onHubMetaChange?.({ tags: (hubMeta?.tags ?? []).filter(t => t !== tag) })}
            className="hover:text-red-400"
          >×</button>
        </span>
      ))}
    </div>
    <input
      className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-xs text-white w-full placeholder:text-zinc-500 focus:outline-none focus:border-green-500"
      placeholder="태그 입력 후 Enter"
      onKeyDown={e => {
        if (e.key !== 'Enter') return
        const val = (e.target as HTMLInputElement).value.trim()
        if (!val) return
        onHubMetaChange?.({ tags: [...new Set([...(hubMeta?.tags ?? []), val])] });
        (e.target as HTMLInputElement).value = ''
      }}
    />
  </div>

  <div>
    <Label>공개 여부</Label>
    <div className="flex gap-2">
      {(['public', 'private'] as const).map(v => (
        <button
          key={v}
          onClick={() => onHubMetaChange?.({ visibility: v })}
          className={`flex-1 text-xs py-1 rounded border transition-colors ${
            (hubMeta?.visibility ?? 'private') === v
              ? 'bg-zinc-700 border-zinc-500 text-white'
              : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
          }`}
        >
          {v === 'public' ? '🌐 공개' : '🔒 비공개'}
        </button>
      ))}
    </div>
  </div>

  <button
    disabled
    className="w-full text-xs py-1.5 rounded border border-zinc-700 text-zinc-600 cursor-not-allowed"
    title="허브 완성 후 연결 예정"
  >
    ☁️ 허브에 업로드 (준비 중)
  </button>
</div>
```

- [ ] **Step 3: builder/page.tsx — hubMeta prop 연결**

`web/app/builder/page.tsx`에서 `MetaSidebar`에 props 추가:

```tsx
<MetaSidebar
  scenario={scenario}
  onChange={updateScenario}
  style={{ width: sidebarWidth }}
  hubMeta={state.project?.hubMeta}
  onHubMetaChange={updateHubMeta}
/>
```

- [ ] **Step 4: 최종 빌드 확인 + 커밋**

```bash
cd web && npm run build 2>&1 | tail -8
```
Expected: `✓ Compiled successfully`

```bash
cd .. && git add web/lib/db.ts web/lib/projects.ts web/lib/store.ts web/app/page.tsx web/app/builder/page.tsx web/components/sidebar/MetaSidebar.tsx
git commit -m "feat(builder): phase 4 — IndexedDB multi-project, hub metadata, home redesign"
```

---

## 최종 검증

### Task 16: 전체 빌드 + 엔진 테스트

- [ ] **Step 1: 웹 최종 빌드**

```bash
cd web && npm run build 2>&1
```
Expected: `✓ Generating static pages (5/5)` 이상, 오류 없음

- [ ] **Step 2: 엔진 전체 테스트**

```bash
cd engine && python -m pytest tests/ -v 2>&1
```
Expected: 모든 테스트 PASSED, 실패 0개

- [ ] **Step 3: 최종 커밋**

```bash
git add -A
git status  # 누락 파일 확인
git commit -m "chore: verify final build and all tests pass"
```
