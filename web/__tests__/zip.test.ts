import { describe, it, expect } from 'vitest'
import { buildZip } from '../lib/zip'
import { unzipSync } from 'fflate'

describe('buildZip', () => {
  it('ZIP에 scenario.json과 scenario.dat이 포함된다', async () => {
    const jsonStr = '{"title":"테스트"}'
    const datBytes = new Uint8Array([1, 2, 3, 4])

    const zip = await buildZip(jsonStr, datBytes)
    const files = unzipSync(zip)

    expect(Object.keys(files)).toContain('scenario.json')
    expect(Object.keys(files)).toContain('scenario.dat')
  })

  it('scenario.json 내용이 일치한다', async () => {
    const jsonStr = '{"title":"테스트"}'
    const zip = await buildZip(jsonStr, new Uint8Array([1, 2, 3]))
    const files = unzipSync(zip)
    const decoded = new TextDecoder().decode(files['scenario.json'])
    expect(decoded).toBe(jsonStr)
  })

  it('scenario.dat 내용이 일치한다', async () => {
    const datBytes = new Uint8Array([0x4F, 0x43, 0x4C, 0x55])
    const zip = await buildZip('{}', datBytes)
    const files = unzipSync(zip)
    expect(Array.from(files['scenario.dat'].slice(0, 4))).toEqual([0x4F, 0x43, 0x4C, 0x55])
  })
})
