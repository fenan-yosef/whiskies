import { NextResponse } from 'next/server';

const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || 'http://127.0.0.1:8001';

export async function GET() {
  try {
    const response = await fetch(`${EMBEDDING_SERVICE_URL}/health`, {
      method: 'GET',
      cache: 'no-store',
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Embedding service unavailable',
        details: String(error),
      },
      { status: 503 }
    );
  }
}
