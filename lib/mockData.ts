export interface Whisky {
  id: number;
  name: string;
  price: string;
  url: string;
  image_url: string;
  image_data: string | null;
  volume: string;
  abv: string;
  description: string;
  distillery: string;
  region: string;
  age: string;
  cask_type: string;
  tasting_notes: string;
  source: string;
  month: string;
  scraped_at: string;
}

export const mockWhiskies: Whisky[] = [
  {
    id: 1,
    name: 'Glenmorangie The Original',
    price: '$45.99',
    url: 'https://example.com/glenmorangie-original',
    image_url: 'https://via.placeholder.com/300x400?text=Glenmorangie',
    image_data: null,
    volume: '700ml',
    abv: '40%',
    description: 'A light, delicate and elegant single malt Scotch whisky with a fresh citrus character.',
    distillery: 'Glenmorangie',
    region: 'Highlands',
    age: '10 years',
    cask_type: 'ex-Bourbon',
    tasting_notes: 'Citrus, floral, vanilla',
    source: 'distillery',
    month: 'January',
    scraped_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Macallan 12 Year Old',
    price: '$89.99',
    url: 'https://example.com/macallan-12',
    image_url: 'https://via.placeholder.com/300x400?text=Macallan',
    image_data: null,
    volume: '700ml',
    abv: '43%',
    description: 'Rich and golden with a complex character reflecting years of maturation in sherry oak.',
    distillery: 'Macallan',
    region: 'Speyside',
    age: '12 years',
    cask_type: 'Sherry Oak',
    tasting_notes: 'Sherry, spice, oak',
    source: 'distributor',
    month: 'January',
    scraped_at: new Date().toISOString(),
  },
  {
    id: 3,
    name: 'Dalwhinnie Winter\'s Gold',
    price: '$39.99',
    url: 'https://example.com/dalwhinnie-winters-gold',
    image_url: 'https://via.placeholder.com/300x400?text=Dalwhinnie',
    image_data: null,
    volume: '700ml',
    abv: '43%',
    description: 'A honey-coloured whisky with a rich, smooth and warming character.',
    distillery: 'Dalwhinnie',
    region: 'Highlands',
    age: '15 years',
    cask_type: 'European oak',
    tasting_notes: 'Honey, heather, warm spice',
    source: 'retailer',
    month: 'January',
    scraped_at: new Date().toISOString(),
  },
  {
    id: 4,
    name: 'Oban 14 Year Old',
    price: '$64.99',
    url: 'https://example.com/oban-14',
    image_url: 'https://via.placeholder.com/300x400?text=Oban',
    image_data: null,
    volume: '700ml',
    abv: '43%',
    description: 'A gentle, complex and fully rounded malt from the remote west coast of Scotland.',
    distillery: 'Oban',
    region: 'West Highlands',
    age: '14 years',
    cask_type: 'ex-Bourbon',
    tasting_notes: 'Sea salt, pepper, smoke',
    source: 'distillery',
    month: 'January',
    scraped_at: new Date().toISOString(),
  },
  {
    id: 5,
    name: 'Laphroaig 10 Year Old',
    price: '$49.99',
    url: 'https://example.com/laphroaig-10',
    image_url: 'https://via.placeholder.com/300x400?text=Laphroaig',
    image_data: null,
    volume: '700ml',
    abv: '40%',
    description: 'A full-bodied, complex, heavily peated Islay malt with a characterful peppery finish.',
    distillery: 'Laphroaig',
    region: 'Islay',
    age: '10 years',
    cask_type: 'ex-Bourbon',
    tasting_notes: 'Peat, smoke, sea salt',
    source: 'retailer',
    month: 'January',
    scraped_at: new Date().toISOString(),
  },
];

// In-memory storage for mock data mutations
export let whiskiesStore = [...mockWhiskies];
let nextId = 6;

export function resetMockData() {
  whiskiesStore = [...mockWhiskies];
  nextId = 6;
}

export function searchWhiskies(query: string): Whisky[] {
  const lowerQuery = query.toLowerCase();
  return whiskiesStore.filter((whisky) => {
    return (
      whisky.name.toLowerCase().includes(lowerQuery) ||
      whisky.distillery.toLowerCase().includes(lowerQuery) ||
      whisky.region.toLowerCase().includes(lowerQuery) ||
      whisky.description.toLowerCase().includes(lowerQuery)
    );
  });
}

export function addWhiskyToStore(whisky: Omit<Whisky, 'id' | 'scraped_at'>): Whisky {
  const newWhisky: Whisky = {
    ...whisky,
    id: nextId++,
    scraped_at: new Date().toISOString(),
  };
  whiskiesStore.push(newWhisky);
  return newWhisky;
}

export function updateWhiskyInStore(id: number, updates: Partial<Whisky>): Whisky | null {
  const index = whiskiesStore.findIndex((w) => w.id === id);
  if (index === -1) return null;
  whiskiesStore[index] = { ...whiskiesStore[index], ...updates, id, scraped_at: new Date().toISOString() };
  return whiskiesStore[index];
}

export function deleteWhiskyFromStore(id: number): boolean {
  const index = whiskiesStore.findIndex((w) => w.id === id);
  if (index === -1) return false;
  whiskiesStore.splice(index, 1);
  return true;
}
