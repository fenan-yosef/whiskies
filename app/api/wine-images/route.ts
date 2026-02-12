import { NextResponse } from 'next/server';
import pool, { query } from '../../../lib/db';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const productId = url.searchParams.get('product_id');

    if (!productId) {
      return NextResponse.json({ success: false, error: 'Missing product_id' }, { status: 400 });
    }

    const rows: any[] = await query(
      'SELECT * FROM wine_product_images WHERE product_id = ? ORDER BY position ASC',
      [productId]
    );

    // convert any binary blobs to base64 data urls when present
    const images = rows.map((r) => {
      let data_url = null as string | null;
      try {
        if (r.img_blob) {
          const b = Buffer.from(r.img_blob);
          const base64 = b.toString('base64');
          data_url = `data:image/jpeg;base64,${base64}`;
        }
      } catch (e) {
        // ignore conversion errors
      }
      return {
        id: r.id,
        product_id: r.product_id,
        url: r.url,
        data_url,
        position: r.position,
      };
    });

    return NextResponse.json({ success: true, data: images });
  } catch (err) {
    console.error('GET /api/wine-images error', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { product_id, url, img_blob, position } = body;

    if (!product_id) {
      return NextResponse.json({ success: false, error: 'Missing product_id' }, { status: 400 });
    }

    const sql = `INSERT INTO wine_product_images (product_id, url, img_blob, position) VALUES (?, ?, ?, ?)`;
    const vals = [
      product_id,
      url || null,
      img_blob || null,
      position || 0,
    ];

    const result = await query(sql, vals);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error('POST /api/wine-images error', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });

    const fields = [] as string[];
    const vals = [] as any[];
    const allowed = ['product_id', 'url', 'img_blob', 'position'];
    for (const k of allowed) {
      if (k in body) {
        fields.push(`${k} = ?`);
        vals.push(body[k]);
      }
    }
    if (fields.length === 0) return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });

    vals.push(body.id);
    const sql = `UPDATE wine_product_images SET ${fields.join(', ')} WHERE id = ?`;
    const result = await query(sql, vals);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error('PUT /api/wine-images error', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    const result = await query(`DELETE FROM wine_product_images WHERE id = ?`, [id]);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error('DELETE /api/wine-images error', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}