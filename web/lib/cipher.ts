// web/lib/cipher.ts

// DAT 포맷: MAGIC(4B) | VERSION(2B BE) | NONCE(12B) | TAG(16B) | CIPHERTEXT
// Python encrypt.py와 동일한 포맷 유지

export const MAGIC_BYTES = new Uint8Array([0x4F, 0x43, 0x4C, 0x55]) // "OCLU"
const VERSION_BYTES = new Uint8Array([0x00, 0x01])                   // uint16 BE = 1
const KEY_STRING = 'OpenClue-Secret-Key-32bytes!!!!!'               // 32 bytes

async function getKey(): Promise<CryptoKey> {
  const keyBytes = new TextEncoder().encode(KEY_STRING)
  return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt'])
}

/**
 * plain: 접두사가 붙은 answer_hash를 SHA-256 hex digest로 변환한다.
 * 예: "plain:1234" → sha256("1234")
 */
async function hashPlain(plain: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain))
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function processPlainAnswers(jsonStr: string): Promise<string> {
  let result = jsonStr

  // 단일 문자열: "answer_hash": "plain:xxx"
  const singleRegex = /"answer_hash":\s*"plain:([^"]+)"/g
  const singleMatches = [...result.matchAll(singleRegex)]
  for (const match of singleMatches) {
    const hex = await hashPlain(match[1])
    result = result.replace(match[0], `"answer_hash": "${hex}"`)
  }

  // 배열: "answer_hash": ["plain:a", "plain:b"]
  const arrayRegex = /"answer_hash":\s*\[([^\]]+)\]/g
  const arrayMatches = [...result.matchAll(arrayRegex)]
  for (const match of arrayMatches) {
    const itemRegex = /"plain:([^"]+)"/g
    let items = match[1]
    const itemMatches = [...items.matchAll(itemRegex)]
    for (const im of itemMatches) {
      const hex = await hashPlain(im[1])
      items = items.replace(im[0], `"${hex}"`)
    }
    result = result.replace(match[0], `"answer_hash": [${items}]`)
  }

  return result
}

/**
 * 시나리오 JSON 문자열을 AES-256-GCM으로 암호화하여 DAT 바이트를 반환한다.
 */
export async function buildDat(jsonStr: string): Promise<Uint8Array> {
  const processed = await processPlainAnswers(jsonStr)
  const plaintext = new TextEncoder().encode(processed)

  const key = await getKey()
  const nonce = crypto.getRandomValues(new Uint8Array(12))

  // AES-GCM encrypt 결과: ciphertext || tag (tag은 마지막 16바이트)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 },
    key,
    plaintext,
  )

  const encBytes = new Uint8Array(encrypted)
  const ciphertext = encBytes.slice(0, -16)
  const tag = encBytes.slice(-16)

  // MAGIC(4) + VERSION(2) + NONCE(12) + TAG(16) + CIPHERTEXT
  const dat = new Uint8Array(4 + 2 + 12 + 16 + ciphertext.length)
  let offset = 0
  dat.set(MAGIC_BYTES, offset); offset += 4
  dat.set(VERSION_BYTES, offset); offset += 2
  dat.set(nonce, offset); offset += 12
  dat.set(tag, offset); offset += 16
  dat.set(ciphertext, offset)

  return dat
}
