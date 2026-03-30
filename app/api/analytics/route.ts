import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';

type RawRow = {
  brand?: unknown;
  country?: unknown;
  category?: unknown;
  price?: unknown;
  abv?: unknown;
  volume?: unknown;
  description?: unknown;
};

function parseNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const cleaned = value.replace(/[^0-9.-]/g, '').trim();
  if (!cleaned) {
    return null;
  }

  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeLabel(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function isNonEmpty(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  return String(value).trim().length > 0;
}

function toRankedValues(map: Map<string, number>, limit: number) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({
      label,
      value,
    }));
}

export async function GET() {
  try {
    const [totalRow] = await query(`SELECT COUNT(*) as count FROM whisky_products`) as any[];
    const totalProducts = Number(totalRow?.count || 0);

    const [withImageRow] = await query(
      `SELECT COUNT(*) as count
         FROM whisky_products wp
        WHERE (wp.image_url IS NOT NULL AND TRIM(wp.image_url) <> '')
           OR EXISTS (
             SELECT 1
               FROM whisky_product_images i
              WHERE i.product_id = wp.id
                AND (
                  (i.img_blob IS NOT NULL AND OCTET_LENGTH(i.img_blob) > 0)
                  OR (i.url IS NOT NULL AND TRIM(i.url) <> '')
                )
           )`
    ) as any[];
    const withImageTotal = Number(withImageRow?.count || 0);

    const rows = await query(
      `SELECT brand, country, category, price, abv, volume, description
         FROM whisky_products`
    ) as RawRow[];

    const brandCounts = new Map<string, number>();
    const countryCounts = new Map<string, number>();
    const categoryCounts = new Map<string, number>();

    let brandFilled = 0;
    let countryFilled = 0;
    let categoryFilled = 0;
    let priceFilled = 0;
    let abvFilled = 0;
    let volumeFilled = 0;
    let descriptionFilled = 0;

    let priceCount = 0;
    let priceSum = 0;
    let abvCount = 0;
    let abvSum = 0;

    for (const row of rows) {
      const brand = normalizeLabel(row.brand, 'Unknown');
      const country = normalizeLabel(row.country, 'Unknown');
      const category = normalizeLabel(row.category, 'Uncategorized');

      brandCounts.set(brand, (brandCounts.get(brand) ?? 0) + 1);
      countryCounts.set(country, (countryCounts.get(country) ?? 0) + 1);
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);

      if (isNonEmpty(row.brand)) brandFilled += 1;
      if (isNonEmpty(row.country)) countryFilled += 1;
      if (isNonEmpty(row.category)) categoryFilled += 1;
      if (isNonEmpty(row.volume)) volumeFilled += 1;
      if (isNonEmpty(row.description)) descriptionFilled += 1;

      const parsedPrice = parseNullableNumber(row.price);
      if (parsedPrice !== null) {
        priceFilled += 1;
        priceCount += 1;
        priceSum += parsedPrice;
      }

      const parsedAbv = parseNullableNumber(row.abv);
      if (parsedAbv !== null) {
        abvFilled += 1;
        abvCount += 1;
        abvSum += parsedAbv;
      }
    }

    const scrapeRows = await query(
      `SELECT DATE_FORMAT(scraped_at, '%Y-%m-%d') as scrape_date,
              COUNT(*) as count
         FROM whisky_products
        WHERE scraped_at IS NOT NULL
        GROUP BY DATE_FORMAT(scraped_at, '%Y-%m-%d')
        ORDER BY scrape_date DESC
        LIMIT 14`
    ) as any[];

    const scrapeTrend = scrapeRows
      .map((row) => ({
        date: String(row.scrape_date),
        count: Number(row.count || 0),
      }))
      .reverse();

    const totalForRates = Math.max(totalProducts, 1);

    const qualitySeries = [
      { metric: 'Brand', fill: Math.round((brandFilled / totalForRates) * 100) },
      { metric: 'Country', fill: Math.round((countryFilled / totalForRates) * 100) },
      { metric: 'Category', fill: Math.round((categoryFilled / totalForRates) * 100) },
      { metric: 'Price', fill: Math.round((priceFilled / totalForRates) * 100) },
      { metric: 'ABV', fill: Math.round((abvFilled / totalForRates) * 100) },
      { metric: 'Volume', fill: Math.round((volumeFilled / totalForRates) * 100) },
      { metric: 'Description', fill: Math.round((descriptionFilled / totalForRates) * 100) },
    ];

    const qualityScore = qualitySeries.length
      ? Math.round(qualitySeries.reduce((sum, item) => sum + item.fill, 0) / qualitySeries.length)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalProducts,
          withImageTotal,
          withImageRate: totalProducts > 0 ? Math.round((withImageTotal / totalProducts) * 100) : 0,
          avgPrice: priceCount > 0 ? Number((priceSum / priceCount).toFixed(4)) : 0,
          avgAbv: abvCount > 0 ? Number((abvSum / abvCount).toFixed(4)) : 0,
          qualityScore,
          recordsAnalyzed: rows.length,
        },
        brandSeries: toRankedValues(brandCounts, 7),
        countrySeries: toRankedValues(countryCounts, 6),
        categorySeries: toRankedValues(categoryCounts, 5),
        scrapeTrend,
        qualitySeries,
      },
    });
  } catch (err) {
    console.error('GET /api/analytics error', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
