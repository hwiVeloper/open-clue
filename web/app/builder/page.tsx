// web/app/builder/page.tsx
'use client'

import { useBuilderStore } from '../../lib/store'
import { StepBar } from '../../components/ui/StepBar'
import { MetaStep } from '../../components/steps/MetaStep'
import { RoomsStep } from '../../components/steps/RoomsStep'
import { RoomDetailStep } from '../../components/steps/RoomDetailStep'
import { VerifyStep } from '../../components/steps/VerifyStep'
import { ExportStep } from '../../components/steps/ExportStep'

export default function BuilderPage() {
  const { state, hydrated, updateScenario, setStep, setEditingRoom, reset } = useBuilderStore()
  const { scenario, currentStep, editingRoomId } = state

  if (!hydrated) return null

  return (
    <main className="min-h-screen p-6 sm:p-10 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-sm text-zinc-500 font-mono">OpenClue Builder</h1>
        <a href="/" className="text-xs text-zinc-600 hover:text-zinc-400">← 홈</a>
      </div>

      <StepBar current={currentStep} onClickStep={i => i < currentStep && setStep(i)} />

      {currentStep === 0 && (
        <MetaStep scenario={scenario} onChange={updateScenario} onNext={() => setStep(1)} />
      )}
      {currentStep === 1 && (
        <RoomsStep
          scenario={scenario}
          onChange={updateScenario}
          onEditRoom={id => { setEditingRoom(id); setStep(2) }}
          onPrev={() => setStep(0)}
          onNext={() => setStep(3)}
        />
      )}
      {currentStep === 2 && editingRoomId && (
        <RoomDetailStep
          scenario={scenario}
          roomId={editingRoomId}
          onChange={updateScenario}
          onBack={() => { setEditingRoom(null); setStep(1) }}
        />
      )}
      {currentStep === 3 && (
        <VerifyStep
          scenario={scenario}
          onPrev={() => setStep(1)}
          onNext={() => setStep(4)}
          onGoToStep={setStep}
        />
      )}
      {currentStep === 4 && (
        <ExportStep
          scenario={scenario}
          onPrev={() => setStep(3)}
          onReset={reset}
        />
      )}
    </main>
  )
}
