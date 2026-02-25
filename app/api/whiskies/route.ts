import { NextResponse } from 'next/server';
import pool, { query } from '../../../lib/db';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('q') || '';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limitParam = parseInt(url.searchParams.get('limit') || '25', 10);
    const limit = Math.min(Math.max(limitParam || 25, 1), 200);
    const offset = (Math.max(page, 1) - 1) * limit;
    const sortByParam = (url.searchParams.get('sortBy') || 'id').toLowerCase();
    const sortOrderParam = (url.searchParams.get('sortOrder') || 'asc').toLowerCase();
    const sortBy = ['id', 'scraped_at'].includes(sortByParam) ? sortByParam : 'id';
    const sortOrder = sortOrderParam === 'desc' ? 'DESC' : 'ASC';
    const orderClause = `ORDER BY ${sortBy} ${sortOrder}, id ${sortOrder}`;

    let rows;
    let total;
    let total_rows: number | null = null;
    let total_distinct_urls: number | null = null;
    let total_with_image: number | null = null;
    let min_id: number | null = null;
    let max_id: number | null = null;
    if (q) {
      // detect which searchable columns exist in the current DB/schema
      const dbName = process.env.DB_NAME || 'whisky_db';
      const colsRes = await query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'wine_products'`,
        [dbName]
      ) as any[];
      const existingCols = colsRes.map((r) => r.COLUMN_NAME);
      const candidate = ['name', 'url', 'brand', 'description'];
      const searchCols = candidate.filter((c) => existingCols.includes(c));

      // if none of the expected columns exist, return empty result set
      if (searchCols.length === 0) {
        return NextResponse.json({ success: true, data: [], total: 0, totalPages: 0, page, limit });
      }

      // build a safe regex pattern from the query: escape regex chars, allow spaces to act like '.*'
      const escapeRegex = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const pattern = `(?i)${escapeRegex(q).replace(/\s+/g, '.*')}`; // (?i) for case-insensitive (MySQL 8+)
      // build WHERE clause dynamically using only the available columns
      const whereParts = searchCols.map((c) => `${c} REGEXP ?`).join(' OR ');
      const params = Array(searchCols.length).fill(pattern);

      const [totalRow] = await query(`SELECT COUNT(*) as count FROM wine_products WHERE ${whereParts}`, params) as any;
      total = totalRow.count;
      // additional debug counts for filtered set
      const [rowsCount] = await query(`SELECT COUNT(*) as count FROM wine_products WHERE ${whereParts}`, params) as any;
      total_rows = rowsCount.count;
      const [distinctCount] = await query(`SELECT COUNT(DISTINCT url) as count FROM wine_products WHERE ${whereParts}`, params) as any;
      total_distinct_urls = distinctCount.count;
      const [withImageCount] = await query(
        `SELECT COUNT(*) as count FROM wine_products wp WHERE (${whereParts}) AND ((wp.image_url IS NOT NULL AND wp.image_url <> '') OR EXISTS (SELECT 1 FROM wine_product_images i WHERE i.product_id = wp.id AND ((i.img_blob IS NOT NULL AND OCTET_LENGTH(i.img_blob) > 0) OR (i.url IS NOT NULL AND i.url <> ''))))`,
        params
      ) as any;
      total_with_image = withImageCount.count;
      const [idRange] = await query(
        `SELECT MIN(id) as min_id, MAX(id) as max_id FROM wine_products WHERE ${whereParts}`,
        params
      ) as any;
      min_id = idRange.min_id;
      max_id = idRange.max_id;
      // LIMIT/OFFSET cannot always be used as prepared-statement params on some MySQL setups
      const safeLimit = Number(limit) || 25;
      const safeOffset = Number(offset) || 0;
      rows = await query(`SELECT * FROM wine_products WHERE ${whereParts} ${orderClause} LIMIT ${safeLimit} OFFSET ${safeOffset}`, params);
    } else {
      const [totalRow] = await query(`SELECT COUNT(*) as count FROM wine_products`) as any;
      total = totalRow.count;
      // global additional counts
      const [totalRowsRow] = await query(`SELECT COUNT(*) as count FROM wine_products`) as any;
      total_rows = totalRowsRow.count;
      const [distinctCount] = await query(`SELECT COUNT(DISTINCT url) as count FROM wine_products`) as any;
      total_distinct_urls = distinctCount.count;
      const [withImageCount] = await query(`SELECT COUNT(*) as count FROM wine_products wp WHERE (wp.image_url IS NOT NULL AND wp.image_url <> '') OR EXISTS (SELECT 1 FROM wine_product_images i WHERE i.product_id = wp.id AND ((i.img_blob IS NOT NULL AND OCTET_LENGTH(i.img_blob) > 0) OR (i.url IS NOT NULL AND i.url <> '')))` ) as any;
      total_with_image = withImageCount.count;
      const [idRange] = await query(`SELECT MIN(id) as min_id, MAX(id) as max_id FROM wine_products`) as any;
      min_id = idRange.min_id;
      max_id = idRange.max_id;
      const safeLimit = Number(limit) || 25;
      const safeOffset = Number(offset) || 0;
      rows = await query(`SELECT * FROM wine_products ${orderClause} LIMIT ${safeLimit} OFFSET ${safeOffset}`);
    }

    return NextResponse.json({
      success: true,
      data: rows,
      total,
      total_rows,
      total_distinct_urls,
      total_with_image,
      min_id,
      max_id,
      sortBy,
      sortOrder: sortOrder.toLowerCase(),
      page,
      limit,
      totalPages: Math.ceil(Number(total || 0) / Number(limit || 25)),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('GET /api/whiskies error', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sql = `INSERT INTO wine_products (name, price, url, image_url, description, brand, source) VALUES (?,?,?,?,?,?,?)`;
    const vals = [
      body.name || null,
      body.price || null,
      body.url || null,
      body.image_url || null,
      body.description || null,
      body.brand || null,
      body.source || null,
    ];

    const result = await query(sql, vals);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('POST /api/whiskies error', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });

    const fields = [] as string[];
    const vals = [] as any[];
    const allowed = ['name','price','url','image_url','description','brand','source'];
    for (const k of allowed) {
      if (k in body) {
        fields.push(`${k} = ?`);
        vals.push(body[k]);
      }
    }
    if (fields.length === 0) return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });

    vals.push(body.id);
    const sql = `UPDATE wine_products SET ${fields.join(', ')} WHERE id = ?`;
    const result = await query(sql, vals);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('PUT /api/whiskies error', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    const result = await query(`DELETE FROM wine_products WHERE id = ?`, [id]);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('DELETE /api/whiskies error', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
