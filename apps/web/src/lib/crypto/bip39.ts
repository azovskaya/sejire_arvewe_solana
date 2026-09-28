import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

export const WORD_COUNT = 12;

export function createMnemonic(): string {
  return generateMnemonic(wordlist, 128); // 12 words
}

export function normalizeMnemonic(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

export function isValidMnemonic(input: string): boolean {
  const m = normalizeMnemonic(input);
  const words = m.split(" ");
  if (words.length !== WORD_COUNT) return false;
  return validateMnemonic(m, wordlist);
}

export function mnemonicToSeed(mnemonic: string): Uint8Array {
  const m = normalizeMnemonic(mnemonic);
  if (!isValidMnemonic(m)) {
    throw new Error("Invalid BIP-39 mnemonic");
  }
  return mnemonicToSeedSync(m);
}

export function splitWords(mnemonic: string): string[] {
  return normalizeMnemonic(mnemonic).split(" ");
}
