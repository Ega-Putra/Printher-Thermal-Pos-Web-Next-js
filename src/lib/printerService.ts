import { convertToEscPosRaster } from './escpos';

export type ConnectionType = 'node-serial' | 'web-bluetooth' | 'web-serial';

class PrinterService {
    type: ConnectionType = 'node-serial';
    isConnected: boolean = false;

    private webSerialPort: any = null;
    private webBluetoothDevice: any = null;
    private webBluetoothCharacteristic: any = null;

    async getAvailableNodePorts() {
        try {
            const res = await fetch('/api/serial/ports');
            const data = await res.json();
            return data.ports || [];
        } catch {
            return [];
        }
    }

    async connectNodeSerial(path: string) {
        const res = await fetch('/api/serial/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, baudRate: 9600 }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to connect via Node API');
        this.type = 'node-serial';
        this.isConnected = true;
    }

    async connectWebSerial() {
        if (!('serial' in navigator)) {
            throw new Error('Web Serial API is not supported in this browser. Try Chrome or Edge.');
        }
        try {
            const port = await (navigator as any).serial.requestPort();
            await port.open({ baudRate: 9600 });
            this.webSerialPort = port;
            this.type = 'web-serial';
            this.isConnected = true;
        } catch (err: any) {
            if (err.message && err.message.includes('Failed to open serial port')) {
                throw new Error('Failed to open serial port. On macOS, Bluetooth COM ports are often locked by the OS or unsupported via Web Serial. Please use the "Node API" method instead.');
            }
            throw err;
        }
    }

    async connectWebBluetooth() {
        if (!('bluetooth' in navigator)) {
            throw new Error('Web Bluetooth API is not supported in this browser. Try Chrome or Edge.');
        }

        let device;
        try {
            device = await (navigator as any).bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: [
                    '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS BLE
                    '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Standard POS BLE
                    'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Standard POS BLE
                    '000018f0-0000-1000-8000-00805f9b34f0'
                ]
            });
        } catch (err: any) {
            if (err.message && err.message.includes('globally disabled')) {
                throw new Error('Web Bluetooth is globally disabled in your browser. If using Chrome, type "chrome://flags/#enable-web-bluetooth" in your URL bar, set it to Enabled, and restart Chrome.');
            }
            throw err;
        }

        const server = await device.gatt.connect();
        const services = await server.getPrimaryServices();
        let characteristic = null;

        // Auto-discover the first writable characteristic
        for (const service of services) {
            const chars = await service.getCharacteristics();
            const writable = chars.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
            if (writable) {
                characteristic = writable;
                break;
            }
        }

        if (!characteristic) {
            device.gatt.disconnect();
            throw new Error("Connected but no writable characteristic found. Printer might not support generic BLE serial communication.");
        }

        // Attach disconnect listener
        device.addEventListener('gattserverdisconnected', () => {
            this.isConnected = false;
            this.webBluetoothDevice = null;
            this.webBluetoothCharacteristic = null;
        });

        this.webBluetoothDevice = device;
        this.webBluetoothCharacteristic = characteristic;
        this.type = 'web-bluetooth';
        this.isConnected = true;
    }

    async disconnect() {
        if (!this.isConnected) return;

        if (this.type === 'node-serial') {
            await fetch('/api/serial/disconnect', { method: 'POST' });
        } else if (this.type === 'web-serial' && this.webSerialPort) {
            await this.webSerialPort.close();
            this.webSerialPort = null;
        } else if (this.type === 'web-bluetooth' && this.webBluetoothDevice) {
            if (this.webBluetoothDevice.gatt.connected) {
                this.webBluetoothDevice.gatt.disconnect();
            }
            this.webBluetoothDevice = null;
            this.webBluetoothCharacteristic = null;
        }
        this.isConnected = false;
    }

    async print(pixels: boolean[], width: number, height: number) {
        if (!this.isConnected) throw new Error("Printer not connected");

        if (this.type === 'node-serial') {
            const res = await fetch('/api/print', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pixels, width, height })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
        } else {
            const data = convertToEscPosRaster(pixels, width, height);
            if (this.type === 'web-serial' && this.webSerialPort) {
                const writer = this.webSerialPort.writable.getWriter();
                await writer.write(data);
                writer.releaseLock();
            } else if (this.type === 'web-bluetooth' && this.webBluetoothCharacteristic) {
                // BLE Maximum Transmission Unit (MTU) differ, chunking is highly required.
                // Windows Chrome BLE stack often fails with "GATT operation failed" if chunks are > 100 bytes or written too fast.
                const maxChunk = 100;
                for (let i = 0; i < data.length; i += maxChunk) {
                    const chunk = data.slice(i, i + maxChunk);
                    if (this.webBluetoothCharacteristic.properties.writeWithoutResponse) {
                        await this.webBluetoothCharacteristic.writeValueWithoutResponse(chunk);
                    } else {
                        await this.webBluetoothCharacteristic.writeValue(chunk);
                    }
                    // Small delay prevents queue saturation on Windows
                    await new Promise(r => setTimeout(r, 10));
                }
            }
        }
    }
}

// Export singleton instance
export const printerService = new PrinterService();
