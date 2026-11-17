import { NextRequest, NextResponse } from 'next/server';
import { PermissionAuditAdapter } from '../../../adapters/PermissionAuditAdapter';
import { ASFAdapter } from '../../../adapters/ASFAdapter';
import { autoDetectSerial } from '../../../utils/adbHelpers';
import { useSettingsStore } from '../../../store/settingsStore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Prioritize body.adbPath over stored default
    const storedAdbPath = useSettingsStore.getState().adbPath;
    const adbPath = body?.adbPath || storedAdbPath || 'adb';
    ASFAdapter.setAdbPath(adbPath);

    let serial = body?.serial || '';
    if (!serial) serial = await autoDetectSerial(adbPath);

    console.log('[DEBUG permissions] adbPath:', adbPath, '| serial:', serial);

    const adapter = new PermissionAuditAdapter();
    const result = await adapter.execute(serial);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[ERROR permissions]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
