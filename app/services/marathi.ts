const VIRAMA = '्';

const consonants: Array<[string, string]> = [
  ['ksh', 'क्ष'],
  ['dny', 'ज्ञ'],
  ['gny', 'ज्ञ'],
  ['jn', 'ज्ञ'],
  ['shr', 'श्र'],
  ['tr', 'त्र'],
  ['chh', 'छ'],
  ['tth', 'ठ'],
  ['ddh', 'ढ'],
  ['kh', 'ख'],
  ['gh', 'घ'],
  ['ch', 'च'],
  ['jh', 'झ'],
  ['th', 'थ'],
  ['dh', 'ध'],
  ['ph', 'फ'],
  ['bh', 'भ'],
  ['sh', 'श'],
  ['ny', 'ञ'],
  ['ng', 'ङ'],
  ['rr', 'ऱ'],
  ['k', 'क'],
  ['g', 'ग'],
  ['c', 'क'],
  ['j', 'ज'],
  ['t', 'त'],
  ['d', 'द'],
  ['n', 'न'],
  ['p', 'प'],
  ['b', 'ब'],
  ['m', 'म'],
  ['y', 'य'],
  ['r', 'र'],
  ['l', 'ल'],
  ['v', 'व'],
  ['w', 'व'],
  ['s', 'स'],
  ['h', 'ह'],
  ['f', 'फ'],
  ['q', 'क'],
  ['x', 'क्स'],
  ['z', 'झ'],
];

const vowels: Array<[string, { independent: string; matra: string }]> = [
  ['au', { independent: 'औ', matra: 'ौ' }],
  ['ai', { independent: 'ऐ', matra: 'ै' }],
  ['aa', { independent: 'आ', matra: 'ा' }],
  ['ii', { independent: 'ई', matra: 'ी' }],
  ['ee', { independent: 'ई', matra: 'ी' }],
  ['uu', { independent: 'ऊ', matra: 'ू' }],
  ['oo', { independent: 'ऊ', matra: 'ू' }],
  ['ri', { independent: 'ऋ', matra: 'ृ' }],
  ['a', { independent: 'अ', matra: '' }], // inherent vowel
  ['i', { independent: 'इ', matra: 'ि' }],
  ['u', { independent: 'उ', matra: 'ु' }],
  ['e', { independent: 'ए', matra: 'े' }],
  ['o', { independent: 'ओ', matra: 'ो' }],
];

function matchToken<T>(
  source: string,
  index: number,
  tokens: Array<[string, T]>
): [string, T] | null {
  for (const [token, value] of tokens) {
    if (source.startsWith(token, index)) return [token, value];
  }
  return null;
}

function transliterateWord(word: string): string {
  const lower = word.toLowerCase();
  let i = 0;
  let out = '';
  let lastWasConsonant = false;

  while (i < lower.length) {
    const consonantHit = matchToken(lower, i, consonants);
    if (consonantHit) {
      const [token, letter] = consonantHit;
      if (lastWasConsonant) out += VIRAMA;
      out += letter;
      lastWasConsonant = true;
      i += token.length;
      continue;
    }

    const vowelHit = matchToken(lower, i, vowels);
    if (vowelHit) {
      const [token, v] = vowelHit;
      if (lastWasConsonant) {
        // "a" is inherent vowel; no explicit matra needed
        out += v.matra;
      } else {
        out += v.independent;
      }
      lastWasConsonant = false;
      i += token.length;
      continue;
    }

    const ch = lower[i];
    if (ch === 'm') {
      out += 'ं';
      lastWasConsonant = false;
      i += 1;
      continue;
    }
    if (ch === 'h') {
      out += 'ः';
      lastWasConsonant = false;
      i += 1;
      continue;
    }

    out += word[i] || '';
    lastWasConsonant = false;
    i += 1;
  }

  return out;
}

export function transliterateToMarathi(input: string): string {
  const text = String(input || '');
  if (!text.trim()) return '';
  if (/[\u0900-\u097F]/.test(text)) return text;

  return text
    .split(/([^\w]+)/g)
    .map((chunk) => {
      if (!chunk) return chunk;
      if (!/[A-Za-z]/.test(chunk)) return chunk;
      return transliterateWord(chunk);
    })
    .join('');
}
