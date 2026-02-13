
// ZeroWawe Crypto Manager
// Implements ECDH (P-256) + AES-GCM (256-bit) E2EE

const ALGO_KEY_GEN = {
    name: 'ECDH',
    namedCurve: 'P-256',
};

const ALGO_DERIVE = {
    name: 'ECDH',
    public: null, // will be set during derivation
};

const ALGO_ENCRYPT = {
    name: 'AES-GCM',
    length: 256,
};

export class CryptoManager {
    constructor() {
        this.keyPair = null;
        this.sharedSecret = null; // CryptoKey (AES-GCM)
    }

    // Generate ephemeral ECDH key pair
    async generateKeyPair() {
        this.keyPair = await window.crypto.subtle.generateKey(
            ALGO_KEY_GEN,
            true, // extractable
            ['deriveKey', 'deriveBits']
        );
        return this.keyPair;
    }

    // Export public key to JWK for transmission
    async exportPublicKey() {
        if (!this.keyPair) throw new Error('No key pair generated');
        return await window.crypto.subtle.exportKey('jwk', this.keyPair.publicKey);
    }

    // Import remote public key from JWK
    async importPublicKey(jwk) {
        return await window.crypto.subtle.importKey(
            'jwk',
            jwk,
            ALGO_KEY_GEN,
            true,
            []
        );
    }

    // Derive shared secret (AES-GCM key) from own private key and remote public key
    async deriveSharedSecret(remotePublicKeyJwk) {
        if (!this.keyPair) throw new Error('No local key pair');

        const remotePublicKey = await this.importPublicKey(remotePublicKeyJwk);

        this.sharedSecret = await window.crypto.subtle.deriveKey(
            {
                name: 'ECDH',
                public: remotePublicKey,
            },
            this.keyPair.privateKey,
            ALGO_ENCRYPT,
            false, // shared key is not extractable
            ['encrypt', 'decrypt']
        );

        return this.sharedSecret;
    }

    // Encrypt data (object -> JSON -> Encrypted ArrayBuffer)
    // Returns: { iv: Array[12], data: ArrayBuffer }
    async encrypt(data) {
        if (!this.sharedSecret) throw new Error('Secure channel not established');

        const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
        const encodedData = new TextEncoder().encode(JSON.stringify(data));

        const encryptedContent = await window.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv,
            },
            this.sharedSecret,
            encodedData
        );

        return {
            iv: Array.from(iv),
            ciphertext: Array.from(new Uint8Array(encryptedContent))
        };
    }

    // Decrypt data (Encrypted ArrayBuffer -> JSON -> object)
    async decrypt(encryptedPackage) {
        if (!this.sharedSecret) throw new Error('Secure channel not established');

        const iv = new Uint8Array(encryptedPackage.iv);
        const ciphertext = new Uint8Array(encryptedPackage.ciphertext);

        const decryptedContent = await window.crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv,
            },
            this.sharedSecret,
            ciphertext
        );

        const decodedData = new TextDecoder().decode(decryptedContent);
        return JSON.parse(decodedData);
    }

    // Compute Fingerprint (SHA-256 of Public Key) for verification
    async computeFingerprint(jwk) {
        // Sort keys to ensure deterministic strict JSON stringify
        // However, for JWK, it's safer to use the x and y coordinates from the JWK if consistent,
        // or better: import the key and export as raw, then hash.
        // Let's rely on valid JWK structure. We'll hash the specific components 'x' and 'y' and 'crv' to be safe.

        // Simpler robust approach: Export standardized raw format and hash that.
        // We already have JWK, let's just use the JWK object but we need to match the remote one exactly.
        // A better standard for user verification is typically a hash of the public key bits.

        // Let's re-import and export as 'raw' (if possible for ECDH) or just hash the x/y concatenation.
        const key = await this.importPublicKey(jwk);
        const rawBuffer = await window.crypto.subtle.exportKey('raw', key);

        const hashBuffer = await window.crypto.subtle.digest('SHA-256', rawBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));

        // Convert to Hex string
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Format as groups for readability: "a1b2 c3d4 ...."
        return hashHex.match(/.{1,4}/g).join(' ').toUpperCase().substring(0, 30); // show first 30 chars
    }
}
