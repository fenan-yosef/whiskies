import { NextResponse } from 'next/server';

const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || 'http://127.0.0.1:8001';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ pid: string }> }
) {
  try {
    const { pid } = await params;
    const body = await req.json().catch(() => ({}));
    const force = Boolean(body?.force);

    const response = await fetch(`${EMBEDDING_SERVICE_URL}/system/processes/${encodeURIComponent(pid)}/terminate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ force }),
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
        error: 'Failed to terminate process',
        details: String(error),
      },
      { status: 503 }
    );
  }
}
