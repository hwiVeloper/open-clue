// web/app/page.tsx
"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../components/ui/Button";
import { ScenarioSchema } from "../lib/schema";

const ASCII_ART = `  ___                    ____ _
 / _ \\_ __   ___ _ __  / ___| |_   _  ___
| | | | '_ \\/ _ \\ '_ \\| |   | | | | |/ _ \\
| |_| | |_) | __/ | | | |___| | |_| |  __/
 \\___/| .__/ \\___|_| |_|\\____|_|\\__,_|\\___|
      |_|`;

export default function LandingPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        const parsed = ScenarioSchema.safeParse(data);
        if (!parsed.success) {
          alert("유효하지 않은 시나리오 파일입니다.");
          return;
        }
        localStorage.setItem(
          "openclue_builder_draft",
          JSON.stringify({
            scenario: parsed.data,
            nodePositions: {},
            selectedRoomId: null,
            overlay: null,
          })
        );
        router.push("/builder");
      } catch {
        alert("JSON 파싱 실패. 파일을 확인해주세요.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center space-y-3">
        <pre
          className="text-green-400 leading-tight hidden sm:block"
          style={{
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: "13px",
          }}
        >
          {ASCII_ART}
        </pre>
        <h1 className="text-2xl font-bold text-green-400">Scenario Builder</h1>
        <p className="text-zinc-400 text-sm">
          방탈출 시나리오를 만들고 ZIP으로 내보내세요.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          onClick={() => router.push("/builder")}
          className="text-base px-8 py-3"
        >
          새 시나리오 만들기
        </Button>
        <Button
          variant="secondary"
          onClick={() => fileRef.current?.click()}
          className="text-base px-8 py-3"
        >
          JSON 불러오기
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleLoad}
        />
      </div>

      <p className="text-xs text-zinc-600">
        모든 작업은 브라우저에서만 처리됩니다. 서버로 데이터가 전송되지
        않습니다.
      </p>
    </main>
  );
}
