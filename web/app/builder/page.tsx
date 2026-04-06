// web/app/builder/page.tsx
'use client'

import { useBuilderStore } from '../../lib/store'

export default function BuilderPage() {
  const { state, hydrated, updateScenario, reset, setSelectedRoom, setOverlay } = useBuilderStore()
  const { scenario } = state

  if (!hydrated) return null

  return (
    <main className="min-h-screen p-6 sm:p-10 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-sm text-zinc-500 font-mono">OpenClue Builder (Canvas - WIP)</h1>
        <a href="/" className="text-xs text-zinc-600 hover:text-zinc-400">← 홈</a>
      </div>

      <div className="space-y-4">
        <div className="rounded border border-zinc-700 p-4">
          <h2 className="font-semibold mb-2">Scenario: {scenario.title || '(untitled)'}</h2>
          <p className="text-sm text-zinc-400">Author: {scenario.author || '(none)'}</p>
          <p className="text-sm text-zinc-400">Rooms: {(scenario.rooms?.length ?? 0)}</p>
        </div>

        <button
          onClick={() => setOverlay('verify')}
          className="rounded bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm"
        >
          Verify
        </button>

        <button
          onClick={() => setOverlay('export')}
          className="rounded bg-green-600 hover:bg-green-700 px-4 py-2 text-sm ml-2"
        >
          Export
        </button>

        <button
          onClick={reset}
          className="rounded bg-red-600 hover:bg-red-700 px-4 py-2 text-sm ml-2"
        >
          Reset
        </button>
      </div>
    </main>
  )
}
