# OpenClue Web Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Next.js 16 웹 앱으로 방탈출 시나리오를 제작하고 JSON + DAT를 ZIP으로 다운로드할 수 있는 브라우저 기반 빌더를 만든다.

**Architecture:** 완전 클라이언트 사이드 정적 앱. 서버 통신 없이 Web Crypto API로 브라우저에서 직접 DAT 암호화, fflate로 ZIP 생성. 5단계 위자드 UI. localStorage 자동저장.

**Tech Stack:** Next.js 16.2.2 (App Router), TypeScript, Tailwind CSS v4, Zod, Web Crypto API, fflate, Vitest

---

## 파일 구조

```
web/
├── app/
│   ├── layout.tsx                  # 루트 레이아웃
│   ├── page.tsx                    # 랜딩 (새로 만들기 / JSON 불러오기)
│   └── builder/
│       └── page.tsx                # 빌더 메인 (위자드 컨테이너)
├── components/
│   ├── ui/
│   │   ├── Button.tsx              # 공용 버튼
│   │   ├── Input.tsx               # 공용 입력
│   │   ├── StepBar.tsx             # 상단 진행바
│   │   └── StarRating.tsx          # 난이도 ★ 선택
│   └── steps/
│       ├── MetaStep.tsx            # ① 메타 정보
│       ├── RoomsStep.tsx           # ② 방 목록
│       ├── RoomDetailStep.tsx      # ③ 방 상세 (포인트+아이템)
│       ├── VerifyStep.tsx          # ④ 검증
│       └── ExportStep.tsx         # ⑤ 내보내기
├── lib/
│   ├── schema.ts                   # Zod 스키마 + TypeScript 타입
│   ├── validator.ts                # 검증 로직 (validator.py 포팅)
│   ├── cipher.ts                   # AES-256-GCM DAT 생성 (Web Crypto API)
│   ├── zip.ts                      # JSON + DAT → ZIP (fflate)
│   └── store.ts                    # ScenarioState + localStorage hook
├── __tests__/
│   ├── validator.test.ts
│   ├── cipher.test.ts
│   └── zip.test.ts
├── next.config.ts
├── tailwind.config.ts
├── vitest.config.ts
└── package.json
```

---

## Task 1: 프로젝트 초기화

**Files:**
- Create: `web/` (디렉토리)
- Create: `web/package.json`
- Create: `web/next.config.ts`
- Create: `web/vitest.config.ts`
- Create: `web/tsconfig.json`

- [ ] **Step 1: Next.js 16 프로젝트 생성**

```bash
cd E:/workspace_claude/open-clue
npx create-next-app@16 web \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --no-import-alias \
  --no-turbopack
cd web
```

프롬프트가 나오면 모두 기본값으로 진행.

- [ ] **Step 2: 추가 의존성 설치**

```bash
cd E:/workspace_claude/open-clue/web
npm install fflate zod
npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: vitest.config.ts 생성**

```typescript
// web/vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

- [ ] **Step 4: vitest.setup.ts 생성**

```typescript
// web/vitest.setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 5: package.json에 test 스크립트 추가**

`web/package.json`의 `scripts`에 추가:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: 기본 동작 확인**

```bash
cd E:/workspace_claude/open-clue/web
npm run dev
```

`http://localhost:3000` 접속 → Next.js 기본 페이지 표시 확인. `Ctrl+C`로 종료.

- [ ] **Step 7: 커밋**

```bash
cd E:/workspace_claude/open-clue
git add web/
git commit -m "feat: initialize Next.js 16 web builder project"
```

---

## Task 2: schema.ts — Zod 스키마 정의

**Files:**
- Create: `web/lib/schema.ts`
- Create: `web/__tests__/schema.test.ts`

Python `models.py`의 Pydantic 모델을 Zod로 1:1 포팅.

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// web/__tests__/schema.test.ts
import { describe, it, expect } from 'vitest'
import { ScenarioSchema, ActionSchema } from '../lib/schema'

describe('ScenarioSchema', () => {
  it('유효한 최소 시나리오를 파싱한다', () => {
    const data = {
      scenario_id: 'test',
      version: '1.0',
      title: '테스트',
      start_room_id: 'room1',
      rooms: [{
        id: 'room1',
        name: '방1',
        description: '설명',
        points: [{
          id: 'exit',
          name: '출구',
          description: '탈출',
          action: { type: 'game_clear', value: null },
        }],
      }],
    }
    const result = ScenarioSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('rooms가 비어 있으면 실패한다', () => {
    const data = {
      scenario_id: 'test',
      title: '테스트',
      start_room_id: 'room1',
      rooms: [],
    }
    const result = ScenarioSchema.safeParse(data)
    expect(result.success).toBe(false)
  })
})

describe('ActionSchema', () => {
  it('game_clear 타입을 파싱한다', () => {
    const result = ActionSchema.safeParse({ type: 'game_clear', value: null })
    expect(result.success).toBe(true)
  })

  it('알 수 없는 타입은 실패한다', () => {
    const result = ActionSchema.safeParse({ type: 'unknown' })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd E:/workspace_claude/open-clue/web
npm test -- __tests__/schema.test.ts
```

Expected: FAIL (모듈 없음)

- [ ] **Step 3: schema.ts 구현**

```typescript
// web/lib/schema.ts
import { z } from 'zod'

export const ActionSchema = z.object({
  type: z.enum(['get_item', 'set_flag', 'move_to', 'game_clear']),
  value: z.unknown().optional().nullable(),
})

export const RequirementsSchema = z.object({
  item_id: z.string().optional().nullable(),
  flag: z.record(z.unknown()).optional().nullable(),
  solved_puzzle: z.string().optional().nullable(),
})

export const PuzzleSchema = z.object({
  type: z.enum(['text_input', 'key_sequence', 'timer']).default('text_input'),
  question: z.string(),
  hint: z.string().optional().nullable(),
  answer_hash: z.string(),
  max_attempts: z.number().int().positive().optional().nullable(),
  time_limit_seconds: z.number().int().positive().optional().nullable(),
  fail_message: z.string().optional().nullable(),
  on_success: z.union([ActionSchema, z.array(ActionSchema)]),
})

export const PointSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  hidden: z.boolean().default(false),
  requirements: RequirementsSchema.optional().nullable(),
  observation: z.string().optional().nullable(),
  action: z.union([ActionSchema, z.array(ActionSchema)]).optional().nullable(),
  puzzle: PuzzleSchema.optional().nullable(),
})

export const RoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  points: z.array(PointSchema).default([]),
})

export const ItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  usable_on: z.array(z.string()).default([]),
})

