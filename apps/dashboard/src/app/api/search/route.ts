import { NextResponse } from 'next/server';
import { search } from '@/services/search.service';
import { withAuth } from '@/lib/api-handler';

export const GET = withAuth(async (request: Request, { clinicId }) => {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ patients: [], visits: [] });
  }

  const results = await search(q, clinicId);
  return NextResponse.json(results);
});