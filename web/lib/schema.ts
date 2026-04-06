// web/lib/schema.ts
import { z } from 'zod'

export const ActionSchema = z.object({
  type: z.enum(['get_item', 'set_flag', 'move_to', 'game_clear']),
  value: z.unknown().optional().nullable(),
})

export const RequirementsSchema = z.object({
  item_id: z.string().optional().nullable(),
  flag: z.record(z.unknown()).optional().nullable(),
  solved_puzzle: z.string().optional().nullable(),
})

export const PuzzleSchema = z.object({
  type: z.enum(['text_input', 'key_sequence', 'timer']).default('text_input'),
  question: z.string(),
  hint: z.string().optional().nullable(),
  answer_hash: z.string(),
  max_attempts: z.number().int().positive().optional().nullable(),
  time_limit_seconds: z.number().int().positive().optional().nullable(),
  fail_message: z.string().optional().nullable(),
  on_success: z.union([ActionSchema, z.array(ActionSchema)]),
})

export const PointSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  hidden: z.boolean().default(false),
  requirements: RequirementsSchema.optional().nullable(),
  observation: z.string().optional().nullable(),
  action: z.union([ActionSchema, z.array(ActionSchema)]).optional().nullable(),
  puzzle: PuzzleSchema.optional().nullable(),
})

export const RoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  points: z.array(PointSchema).default([]),
})

export const ItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  usable_on: z.array(z.string()).default([]),
})

export const ScenarioSchema = z.object({
  scenario_id: z.string(),
  version: z.string().default('1.0'),
  title: z.string(),
  author: z.string().optional().nullable(),
  difficulty: z.number().int().min(1).max(5).optional().nullable(),
  estimated_minutes: z.number().int().positive().optional().nullable(),
  start_room_id: z.string(),
  flags: z.record(z.unknown()).default({}),
  items: z.array(ItemSchema).default([]),
  rooms: z.array(RoomSchema).min(1, '방이 최소 1개 있어야 합니다.'),
})

export type Action = z.infer<typeof ActionSchema>
export type Requirements = z.infer<typeof RequirementsSchema>
export type Puzzle = z.infer<typeof PuzzleSchema>
export type Point = z.infer<typeof PointSchema>
export type Room = z.infer<typeof RoomSchema>
export type Item = z.infer<typeof ItemSchema>
export type Scenario = z.infer<typeof ScenarioSchema>
