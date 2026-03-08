'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { processCanvasForThermal, ProcessMode } from '@/lib/imageProcessing';
import PrinterConnect from './PrinterConnect';
import { RotateCw, Crop as CropIcon, Image as ImageIcon, Printer, Check, X, Trash2 } from 'lucide-react';
import { printerService } from '@/lib/printerService';

export default function ImageWorkspace() {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [mode, setMode] = useState<ProcessMode>('bw');
    const [threshold, setThreshold] = useState<number>(128);
    const [rotation, setRotation] = useState<number>(0);
    const [paperSize, setPaperSize] = useState<number>(384); // 384px (58mm), 576px (80mm), 800px (100mm)
    const [isPrinting, setIsPrinting] = useState(false);

    // Cropper state
    const [isCropMode, setIsCropMode] = useState(false);
    const [crop, setCrop] = useState<Crop>({ unit: '%', width: 50, height: 50, x: 25, y: 25 });
    const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const cropImgRef = useRef<HTMLImageElement>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles && acceptedFiles.length > 0) {
            loadImage(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
        noClick: !!imageSrc // Disable click if image already present
    });

    const loadImage = (file: File) => {
        const url = URL.createObjectURL(file);
        const img = new window.Image();
        img.onload = () => {
            setOriginalImage(img);
            setImageSrc(url);
            setRotation(0);
            setCrop({ unit: '%', width: 50, height: 50, x: 25, y: 25 });
            setCompletedCrop(null);
            setCroppedAreaPixels(null);
            setIsCropMode(false);
        };
        img.src = url;
    };

    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (e.clipboardData && e.clipboardData.items) {
                for (let i = 0; i < e.clipboardData.items.length; i++) {
                    if (e.clipboardData.items[i].type.indexOf('image') !== -1) {
                        const file = e.clipboardData.items[i].getAsFile();
                        if (file) loadImage(file);
                    }
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);

    const clearImage = () => {
        setImageSrc(null);
        setOriginalImage(null);
        setCroppedAreaPixels(null);
        setRotation(0);
        setIsCropMode(false);
    };

    const drawCanvas = useCallback(() => {
        if (!originalImage || !canvasRef.current || isCropMode) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Determine boundaries to draw based on crop or full image
        let sourceX = 0;
        let sourceY = 0;
        let sourceW = originalImage.width;
        let sourceH = originalImage.height;

        if (croppedAreaPixels) {
            sourceX = croppedAreaPixels.x;
            sourceY = croppedAreaPixels.y;
            sourceW = croppedAreaPixels.width;
            sourceH = croppedAreaPixels.height;
        }

        // Target dimensions
        let width = sourceW;
        let height = sourceH;

        const isRotatedSideways = rotation % 180 !== 0;
        if (isRotatedSideways) {
            width = sourceH;
            height = sourceW;
        }

        // Auto scale to fill paper size precisely
        const scale = paperSize / width;
        width = paperSize;
        height = Math.round(height * scale);

        if (width <= 0 || height <= 0) return;

        canvas.width = width;
        canvas.height = height;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate((rotation * Math.PI) / 180);

        if (isRotatedSideways) {
            ctx.drawImage(originalImage, sourceX, sourceY, sourceW, sourceH, -height / 2, -width / 2, height, width);
        } else {
            ctx.drawImage(originalImage, sourceX, sourceY, sourceW, sourceH, -width / 2, -height / 2, width, height);
        }
        ctx.restore();

        // Process image for thermal view (B&W or Dithering)
        processCanvasForThermal(ctx, width, height, mode, threshold);
    }, [originalImage, rotation, mode, threshold, croppedAreaPixels, isCropMode, paperSize]);

    useEffect(() => {
        drawCanvas();
    }, [drawCanvas]);

    const handlePrint = async () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (!printerService.isConnected) {
            alert("Please connect to a printer first in the connection panel.");
            return;
        }

        setIsPrinting(true);
        try {
            // Re-process just to be certain we have pure pixels
            const pixels = processCanvasForThermal(ctx, canvas.width, canvas.height, mode, threshold);

            await printerService.print(pixels, canvas.width, canvas.height);
            // Optional: show a success toast here
        } catch (e: any) {
            alert('Print error: ' + e.message);
        }
        setIsPrinting(false);
    };

    const applyCrop = () => {
        if (completedCrop && cropImgRef.current && originalImage) {
            const scaleX = originalImage.width / cropImgRef.current.width;
            const scaleY = originalImage.height / cropImgRef.current.height;
            setCroppedAreaPixels({
                x: completedCrop.x * scaleX,
                y: completedCrop.y * scaleY,
                width: completedCrop.width * scaleX,
                height: completedCrop.height * scaleY
            });
        }
        setIsCropMode(false);
    };

    const cancelCrop = () => {
        setIsCropMode(false);
    };

    return (
        <div className="flex flex-col gap-8 max-w-6xl mx-auto">
            <PrinterConnect />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Toolbar */}
                <div className="col-span-1 flex flex-col gap-6 bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-2xl">
                    <h3 className="text-xl font-semibold text-white tracking-tight">Editor Tools</h3>

                    <div className="flex flex-col gap-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Paper Size</span>
                        <div className="flex bg-gray-900 border border-gray-700 rounded-lg overflow-hidden p-1">
                            <button
                                onClick={() => setPaperSize(384)}
                                disabled={isCropMode}
                                className={`flex items-center justify-center flex-1 py-1.5 text-xs font-medium transition-all rounded-md ${paperSize === 384 ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                58mm
                            </button>
                            <button
                                onClick={() => setPaperSize(576)}
                                disabled={isCropMode}
                                className={`flex items-center justify-center flex-1 py-1.5 text-xs font-medium transition-all rounded-md ${paperSize === 576 ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                80mm
                            </button>
                            <button
                                onClick={() => setPaperSize(800)}
                                disabled={isCropMode}
                                className={`flex items-center justify-center flex-1 py-1.5 text-xs font-medium transition-all rounded-md ${paperSize === 800 ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                100mm
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Transform</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsCropMode(true)}
                                disabled={!imageSrc || isCropMode}
                                className="flex items-center justify-center flex-1 gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 p-3 rounded-xl border border-gray-700 transition"
                            >
                                <CropIcon size={18} /> <span className="text-sm font-medium">Crop</span>
                            </button>
                            <button
                                onClick={() => setRotation((r) => (r + 90) % 360)}
                                disabled={!imageSrc || isCropMode}
                                className="flex items-center justify-center flex-1 gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 p-3 rounded-xl border border-gray-700 transition"
                            >
                                <RotateCw size={18} /> <span className="text-sm font-medium">Rotate</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Color Mode</span>
                        <div className="flex flex-col space-y-3">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="radio"
                                    name="mode"
                                    checked={mode === 'bw'}
                                    onChange={() => setMode('bw')}
                                    disabled={isCropMode}
                                    className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 focus:ring-blue-500 focus:ring-2 disabled:opacity-50"
                                />
                                <span className="text-sm text-gray-300 group-hover:text-white transition">Black & White</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="radio"
                                    name="mode"
                                    checked={mode === 'dither'}
                                    onChange={() => setMode('dither')}
                                    disabled={isCropMode}
                                    className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 focus:ring-blue-500 focus:ring-2 disabled:opacity-50"
                                />
                                <span className="text-sm text-gray-300 group-hover:text-white transition">Dithering</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Threshold</span>
                            <span className="text-xs font-mono bg-gray-800 px-2 py-1 rounded text-gray-300">{threshold}</span>
                        </div>
                        <input
                            type="range"
                            min="0" max="255"
                            value={threshold}
                            onChange={(e) => setThreshold(Number(e.target.value))}
                            disabled={isCropMode}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
                        />
                    </div>

                    <div className="mt-auto pt-6 border-t border-gray-800 flex flex-col gap-3">
                        <button
                            onClick={clearImage}
                            disabled={!imageSrc || isPrinting || isCropMode}
                            className="w-full flex justify-center items-center gap-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 p-3 rounded-xl font-medium transition-all"
                        >
                            <Trash2 size={16} />
                            Remove / Replace Image
                        </button>

                        <button
                            onClick={handlePrint}
                            disabled={!originalImage || isPrinting || isCropMode}
                            className="w-full flex justify-center items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white p-4 rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-95 disabled:hover:scale-100"
                        >
                            <Printer size={20} />
                            {isPrinting ? 'Printing...' : 'Print'}
                        </button>
                    </div>
                </div>

                {/* Canvas Area */}
                <div className="col-span-1 md:col-span-3">
                    <div
                        {...getRootProps()}
                        className={`w-full h-full min-h-[500px] border-2 border-dashed rounded-3xl overflow-hidden flex flex-col items-center justify-center transition-all relative ${isDragActive
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-800 bg-gray-900/50 hover:bg-gray-800/50'
                            }`}
                    >
                        <input {...getInputProps()} />

                        {!imageSrc ? (
                            <div className="flex flex-col items-center gap-6 text-gray-400 pointer-events-none p-12 text-center">
                                <div className="p-6 bg-gray-800 rounded-full shadow-inner">
                                    <ImageIcon size={64} className="opacity-80 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-2">Upload Image</h3>
                                    <p className="text-gray-400 leading-relaxed">
                                        <span className="text-blue-400 font-semibold cursor-pointer">Click to browse</span>, drag & drop a file, <br />or press <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-1 rounded">Ctrl+V</span> to paste from clipboard
                                    </p>
                                </div>
                            </div>
                        ) : isCropMode ? (
                            <div className="absolute inset-0 z-10 bg-black/90 flex flex-col items-center justify-center p-6">
                                <ReactCrop
                                    crop={crop}
                                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                                    onComplete={(c) => setCompletedCrop(c)}
                                    className="max-h-[80vh]"
                                >
                                    <img
                                        ref={cropImgRef}
                                        src={imageSrc}
                                        alt="Crop preview"
                                        className="max-w-full max-h-[80vh] object-contain"
                                    />
                                </ReactCrop>

                                {/* Crop confirm overlay */}
                                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-gray-900/90 backdrop-blur border border-gray-700 p-3 rounded-2xl shadow-2xl">
                                    <button onClick={cancelCrop} className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition font-semibold text-sm">
                                        <X size={16} /> Cancel
                                    </button>
                                    <button onClick={applyCrop} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-400 rounded-xl transition shadow-lg font-semibold text-sm">
                                        <Check size={16} /> Apply Crop
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gray-950/50 relative group">
                                <canvas
                                    ref={canvasRef}
                                    className="max-w-full h-auto bg-white shadow-2xl ring-1 ring-white/10"
                                    style={{ imageRendering: 'pixelated' }}
                                />
                                <div className="absolute top-4 right-4 bg-black/70 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full font-mono font-medium tracking-wide">
                                    {canvasRef.current ? `${canvasRef.current.width}x${canvasRef.current.height} px` : ''}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
