# OpenClue Web Builder Canvas Editor 전면개편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 5단계 위자드를 완전히 제거하고, React Flow 기반 시각적 캔버스 에디터(ERD 스타일)로 방탈출 시나리오 빌더를 전면 재설계한다.

**Architecture:** 좌측 MetaSidebar(메타+아이템) + 중앙 React Flow Canvas(방=노드, move_to=엣지) + 우측 RoomDetailPanel(선택된 방 편집 슬라이드인). 검증/내보내기는 모달. 방 연결은 마우스 드래그로 생성, Delete 키로 삭제.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, `@xyflow/react` (React Flow v12), Zod, Web Crypto API, fflate, Vitest

---

## 변경 파일 맵

```
web/
├── app/
│   ├── page.tsx              ← MODIFY: ASCII art 폰트 fix + 색상 수정
│   └── builder/
│       └── page.tsx          ← REWRITE: 캔버스 레이아웃으로 전면 교체
├── components/
│   ├── canvas/               ← NEW
│   │   ├── RoomCanvas.tsx    ← React Flow 캔버스 (노드/엣지 관리)
│   │   ├── RoomNode.tsx      ← 커스텀 방 노드 컴포넌트
│   │   └── RoomDetailPanel.tsx ← 슬라이드인 방 편집 패널
│   ├── sidebar/              ← NEW
│   │   └── MetaSidebar.tsx   ← 좌측 사이드바 (메타 + 아이템)
│   ├── ui/
│   │   └── Modal.tsx         ← NEW: 모달 wrapper
│   └── steps/
│       ├── VerifyStep.tsx    ← KEEP (모달 안에서 사용)
│       └── ExportStep.tsx    ← KEEP (모달 안에서 사용)
└── lib/
    └── store.ts              ← MODIFY: BuilderState 재설계
```

**삭제 예정 컴포넌트** (Task 10에서 제거):
- `web/components/steps/MetaStep.tsx`
- `web/components/steps/RoomsStep.tsx`
- `web/components/steps/RoomDetailStep.tsx`
- `web/components/ui/StepBar.tsx`

---

## Task 1: 랜딩 페이지 수정

**Files:**
- Modify: `web/app/page.tsx`

- [ ] **Step 1: ASCII art 폰트 고정 + 색상 수정**

`web/app/page.tsx`의 `pre`와 `h1`을 수정:

```tsx
// web/app/page.tsx
'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '../components/ui/Button'
import { ScenarioSchema } from '../lib/schema'

const ASCII_ART = `
  ___                    ____ _
 / _ \\_ __   ___ _ __  / ___| |_   _  ___
| | | | '_ \\/ _ \\ '_ \\| |   | | | | |/ _ \\
| |_| | |_) |  __/| | | |___| | |_| |  __/
 \\___/| .__/\\___|_| |_|\\____|_|\\__,_|\\___|
      |_|`

export default function LandingPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const handleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        const parsed = ScenarioSchema.safeParse(data)
        if (!parsed.success) {
          alert('유효하지 않은 시나리오 파일입니다.')
          return
        }
        localStorage.setItem('openclue_builder_draft', JSON.stringify({
          scenario: parsed.data,
          nodePositions: {},
          selectedRoomId: null,
          overlay: null,
        }))
        router.push('/builder')
      } catch {
        alert('JSON 파싱 실패. 파일을 확인해주세요.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center space-y-3">
        <pre
          className="text-green-400 leading-tight hidden sm:block"
          style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: '13px' }}
        >
          {ASCII_ART}
        </pre>
        <h1 className="text-2xl font-bold text-green-400">Scenario Builder</h1>
        <p className="text-zinc-400 text-sm">방탈출 시나리오를 만들고 ZIP으로 내보내세요.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Button onClick={() => router.push('/builder')} className="text-base px-8 py-3">
          새 시나리오 만들기
        </Button>
        <Button variant="secondary" onClick={() => fileRef.current?.click()} className="text-base px-8 py-3">
          JSON 불러오기
        </Button>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleLoad} />
      </div>

      <p className="text-xs text-zinc-600">
        모든 작업은 브라우저에서만 처리됩니다. 서버로 데이터가 전송되지 않습니다.
      </p>
    </main>
  )
}
```

- [ ] **Step 2: 빌드 확인**

```bash
cd E:/workspace_claude/open-clue/web && npm run build 2>&1 | tail -10
```

