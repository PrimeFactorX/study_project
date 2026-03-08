"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { simulateHybridGPA, gradeToPoints } from '@/lib/math';
import { LineChart, BarChart3, TrendingUp, Filter, Save, Plus, Trash2, ArrowRightLeft, Download } from 'lucide-react';

const availableGrades = Object.keys(gradeToPoints);

export default function StrategyLab() {
    const [baseGPA, setBaseGPA] = useState(2.85);
    const [baseCredits, setBaseCredits] = useState(80);
    const [isLoaded, setIsLoaded] = useState(false);

    const [simCourses, setSimCourses] = useState([
        { id: '1', name: 'Diferansiyel Denklemler', credits: 4, oldGrade: 'DD', targetGrade: 'BA', isRetake: true },
        { id: '2', name: 'Fizik II', credits: 3, oldGrade: 'DC', targetGrade: 'CB', isRetake: true },
        { id: '3', name: 'Veri Yapıları', credits: 4, oldGrade: 'CC', targetGrade: 'AA', isRetake: true },
    ]);

    // Load from LocalStorage
    useEffect(() => {
        const storedGPA = localStorage.getItem('study_gpa');
        const storedCredits = localStorage.getItem('study_credits');
        const storedSims = localStorage.getItem('study_sims');

        if (storedGPA) setBaseGPA(parseFloat(storedGPA));
        if (storedCredits) setBaseCredits(parseInt(storedCredits));
        if (storedSims) {
            setSimCourses(JSON.parse(storedSims));
        } else {
            // First time loading, try fetching active courses from study_courses
            const storedCourses = localStorage.getItem('study_courses');
            if (storedCourses) {
                const parsed = JSON.parse(storedCourses);
                if (parsed.length > 0) {
                    setSimCourses(parsed.map((c: any) => ({
                        id: c.id,
                        name: c.name,
                        credits: c.credits,
                        oldGrade: 'DD',
                        targetGrade: c.target_grade || 'BB',
                        isRetake: c.status === 'retake'
                    })));
                }
            }
        }
        setIsLoaded(true);
    }, []);

    // Sync to LocalStorage
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem('study_gpa', baseGPA.toString());
            localStorage.setItem('study_credits', baseCredits.toString());
            localStorage.setItem('study_sims', JSON.stringify(simCourses));
        }
    }, [baseGPA, baseCredits, simCourses, isLoaded]);

    const handleImportCourses = () => {
        const storedCourses = localStorage.getItem('study_courses');
        if (storedCourses) {
            const parsed = JSON.parse(storedCourses);
            if (parsed.length > 0) {
                setSimCourses(parsed.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    credits: c.credits,
                    oldGrade: c.old_grade || 'DD',
                    targetGrade: c.target_grade || 'BB',
                    isRetake: c.status === 'retake'
                })));
            } else {
                alert('Stüdyoda kayıtlı ders bulunmuyor!');
            }
        } else {
            alert('Stüdyoda kayıtlı veri bulunmuyor!');
        }
    };

    const projectedGPA = simulateHybridGPA(baseGPA, baseCredits, simCourses);
    const difference = projectedGPA - baseGPA;

    if (!isLoaded) return null;

    return (
        <div className="space-y-10 max-w-5xl mx-auto z-10 relative pb-16">
            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-800 to-slate-600 flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
                            <BarChart3 size={20} />
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">Gelecek S. (Strateji) Laboratuvarı</h1>
                    </div>
                    <p className="text-slate-500 font-medium text-[15px] mt-1 ml-1">
                        Yeni derslerin ve alttan alınan derslerin beraber kümülatif GPA üzerindeki net etkisini hesaplayın.
                    </p>
                </div>
            </header>

            {/* Hero GPA Card - Glassmorphism */}
            <Card className="bg-white/60 backdrop-blur-2xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem]">
                <div className="flex flex-col md:flex-row items-center justify-between py-8">
                    <div className="text-center md:text-left md:border-r border-slate-200/60 pr-0 md:pr-16 w-full md:w-auto mb-8 md:mb-0">
                        <h2 className="text-[11px] font-black uppercase tracking-widest pl-1 mb-3 flex items-center justify-center md:justify-start gap-2 text-slate-400">
                            <TrendingUp size={14} className="text-indigo-500" /> Beklenen Ortalama
                        </h2>
                        <div className="flex items-baseline justify-center md:justify-start gap-3">
                            <span className="text-[5rem] leading-none font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600">
                                {projectedGPA.toFixed(3)}
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 px-4 md:px-16 w-full">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4 text-center md:text-left pl-1">Senaryo Değişim Endeksi</h3>
                        <div className={`flex items-center justify-center md:justify-start gap-5 p-5 rounded-2xl border ${difference >= 0
                            ? 'bg-blue-50/50 border-blue-100 text-blue-700'
                            : 'bg-amber-50/50 border-amber-100 text-amber-700'
                            }`}>
                            <div className="text-4xl font-black tracking-tighter">
                                {difference >= 0 ? '+' : ''}{difference.toFixed(3)}
                            </div>
                            <div className="text-[13px] font-bold leading-snug">Girilen notlara göre<br /> beklenen değişim oranı.</div>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {/* Baseline Config */}
                <Card className="md:col-span-1 border border-white bg-white/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2rem] p-7 h-fit">
                    <h3 className="font-bold mb-8 flex items-center gap-2 text-slate-900 border-b border-slate-200/60 pb-4 text-lg">
                        <Filter size={18} className="text-slate-400" /> Mevcut Durum
                    </h3>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-widest pl-1 text-slate-400 mb-2">Mevcut Ortalama</label>
                            <input
                                type="number" step="0.01" value={baseGPA}
                                onChange={(e) => setBaseGPA(parseFloat(e.target.value) || 0)}
                                className="w-full bg-white/80 border border-slate-200/50 rounded-2xl px-5 py-3.5 text-lg font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-mono shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-widest pl-1 text-slate-400 mb-2">Tamamlanan Kredi</label>
                            <input
                                type="number" value={baseCredits}
                                onChange={(e) => setBaseCredits(parseInt(e.target.value) || 0)}
                                className="w-full bg-white/80 border border-slate-200/50 rounded-2xl px-5 py-3.5 text-lg font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-mono shadow-sm"
                            />
                        </div>
                    </div>
                </Card>

                {/* Scenario Matrix */}
                <Card className="md:col-span-2 border border-white bg-white/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2rem] p-7">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-200/60 pb-4">
                        <h3 className="font-bold flex items-center gap-2 text-slate-900 text-lg">
                            <LineChart size={18} className="text-indigo-500" /> Senaryo Matrisi
                        </h3>
                        <div className="flex gap-2">
                            <button
                                onClick={handleImportCourses}
                                title="Stüdyodaki (Ana Sayfa) aktif derslerinizi simülasyona aktarır."
                                className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                            >
                                <Download size={14} /> Aktar
                            </button>
                            <button
                                onClick={() => setSimCourses([...simCourses, { id: Math.random().toString(), name: 'Yeni Ders', credits: 3, oldGrade: 'DD', targetGrade: 'BB', isRetake: false }])}
                                className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                            >
                                <Plus size={14} /> Ekle
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {simCourses.map((c, i) => (
                            <div key={c.id} className="flex flex-col sm:flex-row items-center justify-between p-5 bg-white/80 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                                <div className="flex-1 w-full mb-4 sm:mb-0 flex items-center gap-4">
                                    <button
                                        onClick={() => setSimCourses(simCourses.filter((_, idx) => idx !== i))}
                                        className="text-slate-300 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <div>
                                        <input
                                            type="text" value={c.name}
                                            onChange={(e) => {
                                                const newCourses = [...simCourses];
                                                newCourses[i].name = e.target.value;
                                                setSimCourses(newCourses);
                                            }}
                                            className="font-bold text-slate-900 text-[15px] bg-transparent focus:outline-none border-b border-transparent focus:border-slate-300 transition-colors w-full"
                                        />
                                        <div className="flex items-center gap-2 mt-1">
                                            <input
                                                type="number" value={c.credits}
                                                onChange={(e) => {
                                                    const newCourses = [...simCourses];
                                                    newCourses[i].credits = parseInt(e.target.value) || 0;
                                                    setSimCourses(newCourses);
                                                }}
                                                className="font-bold text-slate-500 text-[12px] bg-transparent focus:outline-none w-8 text-center"
                                            />
                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Kredi</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-4 items-center w-full sm:w-auto mt-4 sm:mt-0 justify-between sm:justify-end">
                                    <button
                                        onClick={() => {
                                            const newCourses = [...simCourses];
                                            newCourses[i].isRetake = !newCourses[i].isRetake;
                                            setSimCourses(newCourses);
                                        }}
                                        className={`flex flex-col items-center justify-center w-[70px] h-[58px] rounded-xl border transition-all ${c.isRetake ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}
                                    >
                                        <ArrowRightLeft size={16} className="mb-1" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">{c.isRetake ? 'Alttan' : 'Yeni'}</span>
                                    </button>

                                    {c.isRetake && (
                                        <div className="flex flex-col items-center">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Eski Harf</span>
                                            <select
                                                value={c.oldGrade}
                                                onChange={(e) => {
                                                    const newCourses = [...simCourses];
                                                    newCourses[i].oldGrade = e.target.value;
                                                    setSimCourses(newCourses);
                                                }}
                                                className="bg-slate-50 border border-slate-200/50 font-black text-slate-500 text-[14px] rounded-xl focus:outline-none focus:ring-4 focus:ring-slate-400/10 py-2.5 px-3 min-w-[70px] text-center transition-all cursor-pointer shadow-sm hover:bg-slate-100"
                                            >
                                                {availableGrades.map(g => (
                                                    <option key={`old-${g}`} value={g}>{g}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {c.isRetake && (
                                        <div className="w-3 md:w-5 h-[2px] bg-slate-200 mt-5 rounded-full"></div>
                                    )}

                                    <div className="flex flex-col items-center">
                                        <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1.5">Hedef Harf</span>
                                        <select
                                            value={c.targetGrade}
                                            onChange={(e) => {
                                                const newCourses = [...simCourses];
                                                newCourses[i].targetGrade = e.target.value;
                                                setSimCourses(newCourses);
                                            }}
                                            className="bg-blue-50 border border-blue-100 font-black text-blue-700 text-[14px] rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 py-2.5 px-3 min-w-[70px] text-center transition-all cursor-pointer shadow-sm hover:bg-blue-100"
                                        >
                                            {availableGrades.map(g => (
                                                <option key={`target-${g}`} value={g}>{g}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}
