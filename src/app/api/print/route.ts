import { NextResponse } from 'next/server';
import { getSerialPort } from '@/lib/serial';
import { convertToEscPosRaster } from '@/lib/escpos';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { pixels, width, height } = body;

        if (!pixels || !width || !height) {
            return NextResponse.json({ error: 'Missing image data (pixels, width, height)' }, { status: 400 });
        }

        const port = getSerialPort();
        if (!port || !port.isOpen) {
            return NextResponse.json({ error: 'Printer not connected' }, { status: 400 });
        }

        // Convert pixels to ESC/POS buffer
        const buffer = convertToEscPosRaster(pixels, width, height);

        // Send to printer via serial port
        await new Promise((resolve, reject) => {
            port.write(buffer, (err) => {
                if (err) return reject(err);
                resolve(true);
            });
        });

        return NextResponse.json({ success: true, message: 'Printed successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
