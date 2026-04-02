# 시나리오 스키마 명세서 (Scenario Schema Spec): OpenClue

> 이 문서는 시나리오 제작자가 `.json` 파일을 작성할 때 따라야 하는 데이터 규격을 정의한다.
> 작성된 JSON은 `clue build scenario.json` 명령으로 암호화하여 배포한다.

---

## 1. 전체 구조 개요

```
Scenario
├── metadata          # 시나리오 기본 정보
├── flags             # 전역 상태 변수
├── items             # 획득/사용 가능한 아이템 목록
└── rooms[]           # 방 목록
    └── points[]      # 방 안의 조사 지점 목록
        ├── observation   # 단순 조사 (텍스트 출력)
        ├── action        # 조사 결과 액션 (아이템 획득, 플래그 변경)
        ├── requirements  # 상호작용 전제 조건
        └── puzzle        # 퍼즐 정의 (문제, 해시, 성공 후 액션)
```

---

## 2. 최상위 필드

```json
{
  "scenario_id": "lab_escape_01",
  "version": "1.0",
  "title": "비밀 연구소의 생존자",
  "author": "홍길동",
  "difficulty": 3,
  "estimated_minutes": 30,
  "start_room_id": "room_start",
  "flags": {
    "is_power_on": false,
    "found_secret_note": false
  },
  "items": [...],
  "rooms": [...]
}
```

| 필드 | 타입 | 필수 | 설명 |
|:---|:---|:---|:---|
| `scenario_id` | string | Y | 고유 식별자 (영문/숫자/언더스코어) |
| `version` | string | Y | 시나리오 버전 |
| `title` | string | Y | 게임 제목 |
| `author` | string | N | 제작자 이름 |
| `difficulty` | int (1-5) | N | 난이도 |
| `estimated_minutes` | int | N | 예상 플레이 시간 (분) |
| `start_room_id` | string | Y | 시작 방 ID (rooms 중 하나) |
| `flags` | object | N | 전역 상태 변수 초기값 |
| `items` | array | N | 전체 아이템 정의 목록 |
| `rooms` | array | Y | 방 목록 (최소 1개) |

---

## 3. Items (아이템)

```json
"items": [
  {
    "id": "key_rusty",
    "name": "녹슨 열쇠",
    "description": "오래되어 녹이 슨 철 열쇠입니다.",
    "usable_on": ["point_iron_door"]
  }
]
```

| 필드 | 타입 | 필수 | 설명 |
|:---|:---|:---|:---|
| `id` | string | Y | 아이템 고유 ID |
| `name` | string | Y | 인게임 표시 이름 |
| `description` | string | Y | 아이템 설명 |
| `usable_on` | string[] | N | 사용 가능한 포인트 ID 목록 (없으면 어디서나 사용 가능) |

---

## 4. Rooms (방)

```json
"rooms": [
  {
    "id": "room_start",
    "name": "지하 감옥",
    "description": "어둡고 습한 방입니다. 벽에 이끼가 가득합니다.",
    "points": [...]
  }
]
```

| 필드 | 타입 | 필수 | 설명 |
|:---|:---|:---|:---|
| `id` | string | Y | 방 고유 ID |
| `name` | string | Y | 인게임 표시 이름 |
| `description` | string | Y | 방 입장 시 출력되는 묘사 |
| `points` | array | Y | 조사 가능한 지점 목록 |

---

## 5. Points (조사 지점)

방 안에서 플레이어가 `inspect <id>` 로 상호작용할 수 있는 지점.

```json
"points": [
  {
    "id": "bed",
    "name": "낡은 침대",
    "description": "누군가 사용했던 것 같은 침대입니다. 베개 밑이 불룩합니다.",
    "hidden": false,
    "requirements": null,
    "observation": "베개 밑에서 무언가를 발견했습니다!",
    "action": {
      "type": "get_item",
      "value": "key_rusty"
    }
  }
]
```

| 필드 | 타입 | 필수 | 설명 |
|:---|:---|:---|:---|
| `id` | string | Y | 지점 고유 ID |
| `name` | string | Y | 인게임 표시 이름 |
| `description` | string | Y | `look` 시 보이는 간단한 묘사 |
| `hidden` | bool | N | true면 `look` 목록에 노출 안 됨 (기본 false) |
| `requirements` | object | N | 상호작용 전제 조건 (없으면 항상 가능) |
| `observation` | string | N | `inspect` 시 출력되는 상세 묘사 |
| `action` | object | N | 조사 결과로 발생하는 액션 |
| `puzzle` | object | N | 퍼즐 정의 (있으면 퍼즐 모드로 진입) |

---

## 6. Requirements (전제 조건)

```json
"requirements": {
  "item_id": "key_rusty",
  "flag": { "is_power_on": true },
  "solved_puzzle": "p_box_puzzle"
}
```

| 필드 | 타입 | 설명 |
|:---|:---|:---|
| `item_id` | string | 해당 아이템이 인벤토리에 있어야 함 |
| `flag` | object | 특정 플래그가 해당 값이어야 함 |
| `solved_puzzle` | string | 해당 퍼즐 ID가 이미 풀려 있어야 함 |

> 여러 조건이 있으면 **AND** 조건으로 모두 충족해야 함.
> 조건 미충족 시 엔진은 `fail_message`를 출력하거나 기본 거부 메시지를 출력.

---

## 7. Actions (액션)

조사 또는 퍼즐 성공 후 발생하는 게임 상태 변화.

### 7.1 아이템 획득

