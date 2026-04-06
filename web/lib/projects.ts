// web/lib/projects.ts
import type { Scenario } from './schema'
import type { NodePosition } from './store'
import { dbGetAll, dbGet, dbPut, dbDelete } from './db'

export interface HubMeta {
  synopsis?: string
  tags?: string[]
  visibility?: 'public' | 'private'
}

export interface ProjectRecord {
  id: string
  scenario: Partial<Scenario>
  nodePositions: Record<string, NodePosition>
  createdAt: number
  updatedAt: number
  hubMeta?: HubMeta
}

const LEGACY_KEY = 'openclue_builder_draft'

export async function listProjects(): Promise<ProjectRecord[]> {
  const all = await dbGetAll<ProjectRecord>()
  return all.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getProject(id: string): Promise<ProjectRecord | undefined> {
  return dbGet<ProjectRecord>(id)
}

export async function saveProject(project: ProjectRecord): Promise<void> {
  await dbPut({ ...project, updatedAt: Date.now() })
}

export async function deleteProject(id: string): Promise<void> {
  await dbDelete(id)
}

export function newProject(): ProjectRecord {
  const id = crypto.randomUUID()
  const now = Date.now()
  return {
    id,
    scenario: {
      scenario_id: '',
      version: '1.0',
      title: '',
      author: '',
      difficulty: null,
      estimated_minutes: null,
      start_room_id: '',
      flags: {},
      items: [],
      rooms: [],
    },
    nodePositions: {},
    createdAt: now,
    updatedAt: now,
  }
}

/** localStorage 초안이 있으면 IndexedDB로 마이그레이션하고 삭제 */
export async function migrateLegacyDraft(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(LEGACY_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    const project = newProject()
    project.scenario = parsed.scenario ?? project.scenario
    project.nodePositions = parsed.nodePositions ?? {}
    localStorage.removeItem(LEGACY_KEY)  // remove before async save to prevent duplicates on retry
    await saveProject(project)
    return project.id
  } catch {
    return null
  }
}
