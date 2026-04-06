// web/components/canvas/RoomCanvas.tsx
'use client'

import { useCallback, useEffect, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  BackgroundVariant,
  type Node,
  type Edge,
  type Connection,
} from '@xyflow/react'
import { RoomNode, type RoomNodeData } from './RoomNode'
import { EdgeWithDelete } from './EdgeWithDelete'
import type { Scenario, Point } from '../../lib/schema'
import type { NodePosition } from '../../lib/store'

const NODE_TYPES = { roomNode: RoomNode }
const EDGE_TYPES = { withDelete: EdgeWithDelete }

interface RoomCanvasProps {
  scenario: Partial<Scenario>
  nodePositions: Record<string, NodePosition>
  selectedRoomId: string | null
  onUpdateScenario: (patch: Partial<Scenario>) => void
  onSetNodePosition: (roomId: string, pos: NodePosition) => void
  onSelectRoom: (roomId: string | null) => void
  onAddRoom: (pos: NodePosition) => void
  onDeleteRoom: (roomId: string) => void
}

function computeNodes(
  scenario: Partial<Scenario>,
  nodePositions: Record<string, NodePosition>,
  selectedRoomId: string | null,
  onSelect: (id: string) => void,
  onDelete: (id: string) => void,
  onSetStart: (id: string) => void,
): Node[] {
  return (scenario.rooms ?? []).map((room, i) => ({
    id: room.id,
    type: 'roomNode',
    position: nodePositions[room.id] ?? { x: i * 220, y: 100 },
    data: {
      room,
      isStart: room.id === scenario.start_room_id,
      isSelected: room.id === selectedRoomId,
      onSelect: () => onSelect(room.id),
      onDelete: () => onDelete(room.id),
      onSetStart: () => onSetStart(room.id),
    } as RoomNodeData,
  }))
}

function computeEdges(
  scenario: Partial<Scenario>,
  onDelete: (sourceRoomId: string, pointId: string) => void,
): Edge[] {
  const rooms = scenario.rooms ?? []
  const edges: Edge[] = []
  for (const room of rooms) {
    for (const point of room.points) {
      const actions = Array.isArray(point.action) ? point.action : point.action ? [point.action] : []
      for (const action of actions) {
        if (action.type === 'move_to' && action.value) {
          const targetRoom = rooms.find(r => r.id === action.value)
          edges.push({
            id: `edge-${room.id}-${point.id}-${action.value}`,
            source: room.id,
            target: action.value as string,
            type: 'withDelete',
            data: {
              pointName: point.name || '이동',
              targetRoomName: targetRoom?.name || String(action.value),
              onDelete: () => onDelete(room.id, point.id),
            },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#52525b' },
            style: { stroke: '#52525b' },
          })
        }
      }
    }
  }
  return edges
}

export function RoomCanvas({
  scenario,
  nodePositions,
  selectedRoomId,
  onUpdateScenario,
  onSetNodePosition,
  onSelectRoom,
  onAddRoom,
  onDeleteRoom,
}: RoomCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  // 최신 scenario를 ref로 유지 — 엣지 콜백의 stale closure 방지
  const scenarioRef = useRef(scenario)
  scenarioRef.current = scenario

  const onDeleteEdge = useCallback((sourceRoomId: string, pointId: string) => {
    const rooms = (scenarioRef.current.rooms ?? []).map(r =>
      r.id !== sourceRoomId ? r : { ...r, points: r.points.filter(p => p.id !== pointId) }
    )
    onUpdateScenario({ rooms })
  }, [onUpdateScenario])

  useEffect(() => {
    setNodes(computeNodes(
      scenario, nodePositions, selectedRoomId,
      onSelectRoom, onDeleteRoom,
      (id) => onUpdateScenario({ start_room_id: id }),
    ))
    setEdges(computeEdges(scenario, onDeleteEdge))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.rooms, scenario.start_room_id, selectedRoomId, nodePositions, onDeleteEdge])

  const onNodeDragStop = useCallback((_: React.MouseEvent, node: Node) => {
    onSetNodePosition(node.id, node.position)
  }, [onSetNodePosition])

  const onConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target) return
    const rooms = scenario.rooms ?? []
    const targetRoom = rooms.find(r => r.id === params.target)
    if (!targetRoom) return
    const newPoint: Point = {
      id: `link-${params.source}-to-${params.target}-${Date.now()}`,
      name: `${targetRoom.name}(으)로 이동`,
      description: '',
      hidden: false,
      action: { type: 'move_to', value: params.target },
    }
    onUpdateScenario({
      rooms: rooms.map(r =>
        r.id === params.source ? { ...r, points: [...r.points, newPoint] } : r
      ),
    })
  }, [scenario.rooms, onUpdateScenario])

  // Delete 키로 엣지 선택 삭제 시 대응 포인트 제거
  const onEdgesDelete = useCallback((deletedEdges: Edge[]) => {
    let rooms = [...(scenarioRef.current.rooms ?? [])]
    for (const edge of deletedEdges) {
      const targetId = edge.target
      rooms = rooms.map(r => {
        if (r.id !== edge.source) return r
        return {
          ...r,
          points: r.points.filter(p => {
            const actions = Array.isArray(p.action) ? p.action : p.action ? [p.action] : []
            return !actions.some(a => a.type === 'move_to' && a.value === targetId)
          }),
        }
      })
    }
    onUpdateScenario({ rooms })
  }, [onUpdateScenario])

  const onWrapperDoubleClick = useCallback((event: React.MouseEvent) => {
    // Only fire when clicking directly on the pane (not on a node)
    const target = event.target as HTMLElement
    const isPane = target.classList.contains('react-flow__pane') ||
      target.classList.contains('react-flow__renderer')
    if (!isPane) return
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const pos = {
      x: event.clientX - bounds.left - 70,
      y: event.clientY - bounds.top - 40,
    }
    onAddRoom(pos)
  }, [onAddRoom])

  const onPaneClick = useCallback(() => {
    onSelectRoom(null)
  }, [onSelectRoom])

  return (
    <div className="w-full h-full relative" onDoubleClick={onWrapperDoubleClick}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onPaneClick={onPaneClick}
        deleteKeyCode="Delete"
        colorMode="dark"
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
      >
        <Background variant={BackgroundVariant.Dots} color="#3f3f46" gap={20} />
        <Controls />
        <MiniMap
          nodeColor="#3f3f46"
          maskColor="rgba(9,9,11,0.7)"
          style={{ background: '#18181b', border: '1px solid #3f3f46' }}
        />
      </ReactFlow>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-zinc-600 pointer-events-none select-none">
        더블클릭 → 방 추가 · 핸들 드래그 → 연결 · Delete → 삭제
      </div>
    </div>
  )
}
