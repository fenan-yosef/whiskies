import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const productId = url.searchParams.get('product_id');

    if (!productId) {
      return NextResponse.json({ success: false, error: 'Missing product_id' }, { status: 400 });
    }

    const productIdNum = Number(productId);
    if (!Number.isFinite(productIdNum) || productIdNum <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid product_id' }, { status: 400 });
    }

    const rows = await query(
      `SELECT id, product_id, reviewer, rating, rating_max, review_text, review_date, helpful_votes, is_verified_purchase, source, scraped_at
         FROM whisky_product_reviews
        WHERE product_id = ?
        ORDER BY scraped_at DESC, id DESC
        LIMIT 100`,
      [productIdNum]
    ) as any[];

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('GET /api/whisky-reviews error', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
