// CultureWire search categories — ported from search_categories.yaml
// 25 categories across 8 groups

export interface CategoryConfig {
  name: string;
  slug: string;
  group: string;
  icon: string;
  geo_scope: 'au' | 'global';
  clients: string[];
  keywords: string[];
}

export interface CategoryGroup {
  name: string;
  categories: CategoryConfig[];
}

// ---------------------------------------------------------------------------
// Category definitions
// ---------------------------------------------------------------------------

const FOOD_BEVERAGE: CategoryConfig = {
  name: 'Food & Beverage',
  slug: 'food-beverage',
  group: 'Consumer & Lifestyle',
  icon: 'utensils',
  geo_scope: 'au',
  clients: ['Boost Juice', 'Baskin Robbins', 'Bakers Delight', "Leggo's/Simplot"],
  keywords: [
    'what I eat in a day',
    'meal prep hack',
    'taste test review',
    'food haul grocery',
    'viral recipe easy',
    'honest restaurant review',
    'cafe hopping aesthetic',
    'fridge restock ASMR',
    'aussie snack review',
    'lunch box ideas',
    'cooking hack kitchen',
    'food trend trying',
    'street food market',
  ],
};

const RETAIL: CategoryConfig = {
  name: 'Retail',
  slug: 'retail',
  group: 'Consumer & Lifestyle',
  icon: 'shopping-cart',
  geo_scope: 'au',
  clients: ['Officeworks', '99 Bikes'],
  keywords: [
    'Kmart haul new finds',
    'target run haul',
    'Aldi special buys',
    'shopping haul try on',
    'budget finds under',
    'store walkthrough new',
    'best buys this week',
    'unboxing haul review',
    'dupe alert affordable',
    'back to school haul',
    'home office setup',
    'desk setup tour',
  ],
};

const FASHION: CategoryConfig = {
  name: 'Fashion',
  slug: 'fashion',
  group: 'Consumer & Lifestyle',
  icon: 'shirt',
  geo_scope: 'global',
  clients: [],
  keywords: [
    'outfit of the day OOTD',
    'get ready with me GRWM',
    'thrift haul op shop',
    'capsule wardrobe styling',
    'outfit inspo casual',
    'styling hack affordable',
    'Kmart fashion haul',
    'dupe alert designer',
    'closet declutter organise',
    'seasonal wardrobe transition',
    'streetwear fit check',
    'beauty GRWM routine',
  ],
};

const HOME_LIFESTYLE: CategoryConfig = {
  name: 'Home & Lifestyle',
  slug: 'home-lifestyle',
  group: 'Consumer & Lifestyle',
  icon: 'home',
  geo_scope: 'au',
  clients: ['Officeworks', 'Ausbuild'],
  keywords: [
    'home tour room makeover',
    'budget reno before after',
    'Kmart home hack',
    'organisation satisfying clean',
    'pantry restock organise',
    'DIY home project easy',
    'rental friendly decor',
    'moving into new apartment',
    'cozy home aesthetic',
    'garden transformation backyard',
    'cleaning motivation routine',
    'small space living hack',
  ],
};

const PARENTING_FAMILY: CategoryConfig = {
  name: 'Parenting & Family',
  slug: 'parenting-family',
  group: 'Consumer & Lifestyle',
  icon: 'baby',
  geo_scope: 'au',
  clients: [],
  keywords: [
    'day in my life mum',
    'toddler meal ideas',
    'school lunch box prep',
    'parenting hack real talk',
    'baby must haves newborn',
    'kids activities rainy day',
    'honest mum review',
    'family vlog routine',
    'back to school prep',
    'sensory play toddler',
    'mum life real honest',
    'family budget tips',
  ],
};

const PETS_ANIMALS: CategoryConfig = {
  name: 'Pets & Animals',
  slug: 'pets-animals',
  group: 'Consumer & Lifestyle',
  icon: 'paw-print',
  geo_scope: 'global',
  clients: [],
  keywords: [
    'puppy training tips',
    'dog park adventure',
    'pet adoption rescue story',
    'cat compilation funny',
    'pet haul unboxing',
    'what my dog eats',
    'vet visit honest cost',
    'pet routine morning',
    'rescue dog transformation',
    'exotic pets Australia',
    'pet product honest review',
    'animal shelter volunteer',
  ],
};

