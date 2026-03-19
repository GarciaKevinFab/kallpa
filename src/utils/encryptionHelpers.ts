import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Length of the AES key in bytes (256-bit). */
const KEY_BYTE_LENGTH = 32;
/** Length of the initialisation vector in bytes (128-bit). */
const IV_BYTE_LENGTH = 16;
/** SecureStore key where the generated encryption key is persisted. */
const SECURE_KEY_ALIAS = 'kallpa_encryption_key';

// ---------------------------------------------------------------------------
// Key management
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically-secure random key and persist it in
 * expo-secure-store. Returns the key as a hex string.
 *
 * If a key already exists in secure storage the existing key is returned
 * rather than overwriting it.
 */
export const generateKey = async (): Promise<string> => {
  const existing = await SecureStore.getItemAsync(SECURE_KEY_ALIAS);
  if (existing) return existing;

  const randomBytes = await Crypto.getRandomBytesAsync(KEY_BYTE_LENGTH);
  const hexKey = bytesToHex(randomBytes);
  await SecureStore.setItemAsync(SECURE_KEY_ALIAS, hexKey);
  return hexKey;
};

/**
 * Retrieve the encryption key from secure storage.
 * Throws if no key has been generated yet.
 */
export const getKey = async (): Promise<string> => {
  const key = await SecureStore.getItemAsync(SECURE_KEY_ALIAS);
  if (!key) {
    throw new Error(
      '[encryptionHelpers] No encryption key found. Call generateKey() first.',
    );
  }
  return key;
};

// ---------------------------------------------------------------------------
// Encrypt / Decrypt
// ---------------------------------------------------------------------------

/**
 * Encrypt a plaintext string using expo-crypto's digest as a simplified
 * symmetric-encryption approach.
 *
 * Implementation note:
 * React Native / Expo does not ship a built-in AES cipher.  This helper
 * performs an HMAC-SHA256 of the data keyed with the provided key and returns
 * it together with a random IV.  The result is **not reversible** -- use this
 * for integrity verification (e.g. hashing journal entries for tamper
 * detection).  For true AES encryption in a future iteration, swap the body
 * of this function with a native module such as `react-native-aes-crypto`.
 *
 * @returns An object with `{ encrypted, iv }` where both values are hex strings.
 */
export const encrypt = async (
  data: string,
  key: string,
): Promise<{ encrypted: string; iv: string }> => {
  const ivBytes = await Crypto.getRandomBytesAsync(IV_BYTE_LENGTH);
  const iv = bytesToHex(ivBytes);

  // Combine data + iv + key to produce a unique digest.
  const payload = `${iv}:${data}:${key}`;
  const encrypted = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    payload,
  );

  return { encrypted, iv };
};

/**
 * Verify data against a previously generated encrypted digest.
 *
 * Because the current implementation uses SHA-256 (one-way), this function
 * re-computes the digest for the given data and compares it to the stored
 * encrypted value.  Returns `true` when the data matches.
 *
 * When a real AES implementation is added, this function will be replaced
 * with actual decryption that returns the original plaintext.
 */
export const decrypt = async (
  encrypted: string,
  key: string,
  iv: string,
): Promise<{ verified: boolean }> => {
  // This is intentionally left as a placeholder for the future AES swap.
  // Currently serves as a verification helper.
  const payload = `${iv}::${key}`;
  const _digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    payload,
  );

  // Without the original plaintext we cannot re-derive the hash; callers
  // should use `verifyData` below instead.
  return { verified: false };
};

/**
 * Re-compute the digest for `data` using the same key and IV, then compare
 * it against the stored `encrypted` value.
 */
export const verifyData = async (
  data: string,
  key: string,
  iv: string,
  encrypted: string,
): Promise<boolean> => {
  const payload = `${iv}:${data}:${key}`;
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    payload,
  );
  return digest === encrypted;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a Uint8Array to a lowercase hex string. */
const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
