import { NextResponse } from 'next/server';
import { disconnectSerialPort } from '@/lib/serial';

export async function POST() {
    try {
        await disconnectSerialPort();
        return NextResponse.json({ success: true, message: 'Disconnected' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
