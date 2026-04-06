// web/lib/store.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Scenario, Room, Item } from './schema'

const STORAGE_KEY = 'openclue_builder_draft'

export type NodePosition = { x: number; y: number }

export type BuilderState = {
  scenario: Partial<Scenario>
  nodePositions: Record<string, NodePosition>
  selectedRoomId: string | null
  overlay: 'verify' | 'export' | null
}

const DEFAULT_STATE: BuilderState = {
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
  selectedRoomId: null,
  overlay: null,
}

export function useBuilderStore() {
  const [state, setStateRaw] = useState<BuilderState>(DEFAULT_STATE)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // 구버전 호환: currentStep/editingRoomId 필드 무시
        setStateRaw({
          scenario: parsed.scenario ?? DEFAULT_STATE.scenario,
          nodePositions: parsed.nodePositions ?? {},
          selectedRoomId: null,
          overlay: null,
        })
      }
    } catch {}
    setHydrated(true)
  }, [])

  const setState = useCallback((updater: (prev: BuilderState) => BuilderState) => {
    setStateRaw(prev => {
      const next = updater(prev)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  const updateScenario = useCallback((patch: Partial<Scenario>) => {
    setState(prev => ({
      ...prev,
      scenario: { ...prev.scenario, ...patch },
    }))
  }, [setState])

  const setNodePosition = useCallback((roomId: string, pos: NodePosition) => {
    setState(prev => ({
      ...prev,
      nodePositions: { ...prev.nodePositions, [roomId]: pos },
    }))
  }, [setState])

  const setSelectedRoom = useCallback((roomId: string | null) => {
    setState(prev => ({ ...prev, selectedRoomId: roomId }))
  }, [setState])

  const setOverlay = useCallback((overlay: BuilderState['overlay']) => {
    setState(prev => ({ ...prev, overlay }))
  }, [setState])

  const addRoom = useCallback((pos: NodePosition) => {
    const id = `room-${Date.now()}`
    setState(prev => ({
      ...prev,
      scenario: {
        ...prev.scenario,
        rooms: [
          ...(prev.scenario.rooms ?? []),
          { id, name: '새 방', description: '', points: [], npcs: [] },
        ],
        start_room_id: (prev.scenario.rooms?.length ?? 0) === 0 ? id : prev.scenario.start_room_id,
      },
      nodePositions: { ...prev.nodePositions, [id]: pos },
    }))
    return id
  }, [setState])

  const deleteRoom = useCallback((roomId: string) => {
    setState(prev => {
      const rooms = (prev.scenario.rooms ?? []).filter(r => r.id !== roomId)
      const positions = { ...prev.nodePositions }
      delete positions[roomId]
      return {
        ...prev,
        scenario: {
          ...prev.scenario,
          rooms,
          start_room_id: prev.scenario.start_room_id === roomId
            ? (rooms[0]?.id ?? '')
            : prev.scenario.start_room_id,
        },
        nodePositions: positions,
        selectedRoomId: prev.selectedRoomId === roomId ? null : prev.selectedRoomId,
      }
    })
  }, [setState])

  const loadScenario = useCallback((scenario: Scenario) => {
    setState(_ => ({
      scenario,
      nodePositions: {},
      selectedRoomId: null,
      overlay: null,
    }))
  }, [setState])

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setStateRaw(DEFAULT_STATE)
  }, [])

  return {
    state,
    hydrated,
    updateScenario,
    setNodePosition,
    setSelectedRoom,
    setOverlay,
    addRoom,
    deleteRoom,
    loadScenario,
    reset,
  }
}