```json
"action": {
  "type": "get_item",
  "value": "key_rusty"
}
```

### 7.2 플래그 변경

```json
"action": {
  "type": "set_flag",
  "value": { "is_power_on": true }
}
```

### 7.3 방 이동

```json
"action": {
  "type": "move_to",
  "value": "room_corridor"
}
```

### 7.4 복합 액션 (배열)

```json
"action": [
  { "type": "get_item", "value": "access_card" },
  { "type": "set_flag", "value": { "found_secret_note": true } }
]
```

---

## 8. Puzzle (퍼즐)

```json
"puzzle": {
  "type": "text_input",
  "question": "도어락 4자리 코드를 입력하세요.",
  "hint": "방 안 메모지를 다시 확인해보세요.",
  "answer_hash": "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4",
  "max_attempts": 3,
  "time_limit_seconds": null,
  "fail_message": "틀렸습니다. 경보음이 울립니다.",
  "on_success": {
    "type": "move_to",
    "value": "room_corridor"
  }
}
```

| 필드 | 타입 | 필수 | 설명 |
|:---|:---|:---|:---|
| `type` | string | Y | 퍼즐 유형 (`text_input`, `key_sequence`, `timer`) |
| `question` | string | Y | 플레이어에게 표시되는 문제 |
| `hint` | string | N | `hint` 명령 시 출력되는 힌트 |
| `answer_hash` | string | Y | 정답의 SHA-256 해시값 |
| `max_attempts` | int | N | 최대 시도 횟수 (null이면 무제한) |
| `time_limit_seconds` | int | N | 타임어택 제한 시간 (null이면 무제한) |
| `fail_message` | string | N | 오답 시 출력 메시지 |
| `on_success` | action | Y | 정답 시 실행할 액션 |

### 퍼즐 타입

| 타입 | 설명 |
|:---|:---|
| `text_input` | 텍스트 자유 입력 후 해시 비교 |
| `key_sequence` | 특정 순서의 키 입력 (예: `up up down down`) |
| `timer` | 제한 시간 내에 정답 입력 |

---

## 9. 정답 해시 생성 방법

빌더가 시나리오 작성 시 평문 정답 대신 해시값을 직접 넣어야 한다.

```python
import hashlib
answer = "1234"
print(hashlib.sha256(answer.encode()).hexdigest())
# 03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4
```

또는 `clue build` 시 `answer_hash` 필드에 `plain:1234` 형식으로 쓰면 빌더가 자동 변환.

```json
"answer_hash": "plain:1234"
```

---

## 10. 완성된 시나리오 예시

```json
{
  "scenario_id": "lab_escape_01",
  "version": "1.0",
  "title": "비밀 연구소의 생존자",
  "author": "홍길동",
  "difficulty": 2,
  "start_room_id": "room_prison",
  "flags": {
    "is_power_on": false
  },
  "items": [
    {
      "id": "key_rusty",
      "name": "녹슨 열쇠",
      "description": "오래된 철 열쇠입니다.",
      "usable_on": ["door_iron"]
    }
  ],
  "rooms": [
    {
      "id": "room_prison",
      "name": "지하 감옥",
      "description": "어둡고 습한 방입니다. 철창문이 굳게 닫혀 있습니다.",
      "points": [
        {
          "id": "bed",
          "name": "낡은 침대",
          "description": "누군가 사용했던 침대입니다.",
          "observation": "베개 밑에서 녹슨 열쇠를 발견했습니다!",
          "action": { "type": "get_item", "value": "key_rusty" }
        },
        {
          "id": "door_iron",
          "name": "철창문",
          "description": "단단히 잠긴 철문입니다. 열쇠 구멍이 보입니다.",
          "requirements": { "item_id": "key_rusty" },
          "puzzle": {
            "type": "text_input",
            "question": "도어락 숫자를 입력하세요. (힌트: 2의 거듭제곱)",
            "hint": "1, 2, 4, 8... 다음은?",
            "answer_hash": "plain:16",
            "fail_message": "딸깍... 문이 열리지 않습니다.",
            "on_success": { "type": "move_to", "value": "room_corridor" }
          }
        }
      ]
    },
    {
      "id": "room_corridor",
      "name": "복도",
      "description": "희미한 형광등이 깜빡이는 복도입니다. 끝에 문이 하나 보입니다.",
      "points": [
        {
          "id": "exit_door",
          "name": "출구",
          "description": "빛이 새어나오는 문입니다.",
          "puzzle": {
            "type": "text_input",
            "question": "최종 탈출 코드를 입력하세요.",
            "answer_hash": "plain:ESCAPE",
            "on_success": { "type": "game_clear", "value": null }
          }
        }
      ]
    }
  ]
}
```

---

## 11. 유효성 검사 규칙

`clue verify` 실행 시 다음을 검사한다.

| 규칙 | 설명 |
|:---|:---|
| `start_room_id` 존재 여부 | 시작 방이 rooms 목록에 있는지 확인 |
| 아이템 ID 참조 무결성 | `get_item` 액션의 값이 items에 정의되어 있는지 확인 |
| 방 ID 참조 무결성 | `move_to` 액션의 값이 rooms에 존재하는지 확인 |
| 포인트 ID 중복 여부 | 같은 room 내 point ID 중복 없는지 확인 |
| 고립 방 탐지 | 어떤 경로로도 도달할 수 없는 방이 있는지 확인 |
| 탈출 경로 존재 여부 | `game_clear` 액션이 최소 1개 존재하는지 확인 |

---

**작성일**: 2026-04-02
**버전**: Schema v1.0
