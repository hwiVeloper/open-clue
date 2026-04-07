// web/components/canvas/RoomCanvas.tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
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
import type { RoomSize } from '../../lib/projects'

const NODE_TYPES = { roomNode: RoomNode }
const EDGE_TYPES = { withDelete: EdgeWithDelete }

type PendingConnection = {
  sourceRoomId: string
  targetRoomId: string
}

interface RoomCanvasProps {
  scenario: Partial<Scenario>
  nodePositions: Record<string, NodePosition>
  nodeSizes: Record<string, RoomSize>
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
  nodeSizes: Record<string, RoomSize>,
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
      size: nodeSizes[room.id] ?? 'M',
      isStart: room.id === scenario.start_room_id,
      isSelected: room.id === selectedRoomId,
      onSelect: () => onSelect(room.id),
      onDelete: () => onDelete(room.id),
      onSetStart: () => onSetStart(room.id),
    } as RoomNodeData,
  }))
}

function collectMoveToActions(point: Point) {
  const actions = Array.isArray(point.action) ? point.action : point.action ? [point.action] : []
  if (point.puzzle) {
    const onSuccess = point.puzzle.on_success
    const puzzleActions = Array.isArray(onSuccess) ? onSuccess : onSuccess ? [onSuccess] : []
    actions.push(...puzzleActions)
  }
  return actions.filter(a => a.type === 'move_to' && a.value)
}

function computeEdges(
  scenario: Partial<Scenario>,
  onDelete: (sourceRoomId: string, pointId: string) => void,
): Edge[] {
  const rooms = scenario.rooms ?? []
  const edges: Edge[] = []
  for (const room of rooms) {
    for (const point of room.points) {
      for (const action of collectMoveToActions(point)) {
        const targetRoom = rooms.find(r => r.id === action.value)
        edges.push({
          id: `edge-${room.id}-${point.id}-${action.value}`,
          source: room.id,
          target: action.value as string,
          type: 'withDelete',
          data: {
            pointName: point.name || '(이름 없음)',
            targetRoomName: targetRoom?.name || String(action.value),
            onDelete: () => onDelete(room.id, point.id),
          },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#52525b' },
          style: { stroke: '#52525b' },
        })
      }
    }
  }
  return edges
}

