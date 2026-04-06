# OpenClue Builder — 기능 확장 설계

**날짜:** 2026-04-06
**범위:** 방탈출 시나리오 빌더 기능 확장 (Phase 1~4)
**접근 방식:** B (로직 먼저) — 게임 로직 기능 완성 후 프로젝트 관리/허브 순으로 진행

---

## 배경 및 목적

현재 빌더는 방 그래프 편집, 조사 지점, 텍스트 퍼즐, 아이템, 방 이동 액션, 유효성 검사/내보내기를 지원한다.
"진짜 방탈출"다운 시나리오를 만들려면 다음이 부족하다:

- 조사 지점에 **잠금 조건** 설정 불가 (스키마에는 있으나 UI 없음)
- **복합 액션** 불가 (단일 액션만 UI 지원)
- **플래그 초기값** 편집 UI 없음
- 키 시퀀스·타이머 **퍼즐 타입** UI 없음
- **NPC 대화** 시스템 없음
- **인트로/아웃트로** 텍스트 없음
- **여러 프로젝트** 관리 불가 (localStorage에 초안 하나만 저장)
- 허브 업로드를 위한 **메타데이터** (태그, 공개여부, 개요) 없음

---

## Phase 1 — 게임 로직 기반

### 1-1. 잠금 조건 UI (Requirements)

**대상 파일:** `web/components/canvas/RoomDetailPanel.tsx`

각 조사 지점 편집 영역에 "잠금 조건" 섹션 추가. 세 가지 조건을 독립적으로 on/off:

| 조건 타입 | 스키마 필드 | UI |
|---|---|---|
| 아이템 소지 | `requirements.item_id` | 아이템 드롭다운 |
| 플래그 상태 | `requirements.flag` | key-value 입력 |
| 퍼즐 완료 | `requirements.solved_puzzle` | 퍼즐 ID 드롭다운 |

조건이 없으면 항상 접근 가능. 스키마 변경 없음 (`RequirementsSchema` 이미 존재).

### 1-2. 복합 액션

**대상 파일:** `web/components/canvas/RoomDetailPanel.tsx`

현재 단일 액션 `<select>`를 액션 목록으로 교체.

- 액션 행: `[타입 선택] [값 선택] [✕ 삭제]`
- `+ 액션 추가` 버튼으로 행 추가
- 지원 타입: `get_item`, `set_flag`, `move_to`, `game_clear`
- 저장 형태: 1개이면 `Action`, 2개 이상이면 `Action[]` (기존 스키마 그대로)

퍼즐의 `on_success`도 동일하게 복합 액션 UI 적용.

### 1-3. 플래그 초기값 에디터

**대상 파일:** `web/components/sidebar/MetaSidebar.tsx`

MetaSidebar 하단에 "게임 플래그" 섹션 추가.

- key-value 쌍 목록 (key: string, value: boolean | string)
- `+ 플래그 추가` 버튼
- 저장: `scenario.flags` (이미 스키마에 있음)

---

## Phase 2 — 퍼즐 타입 확장

**대상 파일:** `web/lib/schema.ts`, `web/components/canvas/RoomDetailPanel.tsx`

### 2-1. 스키마 확장

`PuzzleSchema`에 `key_sequence` 타입 관련 필드 추가:

```ts
keys: string[]       // 표시될 버튼 레이블 목록 (예: ["↑","↓","←","→"])
sequence: string[]   // 정답 순서 (keys 중 선택)
```

`timer` 타입은 기존 `time_limit_seconds` 필드로 충분. 추가 스키마 변경 없음.

### 2-2. 퍼즐 타입 선택 UI

퍼즐 섹션 상단에 탭형 타입 선택기 추가:

