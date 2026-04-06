// web/__tests__/schema.test.ts
import { describe, it, expect } from 'vitest'
import { ScenarioSchema, ActionSchema } from '../lib/schema'

describe('ScenarioSchema', () => {
  it('유효한 최소 시나리오를 파싱한다', () => {
    const data = {
      scenario_id: 'test',
      version: '1.0',
      title: '테스트',
      start_room_id: 'room1',
      rooms: [{
        id: 'room1',
        name: '방1',
        description: '설명',
        points: [{
          id: 'exit',
          name: '출구',
          description: '탈출',
          action: { type: 'game_clear', value: null },
        }],
      }],
    }
    const result = ScenarioSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('rooms가 비어 있으면 실패한다', () => {
    const data = {
      scenario_id: 'test',
      title: '테스트',
      start_room_id: 'room1',
      rooms: [],
    }
    const result = ScenarioSchema.safeParse(data)
    expect(result.success).toBe(false)
  })
})

describe('ActionSchema', () => {
  it('game_clear 타입을 파싱한다', () => {
    const result = ActionSchema.safeParse({ type: 'game_clear', value: null })
    expect(result.success).toBe(true)
  })

  it('알 수 없는 타입은 실패한다', () => {
    const result = ActionSchema.safeParse({ type: 'unknown' })
    expect(result.success).toBe(false)
  })
})
