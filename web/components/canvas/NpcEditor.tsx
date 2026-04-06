// web/components/canvas/NpcEditor.tsx
'use client'

import { Input, Textarea } from '../ui/Input'
import type { Npc, NpcLine, Room, Scenario } from '../../lib/schema'

interface NpcEditorProps {
  room: Room
  scenario: Partial<Scenario>
  onUpdateRoom: (patch: Partial<Room>) => void
}

function newNpc(): Npc {
  return {
    id: `npc-${Date.now()}`,
    name: '',
    description: '',
    lines: [{ text: '', condition: null }],
  }
}

function newLine(): NpcLine {
  return { text: '', condition: null }
}

export function NpcEditor({ room, scenario, onUpdateRoom }: NpcEditorProps) {
  const npcs = room.npcs ?? []

  const updateNpc = (idx: number, patch: Partial<Npc>) => {
    onUpdateRoom({ npcs: npcs.map((n, i) => i === idx ? { ...n, ...patch } : n) })
  }

  const deleteNpc = (idx: number) => {
    onUpdateRoom({ npcs: npcs.filter((_, i) => i !== idx) })
  }

  const updateLine = (npcIdx: number, lineIdx: number, patch: Partial<NpcLine>) => {
    const lines = npcs[npcIdx].lines.map((l, i) => i === lineIdx ? { ...l, ...patch } : l)
    updateNpc(npcIdx, { lines })
  }

  const deleteLine = (npcIdx: number, lineIdx: number) => {
    updateNpc(npcIdx, { lines: npcs[npcIdx].lines.filter((_, i) => i !== lineIdx) })
  }

  const flagKeys = Object.keys(scenario.flags ?? {})

  return (
    <div className="space-y-3">
      {npcs.map((npc, ni) => (
        <div key={npc.id} className="bg-zinc-900 border border-purple-900/40 rounded p-2 space-y-2">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-purple-400">👤</span>
            <Input
              value={npc.name}
              onChange={e => updateNpc(ni, { name: e.target.value })}
              placeholder="NPC 이름"
              className="text-xs flex-1"
            />
            <button
              onClick={() => deleteNpc(ni)}
              className="text-zinc-600 hover:text-red-400 text-xs px-1"
            >✕</button>
          </div>
          <Input
            value={npc.description}
            onChange={e => updateNpc(ni, { description: e.target.value })}
            placeholder="외형 묘사"
            className="text-xs"
          />
          <Input
            value={npc.id}
            onChange={e => updateNpc(ni, { id: e.target.value })}
            placeholder="npc-id"
            className="text-[10px] font-mono"
          />

          {/* 대사 목록 */}
          <div className="space-y-1 pl-2 border-l border-purple-900/30">
            <div className="text-[10px] text-zinc-500">대사</div>
            {npc.lines.map((line, li) => (
              <div key={li} className="space-y-1 bg-zinc-950 rounded p-1.5">
                <div className="flex gap-1 items-center">
                  <Textarea
                    value={line.text}
                    onChange={e => updateLine(ni, li, { text: e.target.value })}
                    placeholder="대사 내용..."
                    className="text-xs flex-1"
                  />
                  <button
                    onClick={() => deleteLine(ni, li)}
                    className="text-zinc-600 hover:text-red-400 text-[10px] px-1 self-start"
                  >✕</button>
                </div>
                {/* 조건 (플래그) */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!line.condition?.flag}
                    onChange={e => updateLine(ni, li, {
                      condition: e.target.checked ? { flag: { [flagKeys[0] ?? 'flag']: true } } : null
                    })}
                    className="accent-purple-500"
                  />
                  <span className="text-[10px] text-zinc-500">플래그 조건</span>
                  {line.condition?.flag && (
                    <input
                      className="bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-[10px] font-mono flex-1"
                      placeholder='{"key": true}'
                      value={JSON.stringify(line.condition.flag)}
                      onChange={e => {
                        try { updateLine(ni, li, { condition: { flag: JSON.parse(e.target.value) } }) }
                        catch { /* 무시 */ }
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
            <button
              onClick={() => updateNpc(ni, { lines: [...npc.lines, newLine()] })}
              className="text-[10px] text-zinc-500 hover:text-purple-400 px-2 py-0.5 rounded border border-dashed border-zinc-800 hover:border-purple-800 w-full"
            >+ 대사 추가</button>
          </div>
        </div>
      ))}

      <button
        onClick={() => onUpdateRoom({ npcs: [...npcs, newNpc()] })}
        className="text-xs text-zinc-500 hover:text-purple-400 px-2 py-1 rounded border border-dashed border-zinc-800 hover:border-purple-800 w-full"
      >+ NPC 추가</button>
    </div>
  )
}
