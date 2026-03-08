import { NextResponse } from 'next/server';
import { connectSerialPort } from '@/lib/serial';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { path, baudRate } = body;

        if (!path) {
            return NextResponse.json({ error: 'Port path is required' }, { status: 400 });
        }

        await connectSerialPort(path, baudRate || 9600);
        return NextResponse.json({ success: true, message: `Connected to ${path}` });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
