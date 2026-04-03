"""clue.cipher 암호화/복호화 테스트"""
from __future__ import annotations

import hashlib
import json

import pytest

from clue.cipher.encrypt import MAGIC, encrypt_scenario
from clue.cipher.decrypt import decrypt_scenario, DecryptError


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

_MINIMAL_SCENARIO = {
    "scenario_id": "cipher_test",
    "version": "1.0",
    "title": "암호화 테스트",
    "start_room_id": "room1",
    "flags": {},
    "items": [],
    "rooms": [
        {
            "id": "room1",
            "name": "방",
            "description": "테스트 방",
            "points": [
                {
                    "id": "exit",
                    "name": "출구",
                    "description": "탈출",
                    "action": {"type": "game_clear", "value": None},
                }
            ],
        }
    ],
}


# ---------------------------------------------------------------------------
# 암호화 → 복호화 왕복
# ---------------------------------------------------------------------------

def test_encrypt_decrypt_roundtrip(tmp_path):
    json_path = tmp_path / "test.json"
    json_path.write_text(json.dumps(_MINIMAL_SCENARIO, ensure_ascii=False), encoding="utf-8")

    dat_path = encrypt_scenario(json_path)
    result = decrypt_scenario(dat_path)

    assert result["scenario_id"] == "cipher_test"
    assert result["title"] == "암호화 테스트"
    assert result["rooms"][0]["id"] == "room1"


def test_dat_file_has_correct_magic(tmp_path):
    json_path = tmp_path / "test.json"
    json_path.write_text(json.dumps(_MINIMAL_SCENARIO, ensure_ascii=False), encoding="utf-8")

    dat_path = encrypt_scenario(json_path)
    raw = dat_path.read_bytes()

    assert raw[:4] == MAGIC


# ---------------------------------------------------------------------------
# 오류 케이스
# ---------------------------------------------------------------------------

def test_wrong_magic_raises(tmp_path):
    dat_path = tmp_path / "bad.dat"
    dat_path.write_bytes(b"XXXX" + b"\x00" * 30)

    with pytest.raises(DecryptError, match="MAGIC"):
        decrypt_scenario(dat_path)


def test_wrong_version_raises(tmp_path):
    dat_path = tmp_path / "bad.dat"
    # MAGIC + VERSION=99 + 나머지 패딩
    dat_path.write_bytes(MAGIC + b"\x00\x63" + b"\x00" * 30)

    with pytest.raises(DecryptError, match="버전"):
        decrypt_scenario(dat_path)


def test_tampered_ciphertext_raises(tmp_path):
    json_path = tmp_path / "test.json"
    json_path.write_text(json.dumps(_MINIMAL_SCENARIO, ensure_ascii=False), encoding="utf-8")

    dat_path = encrypt_scenario(json_path)
    raw = bytearray(dat_path.read_bytes())
    raw[-1] ^= 0xFF  # 마지막 바이트 변조
    dat_path.write_bytes(bytes(raw))

    with pytest.raises(DecryptError, match="복호화 실패"):
        decrypt_scenario(dat_path)


# ---------------------------------------------------------------------------
# plain: 자동 해시 변환
# ---------------------------------------------------------------------------

def test_plain_answer_converted_to_hash(tmp_path):
    scenario = dict(_MINIMAL_SCENARIO)
    scenario["rooms"] = [
        {
            "id": "room1",
            "name": "방",
            "description": "테스트 방",
            "points": [
                {
                    "id": "lock",
                    "name": "자물쇠",
                    "description": "자물쇠",
                    "puzzle": {
                        "question": "비밀번호?",
                        "answer_hash": "plain:1234",
                        "on_success": {"type": "game_clear", "value": None},
                    },
                }
            ],
        }
    ]

    json_path = tmp_path / "plain.json"
    json_path.write_text(json.dumps(scenario, ensure_ascii=False), encoding="utf-8")

    dat_path = encrypt_scenario(json_path)
    result = decrypt_scenario(dat_path)

    expected_hash = hashlib.sha256("1234".encode()).hexdigest()
    actual_hash = result["rooms"][0]["points"][0]["puzzle"]["answer_hash"]
    assert actual_hash == expected_hash
