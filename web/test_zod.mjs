import { z } from 'zod'

// Test what z.record accepts
try {
  const schema1 = z.record(z.unknown())
  console.log("z.record(z.unknown()) works:", true)
} catch (e) {
  console.log("z.record(z.unknown()) error:", e.message)
}

try {
  const schema2 = z.record(z.string(), z.unknown())
  console.log("z.record(z.string(), z.unknown()) works:", true)
} catch (e) {
  console.log("z.record(z.string(), z.unknown()) error:", e.message)
}
