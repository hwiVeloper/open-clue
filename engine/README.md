# OpenClue Engine

터미널 기반 방탈출 게임 엔진. JSON 시나리오 파일을 AES-256으로 암호화하여 배포하고, CLI 명령어로 플레이한다.

## 설치

```bash
cd engine
pip install -e ".[dev]"
```

## 사용법

```bash
# 시나리오 유효성 검사
clue verify scenarios/sample.json

# 시나리오 빌드 (JSON → 암호화 .dat)
clue build scenarios/sample.json

# 게임 플레이
clue play scenarios/sample.dat
```

## 개발 구조

```
engine/
├── clue/
│   ├── main.py        # CLI 진입점 (Typer)
│   ├── engine/        # 게임 상태 및 기믹 로직
│   ├── cipher/        # AES-256 암호화/복호화
│   ├── schema/        # Pydantic 데이터 모델 및 검증
│   └── ui/            # Rich 기반 TUI 렌더링
├── scenarios/         # 샘플 시나리오 JSON
├── tests/
└── pyproject.toml
```

## 문서

전체 기획 및 기술 명세는 [`../docs/`](../docs/) 참고.