const TRAVEL_OUTDOORS: CategoryConfig = {
  name: 'Travel & Outdoors',
  slug: 'travel-outdoors',
  group: 'Travel & Transport',
  icon: 'plane',
  geo_scope: 'global',
  clients: ['Intrepid Travel', 'Air New Zealand', 'Camplify'],
  keywords: [
    'travel vlog destination',
    'hidden gem underrated',
    'packing hack routine',
    'flight hack upgrade tip',
    'road trip itinerary',
    'camping setup tour',
    'travel day routine',
    'budget travel backpacking',
    'hotel room tour honest',
    'hiking trail scenic',
    'van life Australia',
    'airport outfit travel',
  ],
};

const AUTOMOTIVE: CategoryConfig = {
  name: 'Automotive',
  slug: 'automotive',
  group: 'Travel & Transport',
  icon: 'car',
  geo_scope: 'au',
  clients: ['Mazda'],
  keywords: [
    'new car review honest',
    'electric vehicle EV range',
    'car tour full detail',
    'first car buying tips',
    'car mod transformation',
    'road trip car setup',
    'car detailing satisfying',
    'driving test tips',
    'car comparison review',
    'petrol vs electric cost',
  ],
};

const TECHNOLOGY_APPS: CategoryConfig = {
  name: 'Technology & Apps',
  slug: 'technology-apps',
  group: 'Technology & Digital',
  icon: 'smartphone',
  geo_scope: 'global',
  clients: ['Tinder'],
  keywords: [
    'tech review honest',
    'app you need to try',
    'iPhone hack hidden feature',
    'AI tool game changer',
    'gadget unboxing review',
    'productivity hack app',
    'phone setup customise',
    'tech comparison test',
    'smart home setup tour',
    'coding day in my life',
    'digital detox challenge',
  ],
};

const DATING_RELATIONSHIPS: CategoryConfig = {
  name: 'Dating & Relationships',
  slug: 'dating-relationships',
  group: 'Technology & Digital',
  icon: 'heart',
  geo_scope: 'global',
  clients: ['Tinder'],
  keywords: [
    'dating app storytime',
    'red flag green flag',
    'first date outfit GRWM',
    'relationship advice honest',
    'dating in your 20s',
    'worst date storytime',
    'situationship advice',
    'couple challenge trend',
    'dating profile review',
    'single life hot take',
  ],
};

const GAMING: CategoryConfig = {
  name: 'Gaming',
  slug: 'gaming',
  group: 'Technology & Digital',
  icon: 'gamepad-2',
  geo_scope: 'global',
  clients: [],
  keywords: [
    'gaming setup tour',
    'game review honest',
    'new game release gameplay',
    'gaming clip highlight',
    'cozy gaming aesthetic',
    'game tier list ranking',
    'streamer funny moment',
    'gaming challenge attempt',
    'PC build showcase',
    'mobile game addictive',
  ],
};

const HEALTH_WELLBEING: CategoryConfig = {
  name: 'Health & Wellbeing',
  slug: 'health-wellbeing',
  group: 'Health & Wellbeing',
  icon: 'heart-pulse',
  geo_scope: 'au',
  clients: ['Vic Dept of Health', 'Cancer Council Victoria'],
  keywords: [
    'healthy habit morning routine',
    'what I eat in a day healthy',
    'supplement stack review',
    'gut health hack tip',
    'sleep routine wind down',
    'health check honest story',
    'wellness routine daily',
    'blood test results explained',
    'healthy swap alternative',
    'water intake challenge',
  ],
};

const FITNESS: CategoryConfig = {
  name: 'Fitness',
  slug: 'fitness',
  group: 'Health & Wellbeing',
  icon: 'dumbbell',
  geo_scope: 'global',
  clients: [],
  keywords: [
    'gym transformation progress',
    'workout split routine',
    'gymtok leg day',
    'running challenge training',
    'protein shake recipe',
    'hot girl walk routine',
    'cozy cardio home',
    'gym outfit OOTD',
    'form check technique',
    'home workout no equipment',
    'pilates body results',
    'gym motivation real',
  ],
};

const MENTAL_HEALTH: CategoryConfig = {
  name: 'Mental Health',
  slug: 'mental-health',
  group: 'Health & Wellbeing',
  icon: 'brain',
  geo_scope: 'global',
  clients: ['Smiling Mind', 'Neami'],
  keywords: [
    'mental health check in',
    'therapy session honest',
    'anxiety tips coping',
    'self care routine night',
    'burnout recovery story',
    'journaling prompt daily',
    'meditation for beginners',
    'emotional regulation tip',
    'mental health day routine',
    'healing journey update',
  ],
};