Expected: 빌드 성공

- [ ] **Step 3: 커밋**

```bash
cd E:/workspace_claude/open-clue
git add web/app/page.tsx
git commit -m "fix(web): fix ASCII art font rendering and heading color on landing page"
```

---

## Task 2: store.ts 재설계

**Files:**
- Modify: `web/lib/store.ts`

기존 `currentStep`, `editingRoomId` 제거. 캔버스 전용 상태 추가.

- [ ] **Step 1: store.ts 전체 교체**

```typescript
// web/lib/store.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Scenario, Room, Item } from './schema'

const STORAGE_KEY = 'openclue_builder_draft'

export type NodePosition = { x: number; y: number }

export type BuilderState = {
  scenario: Partial<Scenario>
  nodePositions: Record<string, NodePosition>
  selectedRoomId: string | null
  overlay: 'verify' | 'export' | null
}

const DEFAULT_STATE: BuilderState = {
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
  selectedRoomId: null,
  overlay: null,
}

export function useBuilderStore() {
  const [state, setStateRaw] = useState<BuilderState>(DEFAULT_STATE)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // 구버전 호환: currentStep/editingRoomId 필드 무시
        setStateRaw({
          scenario: parsed.scenario ?? DEFAULT_STATE.scenario,
          nodePositions: parsed.nodePositions ?? {},
          selectedRoomId: null,
          overlay: null,
        })
      }
    } catch {}
    setHydrated(true)
  }, [])

  const setState = useCallback((updater: (prev: BuilderState) => BuilderState) => {
    setStateRaw(prev => {
      const next = updater(prev)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  const updateScenario = useCallback((patch: Partial<Scenario>) => {
    setState(prev => ({
      ...prev,
      scenario: { ...prev.scenario, ...patch },
    }))
  }, [setState])

  const setNodePosition = useCallback((roomId: string, pos: NodePosition) => {
    setState(prev => ({
      ...prev,
      nodePositions: { ...prev.nodePositions, [roomId]: pos },
    }))
  }, [setState])

  const setSelectedRoom = useCallback((roomId: string | null) => {
    setState(prev => ({ ...prev, selectedRoomId: roomId }))
  }, [setState])

  const setOverlay = useCallback((overlay: BuilderState['overlay']) => {
    setState(prev => ({ ...prev, overlay }))
  }, [setState])

  const addRoom = useCallback((pos: NodePosition) => {
    const id = `room-${Date.now()}`
    setState(prev => ({
      ...prev,
      scenario: {
        ...prev.scenario,
        rooms: [
          ...(prev.scenario.rooms ?? []),
          { id, name: '새 방', description: '', points: [] },
        ],
        start_room_id: prev.scenario.rooms?.length === 0 ? id : prev.scenario.start_room_id,
      },
      nodePositions: { ...prev.nodePositions, [id]: pos },
    }))
    return id
  }, [setState])

  const deleteRoom = useCallback((roomId: string) => {
    setState(prev => {
      const rooms = (prev.scenario.rooms ?? []).filter(r => r.id !== roomId)
      const positions = { ...prev.nodePositions }
      delete positions[roomId]
      return {
        ...prev,
        scenario: {
          ...prev.scenario,
          rooms,
          start_room_id: prev.scenario.start_room_id === roomId
            ? (rooms[0]?.id ?? '')
            : prev.scenario.start_room_id,
        },
        nodePositions: positions,
        selectedRoomId: prev.selectedRoomId === roomId ? null : prev.selectedRoomId,
      }
    })
  }, [setState])

  const loadScenario = useCallback((scenario: Scenario) => {
    setState(_ => ({
      scenario,
      nodePositions: {},
      selectedRoomId: null,
      overlay: null,
    }))
  }, [setState])

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setStateRaw(DEFAULT_STATE)
  }, [])

  return {
    state,
    hydrated,
    updateScenario,
    setNodePosition,
    setSelectedRoom,
    setOverlay,
    addRoom,
    deleteRoom,
    loadScenario,
    reset,
  }
}
```

- [ ] **Step 2: 기존 테스트 통과 확인**

```bash
cd E:/workspace_claude/open-clue/web && npm test 2>&1 | tail -10
```

Expected: 21 tests pass (store.ts는 테스트 없으므로 영향 없음)

- [ ] **Step 3: 커밋**

