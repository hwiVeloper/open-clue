// web/components/steps/MetaStep.tsx
'use client'

import { useEffect } from 'react'
import { Button } from '../ui/Button'
import { Input, Textarea, Label } from '../ui/Input'
import { StarRating } from '../ui/StarRating'
import type { Scenario } from '../../lib/schema'

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-가-힣]/g, '')
    .replace(/--+/g, '-')
    .slice(0, 64)
}

interface MetaStepProps {
  scenario: Partial<Scenario>
  onChange: (patch: Partial<Scenario>) => void
  onNext: () => void
}

export function MetaStep({ scenario, onChange, onNext }: MetaStepProps) {
  // 제목 변경 시 scenario_id 자동 생성 (비어 있을 때만)
  useEffect(() => {
    if (!scenario.scenario_id && scenario.title) {
      onChange({ scenario_id: toSlug(scenario.title) })
    }
  }, [scenario.title])

  return (
    <div className="space-y-5 max-w-xl">
      <h2 className="text-lg font-semibold text-white">① 메타 정보</h2>

      <div>
        <Label required>시나리오 제목</Label>
        <Input
          placeholder="폐허가 된 연구소"
          value={scenario.title ?? ''}
          onChange={e => onChange({ title: e.target.value })}
        />
        <p className="text-xs text-zinc-500 mt-1">ZIP 파일명으로 사용됩니다.</p>
      </div>

      <div>
        <Label required>시나리오 ID</Label>
        <Input
          placeholder="abandoned-lab"
          value={scenario.scenario_id ?? ''}
          onChange={e => onChange({ scenario_id: e.target.value })}
        />
        <p className="text-xs text-zinc-500 mt-1">소문자와 하이픈만 사용하세요. Hub 공유 시 고유 키로 사용됩니다.</p>
      </div>

      <div>
        <Label>작가</Label>
        <Input
          placeholder="이름 또는 닉네임"
          value={scenario.author ?? ''}
          onChange={e => onChange({ author: e.target.value })}
        />
      </div>

      <div>
        <Label>난이도</Label>
        <StarRating
          value={scenario.difficulty ?? null}
          onChange={v => onChange({ difficulty: v })}
        />
      </div>

      <div>
        <Label>예상 플레이 시간 (분)</Label>
        <Input
          type="number"
          min={1}
          placeholder="30"
          value={scenario.estimated_minutes ?? ''}
          onChange={e => onChange({ estimated_minutes: e.target.value ? parseInt(e.target.value) : null })}
        />
      </div>

      <div className="pt-2">
        <Button onClick={onNext} disabled={!scenario.title?.trim()}>
          다음 →
        </Button>
      </div>
    </div>
  )
}
