import { NextResponse, type NextRequest } from 'next/server'

const locales = ['ar', 'en'] as const;
const defaultLocale = 'ar';

const existingRoutes = [
  '/login',
  '/register',
  '/forgot-password',
  '/pricing',
  '/about',
  '/terms',
  '/privacy',
  '/contact',
  '/bio',
  '/success',
  '/failure',
  '/status',
  '/blog',
  '/refer',
  '/register-affiliate',
  '/owner',
  '/admin',
  '/menu',
  '/hub',
  '/ai',
  '/branches',
  '/reviews',
  '/chat',
  '/support',
  '/oauth',
  '/ticket',
];

function isExistingRoute(pathname: string): boolean {
  if (pathname === '/') return true;
  for (const route of existingRoutes) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return true;
    }
  }
  return false;
}

function getLocaleFromPath(pathname: string): string | null {
  const segments = pathname.split('/');
  const firstSegment = segments[1];
  if (locales.includes(firstSegment as any)) {
    return firstSegment;
  }
  return null;
}

function getPreferredLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && locales.includes(cookieLocale as any)) {
    return cookieLocale;
  }
  
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const preferred = acceptLanguage.split(',')[0].split('-')[0].toLowerCase();
    if (preferred === 'en') return 'en';
  }
  
  return defaultLocale;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  const pathLocale = getLocaleFromPath(pathname);
  
  if (pathLocale) {
    const response = NextResponse.next({
      request: { headers: request.headers },
    });
    response.cookies.set('NEXT_LOCALE', pathLocale, { path: '/', maxAge: 60 * 60 * 24 * 365 });
    return response;
  }
  
  if (isExistingRoute(pathname)) {
    const response = NextResponse.next({
      request: { headers: request.headers },
    });
    const preferredLocale = getPreferredLocale(request);
    response.cookies.set('NEXT_LOCALE', preferredLocale, { path: '/', maxAge: 60 * 60 * 24 * 365 });
    return response;
  }
  
  const preferredLocale = getPreferredLocale(request);
  const newUrl = request.nextUrl.clone();
  newUrl.pathname = `/${preferredLocale}${pathname}`;
  
  return NextResponse.redirect(newUrl);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.).*)',
  ],
}
