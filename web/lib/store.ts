// web/lib/store.ts
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Scenario } from './schema'
import { getProject, saveProject, type ProjectRecord, type HubMeta, type RoomSize, type MemoData, type GroupData } from './projects'

export type NodePosition = { x: number; y: number }

export type BuilderState = {
  project: ProjectRecord | null
  selectedRoomId: string | null
  overlay: 'verify' | 'export' | null
}

/** 빌더 외부에서 scenario/nodePositions에 접근하기 쉽도록 computed shortcut */
export function useBuilderStore(projectId: string | null) {
  const [state, setStateRaw] = useState<BuilderState>({
    project: null,
    selectedRoomId: null,
    overlay: null,
  })
  const [hydrated, setHydrated] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 초기 로드
  useEffect(() => {
    if (!projectId) { setHydrated(true); return }
    getProject(projectId).then(proj => {
      if (proj) setStateRaw(prev => ({ ...prev, project: proj }))
      setHydrated(true)
    })
  }, [projectId])

  // 디바운스 자동 저장 (1초)
  const scheduleSave = useCallback((project: ProjectRecord) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveProject(project), 1000)
  }, [])

  const setProject = useCallback((updater: (prev: ProjectRecord) => ProjectRecord) => {
    setStateRaw(prev => {
      if (!prev.project) return prev
      const next = updater(prev.project)
      scheduleSave(next)
      return { ...prev, project: next }
    })
  }, [scheduleSave])

  // scenario shortcut
  const scenario = state.project?.scenario ?? {} as Partial<Scenario>
  const nodePositions = state.project?.nodePositions ?? {}
  const nodeSizes = state.project?.nodeSizes ?? {}
  const memos = state.project?.memos ?? []
  const groups = state.project?.groups ?? []

  const updateScenario = useCallback((patch: Partial<Scenario>) => {
    setProject(p => ({ ...p, scenario: { ...p.scenario, ...patch } }))
  }, [setProject])

  const setNodePosition = useCallback((roomId: string, pos: NodePosition) => {
    setProject(p => ({ ...p, nodePositions: { ...p.nodePositions, [roomId]: pos } }))
  }, [setProject])

  const setNodeSize = useCallback((roomId: string, size: RoomSize) => {
    setProject(p => ({ ...p, nodeSizes: { ...p.nodeSizes, [roomId]: size } }))
  }, [setProject])

  const setSelectedRoom = useCallback((roomId: string | null) => {
    setStateRaw(prev => ({ ...prev, selectedRoomId: roomId }))
  }, [])

  const setOverlay = useCallback((overlay: BuilderState['overlay']) => {
    setStateRaw(prev => ({ ...prev, overlay }))
  }, [])

  const addRoom = useCallback((pos: NodePosition) => {
    const id = `room-${Date.now()}`
    setProject(p => ({
      ...p,
      scenario: {
        ...p.scenario,
        rooms: [
          ...(p.scenario.rooms ?? []),
          { id, name: '새 방', description: '', points: [], npcs: [] },
        ],
        start_room_id: (p.scenario.rooms?.length ?? 0) === 0 ? id : p.scenario.start_room_id,
      },
      nodePositions: { ...p.nodePositions, [id]: pos },
    }))
    return id
  }, [setProject])

  const deleteRoom = useCallback((roomId: string) => {
    setProject(p => {
      const rooms = (p.scenario.rooms ?? []).filter(r => r.id !== roomId)
      const positions = { ...p.nodePositions }
      delete positions[roomId]
      const sizes = { ...p.nodeSizes }
      delete sizes[roomId]
      return {
        ...p,
        scenario: {
          ...p.scenario,
          rooms,
          start_room_id: p.scenario.start_room_id === roomId
            ? (rooms[0]?.id ?? '')
            : p.scenario.start_room_id,
        },
        nodePositions: positions,
        nodeSizes: sizes,
      }
    })
    setStateRaw(prev => ({
      ...prev,
      selectedRoomId: prev.selectedRoomId === roomId ? null : prev.selectedRoomId,
    }))
  }, [setProject])

  // Memo CRUD
  const addMemo = useCallback((pos: { x: number; y: number }) => {
    const memo: MemoData = { id: `memo-${Date.now()}`, text: '', color: '#fde047', position: pos, width: 200, height: 120 }
    setProject(p => ({ ...p, memos: [...(p.memos ?? []), memo] }))
    return memo.id
  }, [setProject])

  const updateMemo = useCallback((id: string, patch: Partial<MemoData>) => {
    setProject(p => ({ ...p, memos: (p.memos ?? []).map(m => m.id === id ? { ...m, ...patch } : m) }))
  }, [setProject])

  const deleteMemo = useCallback((id: string) => {
    setProject(p => ({ ...p, memos: (p.memos ?? []).filter(m => m.id !== id) }))
  }, [setProject])

  // Group CRUD
  const addGroup = useCallback((pos: { x: number; y: number }) => {
    const group: GroupData = { id: `group-${Date.now()}`, label: '그룹', position: pos, width: 300, height: 200, color: '#3b82f6' }
    setProject(p => ({ ...p, groups: [...(p.groups ?? []), group] }))
    return group.id
  }, [setProject])

  const updateGroup = useCallback((id: string, patch: Partial<GroupData>) => {
    setProject(p => ({ ...p, groups: (p.groups ?? []).map(g => g.id === id ? { ...g, ...patch } : g) }))
  }, [setProject])

  const deleteGroup = useCallback((id: string) => {
    setProject(p => ({ ...p, groups: (p.groups ?? []).filter(g => g.id !== id) }))
  }, [setProject])

  const updateHubMeta = useCallback((patch: Partial<HubMeta>) => {
    setProject(p => ({ ...p, hubMeta: { ...p.hubMeta, ...patch } }))
  }, [setProject])

  return {
    state,
    hydrated,
    scenario,
    nodePositions,
    nodeSizes,
    selectedRoomId: state.selectedRoomId,
    overlay: state.overlay,
    updateScenario,
    setNodePosition,
    setNodeSize,
    setSelectedRoom,
    setOverlay,
    addRoom,
    deleteRoom,
    updateHubMeta,
    memos,
    addMemo,
    updateMemo,
    deleteMemo,
    groups,
    addGroup,
    updateGroup,
    deleteGroup,
  }
}
