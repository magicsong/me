import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const session = await auth()
  const isLoggedIn = !!session

  // 获取当前路径
  const pathname = request.nextUrl.pathname
  
  // 如果用户未登录且尝试访问受保护的路由，重定向到登录页面
  if (!isLoggedIn && 
      !pathname.startsWith('/login') && 
      !pathname.startsWith('/register') && 
      !pathname.startsWith('/forgot-password') && 
      !pathname.startsWith('/api') && 
      !pathname.startsWith('/_next')) {
    
    const url = new URL('/login', request.url)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }
  
  // 如果用户已登录并尝试访问登录或注册页面，重定向到首页
  if (isLoggedIn && (pathname.startsWith('/login') || pathname.startsWith('/register'))) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

// 配置中间件应用路径
export const config = {
  matcher: [
    // 排除不需要验证的静态资源
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'
  ]
}
