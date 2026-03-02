import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // This middleware is now a pass-through.
  // Firebase client-side auth does not require the same session
  // refreshing logic as Supabase SSR.
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
