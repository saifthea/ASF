import { NextRequest, NextResponse } from 'next/server';
import { TimelineAdapter } from '../../../adapters/TimelineAdapter';
import { useSettingsStore } from '../../../store/settingsStore';
import { ASFAdapter } from '../../../adapters/ASFAdapter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adbPath = 'adb' } = useSettingsStore.getState();
    ASFAdapter.setAdbPath(adbPath);
    const adapter = new TimelineAdapter();
    const result = await adapter.execute(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}