import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    // Validate that the URL is http/https
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return new NextResponse('Invalid URL', { status: 400 });
    }

    const response = await fetch(url);

    if (!response.ok) {
      return new NextResponse(`Failed to fetch image: ${response.statusText}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type');
    
    // Validate content type is an image
    if (!contentType || !contentType.startsWith('image/')) {
      return new NextResponse('URL is not an image', { status: 400 });
    }

    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*', // Allow access from any origin (our frontend)
      },
    });
  } catch (error: any) {
    console.error('Proxy error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
