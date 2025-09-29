import { NextRequest, NextResponse } from 'next/server';

// Edge Runtime 対応の軽量な認証検証
async function verifyAuthToken(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    
    // Firebase ID Token の検証（Edge Runtime 対応）
    const response = await fetch(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=AIzaSyCvX4cKWKtn_qnh3CV-d1UC4GEiVpdPB9w`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idToken: token
      })
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.users?.[0]?.localId || null;
  } catch (error) {
    console.error('Auth verification error:', error);
    return null;
  }
}

export function middleware(request: NextRequest) {
  return createAuthMiddleware(request);
}

async function createAuthMiddleware(request: NextRequest) {
  // パブリックエンドポイントは除外
  const publicPaths = ['/api/helloWorld', '/api/test'];
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path));
  
  if (isPublicPath) {
    return NextResponse.next();
  }

  // 静的ページ（ガイドページなど）は認証不要
  const staticPages = ['/instagram/guide', '/terms', '/login', '/sns-select'];
  const isStaticPage = staticPages.some(path => request.nextUrl.pathname.startsWith(path));
  
  if (isStaticPage) {
    return NextResponse.next();
  }

  // 認証が必要なエンドポイント
  const userId = await verifyAuthToken(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // リクエストヘッダーにuserIdを追加
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', userId);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/api/analytics/:path*',
    '/api/posts/:path*',
    '/api/plans/:path*',
    '/api/notifications/:path*',
    '/api/user/:path*',
    '/api/admin/:path*',
  ],
};