export const ScenarioSchema = z.object({
  scenario_id: z.string(),
  version: z.string().default('1.0'),
  title: z.string(),
  author: z.string().optional().nullable(),
  difficulty: z.number().int().min(1).max(5).optional().nullable(),
  estimated_minutes: z.number().int().positive().optional().nullable(),
  start_room_id: z.string(),
  flags: z.record(z.unknown()).default({}),
  items: z.array(ItemSchema).default([]),
  rooms: z.array(RoomSchema).min(1, '방이 최소 1개 있어야 합니다.'),
})

export type Action = z.infer<typeof ActionSchema>
export type Requirements = z.infer<typeof RequirementsSchema>
export type Puzzle = z.infer<typeof PuzzleSchema>
export type Point = z.infer<typeof PointSchema>
export type Room = z.infer<typeof RoomSchema>
export type Item = z.infer<typeof ItemSchema>
export type Scenario = z.infer<typeof ScenarioSchema>
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd E:/workspace_claude/open-clue/web
npm test -- __tests__/schema.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 5: 커밋**

```bash
cd E:/workspace_claude/open-clue
git add web/lib/schema.ts web/__tests__/schema.test.ts
git commit -m "feat(web): add Zod schema (port of models.py)"
```

---

## Task 3: validator.ts — 검증 로직

**Files:**
- Create: `web/lib/validator.ts`
- Create: `web/__tests__/validator.test.ts`

`engine/clue/schema/validator.py` 1:1 포팅. dead-end 탐지 포함.

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// web/__tests__/validator.test.ts
import { describe, it, expect } from 'vitest'
import { validateScenario } from '../lib/validator'
import type { Scenario } from '../lib/schema'

function baseScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    scenario_id: 'test',
    version: '1.0',
    title: '테스트',
    start_room_id: 'room1',
    flags: {},
    items: [{ id: 'key', name: '열쇠', description: '녹슨 열쇠', usable_on: [] }],
    rooms: [{
      id: 'room1',
      name: '방1',
      description: '출발 방',
      points: [{
        id: 'exit',
        name: '출구',
        description: '탈출',
        hidden: false,
        action: { type: 'game_clear', value: null },
      }],
    }],
    ...overrides,
  }
}