- **텍스트 입력** (`text_input`): 현재 UI 유지
- **키 시퀀스** (`key_sequence`): 버튼 레이블 정의 → 정답 순서 구성 (버튼 클릭으로 순서에 추가, ✕로 마지막 항목 제거)
- **타이머** (`timer`): 기존 필드에 `time_limit_seconds` 입력 추가, 시간 초과 메시지(`fail_message`) 명시

---

## Phase 3 — 스토리 & NPC

### 3-1. 인트로 / 아웃트로

**대상 파일:** `web/lib/schema.ts`, `web/components/sidebar/MetaSidebar.tsx`

스키마에 추가:
```ts
ScenarioSchema:
  intro_text?: string   // 시나리오 시작 시 표시
  outro_text?: string   // game_clear 시 표시
```

MetaSidebar의 "시나리오 정보" 섹션에 Textarea 두 개 추가.

### 3-2. NPC 시스템

**대상 파일:** `web/lib/schema.ts`, `web/components/canvas/RoomDetailPanel.tsx`, `web/components/canvas/RoomNode.tsx`

스키마에 추가:
```ts
NpcLineSchema:
  text: string
  condition?: { flag?: Record<string, unknown> }  // 이 플래그 상태일 때만 표시

NpcSchema:
  id: string
  name: string
  description: string   // 외형 묘사
  lines: NpcLine[]

RoomSchema:
  npcs?: Npc[]          // 기존 필드에 추가
```

**RoomDetailPanel** — "NPC" 탭 추가 (기존 "조사 지점" 탭과 나란히):
- NPC 목록 (추가/삭제)
- 각 NPC: 이름, 외형, 대사 목록
- 각 대사: 텍스트 + 조건(플래그) 선택적 설정

**RoomNode** — NPC 수 뱃지 추가 (조사 지점 수 뱃지와 동일한 방식)

---

## Phase 4 — 프로젝트 관리 & 허브 메타

### 4-1. 멀티 프로젝트 (IndexedDB)

**대상 파일:** `web/lib/store.ts`, `web/app/page.tsx`

**저장소 전환:** localStorage → IndexedDB (native API 사용, 외부 라이브러리 없음)

프로젝트 레코드 구조:
```ts
ProjectRecord:
  id: string            // UUID
  scenario: Partial<Scenario>
  nodePositions: Record<string, {x,y}>
  createdAt: number
  updatedAt: number
  hubMeta?: HubMeta     // 아래 참조
```

**홈 화면 재설계** (`app/page.tsx`):
- ASCII 로고 유지
- 프로젝트 카드 목록 (이름, 방 수, 아이템 수, 수정일, 오류 여부)
- `+ 새로 만들기` / `JSON 불러오기` 버튼
- 카드 클릭 → `/builder?id=<projectId>` 이동
- 기존 localStorage 초안은 최초 진입 시 IndexedDB로 자동 마이그레이션

**빌더 페이지** (`app/builder/page.tsx`):
- URL 쿼리 파라미터 `id`로 프로젝트 로드
- 저장은 자동 (debounce 1초)

### 4-2. 허브 메타데이터

**대상 파일:** `web/lib/schema.ts` (HubMeta 타입), `web/components/sidebar/MetaSidebar.tsx`

```ts
HubMeta:
  synopsis?: string       // 시나리오 개요 (한두 줄)
  tags?: string[]         // 태그 목록
  visibility?: 'public' | 'private'  // 기본값: 'private'

// 주의: HubMeta는 ProjectRecord에 저장되며, 내보내기 ZIP에는 포함되지 않음 (빌더 전용 메타데이터)
```

MetaSidebar 최하단 "허브 업로드 정보" 섹션:
- 개요 Textarea
- 태그 입력 (Enter로 추가, ✕로 삭제, pill 형태 표시)
- 공개/비공개 토글
- "허브에 업로드" 버튼 — 현재는 비활성(준비 중)으로 표시, 실제 업로드는 허브 완성 후 연결

---

## 파일별 수정 요약 — 빌더 (web/)

