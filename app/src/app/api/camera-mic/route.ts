import { NextRequest, NextResponse } from 'next/server';
import { CAMicAdapter } from '../../../adapters/CameraMicAdapter';
import { ASFAdapter } from '../../../adapters/ASFAdapter';
import { autoDetectSerial } from '../../../utils/adbHelpers';
import { useSettingsStore } from '../../../store/settingsStore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const storedAdbPath = useSettingsStore.getState().adbPath;
    const adbPath = body?.adbPath || storedAdbPath || 'adb';
    ASFAdapter.setAdbPath(adbPath);

    let serial = body?.serial || '';
    if (!serial) serial = await autoDetectSerial(adbPath);

    console.log('[DEBUG camera-mic] adbPath:', adbPath, '| serial:', serial);

    const adapter = new CAMicAdapter();
    const result = await adapter.execute(serial);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[ERROR camera-mic]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
