import { NextResponse } from 'next/server';

const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || 'http://127.0.0.1:8001';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const image = formData.get('image');
    const topKRaw = formData.get('top_k');
    const topK = Number(topKRaw || 10);

    if (!(image instanceof File)) {
      return NextResponse.json({ ok: false, error: 'Missing image file' }, { status: 400 });
    }

    const proxyForm = new FormData();
    proxyForm.set('image', image, image.name || 'query.jpg');
    proxyForm.set('top_k', String(Number.isFinite(topK) ? topK : 10));

    const response = await fetch(`${EMBEDDING_SERVICE_URL}/search`, {
      method: 'POST',
      body: proxyForm,
      cache: 'no-store',
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to run embedding search',
        details: String(error),
      },
      { status: 503 }
    );
  }
}
