# OpenClue — 시나리오 제작 + 엔진 본구현 계획

## Context

docs/와 engine/ 골격(main.py + 빈 __init__.py들)은 완성된 상태.
cipher, engine, schema, ui 모듈은 전부 미구현.
이번 작업에서 시나리오 JSON 1개와 엔진 전체를 구현한다.

---

## Task 1: 시나리오 JSON 제작

**파일**: `engine/scenarios/abandoned_lab.json`

### 시나리오 개요

| 항목 | 내용 |
|:---|:---|
| 제목 | 버려진 연구소 (Abandoned Laboratory) |
| 배경 | 비밀 지하 연구소에서 눈을 뜬 플레이어. 탈출해야 한다. |
| 난이도 | ★★★☆☆ |
| 방 수 | 3개 |
| 예상 시간 | 20~30분 |

### 플로우

```
[감금실] ──(머리핀→열쇠→ 27²=729)──▶ [복도] ──(신분증→사번 4829)──▶ [제어실] ──(코드명 NEXUS)──▶ CLEAR
```

### 방 및 포인트 구성

**room_detention (감금실) [start]**
- `bed` : 매트리스 아래 머리핀 획득
- `wall` : 벽 낙서 관찰 → 숫자 **27** 힌트
- `drain` : 하수구 (머리핀 필요) → 녹슨 열쇠 획득
- `cell_door` : 녹슨 열쇠 필요, 퍼즐 "27의 제곱은?" → `729` → 복도로 이동

**room_corridor (복도)**
- `bulletin_board` : 게시판 관찰 → Dr. Kim 사번 **4829** 힌트
- `vending_machine` : 고장난 자판기 아래 → 신분증 획득
- `control_door` : 신분증 필요, 퍼즐 "Dr. Kim의 사번" → `4829` → 제어실로 이동

**room_control (제어실)**
- `console` : 콘솔 아래 메모 획득 ("코드명: NEXUS 적힌 메모")
- `cctv_monitor` : CCTV 화면 관찰 → 힌트 텍스트 출력
- `exit_terminal` : 메모 필요, 퍼즐 "탈출 코드명 입력" → `NEXUS` → game_clear

### 정답 해시 (SHA-256)
- `729` → `plain:729` (빌더가 자동 변환)
- `4829` → `plain:4829`
- `NEXUS` → `plain:NEXUS`

---

## Task 2: 엔진 구현

구현 순서: schema → cipher → engine(state/mechanics) → engine(parser) → ui → main 업데이트

### 2-1. Schema 모듈 (`engine/clue/schema/`)

**models.py** — Pydantic v2 데이터 모델
```
Action, Requirements, Puzzle, Point, Room, Item, Scenario
```
- Action: type (get_item | set_flag | move_to | game_clear) + value
- Requirements: item_id?, flag?: dict, solved_puzzle?: str
- Puzzle: type, question, hint?, answer_hash, max_attempts?, time_limit_seconds?, fail_message?, on_success: Action | list[Action]
- Point: id, name, description, hidden=False, requirements?, observation?, action: Action | list[Action] | None, puzzle?
- Room: id, name, description, points: list[Point]
- Item: id, name, description, usable_on?: list[str]
- Scenario: scenario_id, version, title, author?, difficulty?, estimated_minutes?, start_room_id, flags: dict, items, rooms

**validator.py** — 로직 무결성 검사
- start_room_id 존재 여부
- get_item 값이 items에 정의되어 있는지
- move_to 값이 rooms에 존재하는지
- point ID 중복 여부
- game_clear 액션 최소 1개 존재 여부

### 2-2. Cipher 모듈 (`engine/clue/cipher/`)

**encrypt.py**
- `encrypt_scenario(json_path: str, output_path: str)` → AES-256-GCM
- `plain:` 접두사 정답 자동 SHA-256 변환
- .dat 포맷: `OCLU` (4B) + VERSION (2B) + NONCE (12B) + TAG (16B) + CIPHERTEXT

**decrypt.py**
- `decrypt_scenario(dat_path: str) -> dict` → 복호화 후 dict 반환
- MAGIC 헤더 검증

> 암호화 키는 MVP에서는 하드코딩 (32바이트 고정값)

### 2-3. Engine 모듈 (`engine/clue/engine/`)

