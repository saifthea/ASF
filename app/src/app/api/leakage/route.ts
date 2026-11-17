import { NextRequest, NextResponse } from 'next/server';
import { DataLeakageAdapter } from '../../../adapters/DataLeakageAdapter';
import { useSettingsStore } from '../../../store/settingsStore';
import { ASFAdapter } from '../../../adapters/ASFAdapter';
import { autoDetectSerial } from '../../../utils/adbHelpers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const storedAdbPath = useSettingsStore.getState().adbPath;
    const adbPath = body?.adbPath || storedAdbPath || 'adb';
    ASFAdapter.setAdbPath(adbPath);

    let serial = body?.serial || '';
    if (!serial) serial = await autoDetectSerial(adbPath);

    const adapter = new DataLeakageAdapter();
    const target = body.apkPath || serial;
    const result = await adapter.execute(target);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}