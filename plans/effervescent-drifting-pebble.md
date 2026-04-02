# OpenClue 초기 정리 작업 계획

## Context

Gemini 대화를 기반으로 생성된 문서들이 `docs/`에 저장되었고, GitHub에 push까지 완료된 상태.
두 가지 수정/정비 작업이 필요하다:
1. `docs/PRD.md` ASCII 아트가 "OpenClue" 대신 "SpenClue"로 잘못 생성됨 → 수정 필요
2. 향후 랜딩페이지, 백엔드, 플랫폼 웹 등이 추가될 것을 고려해 Python 엔진을 별도 디렉토리에 위치시키는 구조 설계

---

## Task 1: ASCII 아트 수정 (docs/PRD.md)

**파일**: `docs/PRD.md` (라인 166-172)

**현재 (잘못된 ASCII 아트)**:
```
 ____                     ____ _
/ ___| _ __   ___ _ __   / ___| |_   _  ___
\___ \| '_ \ / _ \ '_ \ | |   | | | | |/ _ \
 ___) | |_) |  __/ | | || |___| | |_| |  __/
|____/| .__/ \___|_| |_| \____|_|\__,_|\___|
      |_|
```
→ 첫 단어 첫 글자 블록이 `/ ___|` (S 모양)

**수정 후 (올바른 ASCII 아트)**:
```
  ___                    ____ _
 / _ \ _ __   ___ _ __  / ___| |_   _  ___
| | | | '_ \ / _ \ '_ \| |   | | | | |/ _ \
| |_| | |_) |  __/ | | | |___| | |_| |  __/
 \___/| .__/ \___|_| |_|\____|_|\__,_|\___|
      |_|
```
→ 첫 글자 블록이 ` / _ \` (O 모양)

---

## Task 2: 프로젝트 디렉토리 구조 재편

### 목표 디렉토리 구조

```
open-clue/
├── docs/                   # 기획 문서 (기존)
│   ├── PRD.md
│   ├── TECHNICAL_SPEC.md
│   ├── SCHEMA_SPEC.md
│   └── ROADMAP.md
├── engine/                 # Python CLI 메인 프로그램 (신규)
│   ├── clue/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── engine/
│   │   ├── cipher/
│   │   ├── schema/
│   │   └── ui/
│   ├── scenarios/
│   ├── tests/
│   ├── pyproject.toml
│   └── README.md
├── web/                    # (future) 랜딩페이지
├── backend/                # (future) 백엔드 API 서버
├── platform/               # (future) 플랫폼 웹페이지
└── README.md               # 루트 README (모노레포 소개)
```

### 작업 내용

1. `engine/` 디렉토리 생성
2. `engine/` 안에 Python 프로젝트 기본 골격 생성:
   - `engine/clue/` — 소스 패키지
   - `engine/scenarios/` — 샘플 시나리오 JSON 보관
   - `engine/tests/` — 테스트
   - `engine/pyproject.toml` — 패키지 메타데이터 및 의존성
3. 루트 `README.md` 생성 — 모노레포 구조 및 각 디렉토리 역할 소개
4. `docs/TECHNICAL_SPEC.md` 모듈 구조 섹션을 새 경로(`engine/`)에 맞게 업데이트

---

## 작업 순서

1. `docs/PRD.md` ASCII 아트 수정
2. `engine/` 디렉토리 및 기본 파일 골격 생성
3. 루트 `README.md` 작성
4. `docs/TECHNICAL_SPEC.md` 경로 업데이트
5. git add → commit → push

---

## 검증

- `docs/PRD.md` ASCII 아트가 "OpenClue"로 올바르게 표시되는지 확인
- `engine/` 디렉토리가 생성되고 기본 파일들이 존재하는지 확인
- GitHub hwiVeloper/open-clue 레포에 정상 push 확인
