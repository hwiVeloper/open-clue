// web/lib/zip.ts
import { zipSync, strToU8 } from 'fflate'

/**
 * JSON 문자열과 DAT 바이트를 받아 ZIP Uint8Array를 반환한다.
 */
export async function buildZip(jsonStr: string, datBytes: Uint8Array, builderMeta?: string): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = {
    'scenario.json': strToU8(jsonStr),
    'scenario.dat': datBytes,
  }
  if (builderMeta) {
    files['builder.json'] = strToU8(builderMeta)
  }
  return zipSync(files)
}
