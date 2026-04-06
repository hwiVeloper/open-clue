import { describe, it, expect } from 'vitest'
import { buildDat, MAGIC_BYTES } from '../lib/cipher'

describe('buildDat', () => {
  it('DAT 헤더가 올바른 MAGIC으로 시작한다', async () => {
    const dat = await buildDat('{"test": true}')
    expect(Array.from(dat.slice(0, 4))).toEqual([0x4F, 0x43, 0x4C, 0x55])
  })

  it('VERSION 바이트가 0x0001이다', async () => {
    const dat = await buildDat('{"test": true}')
    expect(dat[4]).toBe(0x00)
    expect(dat[5]).toBe(0x01)
  })

  it('NONCE가 12바이트다', async () => {
    const dat = await buildDat('{"test": true}')
    const nonce = dat.slice(6, 18)
    expect(nonce.length).toBe(12)
  })

  it('TAG가 16바이트다 (헤더 기준 offset 18)', async () => {
    const dat = await buildDat('{"test": true}')
    const tag = dat.slice(18, 34)
    expect(tag.length).toBe(16)
  })

  it('같은 평문으로 두 번 호출하면 다른 결과가 나온다 (nonce 랜덤)', async () => {
    const a = await buildDat('{"test": true}')
    const b = await buildDat('{"test": true}')
    expect(Array.from(a)).not.toEqual(Array.from(b))
  })

  it('MAGIC_BYTES를 올바르게 export한다', () => {
    expect(Array.from(MAGIC_BYTES)).toEqual([0x4F, 0x43, 0x4C, 0x55])
  })
})
