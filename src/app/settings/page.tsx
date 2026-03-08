"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Settings as SettingsIcon, Save, Database, ShieldCheck, User, CheckCircle2 } from 'lucide-react';

export default function Settings() {
    const [targetGPA, setTargetGPA] = useState<string>("3.20");
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('study_target_gpa');
        if (stored) {
            setTargetGPA(stored);
        }
    }, []);

    const handleSave = () => {
        localStorage.setItem('study_target_gpa', targetGPA);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10 z-10 relative pb-16">

            <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-800 to-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
                            <SettingsIcon size={20} />
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">Sistem Ayarları</h1>
                    </div>
                    <p className="text-slate-500 font-medium text-[15px] mt-1 ml-1 tracking-wide">
                        Gelişmiş çalışma alanının altyapı ve veri konfigürasyonları.
                    </p>
                </div>
            </header>

            <Card className="space-y-10 border border-white bg-white/60 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] rounded-[2.5rem] p-10">
                <div>
                    <h3 className="text-xl font-bold mb-2 text-slate-900 flex items-center gap-2">
                        <User size={20} className="text-blue-600" /> Analitik Profil
                    </h3>
                    <p className="text-[14px] font-medium text-slate-500 mb-6 pl-1 tracking-wide">
                        Tüm projeksiyon ve matematiksel simülasyonların dayanacağı genel tavan hedefi.
                    </p>

                    <div className="bg-white/80 p-6 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] max-w-sm">
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3 ml-1">Kümülatif Tavan Hedef</label>
                        <input
                            type="number" step="0.01"
                            value={targetGPA}
                            onChange={(e) => setTargetGPA(e.target.value)}
                            className="w-full bg-slate-50/50 border border-slate-200/60 rounded-xl px-5 py-4 font-black text-2xl text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-mono shadow-inner"
                        />
                    </div>
                </div>

                <hr className="border-slate-200/60" />

                <div>
                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-slate-900">
                        <Database size={20} className="text-indigo-500" />
                        Veri Entegrasyonu (Local Storage)
                    </h3>
                    <p className="text-[14px] font-medium text-slate-500 mb-6 pl-1 tracking-wide">
                        Cihazınızın tarayıcı belleği ile eşzamanlama ve kalıcılık (persistence) durumu.
                    </p>

                    <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-100/50 p-6 rounded-2xl flex items-center gap-5 shadow-sm max-w-xl">
                        <div className="p-3 bg-white rounded-xl shadow-[0_4px_15px_rgb(59,130,246,0.15)]">
                            <ShieldCheck size={28} className="text-blue-600" />
                        </div>
                        <div className="flex-1">
                            <span className="block text-slate-900 font-extrabold text-[16px] mb-1">Cihaza Senkronizasyon Başarılı</span>
                            <span className="text-slate-500 font-medium text-[13px] tracking-wide leading-relaxed block">
                                Verileriniz `localStorage` üzerinde kaydedilerek sayfa yenilemelerinde veya kapatıp açmalarda güvende tutulmaktadır.
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-start md:justify-end pt-8 border-t border-slate-200/60">
                    <button
                        onClick={handleSave}
                        className={`px-8 py-4 rounded-2xl text-[14px] font-bold transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95 w-full md:w-auto ${isSaved
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10'
                            }`}
                    >
                        {isSaved ? <><CheckCircle2 size={18} /> Kaydedildi!</> : <><Save size={18} /> Değişiklikleri Uygula</>}
                    </button>
                </div>
            </Card>
        </div>
    );
}