```bash
cd E:/workspace_claude/open-clue
git add web/lib/store.ts
git commit -m "feat(web): redesign BuilderState — canvas positions, overlay, add/delete room actions"
```

---

## Task 3: @xyflow/react 설치 + CSS 설정

**Files:**
- Modify: `web/package.json` (npm install)
- Modify: `web/app/layout.tsx`

- [ ] **Step 1: 패키지 설치**

```bash
cd E:/workspace_claude/open-clue/web && npm install @xyflow/react 2>&1 | tail -5
```

Expected: added N packages

- [ ] **Step 2: layout.tsx에 React Flow CSS 추가**

`web/app/layout.tsx` 읽은 후 상단에 CSS import 추가:

```tsx
// web/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import '@xyflow/react/dist/style.css'

export const metadata: Metadata = {
  title: 'OpenClue Builder',
  description: '방탈출 시나리오 제작 도구',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-zinc-950 text-white min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 3: 빌드 확인**

```bash
cd E:/workspace_claude/open-clue/web && npm run build 2>&1 | tail -10
```

Expected: 빌드 성공

- [ ] **Step 4: 커밋**

```bash
cd E:/workspace_claude/open-clue
git add web/package.json web/package-lock.json web/app/layout.tsx
git commit -m "feat(web): install @xyflow/react and add CSS import"
```

---

## Task 4: RoomNode.tsx — 커스텀 방 노드

**Files:**
- Create: `web/components/canvas/RoomNode.tsx`

React Flow 커스텀 노드. 방 이름, 포인트 수, 시작 방 배지, 연결 핸들 표시.

- [ ] **Step 1: 파일 생성**

```tsx
// web/components/canvas/RoomNode.tsx
'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { Room } from '../../lib/schema'

export type RoomNodeData = {
  room: Room
  isStart: boolean
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  onSetStart: () => void
}