describe('validateScenario', () => {
  it('유효한 시나리오는 빈 배열을 반환한다', () => {
    expect(validateScenario(baseScenario())).toEqual([])
  })

  it('잘못된 start_room_id를 감지한다', () => {
    const errors = validateScenario(baseScenario({ start_room_id: 'nonexistent' }))
    expect(errors.some(e => e.includes('start_room_id'))).toBe(true)
  })

  it('포인트 ID 중복을 감지한다', () => {
    const scenario = baseScenario()
    scenario.rooms[0].points.push({ ...scenario.rooms[0].points[0] })
    const errors = validateScenario(scenario)
    expect(errors.some(e => e.includes('중복'))).toBe(true)
  })

  it('존재하지 않는 requirements.item_id를 감지한다', () => {
    const scenario = baseScenario()
    scenario.rooms[0].points.push({
      id: 'door',
      name: '문',
      description: '잠긴 문',
      hidden: false,
      requirements: { item_id: 'ghost_item' },
    })
    const errors = validateScenario(scenario)
    expect(errors.some(e => e.includes('ghost_item'))).toBe(true)
  })

  it('game_clear 액션이 없으면 감지한다', () => {
    const scenario = baseScenario()
    scenario.rooms[0].points = [{
      id: 'note',
      name: '메모',
      description: '쪽지',
      hidden: false,
      observation: '아무것도 없다.',
    }]
    const errors = validateScenario(scenario)
    expect(errors.some(e => e.includes('game_clear'))).toBe(true)
  })

  it('move_to로 존재하지 않는 방을 감지한다', () => {
    const scenario = baseScenario()
    scenario.rooms[0].points.push({
      id: 'portal',
      name: '포털',
      description: '어딘가로',
      hidden: false,
      action: { type: 'move_to', value: 'ghost_room' },
    })
    const errors = validateScenario(scenario)
    expect(errors.some(e => e.includes('ghost_room'))).toBe(true)
  })

  it('고립된 방(dead-end)을 감지한다', () => {
    const scenario = baseScenario()
    scenario.rooms.push({
      id: 'isolated',
      name: '고립된 방',
      description: '아무도 못 온다',
      points: [],
    })
    const errors = validateScenario(scenario)
    expect(errors.some(e => e.includes('isolated') && e.includes('고립'))).toBe(true)
  })

  it('move_to로 도달 가능한 방은 dead-end 오류가 없다', () => {
    const scenario = baseScenario()
    scenario.rooms[0].points.push({
      id: 'passage',
      name: '통로',
      description: '방2로',
      hidden: false,
      action: { type: 'move_to', value: 'room2' },
    })
    scenario.rooms.push({
      id: 'room2',
      name: '방2',
      description: '도달 가능',
      points: [],
    })
    const errors = validateScenario(scenario)
    expect(errors.filter(e => e.includes('고립'))).toEqual([])
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd E:/workspace_claude/open-clue/web
npm test -- __tests__/validator.test.ts
```

Expected: FAIL

- [ ] **Step 3: validator.ts 구현**

```typescript
// web/lib/validator.ts
import type { Action, Point, Scenario } from './schema'

function collectActions(action: Action | Action[] | null | undefined): Action[] {
  if (!action) return []
  return Array.isArray(action) ? action : [action]
}

function checkAction(
  action: Action,
  roomIds: Set<string>,
  itemIds: Set<string>,
  pointId: string,
): string[] {
  const errors: string[] = []
  if (action.type === 'get_item' && !itemIds.has(action.value as string)) {
    errors.push(`포인트 '${pointId}' get_item 값 '${action.value}'가 items에 없습니다.`)
  }
  if (action.type === 'move_to' && !roomIds.has(action.value as string)) {
    errors.push(`포인트 '${pointId}' move_to 값 '${action.value}'가 rooms에 없습니다.`)
  }
  return errors
}

export function validateScenario(scenario: Scenario): string[] {
  const errors: string[] = []
  const roomIds = new Set(scenario.rooms.map(r => r.id))
  const itemIds = new Set(scenario.items.map(i => i.id))

  if (!roomIds.has(scenario.start_room_id)) {
    errors.push(`start_room_id '${scenario.start_room_id}'가 rooms 목록에 없습니다.`)
  }

  const seenPointIds = new Set<string>()
  let hasGameClear = false

  for (const room of scenario.rooms) {
    for (const point of room.points) {
      if (seenPointIds.has(point.id)) {
        errors.push(`포인트 ID '${point.id}'가 중복됩니다.`)
      }
      seenPointIds.add(point.id)

      if (point.requirements?.item_id && !itemIds.has(point.requirements.item_id)) {
        errors.push(
          `포인트 '${point.id}' requirements.item_id '${point.requirements.item_id}'가 items에 없습니다.`
        )
      }

      for (const action of collectActions(point.action)) {
        errors.push(...checkAction(action, roomIds, itemIds, point.id))
        if (action.type === 'game_clear') hasGameClear = true
      }

      if (point.puzzle) {
        for (const action of collectActions(point.puzzle.on_success)) {
          errors.push(...checkAction(action, roomIds, itemIds, point.id))
          if (action.type === 'game_clear') hasGameClear = true
        }
      }
    }
  }

  if (!hasGameClear) {
    errors.push('game_clear 액션이 하나도 없습니다. 탈출 경로를 추가하세요.')
  }

  // Dead-end 탐지 (BFS)
  if (roomIds.has(scenario.start_room_id)) {
    const reachable = new Set<string>()
    const queue = [scenario.start_room_id]
    while (queue.length > 0) {
      const current = queue.shift()!
      if (reachable.has(current)) continue
      reachable.add(current)
      const room = scenario.rooms.find(r => r.id === current)
      if (!room) continue
      for (const point of room.points) {
        for (const action of [
          ...collectActions(point.action),
          ...collectActions(point.puzzle?.on_success),
        ]) {
          if (action.type === 'move_to' && !reachable.has(action.value as string)) {
            queue.push(action.value as string)
          }
        }
      }
    }
    for (const roomId of roomIds) {
      if (!reachable.has(roomId)) {
        errors.push(`방 '${roomId}'는 start_room에서 도달할 수 없는 고립 방입니다.`)
      }
    }
  }

  return errors
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd E:/workspace_claude/open-clue/web
npm test -- __tests__/validator.test.ts
```

Expected: PASS (7 tests)

- [ ] **Step 5: 커밋**

```bash
cd E:/workspace_claude/open-clue
git add web/lib/validator.ts web/__tests__/validator.test.ts
git commit -m "feat(web): add validator.ts (port of validator.py, includes dead-end detection)"
```

---

## Task 4: cipher.ts — DAT 파일 생성

**Files:**
- Create: `web/lib/cipher.ts`
- Create: `web/__tests__/cipher.test.ts`

Python `encrypt.py`와 동일한 DAT 포맷: `MAGIC(4B) | VERSION(2B BE) | NONCE(12B) | TAG(16B) | CIPHERTEXT`

Key: `"OpenClue-Secret-Key-32bytes!!!!!"` (32 bytes, 고정)

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// web/__tests__/cipher.test.ts
import { describe, it, expect } from 'vitest'
import { buildDat, MAGIC_BYTES } from '../lib/cipher'

describe('buildDat', () => {
  it('DAT 헤더가 올바른 MAGIC으로 시작한다', async () => {
    const dat = await buildDat('{"test": true}')
    expect(Array.from(dat.slice(0, 4))).toEqual([0x4F, 0x43, 0x4C, 0x55])
  })

  it('VERSION 바이트가 0x0001이다', async () => {
    const dat = await buildDat('{"test": true}')
    expect(dat[4]).toBe(0x00)
    expect(dat[5]).toBe(0x01)
  })

  it('NONCE가 12바이트다', async () => {
    const dat = await buildDat('{"test": true}')
    const nonce = dat.slice(6, 18)
    expect(nonce.length).toBe(12)
  })

  it('TAG가 16바이트다 (헤더 기준 offset 18)', async () => {
    const dat = await buildDat('{"test": true}')
    const tag = dat.slice(18, 34)
    expect(tag.length).toBe(16)
  })

  it('같은 평문으로 두 번 호출하면 다른 결과가 나온다 (nonce 랜덤)', async () => {
    const a = await buildDat('{"test": true}')
    const b = await buildDat('{"test": true}')
    expect(Array.from(a)).not.toEqual(Array.from(b))
  })

  it('MAGIC_BYTES를 올바르게 export한다', () => {
    expect(Array.from(MAGIC_BYTES)).toEqual([0x4F, 0x43, 0x4C, 0x55])
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd E:/workspace_claude/open-clue/web
npm test -- __tests__/cipher.test.ts
```

Expected: FAIL

- [ ] **Step 3: cipher.ts 구현**

```typescript
// web/lib/cipher.ts

// DAT 포맷: MAGIC(4B) | VERSION(2B BE) | NONCE(12B) | TAG(16B) | CIPHERTEXT
// Python encrypt.py와 동일한 포맷 유지

export const MAGIC_BYTES = new Uint8Array([0x4F, 0x43, 0x4C, 0x55]) // "OCLU"
const VERSION_BYTES = new Uint8Array([0x00, 0x01])                   // uint16 BE = 1
const KEY_STRING = 'OpenClue-Secret-Key-32bytes!!!!!'               // 32 bytes

async function getKey(): Promise<CryptoKey> {
  const keyBytes = new TextEncoder().encode(KEY_STRING)
  return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt'])
}

/**
 * plain: 접두사가 붙은 answer_hash를 SHA-256 hex digest로 변환한다.
 * 예: "plain:1234" → sha256("1234")
 */
export async function processPlainAnswers(jsonStr: string): Promise<string> {
  const encoder = new TextEncoder()
  const regex = /"answer_hash":\s*"plain:([^"]+)"/g
  const matches = [...jsonStr.matchAll(regex)]

  let result = jsonStr
  for (const match of matches) {
    const plain = match[1]
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(plain))
    const hex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    result = result.replace(match[0], `"answer_hash": "${hex}"`)
  }
  return result
}

/**
 * 시나리오 JSON 문자열을 AES-256-GCM으로 암호화하여 DAT 바이트를 반환한다.
 */
export async function buildDat(jsonStr: string): Promise<Uint8Array> {
  const processed = await processPlainAnswers(jsonStr)
  const plaintext = new TextEncoder().encode(processed)

  const key = await getKey()
  const nonce = crypto.getRandomValues(new Uint8Array(12))

  // AES-GCM encrypt 결과: ciphertext || tag (tag은 마지막 16바이트)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 },
    key,
    plaintext,
  )

  const encBytes = new Uint8Array(encrypted)
  const ciphertext = encBytes.slice(0, -16)
  const tag = encBytes.slice(-16)

  // MAGIC(4) + VERSION(2) + NONCE(12) + TAG(16) + CIPHERTEXT
  const dat = new Uint8Array(4 + 2 + 12 + 16 + ciphertext.length)
  let offset = 0
  dat.set(MAGIC_BYTES, offset); offset += 4
  dat.set(VERSION_BYTES, offset); offset += 2
  dat.set(nonce, offset); offset += 12
  dat.set(tag, offset); offset += 16
  dat.set(ciphertext, offset)

  return dat
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd E:/workspace_claude/open-clue/web
npm test -- __tests__/cipher.test.ts
```

Expected: PASS (6 tests)

- [ ] **Step 5: 커밋**

```bash
cd E:/workspace_claude/open-clue
git add web/lib/cipher.ts web/__tests__/cipher.test.ts
git commit -m "feat(web): add cipher.ts (Web Crypto API AES-256-GCM, same DAT format as Python)"
```

---

## Task 5: zip.ts — ZIP 생성

**Files:**
- Create: `web/lib/zip.ts`
- Create: `web/__tests__/zip.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// web/__tests__/zip.test.ts
import { describe, it, expect } from 'vitest'
import { buildZip } from '../lib/zip'
import { unzipSync } from 'fflate'

describe('buildZip', () => {
  it('ZIP에 scenario.json과 scenario.dat이 포함된다', async () => {
    const jsonStr = '{"title":"테스트"}'
    const datBytes = new Uint8Array([1, 2, 3, 4])

    const zip = await buildZip(jsonStr, datBytes)
    const files = unzipSync(zip)

    expect(Object.keys(files)).toContain('scenario.json')
    expect(Object.keys(files)).toContain('scenario.dat')
  })

  it('scenario.json 내용이 일치한다', async () => {
    const jsonStr = '{"title":"테스트"}'
    const zip = await buildZip(jsonStr, new Uint8Array([1, 2, 3]))
    const files = unzipSync(zip)
    const decoded = new TextDecoder().decode(files['scenario.json'])
    expect(decoded).toBe(jsonStr)
  })

  it('scenario.dat 내용이 일치한다', async () => {
    const datBytes = new Uint8Array([0x4F, 0x43, 0x4C, 0x55])
    const zip = await buildZip('{}', datBytes)
    const files = unzipSync(zip)
    expect(Array.from(files['scenario.dat'].slice(0, 4))).toEqual([0x4F, 0x43, 0x4C, 0x55])
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd E:/workspace_claude/open-clue/web
npm test -- __tests__/zip.test.ts
```

Expected: FAIL

- [ ] **Step 3: zip.ts 구현**

```typescript
// web/lib/zip.ts
import { zipSync, strToU8 } from 'fflate'

/**
 * JSON 문자열과 DAT 바이트를 받아 ZIP Uint8Array를 반환한다.
 */
export async function buildZip(jsonStr: string, datBytes: Uint8Array): Promise<Uint8Array> {
  const files = {
    'scenario.json': strToU8(jsonStr),
    'scenario.dat': datBytes,
  }
  return zipSync(files)
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd E:/workspace_claude/open-clue/web
npm test -- __tests__/zip.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: 커밋**

```bash
cd E:/workspace_claude/open-clue
git add web/lib/zip.ts web/__tests__/zip.test.ts
git commit -m "feat(web): add zip.ts (fflate, bundles JSON + DAT into ZIP)"
```

---

## Task 6: store.ts — ScenarioState + localStorage

**Files:**
- Create: `web/lib/store.ts`

- [ ] **Step 1: store.ts 구현**

```typescript
// web/lib/store.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Scenario, Room, Item } from './schema'

const STORAGE_KEY = 'openclue_builder_draft'

export type BuilderState = {
  scenario: Partial<Scenario>
  currentStep: number  // 0~4
  editingRoomId: string | null
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
  currentStep: 0,
  editingRoomId: null,
}

export function useBuilderStore() {
  const [state, setStateRaw] = useState<BuilderState>(DEFAULT_STATE)
  const [hydrated, setHydrated] = useState(false)

  // localStorage에서 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        setStateRaw(JSON.parse(saved))
      }
    } catch {}
    setHydrated(true)
  }, [])

  // 상태 변경 시 localStorage 저장
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

  const setStep = useCallback((step: number) => {
    setState(prev => ({ ...prev, currentStep: step }))
  }, [setState])

  const setEditingRoom = useCallback((roomId: string | null) => {
    setState(prev => ({ ...prev, editingRoomId: roomId }))
  }, [setState])

  const loadScenario = useCallback((scenario: Scenario) => {
    setState(_ => ({ scenario, currentStep: 0, editingRoomId: null }))
  }, [setState])

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setStateRaw(DEFAULT_STATE)
  }, [])

  return { state, hydrated, updateScenario, setStep, setEditingRoom, loadScenario, reset }
}
```

- [ ] **Step 2: 커밋**

```bash
cd E:/workspace_claude/open-clue
git add web/lib/store.ts
git commit -m "feat(web): add useBuilderStore hook with localStorage autosave"
```

---

## Task 7: 공용 UI 컴포넌트

**Files:**
- Create: `web/components/ui/Button.tsx`
- Create: `web/components/ui/Input.tsx`
- Create: `web/components/ui/StepBar.tsx`
- Create: `web/components/ui/StarRating.tsx`

- [ ] **Step 1: Button.tsx**

```tsx
// web/components/ui/Button.tsx
import { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const variantClass: Record<Variant, string> = {
  primary: 'bg-green-500 hover:bg-green-400 text-black font-semibold',
  secondary: 'bg-zinc-700 hover:bg-zinc-600 text-white',
  danger: 'bg-red-700 hover:bg-red-600 text-white',
  ghost: 'bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-white',
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`px-4 py-2 rounded text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${variantClass[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 2: Input.tsx**

```tsx
// web/components/ui/Input.tsx
import { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

const base = 'bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-green-500 w-full'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={base} {...props} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${base} resize-none`} rows={3} {...props} />
}

export function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs text-zinc-400 mb-1">
      {children}{required && <span className="text-red-400 ml-1">*</span>}
    </label>
  )
}
```

- [ ] **Step 3: StepBar.tsx**

```tsx
// web/components/ui/StepBar.tsx
const STEPS = ['메타 정보', '방 목록', '방 상세', '검증', '내보내기']

interface StepBarProps {
  current: number
  onClickStep?: (index: number) => void
}

export function StepBar({ current, onClickStep }: StepBarProps) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <button
              onClick={() => onClickStep?.(i)}
              disabled={i > current}
              className={`flex flex-col items-center gap-1 disabled:cursor-not-allowed group`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                ${done ? 'bg-green-600 text-black' : active ? 'bg-green-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-xs ${active ? 'text-green-400' : done ? 'text-green-600' : 'text-zinc-500'}`}>
                {label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-2 mt-[-16px] ${done ? 'bg-green-600' : 'bg-zinc-700'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: StarRating.tsx**

```tsx
// web/components/ui/StarRating.tsx
interface StarRatingProps {
  value: number | null
  onChange: (v: number) => void
}

export function StarRating({ value, onChange }: StarRatingProps) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-xl transition-colors ${n <= (value ?? 0) ? 'text-yellow-400' : 'text-zinc-600'} hover:text-yellow-300`}
        >
          ★
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: 커밋**

```bash
cd E:/workspace_claude/open-clue
git add web/components/
git commit -m "feat(web): add shared UI components (Button, Input, StepBar, StarRating)"
```

---

## Task 8: MetaStep — ① 메타 정보

**Files:**
- Create: `web/components/steps/MetaStep.tsx`

- [ ] **Step 1: MetaStep.tsx 구현**

```tsx
// web/components/steps/MetaStep.tsx
'use client'

import { useEffect } from 'react'
import { Button } from '../ui/Button'
import { Input, Textarea, Label } from '../ui/Input'
import { StarRating } from '../ui/StarRating'
import type { Scenario } from '../../lib/schema'

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-가-힣]/g, '')
    .replace(/--+/g, '-')
    .slice(0, 64)
}

interface MetaStepProps {
  scenario: Partial<Scenario>
  onChange: (patch: Partial<Scenario>) => void
  onNext: () => void
}

export function MetaStep({ scenario, onChange, onNext }: MetaStepProps) {
  // 제목 변경 시 scenario_id 자동 생성 (비어 있을 때만)
  useEffect(() => {
    if (!scenario.scenario_id && scenario.title) {
      onChange({ scenario_id: toSlug(scenario.title) })
    }
  }, [scenario.title])

  const canNext = !!(scenario.title?.trim() && scenario.scenario_id?.trim() && scenario.start_room_id === undefined
    ? true
    : scenario.title?.trim())

  return (
    <div className="space-y-5 max-w-xl">
      <h2 className="text-lg font-semibold text-white">① 메타 정보</h2>

      <div>
        <Label required>시나리오 제목</Label>
        <Input
          placeholder="폐허가 된 연구소"
          value={scenario.title ?? ''}
          onChange={e => onChange({ title: e.target.value })}
        />
        <p className="text-xs text-zinc-500 mt-1">ZIP 파일명으로 사용됩니다.</p>
      </div>

      <div>
        <Label required>시나리오 ID</Label>
        <Input
          placeholder="abandoned-lab"
          value={scenario.scenario_id ?? ''}
          onChange={e => onChange({ scenario_id: e.target.value })}
        />
        <p className="text-xs text-zinc-500 mt-1">소문자와 하이픈만 사용하세요. Hub 공유 시 고유 키로 사용됩니다.</p>
      </div>

      <div>
        <Label>작가</Label>
        <Input
          placeholder="이름 또는 닉네임"
          value={scenario.author ?? ''}
          onChange={e => onChange({ author: e.target.value })}
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
        <Label>예상 플레이 시간 (분)</Label>
        <Input
          type="number"
          min={1}
          placeholder="30"
          value={scenario.estimated_minutes ?? ''}
          onChange={e => onChange({ estimated_minutes: e.target.value ? parseInt(e.target.value) : null })}
        />
      </div>

      <div className="pt-2">
        <Button onClick={onNext} disabled={!scenario.title?.trim()}>
          다음 →
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
cd E:/workspace_claude/open-clue
git add web/components/steps/MetaStep.tsx
git commit -m "feat(web): add MetaStep (wizard step 1)"
```

---

## Task 9: RoomsStep — ② 방 목록

**Files:**
- Create: `web/components/steps/RoomsStep.tsx`

- [ ] **Step 1: RoomsStep.tsx 구현**

```tsx
// web/components/steps/RoomsStep.tsx
'use client'

import { Button } from '../ui/Button'
import { Input, Label } from '../ui/Input'
import type { Room, Scenario } from '../../lib/schema'

interface RoomsStepProps {
  scenario: Partial<Scenario>
  onChange: (patch: Partial<Scenario>) => void
  onEditRoom: (roomId: string) => void
  onPrev: () => void
  onNext: () => void
}

function newRoom(): Room {
  return {
    id: `room-${Date.now()}`,
    name: '',
    description: '',
    points: [],
  }
}

export function RoomsStep({ scenario, onChange, onEditRoom, onPrev, onNext }: RoomsStepProps) {
  const rooms = scenario.rooms ?? []

  const addRoom = () => {
    const room = newRoom()
    onChange({ rooms: [...rooms, room] })
  }

  const updateRoom = (index: number, patch: Partial<Room>) => {
    const next = rooms.map((r, i) => i === index ? { ...r, ...patch } : r)
    onChange({ rooms: next })
  }

  const deleteRoom = (index: number) => {
    const next = rooms.filter((_, i) => i !== index)
    const startStillExists = next.some(r => r.id === scenario.start_room_id)
    onChange({
      rooms: next,
      start_room_id: startStillExists ? scenario.start_room_id : (next[0]?.id ?? ''),
    })
  }

  const canNext = rooms.length > 0 && rooms.every(r => r.name.trim()) && !!scenario.start_room_id

  return (
    <div className="max-w-xl space-y-5">
      <h2 className="text-lg font-semibold text-white">② 방 목록</h2>

      {rooms.length === 0 && (
        <p className="text-zinc-500 text-sm">방이 없습니다. 방을 추가해주세요.</p>
      )}

      <div className="space-y-3">
        {rooms.map((room, i) => (
          <div key={room.id} className="bg-zinc-900 border border-zinc-700 rounded p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="start_room"
                checked={scenario.start_room_id === room.id}
                onChange={() => onChange({ start_room_id: room.id })}
                className="accent-green-500"
                title="시작 방으로 지정"
              />
              <span className="text-xs text-zinc-500">시작 방</span>
              <div className="flex-1">
                <Input
                  placeholder="방 이름"
                  value={room.name}
                  onChange={e => updateRoom(i, { name: e.target.value })}
                />
              </div>
              <Button variant="secondary" onClick={() => onEditRoom(room.id)} className="shrink-0">
                편집
              </Button>
              <Button variant="danger" onClick={() => deleteRoom(i)} className="shrink-0">
                ×
              </Button>
            </div>
            <Input
              placeholder="방 설명"
              value={room.description}
              onChange={e => updateRoom(i, { description: e.target.value })}
            />
            <p className="text-xs text-zinc-600">포인트 {room.points.length}개</p>
          </div>
        ))}
      </div>

      <Button variant="secondary" onClick={addRoom}>+ 방 추가</Button>

      <div className="flex gap-3 pt-2">
        <Button variant="ghost" onClick={onPrev}>← 이전</Button>
        <Button onClick={onNext} disabled={!canNext}>다음 →</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
cd E:/workspace_claude/open-clue
git add web/components/steps/RoomsStep.tsx
git commit -m "feat(web): add RoomsStep (wizard step 2)"
```

---

## Task 10: RoomDetailStep — ③ 방 상세

**Files:**
- Create: `web/components/steps/RoomDetailStep.tsx`

- [ ] **Step 1: RoomDetailStep.tsx 구현**

```tsx
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

  // 이 방의 포인트에서 얻는 아이템 ID 추출
  const itemsInRoom = items.filter(item =>
    room.points.some(p => {
      const actions: Action[] = p.action
        ? Array.isArray(p.action) ? p.action : [p.action]
        : []
      return actions.some(a => a.type === 'get_item' && a.value === item.id)
    })
  )

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
```

- [ ] **Step 2: 커밋**

```bash
cd E:/workspace_claude/open-clue
git add web/components/steps/RoomDetailStep.tsx
git commit -m "feat(web): add RoomDetailStep (wizard step 3, points + items)"
```

---

## Task 11: VerifyStep + ExportStep

**Files:**
- Create: `web/components/steps/VerifyStep.tsx`
- Create: `web/components/steps/ExportStep.tsx`

- [ ] **Step 1: VerifyStep.tsx**

```tsx
// web/components/steps/VerifyStep.tsx
'use client'

import { useMemo } from 'react'
import { Button } from '../ui/Button'
import { validateScenario } from '../../lib/validator'
import { ScenarioSchema } from '../../lib/schema'
import type { Scenario } from '../../lib/schema'

interface VerifyStepProps {
  scenario: Partial<Scenario>
  onPrev: () => void
  onNext: () => void
  onGoToStep: (step: number) => void
}

export function VerifyStep({ scenario, onPrev, onNext, onGoToStep }: VerifyStepProps) {
  const { errors, parseError } = useMemo(() => {
    const parsed = ScenarioSchema.safeParse(scenario)
    if (!parsed.success) {
      return { errors: [], parseError: parsed.error.issues.map(i => i.message).join(', ') }
    }
    return { errors: validateScenario(parsed.data), parseError: null }
  }, [scenario])

  const ok = !parseError && errors.length === 0

  return (
    <div className="max-w-xl space-y-5">
      <h2 className="text-lg font-semibold text-white">④ 검증</h2>

      {ok ? (
        <div className="bg-green-950 border border-green-700 rounded p-4 text-green-400 text-sm">
          ✓ 오류 없음 — 내보내기가 가능합니다.
        </div>
      ) : (
        <div className="space-y-2">
          {parseError && (
            <div className="bg-red-950 border border-red-700 rounded p-3 text-red-400 text-sm">
              스키마 오류: {parseError}
            </div>
          )}
          {errors.map((err, i) => (
            <div
              key={i}
              className="bg-zinc-900 border border-red-700 rounded p-3 text-sm text-red-300 cursor-pointer hover:border-red-500"
              onClick={() => {
                if (err.includes('start_room_id') || err.includes('title')) onGoToStep(0)
                else if (err.includes('방') || err.includes('room')) onGoToStep(1)
                else if (err.includes('포인트') || err.includes('game_clear')) onGoToStep(2)
              }}
            >
              ✗ {err}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="ghost" onClick={onPrev}>← 이전</Button>
        <Button onClick={onNext} disabled={!ok}>내보내기 →</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: ExportStep.tsx**

```tsx
// web/components/steps/ExportStep.tsx
'use client'

import { useState } from 'react'
import { Button } from '../ui/Button'
import { buildDat } from '../../lib/cipher'
import { buildZip } from '../../lib/zip'
import type { Scenario } from '../../lib/schema'

interface ExportStepProps {
  scenario: Partial<Scenario>
  onPrev: () => void
  onReset: () => void
}

export function ExportStep({ scenario, onPrev, onReset }: ExportStepProps) {
  const [downloading, setDownloading] = useState(false)
  const [done, setDone] = useState(false)

  const title = scenario.title ?? 'scenario'
  const filename = `${title}.zip`

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const jsonStr = JSON.stringify(scenario, null, 2)
      const datBytes = await buildDat(jsonStr)
      const zipBytes = await buildZip(jsonStr, datBytes)

      const blob = new Blob([zipBytes], { type: 'application/zip' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      setDone(true)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <h2 className="text-lg font-semibold text-white">⑤ 내보내기</h2>

      <div className="bg-zinc-900 border border-zinc-700 rounded p-4 space-y-2">
        <p className="text-sm text-zinc-400">다운로드 파일</p>
        <p className="font-mono text-green-400 text-sm">{filename}</p>
        <p className="text-xs text-zinc-500">
          ZIP 안에 <code className="text-zinc-300">scenario.json</code> (편집용)과{' '}
          <code className="text-zinc-300">scenario.dat</code> (플레이용)이 포함됩니다.
        </p>
      </div>

      {done && (
        <div className="bg-green-950 border border-green-700 rounded p-3 text-green-400 text-sm">
          ✓ 다운로드 완료! <code>clue play scenario.dat</code> 으로 플레이하세요.
        </div>
      )}

      <div className="space-y-2">
        <Button onClick={handleDownload} disabled={downloading} className="w-full">
          {downloading ? '생성 중...' : `⬇ ${filename} 다운로드`}
        </Button>

        <Button
          variant="ghost"
          disabled
          className="w-full opacity-40 cursor-not-allowed"
          title="Coming Soon — Phase 2b"
        >
          ☁ Hub에 업로드 (준비 중)
        </Button>
      </div>

      <div className="flex gap-3 pt-2 border-t border-zinc-800">
        <Button variant="ghost" onClick={onPrev}>← 이전</Button>
        <Button variant="secondary" onClick={onReset}>새 시나리오 만들기</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 커밋**

```bash
cd E:/workspace_claude/open-clue
git add web/components/steps/VerifyStep.tsx web/components/steps/ExportStep.tsx
git commit -m "feat(web): add VerifyStep and ExportStep (wizard steps 4-5)"
```

---

## Task 12: 빌더 페이지 + 랜딩 페이지

**Files:**
- Modify: `web/app/layout.tsx`
- Modify: `web/app/page.tsx`
- Create: `web/app/builder/page.tsx`

- [ ] **Step 1: layout.tsx 수정**

```tsx
// web/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

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

- [ ] **Step 2: 랜딩 페이지 (app/page.tsx)**

```tsx
// web/app/page.tsx
'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '../components/ui/Button'
import { ScenarioSchema } from '../lib/schema'

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
          currentStep: 0,
          editingRoomId: null,
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
      <div className="text-center space-y-2">
        <pre className="text-green-400 text-xs leading-tight font-mono hidden sm:block">{`  ___                    ____ _
 / _ \\_ __   ___ _ __  / ___| |_   _  ___
| | | | '_ \\ / _ \\ '_ \\| |   | | | | |/ _ \\
| |_| | |_) |  __/ | | | |___| | |_| |  __/
 \\___/| .__/ \\___|_| |_|\\____|_|\\__,_|\\___|
      |_|`}</pre>
        <h1 className="text-2xl font-bold text-white">Scenario Builder</h1>
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

- [ ] **Step 3: 빌더 페이지 (app/builder/page.tsx)**

```tsx
// web/app/builder/page.tsx
'use client'

import { useBuilderStore } from '../../lib/store'
import { StepBar } from '../../components/ui/StepBar'
import { MetaStep } from '../../components/steps/MetaStep'
import { RoomsStep } from '../../components/steps/RoomsStep'
import { RoomDetailStep } from '../../components/steps/RoomDetailStep'
import { VerifyStep } from '../../components/steps/VerifyStep'
import { ExportStep } from '../../components/steps/ExportStep'

export default function BuilderPage() {
  const { state, hydrated, updateScenario, setStep, setEditingRoom, reset } = useBuilderStore()
  const { scenario, currentStep, editingRoomId } = state

  if (!hydrated) return null

  return (
    <main className="min-h-screen p-6 sm:p-10 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-sm text-zinc-500 font-mono">OpenClue Builder</h1>
        <a href="/" className="text-xs text-zinc-600 hover:text-zinc-400">← 홈</a>
      </div>

      <StepBar current={currentStep} onClickStep={i => i < currentStep && setStep(i)} />

      {currentStep === 0 && (
        <MetaStep scenario={scenario} onChange={updateScenario} onNext={() => setStep(1)} />
      )}
      {currentStep === 1 && (
        <RoomsStep
          scenario={scenario}
          onChange={updateScenario}
          onEditRoom={id => { setEditingRoom(id); setStep(2) }}
          onPrev={() => setStep(0)}
          onNext={() => setStep(3)}
        />
      )}
      {currentStep === 2 && editingRoomId && (
        <RoomDetailStep
          scenario={scenario}
          roomId={editingRoomId}
          onChange={updateScenario}
          onBack={() => { setEditingRoom(null); setStep(1) }}
        />
      )}
      {currentStep === 3 && (
        <VerifyStep
          scenario={scenario}
          onPrev={() => setStep(1)}
          onNext={() => setStep(4)}
          onGoToStep={setStep}
        />
      )}
      {currentStep === 4 && (
        <ExportStep
          scenario={scenario}
          onPrev={() => setStep(3)}
          onReset={reset}
        />
      )}
    </main>
  )
}
```

- [ ] **Step 4: 개발 서버에서 동작 확인**

```bash
cd E:/workspace_claude/open-clue/web
npm run dev
```

- `http://localhost:3000` → 랜딩 페이지 확인
- "새 시나리오 만들기" → 빌더 ① 단계 확인
- 각 단계 이동, 방 추가, 포인트 추가 동작 확인

- [ ] **Step 5: 커밋**

```bash
cd E:/workspace_claude/open-clue
git add web/app/
git commit -m "feat(web): wire up builder pages and wizard flow"
```

---

## Task 13: 전체 테스트 실행 + ROADMAP 업데이트

**Files:**
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: 전체 테스트 실행**

```bash
cd E:/workspace_claude/open-clue/web
npm test
```

Expected: PASS (schema 2 + validator 7 + cipher 6 + zip 3 = 18 tests)

- [ ] **Step 2: 빌드 확인**

```bash
cd E:/workspace_claude/open-clue/web
npm run build
```

Expected: 빌드 성공 (오류 없음)

- [ ] **Step 3: ROADMAP.md Phase 2 업데이트**

`docs/ROADMAP.md`의 Phase 2 섹션을 아래로 교체:

```markdown
## Phase 2: Online Scenario Hub

> 시나리오를 웹에서 제작하고, 업로드·공유·다운로드하는 플랫폼.

### Milestone 2-0: 시나리오 웹 빌더 (Phase 2a)

- [ ] Next.js 16 프로젝트 세팅 (web/ 디렉토리)
- [ ] Zod 스키마 정의 (models.py 포팅)
- [ ] validator.ts 구현 (validator.py 포팅, dead-end 탐지 포함)
- [ ] cipher.ts 구현 (Web Crypto API AES-256-GCM)
- [ ] zip.ts 구현 (fflate, JSON + DAT → {제목}.zip)
- [ ] 5단계 위자드 UI 구현
- [ ] localStorage 자동저장
- [ ] JSON 불러오기 (편집 모드)
- [ ] Vercel 배포

### Milestone 2-1: Scenario Hub (Phase 2b)

- [ ] Hub 백엔드 API 서계 (업로드/검색/다운로드)
- [ ] 시나리오 메타데이터 DB
- [ ] 웹 빌더에서 Hub 업로드 연동
- [ ] `clue list` — 공개 시나리오 목록 조회
- [ ] `clue download <scenario_id>` — 시나리오 다운로드
- [ ] `clue play <scenario_id>` — 다운로드 없이 바로 실행
- [ ] 버전 체크 및 자동 업데이트 알림
```

- [ ] **Step 4: 최종 커밋**

```bash
cd E:/workspace_claude/open-clue
git add docs/ROADMAP.md web/
git commit -m "feat(web): complete Phase 2a web builder — Next.js 16, wizard, cipher, zip export"
```

---

## 검증 체크리스트

- [ ] `npm test` — 18개 테스트 통과
- [ ] `npm run build` — 빌드 오류 없음
- [ ] 랜딩 → 빌더 → 5단계 완주 → ZIP 다운로드
- [ ] 다운로드된 ZIP 압축 해제 → `clue play scenario.dat` 정상 실행
- [ ] `abandoned_lab.json` 불러오기 → 편집 → 재내보내기 → 정상 실행
- [ ] 새로고침 후 localStorage에서 복원 확인
