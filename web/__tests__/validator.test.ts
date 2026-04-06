// web/__tests__/validator.test.ts
import { describe, it, expect } from 'vitest'
import { validateScenario } from '../lib/validator'
import type { Scenario } from '../lib/schema'

function baseScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    scenario_id: 'test',
    version: '1.0',
    title: '테스트',
    start_room_id: 'room1',
    flags: {},
    items: [{ id: 'key', name: '열쇠', description: '녹슨 열쇠', usable_on: [] }],
    rooms: [{
      id: 'room1',
      name: '방1',
      description: '출발 방',
      points: [{
        id: 'exit',
        name: '출구',
        description: '탈출',
        hidden: false,
        action: { type: 'game_clear', value: null },
      }],
    }],
    ...overrides,
  }
}

describe('validateScenario', () => {
  it('유효한 시나리오는 빈 배열을 반환한다', () => {
    expect(validateScenario(baseScenario())).toEqual([])
  })

  it('잘못된 start_room_id를 감지한다', () => {
    const errors = validateScenario(baseScenario({ start_room_id: 'nonexistent' }))
    expect(errors.some(e => e.includes('start_room_id'))).toBe(true)
  })

  it('포인트 ID 중복을 감지한다', () => {
    const scenario = baseScenario()
    scenario.rooms[0].points.push({ ...scenario.rooms[0].points[0] })
    const errors = validateScenario(scenario)
    expect(errors.some(e => e.includes('중복'))).toBe(true)
  })

  it('존재하지 않는 requirements.item_id를 감지한다', () => {
    const scenario = baseScenario()
    scenario.rooms[0].points.push({
      id: 'door',
      name: '문',
      description: '잠긴 문',
      hidden: false,
      requirements: { item_id: 'ghost_item' },
    })
    const errors = validateScenario(scenario)
    expect(errors.some(e => e.includes('ghost_item'))).toBe(true)
  })

  it('game_clear 액션이 없으면 감지한다', () => {
    const scenario = baseScenario()
    scenario.rooms[0].points = [{
      id: 'note',
      name: '메모',
      description: '쪽지',
      hidden: false,
      observation: '아무것도 없다.',
    }]
    const errors = validateScenario(scenario)
    expect(errors.some(e => e.includes('game_clear'))).toBe(true)
  })

  it('move_to로 존재하지 않는 방을 감지한다', () => {
    const scenario = baseScenario()
    scenario.rooms[0].points.push({
      id: 'portal',
      name: '포털',
      description: '어딘가로',
      hidden: false,
      action: { type: 'move_to', value: 'ghost_room' },
    })
    const errors = validateScenario(scenario)
    expect(errors.some(e => e.includes('ghost_room'))).toBe(true)
  })

  it('고립된 방(dead-end)을 감지한다', () => {
    const scenario = baseScenario()
    scenario.rooms.push({
      id: 'isolated',
      name: '고립된 방',
      description: '아무도 못 온다',
      points: [],
    })
    const errors = validateScenario(scenario)
    expect(errors.some(e => e.includes('isolated') && e.includes('고립'))).toBe(true)
  })

  it('move_to로 도달 가능한 방은 dead-end 오류가 없다', () => {
    const scenario = baseScenario()
    scenario.rooms[0].points.push({
      id: 'passage',
      name: '통로',
      description: '방2로',
      hidden: false,
      action: { type: 'move_to', value: 'room2' },
    })
    scenario.rooms.push({
      id: 'room2',
      name: '방2',
      description: '도달 가능',
      points: [],
    })
    const errors = validateScenario(scenario)
    expect(errors.filter(e => e.includes('고립'))).toEqual([])
  })
})