export function RoomCanvas({
  scenario,
  nodePositions,
  nodeSizes,
  selectedRoomId,
  onUpdateScenario,
  onSetNodePosition,
  onSelectRoom,
  onAddRoom,
  onDeleteRoom,
}: RoomCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null)

  // 최신 scenario를 ref로 유지 — 콜백의 stale closure 방지
  const scenarioRef = useRef(scenario)
  scenarioRef.current = scenario

  // 엣지 ✕ 또는 Delete 키: move_to 액션만 제거 (포인트 자체는 유지)
  const onDeleteEdge = useCallback((sourceRoomId: string, pointId: string) => {
    const rooms = (scenarioRef.current.rooms ?? []).map(r =>
      r.id !== sourceRoomId ? r : {
        ...r,
        points: r.points.map(p =>
          p.id !== pointId ? p : { ...p, action: null }
        ),
      }
    )
    onUpdateScenario({ rooms })
  }, [onUpdateScenario])

  useEffect(() => {
    setNodes(computeNodes(
      scenario, nodePositions, nodeSizes, selectedRoomId,
      onSelectRoom, onDeleteRoom,
      (id) => onUpdateScenario({ start_room_id: id }),
    ))
    setEdges(computeEdges(scenario, onDeleteEdge))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.rooms, scenario.start_room_id, selectedRoomId, nodePositions, nodeSizes, onDeleteEdge])

  const onNodeDragStop = useCallback((_: React.MouseEvent, node: Node) => {
    onSetNodePosition(node.id, node.position)
  }, [onSetNodePosition])

  // 방 연결 드래그: 즉시 포인트 생성하지 않고 피커를 띄움
  const onConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target) return
    if (params.source === params.target) return
    setPendingConnection({ sourceRoomId: params.source, targetRoomId: params.target })
  }, [])

  // Delete 키로 엣지 선택 삭제
  const onEdgesDelete = useCallback((deletedEdges: Edge[]) => {
    let rooms = [...(scenarioRef.current.rooms ?? [])]
    for (const edge of deletedEdges) {
      const targetId = edge.target
      rooms = rooms.map(r => {
        if (r.id !== edge.source) return r
        return {
          ...r,
          points: r.points.map(p => {
            const actions = Array.isArray(p.action) ? p.action : p.action ? [p.action] : []
            if (actions.some(a => a.type === 'move_to' && a.value === targetId)) {
              return { ...p, action: null }
            }
            return p
          }),
        }
      })
    }
    onUpdateScenario({ rooms })
  }, [onUpdateScenario])

  // 피커: 기존 포인트에 move_to 할당
  const assignMoveTo = useCallback((pointId: string) => {
    if (!pendingConnection) return
    const { sourceRoomId, targetRoomId } = pendingConnection
    const rooms = (scenarioRef.current.rooms ?? []).map(r =>
      r.id !== sourceRoomId ? r : {
        ...r,
        points: r.points.map(p =>
          p.id !== pointId ? p : { ...p, action: { type: 'move_to' as const, value: targetRoomId } }
        ),
      }
    )
    onUpdateScenario({ rooms })
    setPendingConnection(null)
  }, [pendingConnection, onUpdateScenario])

  // 피커: 새 포인트 생성 후 move_to 할당
  const createAndAssignMoveTo = useCallback(() => {
    if (!pendingConnection) return
    const { sourceRoomId, targetRoomId } = pendingConnection
    const newPoint: Point = {
      id: `point-${Date.now()}`,
      name: '',
      description: '',
      hidden: false,
      action: { type: 'move_to', value: targetRoomId },
    }
    const rooms = (scenarioRef.current.rooms ?? []).map(r =>
      r.id !== sourceRoomId ? r : { ...r, points: [...r.points, newPoint] }
    )
    onUpdateScenario({ rooms })
    setPendingConnection(null)
  }, [pendingConnection, onUpdateScenario])

  const { screenToFlowPosition } = useReactFlow()

  const onPaneDoubleClick = useCallback((event: React.MouseEvent) => {
    const pos = screenToFlowPosition({ x: event.clientX, y: event.clientY })
    onAddRoom({ x: pos.x - 70, y: pos.y - 20 })
  }, [onAddRoom, screenToFlowPosition])

  const onPaneClick = useCallback(() => {
    onSelectRoom(null)
  }, [onSelectRoom])

  // 피커에 필요한 정보
  const pickerSourceRoom = pendingConnection
    ? scenario.rooms?.find(r => r.id === pendingConnection.sourceRoomId)
    : null
  const pickerTargetRoom = pendingConnection
    ? scenario.rooms?.find(r => r.id === pendingConnection.targetRoomId)
    : null

  return (
    <div className="w-full h-full relative">
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
        onDoubleClick={onPaneDoubleClick}
        zoomOnDoubleClick={false}
        colorMode="dark"
        deleteKeyCode="Delete"
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

      {/* 연결 포인트 피커 */}
      {pendingConnection && pickerSourceRoom && pickerTargetRoom && (
        <div
          className="absolute inset-0 flex items-center justify-center z-20 bg-black/50"
          onClick={() => setPendingConnection(null)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl p-4 w-80"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-3">
              <div className="text-xs text-zinc-500 mb-1">방 이동 연결</div>
              <div className="text-sm text-white">
                <span className="text-zinc-300">{pickerSourceRoom.name}</span>
                <span className="text-zinc-600 mx-2">→</span>
                <span className="text-green-400">{pickerTargetRoom.name}</span>
              </div>
              <div className="text-xs text-zinc-500 mt-1">어느 조사 지점에서 이동합니까?</div>
            </div>

            <div className="space-y-1 max-h-52 overflow-y-auto mb-3">
              {pickerSourceRoom.points.map(point => {
                const moveToActions = collectMoveToActions(point)
                const currentMoveTo = moveToActions.length > 0
                  ? scenario.rooms?.find(r => r.id === moveToActions[0].value)
                  : null
                return (
                  <button
                    key={point.id}
                    onClick={() => assignMoveTo(point.id)}
                    className="w-full text-left px-3 py-2 rounded text-sm hover:bg-zinc-800 transition-colors group"
                  >
                    <span className="text-zinc-200 group-hover:text-white">
                      {point.name || '(이름 없음)'}
                    </span>
                    {currentMoveTo && (
                      <span className="text-xs text-zinc-600 ml-2">
                        현재 → {currentMoveTo.name}
                      </span>
                    )}
                  </button>
                )
              })}

              {pickerSourceRoom.points.length === 0 && (
                <div className="text-xs text-zinc-600 py-3 text-center">
                  조사 지점이 없습니다
                </div>
              )}
            </div>

            <div className="border-t border-zinc-800 pt-3 flex items-center justify-between">
              <button
                onClick={createAndAssignMoveTo}
                className="text-xs text-green-500 hover:text-green-400 px-2 py-1 rounded border border-dashed border-green-900 hover:border-green-700"
              >
                + 새 지점으로 연결
              </button>
              <button
                onClick={() => setPendingConnection(null)}
                className="text-xs text-zinc-500 hover:text-zinc-300 px-3 py-1"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-zinc-600 pointer-events-none select-none">
        더블클릭 → 방 추가 · 핸들 드래그 → 연결 · Delete → 삭제
      </div>
    </div>
  )
}
