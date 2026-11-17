import { NextRequest, NextResponse } from 'next/server';
import { DeviceScannerAdapter } from '../../../adapters/DeviceScannerAdapter';
import { autoDetectSerial } from '../../../utils/adbHelpers';

export async function POST(request: NextRequest) {
  try {
    let adbPath = 'adb';
    let serial = '';

    try {
      const body = await request.json();
      if (body?.adbPath) adbPath = body.adbPath;
      if (body?.serial) serial = body.serial;
    } catch {}

    // Auto-detect if no serial provided
    if (!serial) {
      serial = await autoDetectSerial(adbPath);
    }

    console.log('[DEBUG] adbPath:', adbPath, '| serial:', serial || '(none found)');

    const adapter = new DeviceScannerAdapter(adbPath);
    const result = await adapter.execute({ adbPath, serial });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      metadata: { adbPath, serial, timestamp: result.metadata?.timestamp },
    });
  } catch (error) {
    console.error('[ERROR]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