| 파일 | Phase | 변경 내용 |
|---|---|---|
| `lib/schema.ts` | 2,3,4 | PuzzleSchema(key_sequence), NpcSchema, intro/outro, HubMeta |
| `components/canvas/RoomDetailPanel.tsx` | 1,2,3 | 잠금조건, 복합액션, 퍼즐타입탭, NPC탭 |
| `components/sidebar/MetaSidebar.tsx` | 1,3,4 | 플래그에디터, 인트로/아웃트로, 허브메타 |
| `components/canvas/RoomNode.tsx` | 3 | NPC 수 뱃지 |
| `lib/store.ts` | 4 | IndexedDB 전환, 멀티프로젝트 |
| `app/page.tsx` | 4 | 홈→프로젝트 목록 |
| `app/builder/page.tsx` | 4 | URL id 파라미터, 프로젝트 로드/저장 |

---

## 엔진 대응 (engine/)

빌더에서 만든 시나리오가 엔진에서도 동작하도록, Phase별로 엔진 수정이 필요하다.

### 엔진 현황 요약

| 기능 | 엔진 상태 |
|---|---|
| 텍스트 퍼즐 | ✅ 완전 구현 |
| 복합 액션 (Action[]) | ✅ 이미 지원 |
| Requirements (item/flag/puzzle) | ✅ 이미 지원 |
| 플래그 초기값 | ✅ 이미 지원 |
| key_sequence 퍼즐 | ❌ 스키마만 있고 미구현 |
| timer 퍼즐 (독립 타입) | ❌ 표시만 있고 강제 종료 미구현 |
| 인트로/아웃트로 | ❌ 필드 없음, 표시 없음 |
| NPC 대화 | ❌ 스키마·로직 모두 없음 |

Phase 1의 기능(Requirements, 복합 액션, 플래그)은 **엔진에 이미 구현**되어 있어 엔진 수정 불필요.

---

### 엔진 Phase 2 — 퍼즐 타입 구현

#### E2-1. 스키마 (`engine/clue/schema/models.py`)

`Puzzle` 모델에 필드 추가:
```python
keys: list[str] = []       # key_sequence: 표시 버튼 레이블
sequence: list[str] = []   # key_sequence: 정답 순서
```

#### E2-2. key_sequence 퍼즐 (`engine/clue/engine/mechanics.py`)

`attempt_puzzle()`에 타입 분기 추가:
- `text_input`: 현재 SHA-256 해시 비교 유지
- `key_sequence`: 입력된 시퀀스와 `puzzle.sequence` 비교 (해시 불필요, 직접 비교)
  - 정답 형태: 빌더에서 생성한 `sequence` 배열과 사용자 입력 배열이 일치해야 함
  - `answer_hash` 필드는 key_sequence에서 빈 문자열로 저장 (스키마 호환성 유지)

#### E2-3. timer 퍼즐 강제 종료 (`engine/clue/ui/app.py`)

현재 `time_limit_seconds`는 표시만 하고 실패 처리 없음. 타이머 만료 시:
- 퍼즐 모드 강제 종료
- `fail_message` 출력 (없으면 기본 메시지)
- 최대 시도 차감 없이 퍼즐 잠금 (다시 시도 가능)

#### E2-4. key_sequence UI (`engine/clue/ui/app.py`)

- 퍼즐 진입 시 `keys` 목록을 버튼으로 표시
- 사용자가 버튼 번호(또는 레이블)를 순서대로 입력
- 입력 예: `1 3 2 4` → `sequence[0]`, `sequence[2]`, `sequence[1]`, `sequence[3]`
- 현재까지 입력한 순서를 프롬프트에 표시

#### E2-5. 검증 (`engine/clue/schema/validator.py`)

- `key_sequence` 퍼즐에 `keys`, `sequence` 필드가 있는지 확인
- `sequence`의 모든 항목이 `keys`에 포함되는지 확인

