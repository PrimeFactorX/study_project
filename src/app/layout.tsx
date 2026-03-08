import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import { LayoutDashboard, Compass, Settings, Sparkles } from 'lucide-react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Focus | Academic Dashboard',
  description: 'Premium academic planning and focus dashboard.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-[#f8f9fa] text-slate-900 flex flex-col md:flex-row relative overflow-x-hidden selection:bg-blue-100 selection:text-blue-900`}>

        {/* Background Ornaments for Premium Feel */}
        <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 blur-[120px] rounded-full pointer-events-none z-0"></div>
        <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/10 blur-[120px] rounded-full pointer-events-none z-0"></div>

        {/* Clean Sidebar / Navbar */}
        <nav className="w-full md:w-64 bg-white/70 backdrop-blur-xl border-r border-white shadow-[10px_0_30px_rgb(0,0,0,0.02)] p-6 flex md:flex-col gap-3 sticky top-0 md:h-screen z-20">
          <div className="hidden md:flex flex-col mb-10 mt-2">
            <h1 className="text-[1.35rem] font-black flex items-center gap-2.5 text-slate-900 tracking-tight">
              <span className="p-2 bg-gradient-to-br from-blue-600 to-indigo-500 rounded-xl text-white shadow-lg shadow-blue-500/30">
                <Sparkles size={18} strokeWidth={2.5} />
              </span>
              Focus
            </h1>
            <p className="text-[12px] text-slate-400 mt-2 font-bold uppercase tracking-widest pl-1">Academic Study</p>
          </div>

          <Link href="/" className="flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-slate-100/50 hover:shadow-sm transition-all text-[15px] font-bold text-slate-500 hover:text-slate-900">
            <LayoutDashboard size={20} className="text-slate-400" />
            <span className="hidden md:inline">Stüdyo</span>
          </Link>
          <Link href="/strategy" className="flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-slate-100/50 hover:shadow-sm transition-all text-[15px] font-bold text-slate-500 hover:text-slate-900">
            <Compass size={20} className="text-slate-400" />
            <span className="hidden md:inline">Strateji</span>
          </Link>
          <Link href="/settings" className="flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-slate-100/50 hover:shadow-sm transition-all text-[15px] font-bold text-slate-500 hover:text-slate-900">
            <Settings size={20} className="text-slate-400" />
            <span className="hidden md:inline">Kapanış</span>
          </Link>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto z-10 relative">
          {children}
        </main>
      </body>
    </html>
  );
}
