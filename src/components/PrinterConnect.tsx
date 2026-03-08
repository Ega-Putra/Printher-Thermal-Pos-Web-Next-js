'use client';

import { useState, useEffect } from 'react';
import { printerService } from '@/lib/printerService';
import { Usb, Bluetooth, Server, Link as LinkIcon } from 'lucide-react';

export default function PrinterConnect() {
    const [method, setMethod] = useState<'node-serial' | 'web-bluetooth' | 'web-serial'>('web-bluetooth');
    const [ports, setPorts] = useState<{ path: string }[]>([]);
    const [selectedPort, setSelectedPort] = useState<string>('');
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        printerService.getAvailableNodePorts().then((ports) => {
            setPorts(ports);
            if (ports.length > 0) setSelectedPort(ports[0].path);
        });
    }, []);

    const toggleConnection = async () => {
        setLoading(true);
        try {
            if (isConnected) {
                await printerService.disconnect();
                setIsConnected(false);
            } else {
                if (method === 'node-serial') {
                    await printerService.connectNodeSerial(selectedPort);
                } else if (method === 'web-serial') {
                    await printerService.connectWebSerial();
                } else if (method === 'web-bluetooth') {
                    await printerService.connectWebBluetooth();
                }
                setIsConnected(true);
            }
        } catch (err: any) {
            alert('Error: ' + err.message);
            setIsConnected(false);
        }
        setLoading(false);
    };

    return (
        <div className="p-6 border border-white/10 bg-black/40 backdrop-blur-md rounded-2xl shadow-xl flex flex-col gap-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>

            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
                    <LinkIcon size={20} className="text-blue-400" /> Printer Connection
                </h2>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                    <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${isConnected ? 'bg-emerald-500 text-emerald-500' : 'bg-red-500 text-red-500'}`}></div>
                    <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">{isConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
            </div>

            <div className="flex flex-wrap items-end gap-5">
                <div className="flex flex-col gap-2">
                    <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Method</label>
                    <div className="flex bg-gray-900 border border-gray-700 rounded-lg overflow-hidden p-1">
                        <button
                            onClick={() => setMethod('web-bluetooth')}
                            disabled={isConnected}
                            className={`flex items-center gap-2 px-3 py-2 text-sm transition-all rounded-md ${method === 'web-bluetooth' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <Bluetooth size={16} /> Web Bluetooth
                        </button>
                        <button
                            onClick={() => setMethod('web-serial')}
                            disabled={isConnected}
                            className={`flex items-center gap-2 px-3 py-2 text-sm transition-all rounded-md ${method === 'web-serial' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <Usb size={16} /> Web Serial
                        </button>
                        <button
                            onClick={() => setMethod('node-serial')}
                            disabled={isConnected}
                            className={`flex items-center gap-2 px-3 py-2 text-sm transition-all rounded-md ${method === 'node-serial' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <Server size={16} /> Node API
                        </button>
                    </div>
                </div>

                {method === 'node-serial' && (
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">COM Port</label>
                        <select
                            className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer h-10 w-48"
                            value={selectedPort}
                            onChange={(e) => setSelectedPort(e.target.value)}
                            disabled={isConnected || loading}
                        >
                            {ports.length === 0 && <option value="">No ports found</option>}
                            {ports.map((p) => (
                                <option key={p.path} value={p.path}>{p.path}</option>
                            ))}
                        </select>
                    </div>
                )}

                <button
                    onClick={toggleConnection}
                    disabled={loading || (method === 'node-serial' && !selectedPort)}
                    className={`h-10 px-6 rounded-lg font-bold tracking-wide transition-all duration-300 ${isConnected
                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                            : 'bg-emerald-500 text-white hover:bg-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] shadow-lg'
                        } disabled:opacity-50 disabled:cursor-not-allowed uppercase text-sm whitespace-nowrap`}
                >
                    {loading ? '...' : (isConnected ? 'Disconnect' : 'Connect')}
                </button>
            </div>

            {method === 'web-bluetooth' && (
                <p className="text-xs text-gray-500 mt-[-5px]">
                    Web Bluetooth allows direct printing from your browser without a backend. Pair your printer first.
                </p>
            )}
        </div>
    );
}
