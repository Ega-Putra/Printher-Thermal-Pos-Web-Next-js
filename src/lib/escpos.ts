/* 
 Converts Black/White pixel array into ESC/POS bits for a 58mm printer.
 Returns a Uint8Array suitable for Web Serial, Web Bluetooth, and Node.js.
*/

export const convertToEscPosRaster = (pixels: boolean[], width: number, height: number): Uint8Array => {
    // ESC * (Bit Image Mode) approach - 24 dots (pixels) vertical per band.
    // 33 = 24-dot double density mode.

    const init = new Uint8Array([0x1B, 0x40]); // ESC @
    // ESC 3 n (Set line spacing to 24 dots)
    const setLineSpacing24 = new Uint8Array([0x1B, 0x33, 24]);
    // ESC 2 (Reset line spacing default)
    const resetLineSpacing = new Uint8Array([0x1B, 0x32]);
    const feedAndCut = new Uint8Array([0x1B, 0x64, 0x05, 0x1D, 0x56, 0x42, 0x00]); // ESC d 5, GS V B 0 (Cut)

    const chunks: Uint8Array[] = [];
    chunks.push(init);
    chunks.push(setLineSpacing24);

    const bandHeight = 24;

    for (let currentY = 0; currentY < height; currentY += bandHeight) {
        // ESC * m n1 n2 [d1 ... dk]
        // m = 33 (24-dot double density)
        // n1 = width % 256
        // n2 = width / 256
        const n1 = width % 256;
        const n2 = Math.floor(width / 256);

        const header = new Uint8Array([0x1B, 0x2A, 33, n1, n2]);
        chunks.push(header);

        // Data for this band: each column (x) needs 3 bytes (24 bits)
        const bandData = new Uint8Array(width * 3);

        for (let x = 0; x < width; x++) {
            for (let b = 0; b < 3; b++) { // 3 bytes per column vertically
                let byteVal = 0;
                for (let bit = 0; bit < 8; bit++) {
                    const y = currentY + (b * 8) + bit;
                    if (y < height) {
                        const pixelIndex = y * width + x;
                        if (pixels[pixelIndex]) {
                            byteVal |= (1 << (7 - bit)); // MSB first
                        }
                    }
                }
                bandData[x * 3 + b] = byteVal;
            }
        }
        chunks.push(bandData);

        // Print the buffer (Newline)
        chunks.push(new Uint8Array([0x0A]));
    }

    chunks.push(resetLineSpacing);
    chunks.push(feedAndCut);

    // Calculate total length
    const totalLen = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLen);

    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }

    return result;
};
