const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || 'http://127.0.0.1:8001';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const { imageId } = await params;
    const response = await fetch(`${EMBEDDING_SERVICE_URL}/image/${imageId}`, {
      method: 'GET',
      cache: 'no-store',
      redirect: 'follow',
    });

    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => 'Image unavailable');
      return new Response(text || 'Image unavailable', { status: response.status || 404 });
    }

    const headers = new Headers();
    headers.set('Content-Type', response.headers.get('content-type') || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=300');

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    return new Response(`Failed to load image: ${String(error)}`, { status: 503 });
  }
}