function RoomNodeComponent({ data }: NodeProps) {
  const { room, isStart, isSelected, onSelect, onDelete, onSetStart } = data as RoomNodeData

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
      {/* Target handle (왼쪽, 연결 받는 쪽) */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-zinc-600 border-2 border-zinc-500 hover:bg-green-500"
      />

      {/* 시작 방 배지 */}
      {isStart && (
        <div className="absolute -top-2.5 left-2 bg-green-500 text-black text-[10px] font-bold px-1.5 rounded-full">
          START
        </div>
      )}

      {/* 방 이름 */}
      <div className="text-sm font-semibold text-white truncate max-w-[160px]">
        {room.name || '(이름 없음)'}
      </div>

      {/* 포인트 수 */}
      <div className="text-xs text-zinc-500 mt-1">
        {room.points.length}개 포인트
      </div>

      {/* 버튼 */}
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

      {/* Source handle (오른쪽, 연결 시작 쪽) */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-zinc-600 border-2 border-zinc-500 hover:bg-green-500"
      />
    </div>
  )
}

export const RoomNode = memo(RoomNodeComponent)
```

- [ ] **Step 2: 빌드 확인**

```bash
cd E:/workspace_claude/open-clue/web && npm run build 2>&1 | tail -10
```

Expected: 빌드 성공

- [ ] **Step 3: 커밋**

```bash
cd E:/workspace_claude/open-clue
git add web/components/canvas/RoomNode.tsx
git commit -m "feat(web): add RoomNode custom React Flow node"
```

---

## Task 5: RoomCanvas.tsx — 메인 캔버스

**Files:**
- Create: `web/components/canvas/RoomCanvas.tsx`

React Flow 캔버스. 방↔노드, move_to↔엣지. 드래그로 연결 생성, Delete로 엣지 삭제, 더블클릭으로 방 추가.

**중요:** `@xyflow/react` 문서를 `web/node_modules/@xyflow/react/dist/` 에서 확인 후 구현.

- [ ] **Step 1: 파일 생성**

```tsx
// web/components/canvas/RoomCanvas.tsx
'use client'

import { useCallback, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  BackgroundVariant,
} from '@xyflow/react'
import { RoomNode, type RoomNodeData } from './RoomNode'
import type { Scenario, Point } from '../../lib/schema'
import type { NodePosition } from '../../lib/store'

const NODE_TYPES = { roomNode: RoomNode }

interface RoomCanvasProps {
  scenario: Partial<Scenario>
  nodePositions: Record<string, NodePosition>
  selectedRoomId: string | null
  onUpdateScenario: (patch: Partial<Scenario>) => void
  onSetNodePosition: (roomId: string, pos: NodePosition) => void
  onSelectRoom: (roomId: string | null) => void
  onAddRoom: (pos: NodePosition) => void
  onDeleteRoom: (roomId: string) => void
}

function computeNodes(
  scenario: Partial<Scenario>,
  nodePositions: Record<string, NodePosition>,
  selectedRoomId: string | null,
  onSelect: (id: string) => void,
  onDelete: (id: string) => void,
  onSetStart: (id: string) => void,
): Node[] {
  return (scenario.rooms ?? []).map((room, i) => ({
    id: room.id,
    type: 'roomNode',
    position: nodePositions[room.id] ?? { x: i * 220, y: 100 },
    data: {
      room,
      isStart: room.id === scenario.start_room_id,
      isSelected: room.id === selectedRoomId,
      onSelect: () => onSelect(room.id),
      onDelete: () => onDelete(room.id),
      onSetStart: () => onSetStart(room.id),
    } satisfies RoomNodeData,
  }))
}

function computeEdges(scenario: Partial<Scenario>): Edge[] {
  const edges: Edge[] = []
  for (const room of scenario.rooms ?? []) {
    for (const point of room.points) {
      const actions = Array.isArray(point.action) ? point.action : point.action ? [point.action] : []
      for (const action of actions) {
        if (action.type === 'move_to' && action.value) {
          edges.push({
            id: `edge-${room.id}-${point.id}-${action.value}`,
            source: room.id,
            target: action.value as string,
            label: point.name || '이동',
            labelStyle: { fill: '#a1a1aa', fontSize: 11 },
            labelBgStyle: { fill: '#18181b' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#52525b' },
            style: { stroke: '#52525b' },
          })
        }
      }
    }
  }
  return edges
}

export function RoomCanvas({
  scenario,
  nodePositions,
  selectedRoomId,
  onUpdateScenario,
  onSetNodePosition,
  onSelectRoom,
  onAddRoom,
  onDeleteRoom,
}: RoomCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // 시나리오가 바뀔 때 노드/엣지 동기화
  useEffect(() => {
    setNodes(computeNodes(scenario, nodePositions, selectedRoomId, onSelectRoom, onDeleteRoom,
      (id) => onUpdateScenario({ start_room_id: id })))
    setEdges(computeEdges(scenario))
  }, [scenario.rooms, scenario.start_room_id, selectedRoomId, nodePositions])

  // 노드 드래그 종료 시 위치 저장
  const onNodeDragStop = useCallback((_: React.MouseEvent, node: Node) => {
    onSetNodePosition(node.id, node.position)
  }, [onSetNodePosition])

  // 엣지 연결 생성: 드래그로 두 방을 연결 → move_to 포인트 자동 추가
  const onConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target) return
    const rooms = scenario.rooms ?? []
    const targetRoom = rooms.find(r => r.id === params.target)
    if (!targetRoom) return

    const newPoint: Point = {
      id: `link-${params.source}-to-${params.target}-${Date.now()}`,
      name: `${targetRoom.name}(으)로 이동`,
      description: '',
      hidden: false,
      action: { type: 'move_to', value: params.target },
    }
    onUpdateScenario({
      rooms: rooms.map(r =>
        r.id === params.source
          ? { ...r, points: [...r.points, newPoint] }
          : r
      ),
    })
  }, [scenario.rooms, onUpdateScenario])

  // 엣지 삭제: move_to 포인트 제거
  const onEdgesDelete = useCallback((deletedEdges: Edge[]) => {
    let rooms = [...(scenario.rooms ?? [])]
    for (const edge of deletedEdges) {
      const targetId = edge.target
      rooms = rooms.map(r => {
        if (r.id !== edge.source) return r
        return {
          ...r,
          points: r.points.filter(p => {
            const actions = Array.isArray(p.action) ? p.action : p.action ? [p.action] : []
            return !actions.some(a => a.type === 'move_to' && a.value === targetId)
          }),
        }
      })
    }
    onUpdateScenario({ rooms })
  }, [scenario.rooms, onUpdateScenario])

  // 캔버스 더블클릭: 해당 위치에 새 방 추가
  const onPaneDoubleClick = useCallback((event: React.MouseEvent) => {
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const pos = {
      x: event.clientX - bounds.left - 70,
      y: event.clientY - bounds.top - 40,
    }
    onAddRoom(pos)
  }, [onAddRoom])

  // 캔버스 클릭 (빈 곳): 선택 해제
  const onPaneClick = useCallback(() => {
    onSelectRoom(null)
  }, [onSelectRoom])

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onPaneDoubleClick={onPaneDoubleClick}
        onPaneClick={onPaneClick}
        deleteKeyCode="Delete"
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
      >
        <Background variant={BackgroundVariant.Dots} color="#3f3f46" gap={20} />
        <Controls className="[&>button]:bg-zinc-800 [&>button]:border-zinc-700 [&>button]:text-zinc-300" />
        <MiniMap
          nodeColor="#3f3f46"
          maskColor="rgba(9,9,11,0.7)"
          style={{ background: '#18181b', border: '1px solid #3f3f46' }}
        />
      </ReactFlow>
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-xs text-zinc-600 pointer-events-none">
        더블클릭으로 방 추가 · 핸들 드래그로 연결 · Delete로 삭제
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 빌드 확인 및 TypeScript 오류 수정**

