export interface Wine {
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

export const mockWines: Wine[] = [
  {
    id: 1,
    name: 'Chateau Margaux 2015',
    price: 450.00,
    url: 'https://example.com/chateau-margaux-2015',
    image_url: 'https://via.placeholder.com/300x400?text=Margaux',
    description: 'A prestigious Bordeaux wine with exceptional aging potential.',
    brand: 'Chateau Margaux',
    source: 'wine.com',
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
    source: 'wine.com',
    scraped_at: new Date().toISOString(),
  },
  {
    id: 3,
    name: 'Domaine de la Romanée-Conti 2017',
    price: 1200.00,
    url: 'https://example.com/romanee-conti-2017',
    image_url: 'https://via.placeholder.com/300x400?text=Roman%C3%A9e-Conti',
    description: 'One of the most sought-after Pinot Noir wines from Burgundy.',
    brand: 'Domaine de la Romanée-Conti',
    source: 'wine.com',
    scraped_at: new Date().toISOString(),
  },
  {
    id: 4,
    name: 'Penfolds Grange 2016',
    price: 650.00,
    url: 'https://example.com/penfolds-grange-2016',
    image_url: 'https://via.placeholder.com/300x400?text=Penfolds+Grange',
    description: 'Australia\'s most famous wine, a powerful Shiraz blend.',
    brand: 'Penfolds',
    source: 'wine.com',
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
    source: 'wine.com',
    scraped_at: new Date().toISOString(),
  },
];

// In-memory storage for mock data mutations
export let winesStore = [...mockWines];
let nextId = 6;

export function resetMockData() {
  winesStore = [...mockWines];
  nextId = 6;
}

export function searchWines(query: string): Wine[] {
  const lowerQuery = query.toLowerCase();
  return winesStore.filter((wine) => {
    return (
      wine.name.toLowerCase().includes(lowerQuery) ||
      wine.brand.toLowerCase().includes(lowerQuery) ||
      wine.description.toLowerCase().includes(lowerQuery)
    );
  });
}

export function addWineToStore(wine: Omit<Wine, 'id' | 'scraped_at'>): Wine {
  const newWine: Wine = {
    ...wine,
    id: nextId++,
    scraped_at: new Date().toISOString(),
  };
  winesStore.push(newWine);
  return newWine;
}

export function updateWineInStore(id: number, updates: Partial<Wine>): Wine | null {
  const index = winesStore.findIndex((w) => w.id === id);
  if (index === -1) return null;
  winesStore[index] = { ...winesStore[index], ...updates, id, scraped_at: new Date().toISOString() };
  return winesStore[index];
}

export function deleteWineFromStore(id: number): boolean {
  const index = winesStore.findIndex((w) => w.id === id);
  if (index === -1) return false;
  winesStore.splice(index, 1);
  return true;
}
