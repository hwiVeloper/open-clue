from __future__ import annotations

import json
import struct
from pathlib import Path

from Crypto.Cipher import AES

from .encrypt import MAGIC, VERSION, _KEY


class DecryptError(Exception):
    pass


def decrypt_scenario(dat_path: str | Path) -> dict:
    """
    .dat 파일을 복호화하여 시나리오 dict 반환.
    """
    dat_path = Path(dat_path)
    data = dat_path.read_bytes()

    # MAGIC 검증
    if data[:4] != MAGIC:
        raise DecryptError("올바른 시나리오 파일이 아닙니다. (MAGIC 불일치)")

    # VERSION
    (file_version,) = struct.unpack(">H", data[4:6])
    if file_version != VERSION:
        raise DecryptError(
            f"지원하지 않는 파일 버전입니다. (파일={file_version}, 지원={VERSION})"
        )

    nonce = data[6:18]    # 12 bytes
    tag = data[18:34]     # 16 bytes
    ciphertext = data[34:]

    cipher = AES.new(_KEY, AES.MODE_GCM, nonce=nonce)
    try:
        plaintext = cipher.decrypt_and_verify(ciphertext, tag)
    except ValueError as exc:
        raise DecryptError(f"복호화 실패: 파일이 손상되었거나 변조되었습니다. ({exc})")

    return json.loads(plaintext.decode("utf-8"))