```bash
cd E:/workspace_claude/open-clue/web && npm run build 2>&1
```

TypeScript 오류가 있으면 수정. 주요 주의점:
- `@xyflow/react` v12의 `NodeProps` 타입에서 `data`는 `Record<string, unknown>` 기반이므로 캐스팅 필요
- `onEdgesChange`, `onNodesChange` 시그니처 확인

- [ ] **Step 3: 커밋**

```bash
cd E:/workspace_claude/open-clue
git add web/components/canvas/RoomCanvas.tsx
git commit -m "feat(web): add RoomCanvas with React Flow — ERD-style room editor"
```

---

## Task 6: RoomDetailPanel.tsx — 슬라이드인 방 편집 패널

**Files:**
- Create: `web/components/canvas/RoomDetailPanel.tsx`

우측에서 슬라이드인하는 패널. 기존 `RoomDetailStep`의 포인트/퍼즐 편집 UI를 재활용.

- [ ] **Step 1: 파일 생성**

```tsx
// web/components/canvas/RoomDetailPanel.tsx
'use client'

import { useState } from 'react'
import { Button } from '../ui/Button'
import { Input, Textarea, Label } from '../ui/Input'
import type { Point, Item, Room, Scenario, Action } from '../../lib/schema'

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
            {room.points.map((point, i) => (
              <div key={point.id} className="bg-zinc-900 border border-zinc-800 rounded">
                <div className="flex items-center gap-2 p-2">
                  <Input
                    placeholder="지점 이름"
                    value={point.name}
                    onChange={e => updatePoint(i, { name: e.target.value })}
                    className="flex-1 text-xs"
                  />
                  <button
                    onClick={() => setExpandedPoint(expandedPoint === point.id ? null : point.id)}
                    className="text-xs text-zinc-500 hover:text-zinc-300 px-1"
                  >
                    {expandedPoint === point.id ? '접기' : '상세'}
                  </button>
                  <button
                    onClick={() => deletePoint(i)}
                    className="text-zinc-600 hover:text-red-400 text-xs px-1"
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
                          <div>
                            <Label required>퍼즐 질문</Label>
                            <Textarea
                              value={point.puzzle.question}
                              onChange={e => updatePoint(i, { puzzle: { ...point.puzzle!, question: e.target.value } })}
                              placeholder="비밀번호는?"
                              className="text-xs"
                            />
                          </div>
                          <div>
                            <Label required>정답</Label>
                            <Input
                              value={point.puzzle.answer_hash.startsWith('plain:') ? point.puzzle.answer_hash.slice(6) : point.puzzle.answer_hash}
                              onChange={e => updatePoint(i, { puzzle: { ...point.puzzle!, answer_hash: `plain:${e.target.value}` } })}
                              placeholder="1234"
                              className="text-xs"
                            />
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
                          <div>
                            <Label>최대 시도 / 제한 시간(초)</Label>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                min={1}
                                value={point.puzzle.max_attempts ?? ''}
                                onChange={e => updatePoint(i, { puzzle: { ...point.puzzle!, max_attempts: e.target.value ? parseInt(e.target.value) : null } })}
                                placeholder="무제한"
                                className="text-xs"
                              />
                              <Input
                                type="number"
                                min={1}
                                value={point.puzzle.time_limit_seconds ?? ''}
                                onChange={e => updatePoint(i, { puzzle: { ...point.puzzle!, time_limit_seconds: e.target.value ? parseInt(e.target.value) : null } })}
                                placeholder="없음"
                                className="text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
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
```

