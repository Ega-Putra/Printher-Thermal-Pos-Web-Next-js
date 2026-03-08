/* 
 Converts Black/White pixel array into ESC/POS bits for a 58mm printer.
 Returns a Uint8Array suitable for Web Serial, Web Bluetooth, and Node.js.
*/

export const convertToEscPosRaster = (pixels: boolean[], width: number, height: number): Uint8Array => {
    const widthBytes = Math.ceil(width / 8);
    const dataLen = widthBytes * height;
    const buffer = new Uint8Array(dataLen);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < widthBytes * 8; x++) {
            if (x < width) {
                const pixelIndex = y * width + x;
                const isBlack = pixels[pixelIndex];
                // ESC/POS raster print: black pixel = 1, white = 0
                if (isBlack) {
                    const byteIndex = y * widthBytes + Math.floor(x / 8);
                    // ESCPOS bit ordering: left-most pixel is highest bit in the byte.
                    const bitPosition = 7 - (x % 8);
                    buffer[byteIndex] |= (1 << bitPosition);
                }
            }
        }
    }

    const xL = widthBytes % 256;
    const xH = Math.floor(widthBytes / 256);
    const yL = height % 256;
    const yH = Math.floor(height / 256);

    // GS v 0 m xL xH yL yH
    const header = new Uint8Array([0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH]);

    // Initialization
    const init = new Uint8Array([0x1B, 0x40]); // ESC @

    // Print and feed 4 lines
    const end = new Uint8Array([0x1B, 0x64, 0x04]); // ESC d 4

    const totalLen = init.length + header.length + buffer.length + end.length;
    const result = new Uint8Array(totalLen);

    result.set(init, 0);
    result.set(header, init.length);
    result.set(buffer, init.length + header.length);
    result.set(end, init.length + header.length + buffer.length);

    return result;
};
