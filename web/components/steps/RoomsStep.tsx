// web/components/steps/RoomsStep.tsx
'use client'

import { Button } from '../ui/Button'
import { Input, Label } from '../ui/Input'
import type { Room, Scenario } from '../../lib/schema'

interface RoomsStepProps {
  scenario: Partial<Scenario>
  onChange: (patch: Partial<Scenario>) => void
  onEditRoom: (roomId: string) => void
  onPrev: () => void
  onNext: () => void
}

function newRoom(): Room {
  return {
    id: `room-${Date.now()}`,
    name: '',
    description: '',
    points: [],
  }
}

export function RoomsStep({ scenario, onChange, onEditRoom, onPrev, onNext }: RoomsStepProps) {
  const rooms = scenario.rooms ?? []

  const addRoom = () => {
    const room = newRoom()
    onChange({ rooms: [...rooms, room] })
  }

  const updateRoom = (index: number, patch: Partial<Room>) => {
    const next = rooms.map((r, i) => i === index ? { ...r, ...patch } : r)
    onChange({ rooms: next })
  }

  const deleteRoom = (index: number) => {
    const next = rooms.filter((_, i) => i !== index)
    const startStillExists = next.some(r => r.id === scenario.start_room_id)
    onChange({
      rooms: next,
      start_room_id: startStillExists ? scenario.start_room_id : (next[0]?.id ?? ''),
    })
  }

  const canNext = rooms.length > 0 && rooms.every(r => r.name.trim()) && !!scenario.start_room_id

  return (
    <div className="max-w-xl space-y-5">
      <h2 className="text-lg font-semibold text-white">② 방 목록</h2>

      {rooms.length === 0 && (
        <p className="text-zinc-500 text-sm">방이 없습니다. 방을 추가해주세요.</p>
      )}

      <div className="space-y-3">
        {rooms.map((room, i) => (
          <div key={room.id} className="bg-zinc-900 border border-zinc-700 rounded p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="start_room"
                checked={scenario.start_room_id === room.id}
                onChange={() => onChange({ start_room_id: room.id })}
                className="accent-green-500"
                title="시작 방으로 지정"
              />
              <span className="text-xs text-zinc-500">시작 방</span>
              <div className="flex-1">
                <Input
                  placeholder="방 이름"
                  value={room.name}
                  onChange={e => updateRoom(i, { name: e.target.value })}
                />
              </div>
              <Button variant="secondary" onClick={() => onEditRoom(room.id)} className="shrink-0">
                편집
              </Button>
              <Button variant="danger" onClick={() => deleteRoom(i)} className="shrink-0">
                ×
              </Button>
            </div>
            <Input
              placeholder="방 설명"
              value={room.description}
              onChange={e => updateRoom(i, { description: e.target.value })}
            />
            <p className="text-xs text-zinc-600">포인트 {room.points.length}개</p>
          </div>
        ))}
      </div>

      <Button variant="secondary" onClick={addRoom}>+ 방 추가</Button>

      <div className="flex gap-3 pt-2">
        <Button variant="ghost" onClick={onPrev}>← 이전</Button>
        <Button onClick={onNext} disabled={!canNext}>다음 →</Button>
      </div>
    </div>
  )
}