#### E2-6. 테스트 (`engine/tests/`)

- `test_mechanics.py`: key_sequence 정답/오답, timer 만료 케이스 추가
- `test_validator.py`: key_sequence 필드 누락 검증 케이스 추가

---

### 엔진 Phase 3 — 스토리 & NPC

#### E3-1. 스키마 (`engine/clue/schema/models.py`)

`Scenario` 모델에 추가:
```python
intro_text: str | None = None
outro_text: str | None = None
```

`Room` 모델에 추가:
```python
npcs: list[Npc] = []
```

새 모델 추가:
```python
class NpcLine(BaseModel):
    text: str
    condition: dict | None = None   # {"flag": {"key": value}}

class Npc(BaseModel):
    id: str
    name: str
    description: str
    lines: list[NpcLine]
```

#### E3-2. 인트로/아웃트로 (`engine/clue/ui/app.py`)

- 게임 시작 시 `scenario.intro_text`가 있으면 로그 패널에 출력 후 첫 방 진입
- `game_clear` 액션 처리 시 `scenario.outro_text`가 있으면 승리 화면에 표시

#### E3-3. NPC 시스템 (`engine/clue/`)

**parser.py** — `talk` 명령 추가:
```python
"talk": ("talk", target),   # "talk 박사", "talk npc-001"
```

**state.py** — NPC 대사 조건 평가 메서드 추가:
```python
def get_npc_lines(self, npc: Npc) -> list[str]:
    # condition이 없거나 플래그 조건이 충족된 line.text만 반환
```

**mechanics.py** — NPC 대화 실행:
```python
def talk_to_npc(npc: Npc, state: GameState) -> list[str]:
    # 조건에 맞는 대사 목록 반환
    # 빈 목록이면 "할 말이 없는 것 같다."
```

**app.py** — `talk` 명령 처리:
- 현재 방의 NPC 중 이름/ID로 검색
- 조건 충족 대사를 순서대로 로그에 출력
- NPC 목록을 방 정보 패널에 조사 지점과 함께 표시

#### E3-4. 검증 (`engine/clue/schema/validator.py`)

- NPC ID 중복 검사 (방 내, 시나리오 전체)
- `NpcLine.condition.flag` 키가 `scenario.flags`에 존재하는지 확인

#### E3-5. 테스트 (`engine/tests/`)

- `test_mechanics.py`: NPC 대화 조건 평가, 조건부 대사 필터링 케이스 추가
- `test_validator.py`: NPC ID 중복, 조건 플래그 미존재 케이스 추가

---

## 파일별 수정 요약 — 엔진 (engine/)

| 파일 | Phase | 변경 내용 |
|---|---|---|
| `clue/schema/models.py` | E2, E3 | Puzzle(keys/sequence), Npc, NpcLine, Scenario(intro/outro), Room(npcs) |
| `clue/schema/validator.py` | E2, E3 | key_sequence 필드 검증, NPC ID 중복, NpcLine 조건 플래그 검증 |
| `clue/engine/mechanics.py` | E2, E3 | key_sequence 비교 로직, talk_to_npc() |
| `clue/engine/state.py` | E3 | get_npc_lines() 조건 평가 |
| `clue/engine/parser.py` | E3 | talk 명령 추가 |
| `clue/ui/app.py` | E2, E3 | 퍼즐 타입 UI, timer 강제 종료, 인트로/아웃트로 표시, NPC 표시/talk 처리 |
| `tests/test_mechanics.py` | E2, E3 | 신규 케이스 추가 |
| `tests/test_validator.py` | E2, E3 | 신규 케이스 추가 |

---

## 비범위 (이번 설계에서 제외)

- 허브 실제 업로드 API (허브 완성 후)
- 로그인/인증
- 플레이테스트 (인게임 실행)
- 아이템 조합 퍼즐
- 표지 이미지
- 실행 취소/다시 실행 (undo/redo)
