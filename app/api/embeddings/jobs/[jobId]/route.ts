import { NextResponse } from 'next/server';

const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || 'http://127.0.0.1:8001';
const CONTROL_ACTIONS = new Set(['pause', 'resume', 'cancel']);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const response = await fetch(`${EMBEDDING_SERVICE_URL}/jobs/${jobId}`, {
      method: 'GET',
      cache: 'no-store',
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to get embedding job status',
        details: String(error),
      },
      { status: 503 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '').toLowerCase();

    if (!CONTROL_ACTIONS.has(action)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid action. Use pause, resume, or cancel.',
        },
        { status: 400 }
      );
    }

    const response = await fetch(`${EMBEDDING_SERVICE_URL}/jobs/${jobId}/${action}`, {
      method: 'POST',
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
        error: 'Failed to control embedding job',
        details: String(error),
      },
      { status: 503 }
    );
  }
}