const SUSTAINABILITY_ENVIRONMENT: CategoryConfig = {
  name: 'Sustainability & Environment',
  slug: 'sustainability-environment',
  group: 'Purpose & Sustainability',
  icon: 'leaf',
  geo_scope: 'global',
  clients: ['Intrepid', 'Cleanaway', 'Sustainability Victoria'],
  keywords: [
    'sustainable swap easy',
    'zero waste challenge',
    'thrift flip upcycle',
    'eco friendly product review',
    'climate action protest',
    'plastic free alternative',
    'sustainable fashion haul',
    'compost hack beginner',
    'refill station shopping',
    'op shop haul thrift',
    'beach clean up volunteer',
    'carbon footprint reduce',
  ],
};

const ENERGY_UTILITIES: CategoryConfig = {
  name: 'Energy & Utilities',
  slug: 'energy-utilities',
  group: 'Purpose & Sustainability',
  icon: 'zap',
  geo_scope: 'au',
  clients: ['Origin Energy'],
  keywords: [
    'solar panel review home',
    'electricity bill reduce hack',
    'EV charging home setup',
    'energy saving tip winter',
    'power bill comparison',
    'battery storage home',
    'smart meter explained',
    'renewable energy explained',
    'heat pump vs gas',
    'energy audit home DIY',
  ],
};

const SPORTS: CategoryConfig = {
  name: 'Sports',
  slug: 'sports',
  group: 'Sports & Entertainment',
  icon: 'trophy',
  geo_scope: 'au',
  clients: ['ASICS', 'TAC'],
  keywords: [
    'AFL highlights best goals',
    'NRL try of the week',
    'cricket funny moment',
    'match day vlog game',
    'athlete day in life',
    'sports hot take opinion',
    'grand final reaction',
    'sports tier list ranking',
    'training routine athlete',
    'aussie rules footy',
    'tennis open highlights',
    'Olympic trials athlete',
  ],
};

const ENTERTAINMENT_CULTURE: CategoryConfig = {
  name: 'Entertainment & Culture',
  slug: 'entertainment-culture',
  group: 'Sports & Entertainment',
  icon: 'clapperboard',
  geo_scope: 'global',
  clients: ['Dylan Alcott Foundation', 'The Y Australia'],
  keywords: [
    'movie review no spoilers',
    'TV show recommendation',
    'celebrity drama explained',
    'pop culture hot take',
    'binge watch ranking',
    'reality TV recap',
    'streaming new release',
    'book recommendation booktok',
    'podcast recommendation',
    'red carpet fashion review',
    'award show reaction',
    'nostalgia throwback',
  ],
};

const ARTS: CategoryConfig = {
  name: 'Arts',
  slug: 'arts',
  group: 'Sports & Entertainment',
  icon: 'palette',
  geo_scope: 'global',
  clients: [],
  keywords: [
    'art process timelapse',
    'studio tour artist',
    'gallery exhibition review',
    'creative process behind scenes',
    'digital art tutorial',
    'street art mural',
    'art supply review haul',
    'painting technique tip',
    'pottery making satisfying',
    'art market stall',
  ],
};

const MUSIC: CategoryConfig = {
  name: 'Music',
  slug: 'music',
  group: 'Sports & Entertainment',
  icon: 'music',
  geo_scope: 'global',
  clients: [],
  keywords: [
    'new song reaction review',
    'viral sound trending audio',
    'concert vlog experience',
    'festival lineup reaction',
    'cover song acoustic',
    'music production beat',
    'album ranking tier list',
    'gig review live',
    'Splendour Laneway festival',
    'aussie artist new music',
    'DJ set live mix',
    'song recommendation playlist',
  ],
};

const GOVERNMENT_POLICY: CategoryConfig = {
  name: 'Government & Policy',
  slug: 'government-policy',
  group: 'Business & Government',
  icon: 'landmark',
  geo_scope: 'au',
  clients: ['TAC', 'Vic Dept of Health', 'Dept of Education'],
  keywords: [
    'budget explained simple',
    'new law rule change',
    'government announcement reaction',
    'cost of living update',
    'housing crisis explained',
    'Medicare change update',
    'tax return tips',
    'election explained simple',
    'public transport complaint',
    'education policy change',
  ],
};

