// This API route has been deprecated and is no longer in use.
// The payment flow is now handled manually via a static payment link.
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    return NextResponse.json({ error: 'This endpoint is deprecated.' }, { status: 410 });
}
