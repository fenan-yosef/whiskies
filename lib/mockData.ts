export interface Whisky {
  id: number;
  name: string;
  url: string;
  price: number | null;
  image_url: string;
  all_images?: string | string[];
  description: string;
  brand: string;
  source: string;
  scraped_at: string;
}

export const mockWhiskys: Whisky[] = [
  {
    id: 1,
    name: 'Chateau Margaux 2015',
    price: 450.00,
    url: 'https://example.com/chateau-margaux-2015',
    image_url: 'https://via.placeholder.com/300x400?text=Margaux',
    description: 'A prestigious Bordeaux whisky with exceptional aging potential.',
    brand: 'Chateau Margaux',
    source: 'whisky.com',
    scraped_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Opus One 2018',
    price: 350.00,
    url: 'https://example.com/opus-one-2018',
    image_url: 'https://via.placeholder.com/300x400?text=Opus+One',
    description: 'A blend of Cabernet Sauvignon and Merlot from Napa Valley.',
    brand: 'Opus One',
    source: 'whisky.com',
    scraped_at: new Date().toISOString(),
  },
  {
    id: 3,
    name: 'Domaine de la Romanée-Conti 2017',
    price: 1200.00,
    url: 'https://example.com/romanee-conti-2017',
    image_url: 'https://via.placeholder.com/300x400?text=Roman%C3%A9e-Conti',
    description: 'One of the most sought-after Pinot Noir whiskies from Burgundy.',
    brand: 'Domaine de la Romanée-Conti',
    source: 'whisky.com',
    scraped_at: new Date().toISOString(),
  },
  {
    id: 4,
    name: 'Penfolds Grange 2016',
    price: 650.00,
    url: 'https://example.com/penfolds-grange-2016',
    image_url: 'https://via.placeholder.com/300x400?text=Penfolds+Grange',
    description: 'Australia\'s most famous whisky, a powerful Shiraz blend.',
    brand: 'Penfolds',
    source: 'whisky.com',
    scraped_at: new Date().toISOString(),
  },
  {
    id: 5,
    name: 'Screaming Eagle Cabernet Sauvignon 2015',
    price: 2500.00,
    url: 'https://example.com/screaming-eagle-2015',
    image_url: 'https://via.placeholder.com/300x400?text=Screaming+Eagle',
    description: 'Ultra-rare Napa Valley Cabernet with legendary status.',
    brand: 'Screaming Eagle',
    source: 'whisky.com',
    scraped_at: new Date().toISOString(),
  },
];

// In-memory storage for mock data mutations
export let whiskiesStore = [...mockWhiskys];
let nextId = 6;

export function resetMockData() {
  whiskiesStore = [...mockWhiskys];
  nextId = 6;
}

export function searchWhiskys(query: string): Whisky[] {
  const lowerQuery = query.toLowerCase();
  return whiskiesStore.filter((whisky) => {
    return (
      whisky.name.toLowerCase().includes(lowerQuery) ||
      whisky.brand.toLowerCase().includes(lowerQuery) ||
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
