const ENGLISH = [
  'fuck','shit','ass','bitch','bastard','damn','crap','dick','piss','slut',
  'whore','cock','pussy','asshole','douchebag','motherfucker','jackass',
  'bollocks','wanker'
];

const HINDI = [
  'चूतिया','भोसड़ी','मादरचोद','बहनचोद','लंड','चूत','गांड',
  'झांट','कुत्ता','साला','रंडी','हरामी','बेवकूफ','सुअर','चुतिया','गंडू','लोडा','गांड'
];

const HINGLISH = [
  'chutiya','bhosdi','madarchod','bhenchod','lund','chut','gand',
  'jhaant','kutta','sala','randi','harami','bewakoof','suar','chutia',
  'gandu','loda','gaand'
];

const LEET_MAP: Record<string, string> = {
  '4': 'a', '@': 'a', '8': 'b', '(': 'c', '{': 'c',
  '3': 'e', '6': 'g', '9': 'g', '#': 'h', '1': 'i', '!': 'i',
  '|': 'l', '0': 'o', '5': 's', '$': 's', '7': 't', '+': 't',
  '2': 'z',
};

function normalizeLeet(s: string): string {
  return s.replace(/[4@8({369#1!|05$7+2]/g, c => LEET_MAP[c] || c);
}

const ALL_WORDS = [...ENGLISH, ...HINDI, ...HINGLISH];
const NORMALIZED = ALL_WORDS.map(w => normalizeLeet(w.toLowerCase()));
const PATTERN = new RegExp(`(?:${NORMALIZED.join('|')})`, 'i');

export function containsProfanity(text: string): boolean {
  return PATTERN.test(normalizeLeet(text.toLowerCase()));
}

export function filterProfanity(text: string): string {
  return text.replace(PATTERN, (m) => '*'.repeat(m.length));
}
