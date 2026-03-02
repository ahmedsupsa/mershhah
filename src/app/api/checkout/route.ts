import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'هذا المسار غير مستخدم.' },
    { status: 410 }
  );
}
