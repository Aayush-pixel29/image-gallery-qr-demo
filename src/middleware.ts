import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const ADMIN_EMAIL = 'shelaraayush535@gmail.com'

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isAdminPath = path.startsWith('/admin') && !path.startsWith('/admin/login')
  const isAuthPage = path === '/login' || path === '/signup' || path === '/admin/login'
  const isPublicScan = path.startsWith('/i/')
  
  // 1. Keep QR Scan paths public
  if (isPublicScan) {
    return supabaseResponse
  }

  // 2. Protect Admin Paths
  if (isAdminPath) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.redirect(new URL('/', request.url)) // redirect normal users away from admin
    }
  }

  // 3. Protect Root (Gallery)
  if (path === '/') {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // 4. Redirect logged-in users away from auth pages
  if (isAuthPage && user) {
    if (user.email === ADMIN_EMAIL && path === '/admin/login') {
      return NextResponse.redirect(new URL('/admin', request.url))
    } else {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
