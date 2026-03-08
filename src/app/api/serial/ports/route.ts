export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { SerialPort } from 'serialport';

export async function GET() {
    try {
        const ports = await SerialPort.list();
        return NextResponse.json({ ports });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
