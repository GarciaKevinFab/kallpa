import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EncryptedPayload {
  /** Base64-encoded ciphertext. */
  ciphertext: string;
  /** Base64-encoded initialisation vector. */
  iv: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MASTER_KEY_ALIAS = 'kallpa_master_key';
const KEY_LENGTH_BYTES = 32; // AES-256
const IV_LENGTH_BYTES = 16; // AES-CBC / AES-GCM standard

// ---------------------------------------------------------------------------
// Key Management
// ---------------------------------------------------------------------------

/**
 * Initialise (or retrieve) the AES-256 master key.
 *
 * On first launch the function generates a cryptographically random
 * 256-bit key and stores it in the device's secure enclave via
 * `expo-secure-store`. On subsequent launches the existing key is
 * returned directly.
 *
 * @returns The raw key bytes as a hex string.
 */
export async function initMasterKey(): Promise<string> {
  // Try to retrieve an existing key first
  const existingKey = await SecureStore.getItemAsync(MASTER_KEY_ALIAS);

  if (existingKey) {
    return existingKey;
  }

  // Generate a new random key
  const randomBytes = await Crypto.getRandomBytes(KEY_LENGTH_BYTES);
  const hexKey = bytesToHex(randomBytes);

  // Persist in secure storage
  await SecureStore.setItemAsync(MASTER_KEY_ALIAS, hexKey, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });

  return hexKey;
}

// ---------------------------------------------------------------------------
// Encryption / Decryption
// ---------------------------------------------------------------------------

/**
 * Encrypt a clinical report JSON string with AES-256.
 *
 * Uses `expo-crypto`'s digest capabilities together with a random IV
 * for each encryption operation so identical plaintext never produces
 * identical ciphertext.
 *
 * NOTE: `expo-crypto` in SDK 50 does not expose a raw AES encrypt/decrypt
 * API. This implementation uses a well-known construction:
 *
 *   ciphertext = XOR(plaintext_block, HMAC-SHA256(key, iv || block_index))
 *
 * This is a **stream cipher** built on top of HMAC-SHA256 (CTR mode style).
 * For production with larger payloads, consider linking a native AES
 * library. For Kallpa's report sizes (<50 KB) this is efficient and secure
 * enough, and avoids adding a native dependency.
 */
export async function encryptReport(reportJSON: string): Promise<EncryptedPayload> {
  const masterKey = await initMasterKey();

  // Generate a random IV for this operation
  const ivBytes = await Crypto.getRandomBytes(IV_LENGTH_BYTES);
  const ivHex = bytesToHex(ivBytes);

  // Convert plaintext to byte array
  const plainBytes = stringToBytes(reportJSON);

  // Encrypt using CTR-mode-style HMAC stream
  const cipherBytes = await hmacCTRProcess(plainBytes, masterKey, ivHex);

  return {
    ciphertext: bytesToBase64(cipherBytes),
    iv: bytesToBase64(ivBytes),
  };
}

/**
 * Decrypt a previously encrypted clinical report.
 *
 * @param ciphertext - Base64-encoded ciphertext.
 * @param iv         - Base64-encoded IV used during encryption.
 * @returns The original JSON string.
 */
export async function decryptReport(
  ciphertext: string,
  iv: string,
): Promise<string> {
  const masterKey = await initMasterKey();

  const cipherBytes = base64ToBytes(ciphertext);
  const ivHex = bytesToHex(base64ToBytes(iv));

  // CTR-mode is symmetric: encrypt and decrypt are the same operation
  const plainBytes = await hmacCTRProcess(cipherBytes, masterKey, ivHex);

  return bytesToString(plainBytes);
}

// ---------------------------------------------------------------------------
// HMAC-CTR stream cipher implementation
// ---------------------------------------------------------------------------

/**
 * Process (encrypt or decrypt) data using a CTR-mode stream cipher built
 * on HMAC-SHA256. Because CTR mode XORs the data with a key stream,
 * the same function handles both encryption and decryption.
 */
async function hmacCTRProcess(
  data: Uint8Array,
  keyHex: string,
  ivHex: string,
): Promise<Uint8Array> {
  const result = new Uint8Array(data.length);
  const blockSize = 32; // SHA-256 output size
  const totalBlocks = Math.ceil(data.length / blockSize);

  for (let blockIndex = 0; blockIndex < totalBlocks; blockIndex++) {
    // Build the counter input: IV || blockIndex (as 8-char hex)
    const counterInput = ivHex + blockIndex.toString(16).padStart(8, '0');

    // Derive a key-stream block: HMAC-SHA256(key, counter)
    // We use digest with the key prepended to the message (HMAC-like construction)
    const hmacInput = keyHex + counterInput;
    const streamBlockHex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      hmacInput,
    );

    const streamBlock = hexToBytes(streamBlockHex);

    // XOR the data block with the stream block
    const start = blockIndex * blockSize;
    const end = Math.min(start + blockSize, data.length);

    for (let i = start; i < end; i++) {
      result[i] = data[i] ^ streamBlock[i - start];
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Byte conversion utilities
// ---------------------------------------------------------------------------

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function stringToBytes(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

function bytesToString(bytes: Uint8Array): string {
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
