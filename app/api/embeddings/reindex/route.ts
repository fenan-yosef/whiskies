import { NextResponse } from 'next/server';

const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || 'http://127.0.0.1:8001';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const response = await fetch(`${EMBEDDING_SERVICE_URL}/reindex`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body || {}),
      cache: 'no-store',
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to trigger reindex',
        details: String(error),
      },
      { status: 503 }
    );
  }
}
