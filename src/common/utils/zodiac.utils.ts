// src/common/utils/zodiac.utils.ts

export const ZODIAC_SYMBOLS: Record<string, string> = {
  "Bélier": "♈", "Taureau": "♉", "Gémeaux": "♊", "Cancer": "♋",
  "Lion": "♌", "Vierge": "♍", "Balance": "♎", "Scorpion": "♏",
  "Sagittaire": "♐", "Capricorne": "♑", "Verseau": "♒", "Poissons": "♓"
};

export const ZODIAC_ELEMENTS: Record<string, string> = {
  "Bélier": "Feu", "Lion": "Feu", "Sagittaire": "Feu",
  "Taureau": "Terre", "Vierge": "Terre", "Capricorne": "Terre",
  "Gémeaux": "Air", "Balance": "Air", "Verseau": "Air",
  "Cancer": "Eau", "Scorpion": "Eau", "Poissons": "Eau"
};

export function getZodiacSign(date: Date): string {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "Bélier";
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "Taureau";
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "Gémeaux";
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "Cancer";
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Lion";
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "Vierge";
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "Balance";
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "Scorpion";
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "Sagittaire";
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "Capricorne";
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "Verseau";
  return "Poissons";
}

export function getZodiacSymbol(sign: string): string {
  return ZODIAC_SYMBOLS[sign] || "✨";
}

export function getZodiacElement(sign: string): string {
  return ZODIAC_ELEMENTS[sign] || "Inconnu";
}
