import { pool } from '../db';

interface UserPreferences {
  interests?: string[];
  vibe?: string;
  topics?: string[];
  conversationStyle?: string;
  ageRange?: string;
}

const VIBE_ADJECTIVES: Record<string, string[]> = {
  chill: ['Quiet', 'Velvet', 'Silent', 'Mellow', 'Calm', 'Breeze', 'Gentle', 'Hazy'],
  mystic: ['Midnight', 'Shadow', 'Lunar', 'Echo', 'Nebula', 'Eclipse', 'Ghost', 'Astral'],
  curious: ['Curious', 'Inquisitive', 'Pondering', 'Wandering', 'Keen', 'Seeking'],
  energetic: ['Blazing', 'Hyper', 'Swift', 'Dynamic', 'Volt', 'Spark', 'Electric', 'Flash'],
  philosophical: ['Deep', 'Sage', 'Pensive', 'Stoic', 'Infinite', 'Lucid', 'Timeless'],
  creative: ['Pixel', 'Prism', 'Cosmic', 'Aura', 'Chroma', 'Canvas', 'Abstract', 'Vivid'],
  rebel: ['Rogue', 'Sneaky', 'Glitch', 'Wild', 'Outlaw', 'Cyber', 'Chaos', 'Vortex'],
};

const INTEREST_NOUNS: Record<string, string[]> = {
  programming: ['Coder', 'Byte', 'Kernel', 'Terminal', 'Dev', 'Stack', 'Pixel', 'Algorithm', 'Node'],
  coding: ['Coder', 'Byte', 'Kernel', 'Terminal', 'Dev', 'Stack', 'Pixel', 'Algorithm', 'Node'],
  tech: ['Silicon', 'Circuit', 'Matrix', 'Vector', 'Cyber', 'Syntax'],
  photography: ['Lens', 'Shutter', 'Aperture', 'Focus', 'Frame', 'Exposure', 'Prism'],
  gaming: ['Wolf', 'Knight', 'Ranger', 'Titan', 'Specter', 'Vanguard', 'Hunter'],
  music: ['Melody', 'Harmony', 'Rhythm', 'Echo', 'Sonata', 'Acoustic', 'Chord'],
  art: ['Canvas', 'Palette', 'Sculptor', 'Sketch', 'Mosaic', 'Hue'],
  books: ['Scholar', 'Chronicle', 'Reader', 'Scribe', 'Poet', 'Raven'],
  philosophy: ['Seeker', 'Nomad', 'Observer', 'Thinker', 'Solitude', 'Oracle'],
  coffee: ['Espresso', 'Roast', 'Caffeine', 'Brew', 'Mocha', 'Barista'],
  nature: ['Forest', 'Summit', 'Orbit', 'Falcon', 'River', 'Aurora', 'Comet'],
  space: ['Orbit', 'Cosmos', 'Galaxy', 'Star', 'Meteor', 'Pulsar', 'Nova'],
};

const GENERAL_ADJECTIVES = [
  'Blue', 'Silver', 'Amber', 'Obsidian', 'Silent', 'Solar', 'Velvet', 'Neon', 'Echo', 'Zenith', 'Iron'
];

const GENERAL_NOUNS = [
  'Orbit', 'Pixel', 'Wolf', 'Echo', 'Nomad', 'Voyager', 'Phantom', 'Cipher', 'Beacon', 'Horizon', 'Sentinel'
];

export async function generateUniqueAnonymousUsername(preferences: UserPreferences): Promise<string> {
  const vibeKey = (preferences.vibe || 'chill').toLowerCase();
  const adjectivesList = VIBE_ADJECTIVES[vibeKey] || GENERAL_ADJECTIVES;

  let nounsList: string[] = [];

  // Match interests
  if (preferences.interests && Array.isArray(preferences.interests) && preferences.interests.length > 0) {
    for (const interest of preferences.interests) {
      const key = interest.toLowerCase();
      if (INTEREST_NOUNS[key]) {
        nounsList.push(...INTEREST_NOUNS[key]);
      }
    }
  }

  // Fallback to topics
  if (nounsList.length === 0 && preferences.topics && Array.isArray(preferences.topics)) {
    for (const topic of preferences.topics) {
      const key = topic.toLowerCase();
      if (INTEREST_NOUNS[key]) {
        nounsList.push(...INTEREST_NOUNS[key]);
      }
    }
  }

  if (nounsList.length === 0) {
    nounsList = GENERAL_NOUNS;
  }

  let attempts = 0;
  while (attempts < 20) {
    const adj = adjectivesList[Math.floor(Math.random() * adjectivesList.length)];
    const noun = nounsList[Math.floor(Math.random() * nounsList.length)];
    
    // Choose whether to append number based on attempt
    const suffix = attempts === 0 && Math.random() > 0.5 
      ? '' 
      : Math.floor(10 + Math.random() * 89).toString();
    
    const candidate = `${adj}${noun}${suffix}`;

    // Verify uniqueness in PostgreSQL
    const res = await pool.query(
      `SELECT id FROM users WHERE LOWER(anonymous_username) = LOWER($1);`,
      [candidate]
    );

    if (res.rows.length === 0) {
      return candidate;
    }
    attempts++;
  }

  // Fallback high-entropy guarantee
  const fallbackNum = Math.floor(100 + Math.random() * 900);
  return `AnonVoyager${fallbackNum}`;
}
