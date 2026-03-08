/* 
 Converts Black/White pixel array into ESC/POS bits for a 58mm printer.
 Returns a Uint8Array suitable for Web Serial, Web Bluetooth, and Node.js.
*/

export const convertToEscPosRaster = (pixels: boolean[], width: number, height: number): Uint8Array => {
    const widthBytes = Math.ceil(width / 8);

    // Initialization
    const init = new Uint8Array([0x1B, 0x40]); // ESC @

    // Print and feed 4 lines
    const end = new Uint8Array([0x1B, 0x64, 0x04]); // ESC d 4

    const MAX_STRIP_HEIGHT = 120;
    const chunks: Uint8Array[] = [];
    chunks.push(init);

    for (let currentY = 0; currentY < height; currentY += MAX_STRIP_HEIGHT) {
        const stripHeight = Math.min(MAX_STRIP_HEIGHT, height - currentY);
        const dataLen = widthBytes * stripHeight;
        const buffer = new Uint8Array(dataLen);

        for (let y = 0; y < stripHeight; y++) {
            for (let x = 0; x < widthBytes * 8; x++) {
                if (x < width) {
                    const pixelIndex = (currentY + y) * width + x;
                    const isBlack = pixels[pixelIndex];
                    if (isBlack) {
                        const byteIndex = y * widthBytes + Math.floor(x / 8);
                        const bitPosition = 7 - (x % 8);
                        buffer[byteIndex] |= (1 << bitPosition);
                    }
                }
            }
        }

        const xL = widthBytes % 256;
        const xH = Math.floor(widthBytes / 256);
        const yL = stripHeight % 256;
        const yH = Math.floor(stripHeight / 256);

        // GS v 0 m xL xH yL yH
        const header = new Uint8Array([0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH]);

        chunks.push(header);
        chunks.push(buffer);
    }

    chunks.push(end);

    const totalLen = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLen);

    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }

    return result;
};
