# Security Architecture

## Encryption Model (Phase 1)
ZeroWawe uses a **Zero Trust** architecture. We assume the signaling server (PeerJS) and the network are compromised.

### End-to-End Encryption (E2EE)
- **Algorithm**: AES-GCM (256-bit)
- **Key Exchange**: ECDH (Elliptic Curve Diffie-Hellman) using NIST P-256 curve.
- **Key Derivation**: HKDF (HMAC-based Key Derivation Function) to derive the symmetric AES encryption key.
- **IV**: Random 96-bit Initialization Vector (IV) for every message.

### Protocol Flow
1.  **Handshake**:
    -   Alice generates an ephemeral ECDH key pair (`Alice_Priv`, `Alice_Pub`).
    -   Bob generates an ephemeral ECDH key pair (`Bob_Priv`, `Bob_Pub`).
    -   They exchange public keys (`Alice_Pub` <-> `Bob_Pub`) over the signaling channel.
2.  **Shared Secret**:
    -   Alice computes `S = ECDH(Alice_Priv, Bob_Pub)`.
    -   Bob computes `S = ECDH(Bob_Priv, Alice_Pub)`.
    -   Both derive `Session_Key` from `S` using HKDF.
3.  **Messaging**:
    -   Alice encrypts message `M` -> `C = AES_Encrypt(M, Session_Key, IV)`.
    -   Alice sends `IV + C`.
    -   Bob decrypts `M = AES_Decrypt(C, Session_Key, IV)`.

### Identity Verification
- **Fingerprint**: A SHA-256 hash of the remote peer's public key is displayed as a "Safety Number".
- **Verification**: Users verify this fingerprint via a secondary channel (e.g., visually scanning the QR code or reading it aloud) to prevent Man-in-the-Middle (MitM) attacks.

## Network Privacy (Phase 2 - Planned)
- **IP Leakage**: WebRTC naturally exposes IP addresses to establish P2P connections.
- **Mitigation**: Future updates will include "Relay-Only" mode (forcing TURN) to mask IP addresses at the cost of latency.

## Threat Model
| Threat | Mitigation | Status |
| :--- | :--- | :--- |
| **Passive Eavesdropping** | AES-GCM Encrypted Payloads | ✅ Live |
| **Man-in-the-Middle (Active)** | ECDH + Fingerprint Verification | ✅ Live |
| **Server Compromise** | E2EE (Server sees only ciphertext) | ✅ Live |
| **Data Retention** | Ephemeral Keys (Ram-only, lost on refresh) | ✅ Live |
| **IP Leakage** | None (Direct P2P = IP exposed) | ⚠️ Pending |
| **Metadata Analysis** | Traffic flow visible, Packet sizes visible | ⚠️ Pending |

> "Zero Trace. Pure Wave."
