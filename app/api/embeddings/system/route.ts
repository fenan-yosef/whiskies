import { NextResponse } from 'next/server';

const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || 'http://127.0.0.1:8001';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') || '80';

    const response = await fetch(`${EMBEDDING_SERVICE_URL}/system/status?limit=${encodeURIComponent(limit)}`, {
      method: 'GET',
      cache: 'no-store',
    });

    const text = await response.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { ok: response.ok, message: text || 'No response body' };
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to load system status',
        details: String(error),
      },
      { status: 503 }
    );
  }
}