- [ ] **Step 2: 빌드 확인**

```bash
cd E:/workspace_claude/open-clue/web && npm run build 2>&1 | tail -10
```

- [ ] **Step 3: 커밋**

```bash
cd E:/workspace_claude/open-clue
git add web/components/canvas/RoomDetailPanel.tsx
git commit -m "feat(web): add RoomDetailPanel slide-in editor"
```

---

## Task 7: MetaSidebar.tsx — 좌측 사이드바

**Files:**
- Create: `web/components/sidebar/MetaSidebar.tsx`

메타 정보(제목/ID/작가/난이도/시간) + 아이템 목록을 좌측 고정 사이드바에 표시.

- [ ] **Step 1: 파일 생성**

```tsx
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
}

export function MetaSidebar({ scenario, onChange }: MetaSidebarProps) {
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
    <div className="w-64 flex-shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col overflow-y-auto">
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
              <div className="text-[10px] text-zinc-600 font-mono truncate">{item.id}</div>
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
```

- [ ] **Step 2: 빌드 확인**

```bash
cd E:/workspace_claude/open-clue/web && npm run build 2>&1 | tail -10
```

- [ ] **Step 3: 커밋**

```bash
cd E:/workspace_claude/open-clue
git add web/components/sidebar/MetaSidebar.tsx
git commit -m "feat(web): add MetaSidebar with meta fields and items"
```

---

## Task 8: Modal.tsx — 모달 wrapper

**Files:**
- Create: `web/components/ui/Modal.tsx`

VerifyStep / ExportStep을 모달로 표시하기 위한 단순 wrapper.

- [ ] **Step 1: 파일 생성**

```tsx
// web/components/ui/Modal.tsx
'use client'

import { useEffect } from 'react'

interface ModalProps {
  onClose: () => void
  children: React.ReactNode
  title: string
}

export function Modal({ onClose, children, title }: ModalProps) {
  // ESC로 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* 패널 */}
      <div className="relative bg-zinc-950 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-zinc-300 text-xl leading-none"
          >
            ✕
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
cd E:/workspace_claude/open-clue
git add web/components/ui/Modal.tsx
git commit -m "feat(web): add Modal wrapper component"
```

---

## Task 9: 빌더 페이지 전면 재설계

**Files:**
- Modify: `web/app/builder/page.tsx`

5단계 위자드 → 캔버스 기반 레이아웃으로 교체.

레이아웃:
```
[TopBar: 앱명 | 검증 뱃지 | 검증/내보내기 버튼 | 새로만들기 | 홈]
[MetaSidebar | RoomCanvas (relative)] [RoomDetailPanel (absolute, 캔버스 위)]
```

- [ ] **Step 1: 파일 전체 교체**

`web/app/builder/page.tsx`를 읽은 후 다음으로 교체:

