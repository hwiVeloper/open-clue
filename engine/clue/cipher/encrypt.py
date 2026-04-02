from __future__ import annotations

import hashlib
import json
import re
import struct
from pathlib import Path

from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes

# 32-byte 고정 키 (MVP)
_KEY = b"OpenClue-Secret-Key-32bytes!!!!!"

MAGIC = b"OCLU"
VERSION = 1


def _hash_answer(answer: str) -> str:
    return hashlib.sha256(answer.encode()).hexdigest()


def _process_plain_answers(data: dict) -> dict:
    """
    시나리오 dict를 순회하며 answer_hash 값이 "plain:<answer>" 형식이면
    SHA-256 해시로 자동 변환한다.
    """
    text = json.dumps(data, ensure_ascii=False)

    def replacer(m: re.Match) -> str:
        answer = m.group(1)
        hashed = _hash_answer(answer)
        return f'"answer_hash": "{hashed}"'

    text = re.sub(r'"answer_hash":\s*"plain:([^"]+)"', replacer, text)
    return json.loads(text)


def encrypt_scenario(json_path: str | Path, output_path: str | Path | None = None) -> Path:
    """
    시나리오 JSON → AES-256-GCM 암호화 .dat 파일 생성.

    .dat 포맷:
      MAGIC (4B) | VERSION (2B, uint16 BE) | NONCE (12B) | TAG (16B) | CIPHERTEXT
    """
    json_path = Path(json_path)
    if output_path is None:
        output_path = json_path.with_suffix(".dat")
    output_path = Path(output_path)

    raw = json.loads(json_path.read_text(encoding="utf-8"))
    processed = _process_plain_answers(raw)
    plaintext = json.dumps(processed, ensure_ascii=False).encode("utf-8")

    nonce = get_random_bytes(12)
    cipher = AES.new(_KEY, AES.MODE_GCM, nonce=nonce)
    ciphertext, tag = cipher.encrypt_and_digest(plaintext)

    with output_path.open("wb") as f:
        f.write(MAGIC)
        f.write(struct.pack(">H", VERSION))
        f.write(nonce)   # 12 bytes
        f.write(tag)     # 16 bytes
        f.write(ciphertext)

    return output_path
