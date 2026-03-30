import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').trim();
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limitParam = parseInt(url.searchParams.get('limit') || '25', 10);
    const limit = Math.min(Math.max(limitParam || 25, 1), 200);
    const offset = (Math.max(page, 1) - 1) * limit;
    const sortByParam = (url.searchParams.get('sortBy') || 'id').toLowerCase();
    const sortOrderParam = (url.searchParams.get('sortOrder') || 'asc').toLowerCase();
    const sortBy = ['id', 'scraped_at'].includes(sortByParam) ? sortByParam : 'id';
    const sortOrder = sortOrderParam === 'desc' ? 'DESC' : 'ASC';
    const orderClause = `ORDER BY ${sortBy} ${sortOrder}, id ${sortOrder}`;
    const hasImages = url.searchParams.get('has_images') === '1';
    const hasReviews = url.searchParams.get('has_reviews') === '1';

    const whereParts: string[] = [];
    const whereParams: any[] = [];

    if (q) {
      // detect which searchable columns exist in the current DB/schema
      const dbName = process.env.DB_NAME || 'whisky_db';
      const colsRes = await query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'whisky_products'`,
        [dbName]
      ) as any[];
      const existingCols = colsRes.map((r) => r.COLUMN_NAME);
      const candidate = ['name', 'url', 'brand', 'description', 'category', 'region', 'country', 'distillery', 'style', 'vintage', 'age_years', 'bottling_year', 'categories_list'];
      const searchCols = candidate.filter((c) => existingCols.includes(c));

      // if none of the expected columns exist, return empty result set
      if (searchCols.length === 0) {
        return NextResponse.json({
          success: true,
          data: [],
          total: 0,
          total_rows: 0,
          total_distinct_urls: 0,
          total_with_image: 0,
          min_id: null,
          max_id: null,
          sortBy,
          sortOrder: sortOrder.toLowerCase(),
          page,
          limit,
          totalPages: 0,
          has_images: hasImages,
          has_reviews: hasReviews,
        });
      }

      // build a safe regex pattern from the query: escape regex chars, allow spaces to act like '.*'
      const escapeRegex = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const pattern = `(?i)${escapeRegex(q).replace(/\s+/g, '.*')}`; // (?i) for case-insensitive (MySQL 8+)
      whereParts.push(`(${searchCols.map((c) => `${c} REGEXP ?`).join(' OR ')})`);
      whereParams.push(...Array(searchCols.length).fill(pattern));
    }

    // exact-match filters from UI
    const filterCandidates = ['brand', 'category', 'region', 'country', 'distillery', 'style', 'vintage', 'age_years', 'bottling_year'];
    for (const f of filterCandidates) {
      const v = url.searchParams.get(f);
      if (v) {
        whereParts.push(`${f} = ?`);
        whereParams.push(v);
      }
    }

    if (hasImages) {
      whereParts.push(`((whisky_products.image_url IS NOT NULL AND TRIM(whisky_products.image_url) <> '') OR EXISTS (SELECT 1 FROM whisky_product_images i WHERE i.product_id = whisky_products.id AND ((i.img_blob IS NOT NULL AND OCTET_LENGTH(i.img_blob) > 0) OR (i.url IS NOT NULL AND TRIM(i.url) <> ''))))`);
    }

    if (hasReviews) {
      whereParts.push(`EXISTS (SELECT 1 FROM whisky_product_reviews r WHERE r.product_id = whisky_products.id)`);
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';
    const withImageCondition = `((whisky_products.image_url IS NOT NULL AND TRIM(whisky_products.image_url) <> '') OR EXISTS (SELECT 1 FROM whisky_product_images i WHERE i.product_id = whisky_products.id AND ((i.img_blob IS NOT NULL AND OCTET_LENGTH(i.img_blob) > 0) OR (i.url IS NOT NULL AND TRIM(i.url) <> ''))))`;
    const withImageWhere = whereClause ? `${whereClause} AND ${withImageCondition}` : `WHERE ${withImageCondition}`;

    const [totalRow] = (await query(`SELECT COUNT(*) as count FROM whisky_products ${whereClause}`, whereParams)) as any[];
    const total = Number(totalRow?.count || 0);

    const [rowsCount] = (await query(`SELECT COUNT(*) as count FROM whisky_products ${whereClause}`, whereParams)) as any[];
    const total_rows = Number(rowsCount?.count || 0);

    const [distinctCount] = (await query(`SELECT COUNT(DISTINCT url) as count FROM whisky_products ${whereClause}`, whereParams)) as any[];
    const total_distinct_urls = Number(distinctCount?.count || 0);

    const [withImageCount] = (await query(`SELECT COUNT(*) as count FROM whisky_products ${withImageWhere}`, whereParams)) as any[];
    const total_with_image = Number(withImageCount?.count || 0);

    const [idRange] = (await query(`SELECT MIN(id) as min_id, MAX(id) as max_id FROM whisky_products ${whereClause}`, whereParams)) as any[];
    const min_id = idRange?.min_id ?? null;
    const max_id = idRange?.max_id ?? null;

    // LIMIT/OFFSET cannot always be used as prepared-statement params on some MySQL setups
    const safeLimit = Number(limit) || 25;
    const safeOffset = Number(offset) || 0;
    const rows = await query(`SELECT * FROM whisky_products ${whereClause} ${orderClause} LIMIT ${safeLimit} OFFSET ${safeOffset}`, whereParams);

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
      has_images: hasImages,
      has_reviews: hasReviews,
    });
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error('GET /api/whiskies error', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sql = `INSERT INTO whisky_products (name, price, url, image_url, description, brand, source) VALUES (?,?,?,?,?,?,?)`;
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
    const sql = `UPDATE whisky_products SET ${fields.join(', ')} WHERE id = ?`;
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
    const result = await query(`DELETE FROM whisky_products WHERE id = ?`, [id]);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('DELETE /api/whiskies error', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