```tsx
// web/app/builder/page.tsx
'use client'

import { useMemo } from 'react'
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

export default function BuilderPage() {
  const {
    state,
    hydrated,
    updateScenario,
    setNodePosition,
    setSelectedRoom,
    setOverlay,
    addRoom,
    deleteRoom,
    loadScenario,
    reset,
  } = useBuilderStore()

  const { scenario, nodePositions, selectedRoomId, overlay } = state

  // 검증 오류 수 (실시간)
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

        {/* 검증 뱃지 */}
        <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          errorCount === 0
            ? 'bg-green-950 text-green-400 border border-green-800'
            : 'bg-red-950 text-red-400 border border-red-800'
        }`}>
          {errorCount === 0 ? '✓ 오류 없음' : `⚠ ${errorCount}개 오류`}
        </div>

        <div className="flex-1" />

        <Button
          variant="secondary"
          onClick={() => setOverlay('verify')}
          className="text-xs py-1 px-3"
        >
          검증
        </Button>
        <Button
          onClick={() => setOverlay('export')}
          disabled={errorCount > 0}
          className="text-xs py-1 px-3"
        >
          내보내기
        </Button>
        <Button
          variant="ghost"
          onClick={reset}
          className="text-xs py-1 px-3"
        >
          새로 만들기
        </Button>
        <a href="/" className="text-xs text-zinc-600 hover:text-zinc-400 ml-1">
          ← 홈
        </a>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <MetaSidebar scenario={scenario} onChange={updateScenario} />

        {/* Canvas Area (relative for overlay positioning) */}
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

          {/* Room Detail Panel (absolute, slides in from right) */}
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

      {/* Verify Modal */}
      {overlay === 'verify' && (
        <Modal title="시나리오 검증" onClose={() => setOverlay(null)}>
          <VerifyStep
            scenario={scenario}
            onPrev={() => setOverlay(null)}
            onNext={() => setOverlay('export')}
            onGoToStep={() => setOverlay(null)}
          />
        </Modal>
      )}

      {/* Export Modal */}
      {overlay === 'export' && (
        <Modal title="내보내기" onClose={() => setOverlay(null)}>
          <ExportStep
            scenario={scenario}
            onPrev={() => setOverlay('verify')}
            onReset={() => { reset(); setOverlay(null) }}
          />
        </Modal>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 빌드 확인 및 TypeScript 오류 수정**

```bash
cd E:/workspace_claude/open-clue/web && npm run build 2>&1
```

`VerifyStep`의 `onGoToStep` prop 시그니처: `(step: number) => void`. 빌더 페이지에서는 `step` 인자를 무시하고 오버레이를 닫는다. TypeScript 오류가 있으면 타입을 맞춰 수정.

- [ ] **Step 3: 테스트 실행 확인**

```bash
cd E:/workspace_claude/open-clue/web && npm test 2>&1 | tail -10
```

Expected: 21 tests pass

- [ ] **Step 4: 커밋**

```bash
cd E:/workspace_claude/open-clue
git add web/app/builder/page.tsx
git commit -m "feat(web): rewrite builder page — canvas layout, modals for verify/export"
```

---

## Task 10: 정리 + ROADMAP 업데이트

**Files:**
- Delete: `web/components/steps/MetaStep.tsx`
- Delete: `web/components/steps/RoomsStep.tsx`
- Delete: `web/components/steps/RoomDetailStep.tsx`
- Delete: `web/components/ui/StepBar.tsx`
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: 사용하지 않는 컴포넌트 삭제**

```bash
cd E:/workspace_claude/open-clue/web
rm components/steps/MetaStep.tsx
rm components/steps/RoomsStep.tsx
rm components/steps/RoomDetailStep.tsx
rm components/ui/StepBar.tsx
```

- [ ] **Step 2: 빌드 확인 (삭제 후 참조 없는지)**

```bash
cd E:/workspace_claude/open-clue/web && npm run build 2>&1 | tail -15
```

"Module not found" 오류가 있으면 해당 import를 찾아 제거.

- [ ] **Step 3: 테스트 최종 확인**

```bash
cd E:/workspace_claude/open-clue/web && npm test 2>&1
```

Expected: 21 tests pass

- [ ] **Step 4: ROADMAP.md 업데이트**

`docs/ROADMAP.md`의 Milestone 2-0 체크리스트를 읽은 후, "5단계 위자드 UI 구현"을 "캔버스 기반 시각적 방 편집기 구현 (React Flow ERD 스타일)"으로 교체.

- [ ] **Step 5: 최종 커밋**

```bash
cd E:/workspace_claude/open-clue
git add -A
git commit -m "feat(web): canvas editor redesign complete — ERD-style room builder with React Flow"
```

---

## 검증 체크리스트

- [ ] `npm test` — 21개 테스트 모두 통과
- [ ] `npm run build` — TypeScript 오류 없음
- [ ] 랜딩 페이지: ASCII art 폰트 정렬 정상, "Scenario Builder" 초록색
- [ ] 빌더: 더블클릭으로 방 추가됨
- [ ] 빌더: 방 노드 클릭 → RoomDetailPanel 슬라이드인
- [ ] 빌더: 방 핸들 드래그 → 연결 생성 (move_to 포인트 자동 추가)
- [ ] 빌더: 엣지 선택 후 Delete → 연결 삭제 (move_to 포인트 제거)
- [ ] 검증 모달: 오류 있으면 목록 표시
- [ ] 내보내기 모달: ZIP 다운로드 동작
- [ ] 새로고침 후 localStorage에서 방/위치 복원
