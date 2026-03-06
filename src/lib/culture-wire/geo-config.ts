export const AUSTRALIAN_DOMAINS: string[] = [
  // All .au TLDs
  '.au', '.com.au',
  // Major News/Media
  'abc.net.au', 'sbs.com.au', 'news.com.au', 'smh.com.au', 'theaustralian.com.au',
  'afr.com', 'theage.com.au', 'heraldsun.com.au', 'dailytelegraph.com.au',
  'couriermail.com.au', 'perthnow.com.au', 'adelaidenow.com.au', 'themercury.com.au',
  'thewest.com.au', 'canberratimes.com.au', '9news.com.au', '7news.com.au',
  '10daily.com.au', 'theguardian.com/au',
  // Industry/Marketing
  'mumbrella.com.au', 'adnews.com.au', 'bandt.com.au', 'campaignbrief.com', 'marketingmag.com.au',
  // Lifestyle/Culture
  'pedestrian.tv', 'junkee.com', 'mamamia.com.au', 'whimn.com.au', 'themusic.com.au',
  'broadsheet.com.au', 'timeout.com/sydney', 'timeout.com/melbourne', 'concrete-playground.com',
  'urbanlist.com', 'delicious.com.au', 'goodfood.com.au',
  // Business/Tech
  'smartcompany.com.au', 'startupdaily.net', 'itnews.com.au', 'zdnet.com.au',
];

export const AUSTRALIAN_LOCATIONS: string[] = [
  'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Canberra',
  'Gold Coast', 'Newcastle', 'Wollongong', 'Hobart', 'Darwin', 'Australia',
  'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT',
];

export const AUSTRALIAN_CULTURAL_SIGNALS: string[] = [
  'straya', 'aussie', 'mate', 'arvo', 'servo', 'maccas', 'bunnings', 'woolies',
  'coles', 'aldi australia', 'footy', 'AFL', 'NRL', 'sausage sizzle', 'snag',
  'barbie', 'brekky', 'bottlo', 'goon', 'thongs', 'esky', 'ute', 'tradie',
  'centrelink', 'medicare', 'anzac', 'struth', 'crikey', 'bonza', 'ripper',
];

export const GEO_BOOST_MULTIPLIER = 1.35;

/**
 * Check if content has Australian signals and return boost multiplier.
 * Returns 1.35 for AU-relevant content, 1.0 for everything else.
 */
export function getGeoBoost(content: string, url?: string): number {
  const lowerContent = content.toLowerCase();

  // Check URL domains
  if (url) {
    const lowerUrl = url.toLowerCase();
    for (const domain of AUSTRALIAN_DOMAINS) {
      if (lowerUrl.includes(domain)) return GEO_BOOST_MULTIPLIER;
    }
  }

  // Check locations
  for (const location of AUSTRALIAN_LOCATIONS) {
    if (lowerContent.includes(location.toLowerCase())) return GEO_BOOST_MULTIPLIER;
  }

  // Check cultural signals
  for (const signal of AUSTRALIAN_CULTURAL_SIGNALS) {
    if (lowerContent.includes(signal.toLowerCase())) return GEO_BOOST_MULTIPLIER;
  }

  return 1.0;
}
