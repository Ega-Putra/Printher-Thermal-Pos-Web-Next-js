import ImageWorkspace from '@/components/ImageWorkspace';

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-gray-100 font-sans selection:bg-blue-500/30">
      <div className="max-w-[1400px] mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <header className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-2 bg-blue-500/10 rounded-full mb-4">
            <span className="px-3 py-1 text-xs font-bold tracking-widest uppercase text-blue-400">ESC/POS Thermal v1.0</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
            Thermal Print Studio
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            A specialized workspace for preparing and printing receipts or monochrome artwork to your 58mm POS thermal printer.
          </p>
        </header>

        <ImageWorkspace />
      </div>

      <footer className="mt-20 py-8 border-t border-white/5 text-center text-gray-600 text-sm">
        Powered by Next.js, SerialPort, and Canvas API
      </footer>
    </main>
  );
}