**state.py** — GameState dataclass
```python
@dataclass
class GameState:
    scenario: Scenario
    current_room_id: str
    inventory: list[str]          # item id 목록
    flags: dict[str, Any]
    solved_puzzles: set[str]       # puzzle을 가진 point id 집합
    start_time: datetime
```
- `current_room()` → Room 반환 헬퍼
- `has_item(item_id)`, `add_item(item_id)`, `remove_item(item_id)`
- `check_requirements(req: Requirements)` → bool

**mechanics.py** — 액션 실행
- `execute_action(state, action)` → GameState 업데이트 + 결과 메시지 반환
  - get_item: inventory 추가
  - set_flag: flags 업데이트
  - move_to: current_room_id 변경
  - game_clear: 클리어 플래그 설정
- `check_puzzle(state, puzzle, user_input)` → 해시 비교, 시도 횟수 관리

**parser.py** — 명령어 파싱 및 디스패치
- `parse(input_str)` → (command, target) 튜플
- 지원 명령어: look, inspect/cd, use, inv, hint, help, quit
- 존재하지 않는 포인트 조사 시 오류 메시지

### 2-4. UI 모듈 (`engine/clue/ui/renderer.py`)

Rich 기반 화면 구성:
```
┌──────────────────────────────────────────┐
│  OpenClue  |  버려진 연구소 > 감금실      │
├──────────────────────────────────────────┤
│  (방 묘사 텍스트)                          │
├──────────────────────────────────────────┤
│  [조사 가능한 지점]                        │
│   - 침대 (bed)                            │
│   - 벽 (wall)                             │
├──────────────────────────────────────────┤
│  [인벤토리]  머리핀, 녹슨 열쇠             │
└──────────────────────────────────────────┘
> _
```

주요 함수:
- `render_room(state)` → 방 묘사 + 포인트 목록 출력
- `render_message(msg, style)` → 일반/성공/오류 메시지
- `render_inventory(state)` → 소지품 목록
- `render_clear(state)` → 클리어 화면 (ASCII 아트 + 소요 시간)
- `render_puzzle_prompt(puzzle)` → 퍼즐 입력 프롬프트

### 2-5. main.py 업데이트

**play 커맨드**: decrypt → Pydantic 파싱 → GameState 초기화 → 게임 루프
**build 커맨드**: validator 검사 → encrypt_scenario 실행
**verify 커맨드**: JSON 읽기 → validator 검사 → 결과 출력

---

## 구현 순서

1. `engine/scenarios/abandoned_lab.json` 시나리오 작성
2. `engine/clue/schema/models.py` Pydantic 모델
3. `engine/clue/schema/validator.py` 유효성 검사
4. `engine/clue/cipher/encrypt.py` + `decrypt.py`
5. `engine/clue/engine/state.py` GameState
6. `engine/clue/engine/mechanics.py` 액션 실행
7. `engine/clue/engine/parser.py` 명령어 파서
8. `engine/clue/ui/renderer.py` Rich TUI
9. `engine/clue/main.py` 전체 통합
10. 직접 실행 테스트 (`pip install -e . && clue verify ... && clue build ... && clue play ...`)
11. git commit & push

---

## 검증

```bash
cd engine
pip install -e .

# 시나리오 검증
clue verify scenarios/abandoned_lab.json

# 빌드
clue build scenarios/abandoned_lab.json

# 플레이 (직접 실행해 전체 플로우 확인)
clue play scenarios/abandoned_lab.dat
```

게임 진행 체크리스트:
- [ ] 감금실에서 `look` → 포인트 목록 출력
- [ ] `inspect bed` → 머리핀 획득
- [ ] `inspect drain` (머리핀 없이) → 거부 메시지
- [ ] `inspect drain` (머리핀 있음) → 열쇠 획득
- [ ] `inspect cell_door` → 퍼즐 진입 → "729" 입력 → 복도 이동
- [ ] 복도에서 `inspect bulletin_board` → 사번 힌트
- [ ] `inspect vending_machine` → 신분증 획득
- [ ] `inspect control_door` → "4829" → 제어실 이동
- [ ] 제어실에서 `inspect console` → 메모 획득
- [ ] `inspect exit_terminal` → "NEXUS" → CLEAR 화면 출력
