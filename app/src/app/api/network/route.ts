import { NextRequest, NextResponse } from 'next/server';
import { NetworkTrafficAdapter } from '../../../adapters/NetworkTrafficAdapter';
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

    console.log('[DEBUG network] adbPath:', adbPath, '| serial:', serial);

    const adapter = new NetworkTrafficAdapter();
    const result = await adapter.execute(serial);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[ERROR network]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
