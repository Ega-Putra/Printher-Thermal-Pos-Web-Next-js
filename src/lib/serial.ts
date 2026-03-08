import { SerialPort } from 'serialport';

// Use a global variables for the serial port instance and status to survive Next.js HMR.
declare global {
  // eslint-disable-next-line no-var
  var _serialPort: SerialPort | null;
  // eslint-disable-next-line no-var
  var _serialPortPath: string | null;
}

globalThis._serialPort = globalThis._serialPort || null;
globalThis._serialPortPath = globalThis._serialPortPath || null;

export const getSerialPort = () => globalThis._serialPort;
export const getSerialPortPath = () => globalThis._serialPortPath;

export const connectSerialPort = async (path: string, baudRate: number = 9600): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    if (globalThis._serialPort) {
      if (globalThis._serialPort.isOpen && globalThis._serialPortPath === path) {
        return resolve(true);
      }
      // disconnect old if any
      globalThis._serialPort.close();
      globalThis._serialPort = null;
      globalThis._serialPortPath = null;
    }

    const port = new SerialPort({ path, baudRate, autoOpen: false });
    
    port.open((err) => {
      if (err) {
        return reject(err);
      }
      globalThis._serialPort = port;
      globalThis._serialPortPath = path;
      resolve(true);
    });
  });
};

export const disconnectSerialPort = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (globalThis._serialPort && globalThis._serialPort.isOpen) {
      globalThis._serialPort.close(() => {
        globalThis._serialPort = null;
        globalThis._serialPortPath = null;
        resolve(true);
      });
    } else {
      globalThis._serialPort = null;
      globalThis._serialPortPath = null;
      resolve(true);
    }
  });
};
