const COMMON_SUFFIXES = ['tiktok', 'content', 'creator', 'tips', 'hack', 'tutorial'];

export function generateHashtags(topic: string): string[] {
  const base = topic.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const words = base.split(/\s+/);

  const hashtags: string[] = [];

  // Primary: the topic as-is (no spaces)
  hashtags.push(words.join(''));

  // If multi-word, add individual words that are 4+ chars
  if (words.length > 1) {
    for (const word of words) {
      if (word.length >= 4 && !hashtags.includes(word)) {
        hashtags.push(word);
      }
    }
  }

  // Suffixed variants
  for (const suffix of COMMON_SUFFIXES.slice(0, 3)) {
    const variant = words.join('') + suffix;
    if (!hashtags.includes(variant)) {
      hashtags.push(variant);
    }
  }

  // Cap at 10 hashtags
  return hashtags.slice(0, 10);
}

export function extractHashtags(description: string): string[] {
  const matches = description.match(/#(\w+)/g);
  if (!matches) return [];
  return matches.map((m) => m.replace('#', '').toLowerCase());
}
