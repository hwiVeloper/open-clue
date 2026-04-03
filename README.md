# OpenClue

```
  ___                    ____ _
 / _ \ _ __   ___ _ __  / ___| |_   _  ___
| | | | '_ \ / _ \ '_ \| |   | | | | |/ _ \
| |_| | |_) |  __/ | | | |___| | |_| |  __/
 \___/| .__/ \___|_| |_|\____|_|\__,_|\___|
      |_|
```

JSON 시나리오 파일을 작성하면 터미널에서 플레이 가능한 텍스트 기반 방탈출 엔진.

---

## 다운로드

[Releases 페이지](https://github.com/hwiVeloper/open-clue/releases/latest)에서 운영체제에 맞는 파일을 받는다.

- Windows: `OpenClue-windows.exe`
- macOS: `OpenClue-macos`

macOS에서는 처음 실행 시 Gatekeeper 경고가 뜰 수 있다. 그럴 경우:

```bash
chmod +x OpenClue-macos
xattr -d com.apple.quarantine OpenClue-macos
./OpenClue-macos
```

---

## 실행

실행 파일을 바로 실행하면 `scenarios/` 폴더의 `.dat` 파일을 자동으로 탐색한다. 시나리오가 하나이면 바로 시작되고, 여러 개이면 선택 화면이 나온다.

특정 파일을 직접 지정할 수도 있다:

```bash
./OpenClue-macos path/to/scenario.dat
# 또는
OpenClue-windows.exe path\to\scenario.dat
```

---

## 조작법

**시나리오 선택 화면**

| 키 | 동작 |
|---|---|
| `↑` / `↓` | 목록 이동 |
| `Enter` | 선택 |
| `q` / `Esc` | 종료 |

**게임 중**

입력창에 명령어를 타이핑하고 Enter를 누른다.

| 명령어 | 설명 |
|---|---|
| `look` | 현재 방의 구조와 조사 가능한 지점 목록 보기 |
| `inspect <id>` | 특정 지점 조사 (예: `inspect desk`) |
| `use <id>` | 인벤토리 아이템 확인 (예: `use key`) |
| `inv` | 소지품 목록 보기 |
| `hint` | 현재 방의 미해결 퍼즐 힌트 |
| `help` | 명령어 목록 요약 |
| `quit` 또는 `Ctrl+Q` | 게임 종료 |

퍼즐 입력 모드에서는 정답을 입력하고 Enter. 틀리면 재시도할 수 있고, 최대 시도 횟수가 설정된 경우 초과 시 자동으로 종료된다.

---

## 개발자용

소스에서 직접 실행하거나 시나리오를 제작하려면 [engine/README.md](engine/README.md)와 [docs/](docs/)를 참고.

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
