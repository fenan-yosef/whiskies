import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';

const allowed = ['brand','category','region','country','distillery','style','vintage','age_years','bottling_year','categories_list'];

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const field = url.searchParams.get('field');
    if (!field || !allowed.includes(field)) {
      return NextResponse.json({ success: false, error: 'Invalid field' }, { status: 400 });
    }

    const rows = await query(`SELECT DISTINCT ${field} as v FROM wine_products WHERE ${field} IS NOT NULL AND ${field} <> '' ORDER BY ${field} ASC LIMIT 100` ) as any[];
    const values = rows.map(r => r.v).filter(Boolean);
    return NextResponse.json({ success: true, data: values });
  } catch (err) {
    console.error('GET /api/whiskies/filters error', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
