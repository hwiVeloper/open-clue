// web/lib/validator.ts
import type { Action, Scenario } from './schema'

function collectActions(action: Action | Action[] | null | undefined): Action[] {
  if (!action) return []
  return Array.isArray(action) ? action : [action]
}

function checkAction(
  action: Action,
  roomIds: Set<string>,
  itemIds: Set<string>,
  pointId: string,
): string[] {
  const errors: string[] = []
  if (action.type === 'get_item' && !itemIds.has(action.value as string)) {
    errors.push(`포인트 '${pointId}' get_item 값 '${action.value}'가 items에 없습니다.`)
  }
  if (action.type === 'move_to' && !roomIds.has(action.value as string)) {
    errors.push(`포인트 '${pointId}' move_to 값 '${action.value}'가 rooms에 없습니다.`)
  }
  return errors
}

export function validateScenario(scenario: Scenario): string[] {
  const errors: string[] = []
  const roomIds = new Set(scenario.rooms.map(r => r.id))
  const itemIds = new Set(scenario.items.map(i => i.id))

  if (!roomIds.has(scenario.start_room_id)) {
    errors.push(`start_room_id '${scenario.start_room_id}'가 rooms 목록에 없습니다.`)
  }

  const seenPointIds = new Set<string>()
  let hasGameClear = false

  for (const room of scenario.rooms) {
    for (const point of room.points) {
      if (seenPointIds.has(point.id)) {
        errors.push(`포인트 ID '${point.id}'가 중복됩니다.`)
      }
      seenPointIds.add(point.id)

      if (point.requirements?.item_id && !itemIds.has(point.requirements.item_id)) {
        errors.push(
          `포인트 '${point.id}' requirements.item_id '${point.requirements.item_id}'가 items에 없습니다.`
        )
      }

      for (const action of collectActions(point.action)) {
        errors.push(...checkAction(action, roomIds, itemIds, point.id))
        if (action.type === 'game_clear') hasGameClear = true
      }

      if (point.puzzle) {
        for (const action of collectActions(point.puzzle.on_success)) {
          errors.push(...checkAction(action, roomIds, itemIds, point.id))
          if (action.type === 'game_clear') hasGameClear = true
        }
      }
    }
  }

  if (!hasGameClear) {
    errors.push('game_clear 액션이 하나도 없습니다. 탈출 경로를 추가하세요.')
  }

  // Dead-end 탐지 (BFS)
  if (roomIds.has(scenario.start_room_id)) {
    const reachable = new Set<string>()
    const queue = [scenario.start_room_id]
    while (queue.length > 0) {
      const current = queue.shift()!
      if (reachable.has(current)) continue
      reachable.add(current)
      const room = scenario.rooms.find(r => r.id === current)
      if (!room) continue
      for (const point of room.points) {
        for (const action of [
          ...collectActions(point.action),
          ...collectActions(point.puzzle?.on_success),
        ]) {
          if (action.type === 'move_to' && !reachable.has(action.value as string)) {
            queue.push(action.value as string)
          }
        }
      }
    }
    for (const roomId of roomIds) {
      if (!reachable.has(roomId)) {
        errors.push(`방 '${roomId}'는 start_room에서 도달할 수 없는 고립 방입니다.`)
      }
    }
  }

  return errors
}
