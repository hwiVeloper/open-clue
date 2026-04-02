# 개발 로드맵 (Development Roadmap): OpenClue

---

## Phase 1: Local MVP (현재 목표)

> 서버 없이 로컬에서 완전히 동작하는 싱글 플레이 엔진과 시나리오 빌더 완성.

### Milestone 1-1: 프로젝트 기반 세팅

- [ ] Python 프로젝트 구조 세팅 (`pyproject.toml`, 모듈 분리)
- [ ] 의존성 설치 (Rich, Pydantic, PyCryptodome, Typer)
- [ ] `clue` CLI 진입점 기본 구조 작성 (Typer)
- [ ] 샘플 시나리오 JSON 초안 작성

### Milestone 1-2: 시나리오 스키마 및 검증

- [ ] Pydantic 데이터 모델 정의 (`Scenario`, `Room`, `Point`, `Puzzle`, `Action`)
- [ ] `clue verify` 명령어 구현
  - `start_room_id` 존재 여부 확인
  - 방-포인트-아이템 참조 무결성 검사
  - 탈출 경로(`game_clear`) 존재 여부 확인
  - 고립 방(Dead-end Room) 탐지

### Milestone 1-3: 암호화 모듈

- [ ] AES-256-GCM 암호화/복호화 구현 (`PyCryptodome`)
- [ ] `.dat` 바이너리 파일 포맷 설계 및 구현
  - 헤더: MAGIC + VERSION + NONCE + AUTH_TAG
  - 바디: 암호화된 JSON 바이너리
- [ ] `answer_hash` 자동 변환 (`plain:답` 형식 지원)
- [ ] `clue build` 명령어 구현

### Milestone 1-4: 게임 엔진 핵심 구현

- [ ] `GameState` 객체 구현 (Room, Inventory, Flags, SolvedPuzzles)
- [ ] Command Parser 구현
  - `look`, `inspect`, `use`, `inv`, `hint`, `help`, `quit`
- [ ] 게임 기믹 로직
  - 조사(Inspect): 묘사 출력, 아이템 획득, 플래그 변경
  - 퍼즐: 정답 입력 → SHA-256 해시 비교 → 액션 실행
  - Requirements 조건 체크 (아이템, 플래그, 풀린 퍼즐)
  - 방 이동 (move_to)
  - 게임 클리어 감지 및 종료 메시지

### Milestone 1-5: TUI 렌더링

- [ ] Rich 기반 메인 화면 레이아웃 구성
  - 상단 헤더 (시나리오 제목 + 현재 방)
  - 메인 패널 (방 묘사 + 조사 지점 목록)
  - 하단 인벤토리 바
- [ ] 게임 이벤트 별 출력 스타일 정의
  - 아이템 획득: 초록색 강조
  - 퍼즐 오답: 빨간색 경고
  - 방 이동: 구분선 + 새 방 묘사
  - 클리어: ASCII 아트 + 소요 시간 출력
- [ ] 타임어택 퍼즐용 Progress Bar 구현

### Milestone 1-6: 통합 테스트 및 배포 준비

- [ ] 샘플 시나리오 2개 제작 및 테스트
- [ ] Windows / macOS 환경 UI 레이아웃 동일성 확인
- [ ] PyInstaller로 단일 실행 파일 빌드 테스트
- [ ] README.md 작성 (설치 및 사용법)

---

## Phase 2: Online Scenario Hub

> 시나리오를 온라인에서 내려받아 즉시 플레이할 수 있는 기능 추가.

- [ ] GitHub Releases 또는 S3 기반 시나리오 저장소 구축
- [ ] `clue list` - 공개 시나리오 목록 조회
- [ ] `clue download <scenario_id>` - 시나리오 다운로드
- [ ] `clue play <scenario_id>` - 다운로드 없이 바로 실행 (스트리밍)
- [ ] 버전 체크 및 자동 업데이트 알림
- [ ] 시나리오 메타데이터 API (제목, 난이도, 제작자, 플레이 수)

---

## Phase 3: Multiplayer Mode

> 같은 방에서 여러 명이 함께 협력하여 탈출하는 실시간 멀티플레이.

- [ ] WebSocket 기반 멀티플레이 서버 설계 (FastAPI + WebSocket)
- [ ] 방 코드(Room Code) 생성 및 참여 기능
- [ ] 게임 상태 실시간 동기화
  - 플레이어 A가 아이템 획득 → 모든 플레이어 화면에 반영
  - 플레이어 B가 퍼즐 성공 → 방 이동 공유
- [ ] 채팅 기능 (터미널 내 텍스트 채팅)
- [ ] 역할 분리 기능 (방마다 입장 가능 플레이어 지정)

---

## 기술 부채 및 개선 예정

| 항목 | 현재 | 목표 |
|:---|:---|:---|
| 암호화 키 관리 | 실행 파일 내 하드코딩 | PBKDF2 기반 패스워드 키 유도 |
| 이미지 힌트 | ASCII 아트만 지원 | `.dat` 번들 이미지 → 시스템 뷰어 연동 |
| 효과음 | 미구현 | `playsound` 기반 이벤트 사운드 |
| 시나리오 빌더 UI | CLI만 지원 | 터미널 기반 인터랙티브 에디터 (TUI) |
| 세이브/로드 | 미구현 | 진행 상태 로컬 저장 지원 |

---

**작성일**: 2026-04-02
**현재 단계**: Phase 1 - Local MVP
