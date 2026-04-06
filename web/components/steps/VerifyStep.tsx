// web/components/steps/VerifyStep.tsx
'use client'

import { useMemo } from 'react'
import { Button } from '../ui/Button'
import { validateScenario } from '../../lib/validator'
import { ScenarioSchema } from '../../lib/schema'
import type { Scenario } from '../../lib/schema'

interface VerifyStepProps {
  scenario: Partial<Scenario>
  onPrev: () => void
  onNext: () => void
  onGoToStep: (step: number) => void
}

export function VerifyStep({ scenario, onPrev, onNext, onGoToStep }: VerifyStepProps) {
  const { errors, parseError } = useMemo(() => {
    const parsed = ScenarioSchema.safeParse(scenario)
    if (!parsed.success) {
      return { errors: [], parseError: parsed.error.issues.map(i => i.message).join(', ') }
    }
    return { errors: validateScenario(parsed.data), parseError: null }
  }, [scenario])

  const ok = !parseError && errors.length === 0

  return (
    <div className="max-w-xl space-y-5">
      <h2 className="text-lg font-semibold text-white">④ 검증</h2>

      {ok ? (
        <div className="bg-green-950 border border-green-700 rounded p-4 text-green-400 text-sm">
          ✓ 오류 없음 — 내보내기가 가능합니다.
        </div>
      ) : (
        <div className="space-y-2">
          {parseError && (
            <div className="bg-red-950 border border-red-700 rounded p-3 text-red-400 text-sm">
              스키마 오류: {parseError}
            </div>
          )}
          {errors.map((err, i) => (
            <div
              key={i}
              className="bg-zinc-900 border border-red-700 rounded p-3 text-sm text-red-300 cursor-pointer hover:border-red-500"
              onClick={() => {
                if (err.includes('start_room_id') || err.includes('title')) onGoToStep(0)
                else if (err.includes('방') || err.includes('room')) onGoToStep(1)
                else if (err.includes('포인트') || err.includes('game_clear')) onGoToStep(2)
              }}
            >
              ✗ {err}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="ghost" onClick={onPrev}>← 이전</Button>
        <Button onClick={onNext} disabled={!ok}>내보내기 →</Button>
      </div>
    </div>
  )
}
