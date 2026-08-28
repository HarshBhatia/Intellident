import { NextResponse } from 'next/server';
import { isFlagEnabled, type FlagKey } from './flags';

export function flagDisabledResponse() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export function assertFlag(key: FlagKey): NextResponse | null {
  if (!isFlagEnabled(key)) return flagDisabledResponse();
  return null;
}
