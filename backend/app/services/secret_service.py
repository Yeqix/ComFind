import base64
import hashlib
import os
from typing import Any, Dict, Optional


class SecretService:
    """Small local secret wrapper for API keys.

    This avoids storing raw keys in JSON. For stronger production security,
    configure COMBFIND_SECRET_KEY from a deployment secret manager.
    """

    scheme = "xor-sha256-v1"

    def encrypt(self, plaintext: str) -> Dict[str, str]:
        nonce = os.urandom(16)
        data = plaintext.encode("utf-8")
        stream = self._keystream(nonce, len(data))
        ciphertext = bytes(a ^ b for a, b in zip(data, stream))
        return {
            "scheme": self.scheme,
            "value": base64.b64encode(nonce + ciphertext).decode("ascii"),
        }

    def decrypt(self, wrapped: Any) -> Optional[str]:
        if not wrapped:
            return None
        if isinstance(wrapped, str):
            return wrapped
        if not isinstance(wrapped, dict) or wrapped.get("scheme") != self.scheme:
            return None
        try:
            raw = base64.b64decode(wrapped["value"])
            nonce, ciphertext = raw[:16], raw[16:]
            stream = self._keystream(nonce, len(ciphertext))
            return bytes(a ^ b for a, b in zip(ciphertext, stream)).decode("utf-8")
        except Exception:
            return None

    def _key(self) -> bytes:
        configured = os.environ.get("COMBFIND_SECRET_KEY")
        if configured:
            return hashlib.sha256(configured.encode("utf-8")).digest()
        local_hint = "|".join(
            [
                os.environ.get("USERNAME", ""),
                os.environ.get("USER", ""),
                os.environ.get("COMPUTERNAME", ""),
                "combfind-local-secret",
            ]
        )
        return hashlib.sha256(local_hint.encode("utf-8")).digest()

    def _keystream(self, nonce: bytes, length: int) -> bytes:
        key = self._key()
        chunks = []
        counter = 0
        while sum(len(chunk) for chunk in chunks) < length:
            chunks.append(hashlib.sha256(key + nonce + counter.to_bytes(4, "big")).digest())
            counter += 1
        return b"".join(chunks)[:length]
