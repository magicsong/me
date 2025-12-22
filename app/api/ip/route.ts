import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const ip = 
    request.ip ||  
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    '未知';

  return NextResponse.json({ ip });
}
