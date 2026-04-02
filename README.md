# OpenClue

> "Terminal is your only clue."

```
  ___                    ____ _
 / _ \ _ __   ___ _ __  / ___| |_   _  ___
| | | | '_ \ / _ \ '_ \| |   | | | | |/ _ \
| |_| | |_) |  __/ | | | |___| | |_| |  __/
 \___/| .__/ \___|_| |_|\____|_|\__,_|\___|
      |_|
```

JSON 시나리오 파일만 있으면 터미널에서 즐기는 텍스트 기반 방탈출 엔진.

---

## 프로젝트 구조

```
open-clue/
├── engine/       # Python CLI 게임 엔진 (메인 프로그램)
├── docs/         # 기획 문서 (PRD, 기술 명세, 스키마, 로드맵)
├── web/          # (예정) 랜딩 페이지
├── backend/      # (예정) 백엔드 API 서버
└── platform/     # (예정) 플랫폼 웹 페이지
```

## 빠른 시작

```bash
cd engine
pip install -e .
clue play scenarios/sample.dat
```

## 문서

| 문서 | 설명 |
|:---|:---|
| [PRD](docs/PRD.md) | 제품 요구사항 문서 |
| [Technical Spec](docs/TECHNICAL_SPEC.md) | 기술 명세 및 아키텍처 |
| [Schema Spec](docs/SCHEMA_SPEC.md) | 시나리오 JSON 스키마 |
| [Roadmap](docs/ROADMAP.md) | 개발 로드맵 |
