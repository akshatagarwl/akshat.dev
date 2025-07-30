import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: '/((?!api/|_next/|favicon\\.ico).*)',
};

export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') || '').toLowerCase();

  if (host === 'resume.akshat.dev') {
    const url = req.nextUrl.clone();
    url.pathname = '/api/resume';
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}
