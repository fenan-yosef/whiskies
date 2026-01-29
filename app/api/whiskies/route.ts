import { NextResponse } from 'next/server';
import pool, { query } from '../../../lib/db';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('q') || '';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '25', 10);
    const offset = (Math.max(page, 1) - 1) * limit;

    let rows;
    let total;
    if (q) {
      const like = `%${q}%`;
      const [totalRow] = await query(
        `SELECT COUNT(*) as count FROM whiskies WHERE name LIKE ? OR distillery LIKE ? OR region LIKE ? OR description LIKE ?`,
        [like, like, like, like]
      ) as any;
      total = totalRow.count;
      rows = await query(
        `SELECT * FROM whiskies WHERE name LIKE ? OR distillery LIKE ? OR region LIKE ? OR description LIKE ? ORDER BY scraped_at DESC LIMIT ? OFFSET ?`,
        [like, like, like, like, limit, offset]
      );
    } else {
      const [totalRow] = await query(`SELECT COUNT(*) as count FROM whiskies`) as any;
      total = totalRow.count;
      rows = await query(`SELECT * FROM whiskies ORDER BY scraped_at DESC LIMIT ? OFFSET ?`, [limit, offset]);
    }

    return NextResponse.json({ success: true, data: rows, total, page, limit });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('GET /api/whiskies error', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sql = `INSERT INTO whiskies (name, price, url, image_url, image_data, volume, abv, description, distillery, region, age, cask_type, tasting_notes, source, month) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    const vals = [
      body.name || null,
      body.price || null,
      body.url || null,
      body.image_url || null,
      body.image_data || null,
      body.volume || null,
      body.abv || null,
      body.description || null,
      body.distillery || null,
      body.region || null,
      body.age || null,
      body.cask_type || null,
      body.tasting_notes || null,
      body.source || null,
      body.month || null,
    ];

    const [result] = await pool.execute(sql, vals as any);

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
    const allowed = ['name','price','url','image_url','image_data','volume','abv','description','distillery','region','age','cask_type','tasting_notes','source','month'];
    for (const k of allowed) {
      if (k in body) {
        fields.push(`${k} = ?`);
        vals.push(body[k]);
      }
    }
    if (fields.length === 0) return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });

    vals.push(body.id);
    const sql = `UPDATE whiskies SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await pool.execute(sql, vals as any);
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
    const [result] = await pool.execute(`DELETE FROM whiskies WHERE id = ?`, [id]);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('DELETE /api/whiskies error', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
