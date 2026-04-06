// web/app/builder/page.tsx
'use client'

import { useMemo, useRef, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useBuilderStore } from '../../lib/store'
import { validateScenario } from '../../lib/validator'
import { ScenarioSchema } from '../../lib/schema'
import { RoomCanvas } from '../../components/canvas/RoomCanvas'
import { RoomDetailPanel } from '../../components/canvas/RoomDetailPanel'
import { MetaSidebar } from '../../components/sidebar/MetaSidebar'
import { Modal } from '../../components/ui/Modal'
import { VerifyStep } from '../../components/steps/VerifyStep'
import { ExportStep } from '../../components/steps/ExportStep'
import { Button } from '../../components/ui/Button'

function BuilderContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('id')

  const {
    state, hydrated,
    scenario, nodePositions,
    selectedRoomId, overlay,
    updateScenario, setNodePosition,
    setSelectedRoom, setOverlay,
    addRoom, deleteRoom,
    updateHubMeta,
  } = useBuilderStore(projectId)

  const [sidebarWidth, setSidebarWidth] = useState(256)
  const resizingRef = useRef(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(256)

  const handleSidebarResizeStart = useCallback((e: React.MouseEvent) => {
    resizingRef.current = true
    startXRef.current = e.clientX
    startWidthRef.current = sidebarWidth
    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return
      setSidebarWidth(Math.max(160, Math.min(480, startWidthRef.current + ev.clientX - startXRef.current)))
    }
    const onUp = () => {
      resizingRef.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [sidebarWidth])

  const errorCount = useMemo(() => {
    const parsed = ScenarioSchema.safeParse(scenario)
    if (!parsed.success) return parsed.error.issues.length
    return validateScenario(parsed.data).length
  }, [scenario])

  if (!hydrated) return null

  return (
    <div className="flex flex-col h-screen bg-zinc-950 overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-800 flex-shrink-0">
        <span className="text-xs text-zinc-500 font-mono mr-2">OpenClue Builder</span>
        <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          errorCount === 0
            ? 'bg-green-950 text-green-400 border border-green-800'
            : 'bg-red-950 text-red-400 border border-red-800'
        }`}>
          {errorCount === 0 ? '✓ 오류 없음' : `⚠ ${errorCount}개 오류`}
        </div>
        <div className="flex-1" />
        <Button variant="secondary" onClick={() => setOverlay('verify')} className="text-xs py-1 px-3">검증</Button>
        <Button onClick={() => setOverlay('export')} disabled={errorCount > 0} className="text-xs py-1 px-3">내보내기</Button>
        <a href="/" className="text-xs text-zinc-600 hover:text-zinc-400 ml-1">← 홈</a>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <MetaSidebar
          scenario={scenario}
          onChange={updateScenario}
          style={{ width: sidebarWidth }}
          hubMeta={state.project?.hubMeta}
          onHubMetaChange={updateHubMeta}
        />
        <div className="w-1 flex-shrink-0 cursor-col-resize bg-zinc-800 hover:bg-green-700 transition-colors duration-150" onMouseDown={handleSidebarResizeStart} />
        <div className="flex-1 relative">
          <RoomCanvas
            scenario={scenario}
            nodePositions={nodePositions}
            selectedRoomId={selectedRoomId}
            onUpdateScenario={updateScenario}
            onSetNodePosition={setNodePosition}
            onSelectRoom={setSelectedRoom}
            onAddRoom={addRoom}
            onDeleteRoom={deleteRoom}
          />
          {selectedRoomId && (
            <RoomDetailPanel
              scenario={scenario}
              roomId={selectedRoomId}
              onChange={updateScenario}
              onClose={() => setSelectedRoom(null)}
            />
          )}
        </div>
      </div>

      {overlay === 'verify' && (
        <Modal title="시나리오 검증" onClose={() => setOverlay(null)}>
          <VerifyStep scenario={scenario} onPrev={() => setOverlay(null)} onNext={() => setOverlay('export')} onGoToStep={() => setOverlay(null)} />
        </Modal>
      )}
      {overlay === 'export' && (
        <Modal title="내보내기" onClose={() => setOverlay(null)}>
          <ExportStep scenario={scenario} onPrev={() => setOverlay('verify')} onReset={() => router.push('/')} />
        </Modal>
      )}
    </div>
  )
}

export default function BuilderPage() {
  return (
    <Suspense fallback={null}>
      <BuilderContent />
    </Suspense>
  )
}
