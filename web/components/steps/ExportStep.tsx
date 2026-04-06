// web/components/steps/ExportStep.tsx
'use client'

import { useState } from 'react'
import { Button } from '../ui/Button'
import { buildDat } from '../../lib/cipher'
import { buildZip } from '../../lib/zip'
import type { Scenario } from '../../lib/schema'

interface ExportStepProps {
  scenario: Partial<Scenario>
  onPrev: () => void
  onReset: () => void
}

export function ExportStep({ scenario, onPrev, onReset }: ExportStepProps) {
  const [downloading, setDownloading] = useState(false)
  const [done, setDone] = useState(false)

  const title = scenario.title ?? 'scenario'
  const filename = `${title}.zip`

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const jsonStr = JSON.stringify(scenario, null, 2)
      const datBytes = await buildDat(jsonStr)
      const zipBytes = await buildZip(jsonStr, datBytes)

      const blob = new Blob([zipBytes.buffer as ArrayBuffer], { type: 'application/zip' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      setDone(true)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <h2 className="text-lg font-semibold text-white">⑤ 내보내기</h2>

      <div className="bg-zinc-900 border border-zinc-700 rounded p-4 space-y-2">
        <p className="text-sm text-zinc-400">다운로드 파일</p>
        <p className="font-mono text-green-400 text-sm">{filename}</p>
        <p className="text-xs text-zinc-500">
          ZIP 안에 <code className="text-zinc-300">scenario.json</code> (편집용)과{' '}
          <code className="text-zinc-300">scenario.dat</code> (플레이용)이 포함됩니다.
        </p>
      </div>

      {done && (
        <div className="bg-green-950 border border-green-700 rounded p-3 text-green-400 text-sm">
          ✓ 다운로드 완료! <code>clue play scenario.dat</code> 으로 플레이하세요.
        </div>
      )}

      <div className="space-y-2">
        <Button onClick={handleDownload} disabled={downloading} className="w-full">
          {downloading ? '생성 중...' : `⬇ ${filename} 다운로드`}
        </Button>

        <Button
          variant="ghost"
          disabled
          className="w-full opacity-40 cursor-not-allowed"
          title="Coming Soon — Phase 2b"
        >
          ☁ Hub에 업로드 (준비 중)
        </Button>
      </div>

      <div className="flex gap-3 pt-2 border-t border-zinc-800">
        <Button variant="ghost" onClick={onPrev}>← 이전</Button>
        <Button variant="secondary" onClick={onReset}>새 시나리오 만들기</Button>
      </div>
    </div>
  )
}
