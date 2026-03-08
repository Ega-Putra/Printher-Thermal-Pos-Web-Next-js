export type ProcessMode = 'bw' | 'dither';

/**
 * Processes a canvas for ESC/POS thermal printing (max width normally 384px for 58mm printers).
 * Modifies the canvas to display a preview and returns the boolean array of black pixels.
 */
export const processCanvasForThermal = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    mode: ProcessMode,
    threshold: number
): boolean[] => {
    width = Math.round(width);
    height = Math.round(height);

    if (width <= 0 || height <= 0 || isNaN(width) || isNaN(height)) {
        return [];
    }

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data; // RGBA
    const pixels = new Array(width * height).fill(false);

    // Convert to grayscale first
    const grayscale = new Float32Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // If transparent, treat as white
        if (a === 0) {
            grayscale[i / 4] = 255;
        } else {
            // Luminance formula
            grayscale[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
        }
    }

    if (mode === 'bw') {
        // Simple Thresholding
        for (let i = 0; i < grayscale.length; i++) {
            const isBlack = grayscale[i] < threshold;
            pixels[i] = isBlack;
            const color = isBlack ? 0 : 255;
            data[i * 4] = color;     // R
            data[i * 4 + 1] = color; // G
            data[i * 4 + 2] = color; // B
            data[i * 4 + 3] = 255;   // A
        }
    } else {
        // Floyd-Steinberg Dithering
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = y * width + x;
                const oldPixel = grayscale[i];
                const newPixel = oldPixel < threshold ? 0 : 255;

                pixels[i] = newPixel === 0;

                // Set visual pixel
                data[i * 4] = newPixel;
                data[i * 4 + 1] = newPixel;
                data[i * 4 + 2] = newPixel;
                data[i * 4 + 3] = 255;

                const quantError = oldPixel - newPixel;

                // Propagate error
                if (x + 1 < width) grayscale[i + 1] += quantError * 7 / 16;
                if (x - 1 >= 0 && y + 1 < height) grayscale[i + width - 1] += quantError * 3 / 16;
                if (y + 1 < height) grayscale[i + width] += quantError * 5 / 16;
                if (x + 1 < width && y + 1 < height) grayscale[i + width + 1] += quantError * 1 / 16;
            }
        }
    }

    // Put back on canvas to show preview
    ctx.putImageData(imageData, 0, 0);

    return pixels;
};