const BUSINESS_FINANCE: CategoryConfig = {
  name: 'Business & Finance',
  slug: 'business-finance',
  group: 'Business & Government',
  icon: 'briefcase',
  geo_scope: 'global',
  clients: [],
  keywords: [
    'money saving hack budget',
    'side hustle idea income',
    'investing for beginners',
    'salary transparency reveal',
    'day in my life corporate',
    'work from home setup',
    'first home buyer tips',
    'finance tip for 20s',
    'stock market explained',
    'small business owner day',
  ],
};

const NEWS_CURRENT_AFFAIRS: CategoryConfig = {
  name: 'News & Current Affairs',
  slug: 'news-current-affairs',
  group: 'Social & Reactive',
  icon: 'newspaper',
  geo_scope: 'au',
  clients: [],
  keywords: [
    'breaking news explained',
    'news reaction hot take',
    'controversy explained simple',
    'what happened today',
    'drama recap explained',
    'fact check debunk',
    'Australian news update',
    'social issue debate',
    'protest rally coverage',
    'opinion unpopular take',
  ],
};

const TRENDS_MEMES: CategoryConfig = {
  name: 'Trends & Memes',
  slug: 'trends-memes',
  group: 'Social & Reactive',
  icon: 'trending-up',
  geo_scope: 'global',
  clients: [],
  keywords: [
    'trending sound viral audio',
    'meme compilation funny',
    'POV trend challenge',
    'storytime wild crazy',
    'tier list ranking hot take',
    'delulu trend delusional',
    'roman empire equivalent',
    'relatable moment skit',
    'trend attempt fail',
    'duet reaction stitch',
    'TikTok trend tutorial',
    'cultural moment reaction',
  ],
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/** Flat array of all 25 categories */
export const CATEGORIES: CategoryConfig[] = [
  // Consumer & Lifestyle
  FOOD_BEVERAGE,
  RETAIL,
  FASHION,
  HOME_LIFESTYLE,
  PARENTING_FAMILY,
  PETS_ANIMALS,
  // Travel & Transport
  TRAVEL_OUTDOORS,
  AUTOMOTIVE,
  // Technology & Digital
  TECHNOLOGY_APPS,
  DATING_RELATIONSHIPS,
  GAMING,
  // Health & Wellbeing
  HEALTH_WELLBEING,
  FITNESS,
  MENTAL_HEALTH,
  // Purpose & Sustainability
  SUSTAINABILITY_ENVIRONMENT,
  ENERGY_UTILITIES,
  // Sports & Entertainment
  SPORTS,
  ENTERTAINMENT_CULTURE,
  ARTS,
  MUSIC,
  // Business & Government
  GOVERNMENT_POLICY,
  BUSINESS_FINANCE,
  // Social & Reactive
  NEWS_CURRENT_AFFAIRS,
  TRENDS_MEMES,
];

/** Categories organised by group */
export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    name: 'Consumer & Lifestyle',
    categories: [FOOD_BEVERAGE, RETAIL, FASHION, HOME_LIFESTYLE, PARENTING_FAMILY, PETS_ANIMALS],
  },
  {
    name: 'Travel & Transport',
    categories: [TRAVEL_OUTDOORS, AUTOMOTIVE],
  },
  {
    name: 'Technology & Digital',
    categories: [TECHNOLOGY_APPS, DATING_RELATIONSHIPS, GAMING],
  },
  {
    name: 'Health & Wellbeing',
    categories: [HEALTH_WELLBEING, FITNESS, MENTAL_HEALTH],
  },
  {
    name: 'Purpose & Sustainability',
    categories: [SUSTAINABILITY_ENVIRONMENT, ENERGY_UTILITIES],
  },
  {
    name: 'Sports & Entertainment',
    categories: [SPORTS, ENTERTAINMENT_CULTURE, ARTS, MUSIC],
  },
  {
    name: 'Business & Government',
    categories: [GOVERNMENT_POLICY, BUSINESS_FINANCE],
  },
  {
    name: 'Social & Reactive',
    categories: [NEWS_CURRENT_AFFAIRS, TRENDS_MEMES],
  },
];

/** Look up a single category by its slug */
export function getCategoryBySlug(slug: string): CategoryConfig | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

/** Get all categories belonging to a group */
export function getCategoriesByGroup(groupName: string): CategoryConfig[] {
  return CATEGORIES.filter((c) => c.group === groupName);
}

/** Maps client name to the category names they are associated with */
export const CLIENT_CATEGORY_MAP: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {};
  for (const cat of CATEGORIES) {
    for (const client of cat.clients) {
      if (!map[client]) {
        map[client] = [];
      }
      map[client].push(cat.name);
    }
  }
  return map;
})();
