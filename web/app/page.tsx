// web/app/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { listProjects, newProject, saveProject, deleteProject, migrateLegacyDraft, type ProjectRecord } from '../lib/projects'
import { ScenarioSchema } from '../lib/schema'

const ASCII_ART = `  ___                    ____ _
 / _ \\ _ __   ___ _ __  / ___| |_   _  ___
| | | | '_ \\/ _ \\ '_ \\| |   | | | | |/ _ \\
| |_| | |_) |  __/ | | | |___| | |_| |  __/
 \\___/| .__/ \\___|_| |_|\\____|_|\\__,_|\\___|
      |_|`

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function HomePage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    migrateLegacyDraft().then(() => listProjects()).then(ps => {
      setProjects(ps)
      setLoading(false)
    })
  }, [])

  const handleNew = async () => {
    const p = newProject()
    await saveProject(p)
    router.push(`/builder?id=${p.id}`)
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('이 프로젝트를 삭제할까요?')) return
    await deleteProject(id)
    setProjects(ps => ps.filter(p => p.id !== id))
  }

  const handleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        const parsed = ScenarioSchema.safeParse(data)
        if (!parsed.success) { alert('유효하지 않은 시나리오 파일입니다.'); return }
        const p = newProject()
        p.scenario = parsed.data
        await saveProject(p)
        router.push(`/builder?id=${p.id}`)
      } catch { alert('파일을 읽을 수 없습니다.') }
    }
    reader.readAsText(file)
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* 헤더 */}
        <div className="mb-10">
          <pre
            className="text-green-400 hidden sm:block text-left"
            style={{ fontFamily: '"Consolas","Courier New",Courier,monospace', fontSize: '14px', lineHeight: '1.2', letterSpacing: '0' }}
          >
            {ASCII_ART}
          </pre>
          <p className="text-zinc-500 text-sm mt-2">방탈출 시나리오 빌더</p>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={handleNew}
            className="bg-green-700 hover:bg-green-600 text-white text-sm px-4 py-2 rounded font-medium transition-colors"
          >
            + 새 시나리오 만들기
          </button>
          <label className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2 rounded cursor-pointer transition-colors">
            JSON 불러오기
            <input type="file" accept=".json" className="hidden" onChange={handleLoad} />
          </label>
        </div>

        {/* 프로젝트 목록 */}
        {loading ? (
          <div className="text-zinc-600 text-sm">불러오는 중...</div>
        ) : projects.length === 0 ? (
          <div className="text-zinc-600 text-sm text-center py-16">
            아직 시나리오가 없습니다.<br/>
            <span className="text-zinc-500">위 버튼으로 새 시나리오를 만들어보세요.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map(p => {
              const roomCount = p.scenario.rooms?.length ?? 0
              const itemCount = p.scenario.items?.length ?? 0
              return (
                <div
                  key={p.id}
                  onClick={() => router.push(`/builder?id=${p.id}`)}
                  className="flex items-start gap-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 rounded-lg px-4 py-3 cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-white truncate">
                      {p.scenario.title || '(제목 없음)'}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {p.scenario.scenario_id || '—'} · 방 {roomCount}개 · 아이템 {itemCount}개
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-zinc-600">{formatDate(p.updatedAt)}</div>
                    <div className="flex gap-2 mt-1 justify-end">
                      <button
                        onClick={e => handleDelete(e, p.id)}
                        className="text-[10px] text-zinc-600 hover:text-red-400 px-1"
                      >삭제</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
