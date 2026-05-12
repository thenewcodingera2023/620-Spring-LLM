// cl100k_base tokenizer adapter for Layer 1.
//
// We use js-tiktoken (pure JavaScript) so the tokenizer ships in the bundle and runs offline
// without a WASM payload or network round-trip. The encoding name is exposed alongside the IDs
// so the UI can be honest about which tokenizer it is using. If construction throws (which we do
// not expect since the ranks ship in the package) the adapter falls back to a documented
// deterministic char-code-based tokenization and self-reports mode === 'fallback' so the UI can
// flag it instead of pretending the fallback is real cl100k_base.

import cl100kBaseRanks from 'js-tiktoken/ranks/cl100k_base';
import { Tiktoken } from 'js-tiktoken/lite';

export type TokenizerMode = 'real' | 'fallback';

export interface TokenizationResult {
  ids: number[];
  encoding: string;
  mode: TokenizerMode;
}

// cl100k_base vocabulary size, derived from the highest special-token id in the ranks file
// (100276) plus 1. We compute this at module load so it stays in sync with whatever ranks
// js-tiktoken shipped, rather than baking a magic number that could drift on upgrade.
function deriveCl100kNormalizer(): number {
  const specials = cl100kBaseRanks.special_tokens;
  let max = 0;
  for (const id of Object.values(specials)) {
    if (id > max) max = id;
  }
  // +1 so the normalizer is a vocabulary *size*, making meanTokenId/normalizer in [0, 1).
  return max + 1;
}

export const TOKEN_ID_NORMALIZER = deriveCl100kNormalizer();
export const ENCODING_NAME = 'cl100k_base';

let cachedEncoder: Tiktoken | null = null;
let cachedMode: TokenizerMode = 'real';

function getEncoder(): { encoder: Tiktoken | null; mode: TokenizerMode } {
  if (cachedEncoder !== null) {
    return { encoder: cachedEncoder, mode: cachedMode };
  }
  try {
    cachedEncoder = new Tiktoken(cl100kBaseRanks);
    cachedMode = 'real';
  } catch {
    cachedEncoder = null;
    cachedMode = 'fallback';
  }
  return { encoder: cachedEncoder, mode: cachedMode };
}

// Deterministic fallback when js-tiktoken cannot construct. Splits on whitespace and hashes each
// word's chars into a stable id in [0, TOKEN_ID_NORMALIZER). This is NOT cl100k_base — the
// adapter's mode === 'fallback' tells the UI to label itself as such.
function fallbackTokenize(text: string): number[] {
  if (text.length === 0) return [];
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const ids: number[] = [];
  for (const word of words) {
    let h = 5381;
    for (let i = 0; i < word.length; i++) {
      h = ((h << 5) + h + word.charCodeAt(i)) | 0;
    }
    const id = Math.abs(h) % TOKEN_ID_NORMALIZER;
    ids.push(id);
  }
  return ids;
}

export function tokenize(text: string): TokenizationResult {
  const { encoder, mode } = getEncoder();
  if (encoder && mode === 'real') {
    return {
      ids: encoder.encode(text),
      encoding: ENCODING_NAME,
      mode: 'real',
    };
  }
  return {
    ids: fallbackTokenize(text),
    encoding: `${ENCODING_NAME} (fallback)`,
    mode: 'fallback',
  };
}
