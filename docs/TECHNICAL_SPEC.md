# 기술 명세서 (Technical Specification): OpenClue

---

## 1. 기술 스택 (Tech Stack)

| 구분 | 기술 | 버전 | 용도 |
|:---|:---|:---|:---|
| **Language** | Python | 3.10+ | 전체 엔진 로직 구현 |
| **TUI Framework** | Rich | latest | 터미널 레이아웃, 컬러, 패널, 마크다운 렌더링 |
| **Security** | PyCryptodome | latest | AES-256 암호화/복호화, SHA-256 해싱 |
| **Data Validation** | Pydantic | v2 | JSON 시나리오 스키마 정의 및 유효성 검사 |
| **CLI Framework** | Typer | latest | `play`, `build`, `verify` 명령어 인터페이스 |
| **Packaging** | PyInstaller | latest | 단일 실행 파일(.exe, .app) 빌드 |
| **Audio (Optional)** | playsound | latest | 이벤트 트리거 시 효과음 재생 |

---

## 2. 시스템 아키텍처

```
┌──────────────────────────────────────────────┐
│                  OpenClue CLI                │
│          (Typer: play / build / verify)      │
└──────────────┬───────────────────────────────┘
               │
     ┌─────────┴─────────┐
     │                   │
     ▼                   ▼
┌─────────┐       ┌─────────────┐
│ Builder │       │   Player    │
│  Mode   │       │    Mode     │
└────┬────┘       └──────┬──────┘
     │                   │
     ▼                   ▼
┌──────────────┐  ┌──────────────────┐
│ Cipher       │  │ Cipher           │
│ (AES Encode) │  │ (AES Decode)     │
└──────┬───────┘  └────────┬─────────┘
       │                   │
       ▼                   ▼
┌──────────────┐  ┌──────────────────┐
│ .dat 파일    │  │ State Manager    │
│ (암호화 출력)│  │ (Room/Inv/Flag)  │
└──────────────┘  └────────┬─────────┘
                           │
                  ┌────────┴─────────┐
                  │                  │
                  ▼                  ▼
          ┌──────────────┐  ┌──────────────┐
          │ Command      │  │ TUI          │
          │ Parser       │  │ Renderer     │
          └──────────────┘  │ (Rich)       │
                            └──────────────┘
```

---

## 3. 모듈 구조

```
open-clue/
├── docs/                    # 기획 문서
├── engine/                  # Python CLI 게임 엔진
│   ├── clue/
│   │   ├── __init__.py
│   │   ├── main.py              # Typer CLI 진입점 (play, build, verify)
│   │   ├── engine/
│   │   │   ├── state.py         # GameState: Room, Inventory, Flags 관리
│   │   │   ├── parser.py        # 명령어 파서 및 액션 디스패처
│   │   │   └── mechanics.py     # 퍼즐, 아이템 사용, 방 이동 로직
│   │   ├── cipher/
│   │   │   ├── encrypt.py       # AES-256 GCM 암호화 (Builder용)
│   │   │   └── decrypt.py       # AES-256 GCM 복호화 (Player용)
│   │   ├── schema/
│   │   │   ├── models.py        # Pydantic 데이터 모델 정의
│   │   │   └── validator.py     # 시나리오 로직 무결성 검사
│   │   └── ui/
│   │       ├── renderer.py      # Rich 기반 TUI 렌더링
│   │       └── ascii.py         # ASCII 아트 유틸리티
│   ├── scenarios/               # 샘플 시나리오 JSON 파일들
│   ├── tests/
│   ├── pyproject.toml
│   └── README.md
├── web/                     # (예정) 랜딩 페이지
├── backend/                 # (예정) 백엔드 API 서버
├── platform/                # (예정) 플랫폼 웹 페이지
└── README.md                # 루트 README
```

---

## 4. 핵심 모듈 상세 설계

### 4.1 GameState (`engine/state.py`)

게임 진행 중 모든 상태를 메모리에서 관리하는 단일 객체.

```python
@dataclass
class GameState:
    scenario: Scenario           # 로드된 시나리오 전체
    current_room_id: str         # 현재 플레이어 위치
    inventory: list[str]         # 보유 아이템 ID 목록
    flags: dict[str, bool]       # 전역 상태 플래그
    solved_puzzles: set[str]     # 이미 풀린 퍼즐 ID 집합
    start_time: datetime         # 게임 시작 시각 (클리어 타임 계산용)
```

