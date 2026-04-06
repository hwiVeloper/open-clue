'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Scenario, Room, Item } from './schema'

const STORAGE_KEY = 'openclue_builder_draft'

export type BuilderState = {
  scenario: Partial<Scenario>
  currentStep: number  // 0~4
  editingRoomId: string | null
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
  currentStep: 0,
  editingRoomId: null,
}

export function useBuilderStore() {
  const [state, setStateRaw] = useState<BuilderState>(DEFAULT_STATE)
  const [hydrated, setHydrated] = useState(false)

  // localStorage에서 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        setStateRaw(JSON.parse(saved))
      }
    } catch {}
    setHydrated(true)
  }, [])

  // 상태 변경 시 localStorage 저장
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

  const setStep = useCallback((step: number) => {
    setState(prev => ({ ...prev, currentStep: step }))
  }, [setState])

  const setEditingRoom = useCallback((roomId: string | null) => {
    setState(prev => ({ ...prev, editingRoomId: roomId }))
  }, [setState])

  const loadScenario = useCallback((scenario: Scenario) => {
    setState(_ => ({ scenario, currentStep: 0, editingRoomId: null }))
  }, [setState])

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setStateRaw(DEFAULT_STATE)
  }, [])

  return { state, hydrated, updateScenario, setStep, setEditingRoom, loadScenario, reset }
}