### 4.2 Command Parser (`engine/parser.py`)

사용자 입력을 파싱하여 적절한 엔진 함수로 디스패치.

| 입력 예시 | 파싱 결과 |
|:---|:---|
| `look` | `action=look, target=None` |
| `inspect desk` | `action=inspect, target="desk"` |
| `use rusty_key` | `action=use, target="rusty_key"` |
| `inv` | `action=inventory, target=None` |
| `hint` | `action=hint, target=None` |

### 4.3 암호화 모듈 (`cipher/`)

**암호화 (Builder)**:
1. 원본 `scenario.json` 파일 읽기
2. 랜덤 256-bit 키 + 96-bit Nonce 생성
3. AES-256-GCM 으로 전체 데이터 암호화
4. 헤더(버전, Nonce, Auth Tag) + 암호문을 `.dat` 바이너리로 저장

**복호화 (Player)**:
1. `.dat` 파일의 헤더에서 Nonce, Auth Tag 추출
2. 내장 키로 AES-256-GCM 복호화
3. 복호화된 JSON을 Pydantic 모델로 파싱하여 메모리 적재

> **주의**: 암호화 키는 실행 파일 내부에 하드코딩된 방식으로 시작하며, 이후 버전에서 패스워드 기반 키 유도(PBKDF2) 방식으로 업그레이드 예정.

### 4.4 정답 검증

정답은 시나리오 파일 내에 평문으로 저장되지 않고 SHA-256 해시값으로 저장.

```python
import hashlib

def verify_answer(user_input: str, stored_hash: str) -> bool:
    input_hash = hashlib.sha256(user_input.strip().encode()).hexdigest()
    return input_hash == stored_hash
```

### 4.5 TUI 렌더링 (`ui/renderer.py`)

Rich 라이브러리를 활용한 주요 화면 구성.

```
┌─────────────────────────────────────────┐
│  [OpenClue]  비밀 연구소 > 지하 감옥     │
├─────────────────────────────────────────┤
│  어둡고 습한 방입니다. 철창문이 굳게     │
│  닫혀 있습니다.                         │
├─────────────────────────────────────────┤
│  [조사 가능한 지점]                      │
│   - 낡은 침대 (bed)                     │
│   - 철창문 (door)  🔒                   │
├─────────────────────────────────────────┤
│  [인벤토리]  없음                        │
└─────────────────────────────────────────┘
> _
```

---

## 5. 보안 설계

### 5.1 시나리오 파일 보안 레이어

| 레이어 | 기술 | 목적 |
|:---|:---|:---|
| L1 | AES-256-GCM | 시나리오 전체 내용 암호화 |
| L2 | SHA-256 | 정답 평문 은닉 |
| L3 | PyInstaller | 엔진 소스코드 역공학 방지 |

### 5.2 `.dat` 파일 포맷

```
[ MAGIC (4B) ][ VERSION (2B) ][ NONCE (12B) ][ TAG (16B) ][ CIPHERTEXT (...) ]
```

- MAGIC: `OCLU` (OpenCLUe 식별자)
- VERSION: 파일 포맷 버전 (향후 호환성 관리)
- NONCE: AES-GCM 난수 (매 빌드마다 새로 생성)
- TAG: AES-GCM 인증 태그 (무결성 검증)
- CIPHERTEXT: 암호화된 JSON 바이너리

---

## 6. 배포 전략

### 6.1 엔진 배포

```bash
# 단일 실행 파일 빌드
pyinstaller --onefile --name "clue" clue/main.py
```

| 플랫폼 | 결과물 |
|:---|:---|
| Windows | `clue.exe` |
| macOS | `clue` |
| Linux | `clue` |

### 6.2 시나리오 공유 방식

- 제작자: `clue build scenario.json` → `scenario.dat` 생성
- 배포: GitHub Releases, Discord, 직접 전달 등 자유 형식
- 플레이어: `clue play scenario.dat` 단 하나의 명령으로 실행

---

## 7. 의존성 목록 (requirements.txt)

```
rich>=13.0.0
pycryptodome>=3.18.0
pydantic>=2.0.0
typer>=0.9.0
playsound>=1.3.0  # optional
pyinstaller>=6.0.0  # dev only
```

---

**작성일**: 2026-04-02
**버전**: v0.1 Draft
