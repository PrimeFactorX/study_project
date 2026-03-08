"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { calculatePriorityScore, Course, gradeToPoints, SlideDeck, getCourseTotals, Assessment, simulateHybridGPA } from '@/lib/math';
import {
  Plus, Minus, Play, Pause, Square, BarChart3, Clock,
  AlertCircle, ChevronRight, GraduationCap, ArchiveRestore,
  Calendar, GripHorizontal, CheckCircle2, RotateCcw, Edit2, Coffee, Layers, ChevronDown, Award, PenTool, Trash2
} from 'lucide-react';
import { differenceInDays, format } from 'date-fns';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

const defaultCourses: Course[] = [
  {
    id: '1',
    name: 'Diferansiyel Denklemler',
    decks: [
      { id: 'd1', name: 'Hafta 1 Slaytı', total_pages: 40, read_pages: 40, is_completed: true },
      { id: 'd2', name: 'Hafta 2 Slaytı', total_pages: 65, read_pages: 20, is_completed: false },
      { id: 'd3', name: 'Çıkmış Sorular', total_pages: 20, read_pages: 0, is_completed: false }
    ],
    assessments: [
      { id: 'a1', name: 'Vize 1', type: 'exam', date: new Date(new Date().setDate(new Date().getDate() + 12)), weight: 30, is_completed: false },
      { id: 'a2', name: 'Proje', type: 'project', date: new Date(new Date().setDate(new Date().getDate() + 25)), weight: 20, is_completed: false }
    ],
    difficulty: 9,
    credits: 4,
    target_grade: 'BA',
    current_avg: 0,
    status: 'active',
    total_items: 0,
    finished_items: 0,
  },
  {
    id: '2',
    name: 'Fizik II',
    decks: [
      { id: 'd4', name: 'Elektromanyetizma', total_pages: 120, read_pages: 100, is_completed: false }
    ],
    assessments: [
      { id: 'a3', name: 'Quiz 1', type: 'quiz', date: new Date(new Date().setDate(new Date().getDate() + 5)), weight: 10, is_completed: false }
    ],
    difficulty: 7,
    credits: 3,
    target_grade: 'CB',
    current_avg: 0,
    status: 'active',
    total_items: 0,
    finished_items: 0,
  },
];

export default function Dashboard() {
  const [courses, setCourses] = useState<Course[]>([]);

  // Base Data State
  const [baseGPA, setBaseGPA] = useState(2.85);
  const [baseCredits, setBaseCredits] = useState(80);

  // View State
  const [activeTab, setActiveTab] = useState<'active' | 'retake'>('active');
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);

  // Loaded State for Hydration
  const [isLoaded, setIsLoaded] = useState(false);

  // Advanced Pomodoro Timer State
  const [focusMinutes, setFocusMinutes] = useState<number | string>(25);
  const [restMinutes, setRestMinutes] = useState<number | string>(5);
  const [targetCycles, setTargetCycles] = useState<number | string>(4);
  const [currentCycle, setCurrentCycle] = useState(1);
  const [sessionType, setSessionType] = useState<'focus' | 'rest'>('focus');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeDeck, setActiveDeck] = useState<SlideDeck | null>(null);

  // Todo List State
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');

  // Course Modal State (Create & Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);

  // Separate deck state for the modal form
  const [formDecks, setFormDecks] = useState<SlideDeck[]>([]);
  const [formAssessments, setFormAssessments] = useState<Assessment[]>([]);

  const [formCourse, setFormCourse] = useState<Partial<Course>>({
    name: '', credits: 3, difficulty: 5, target_grade: 'BB', status: 'active', schedule_days: []
  });

  // Local Storage Persistence
  useEffect(() => {
    const storedCourses = localStorage.getItem('study_courses');
    const storedGPA = localStorage.getItem('study_gpa');
    const storedCredits = localStorage.getItem('study_credits');
    const storedTodos = localStorage.getItem('study_todos');

    if (storedTodos) {
      setTodos(JSON.parse(storedTodos));
    }

    if (storedCourses) {
      const parsed = JSON.parse(storedCourses).map((c: any) => ({
        ...c,
        decks: c.decks || [], // Ensure decks array exists for legacy data
        assessments: (c.assessments || []).map((a: any) => ({
          ...a,
          date: a.date ? new Date(a.date) : null
        }))
      }));
      setCourses(parsed);
    } else {
      setCourses(defaultCourses);
    }

    if (storedGPA) setBaseGPA(parseFloat(storedGPA));
    if (storedCredits) setBaseCredits(parseInt(storedCredits));

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('study_courses', JSON.stringify(courses));
      localStorage.setItem('study_gpa', baseGPA.toString());
      localStorage.setItem('study_credits', baseCredits.toString());
      localStorage.setItem('study_todos', JSON.stringify(todos));
    }
  }, [courses, baseGPA, baseCredits, todos, isLoaded]);

  // Audio Refs (Client Side Only)
  const focusEndAudio = typeof Audio !== "undefined" ? new Audio('/audio/focus_end.mp3') : null;
  const restEndAudio = typeof Audio !== "undefined" ? new Audio('/audio/rest_end.mp3') : null;
  const sessionCompleteAudio = typeof Audio !== "undefined" ? new Audio('/audio/session_complete.mp3') : null;

  // Pomodoro Timer Logic (Focus -> Rest Cycles)
  useEffect(() => {
    let interval: any;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (isActive && timeLeft <= 0) {
      // Cycle Transition
      if (sessionType === 'focus') {
        focusEndAudio?.play().catch(e => console.log('Audio play failed:', e));
        setSessionType('rest');
        setTimeLeft((Number(restMinutes) || 5) * 60);
      } else {
        const nextCycle = currentCycle + 1;
        const totalCycles = Number(targetCycles) || 1;

        if (nextCycle <= totalCycles) {
          // Continue to next Focus session
          restEndAudio?.play().catch(e => console.log('Audio play failed:', e));
          setCurrentCycle(nextCycle);
          setSessionType('focus');
          setTimeLeft((Number(focusMinutes) || 25) * 60);
        } else {
          // Finished all cycles completely
          sessionCompleteAudio?.play().catch(e => console.log('Audio play failed:', e));
          setSessionType('focus');
          setTimeLeft((Number(focusMinutes) || 25) * 60);
          setCurrentCycle(1);
          setIsActive(false);
        }
      }
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, sessionType, focusMinutes, restMinutes, currentCycle, targetCycles]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startFocusSession = (course: Course, deck: SlideDeck | null = null) => {
    // If changing course altogether
    if (activeCourse?.id !== course.id || activeDeck?.id !== deck?.id) {
      setActiveCourse(course);
      setActiveDeck(deck);
      setSessionType('focus');
      setCurrentCycle(1);
      setTimeLeft((Number(focusMinutes) || 25) * 60);
      setIsActive(true);
    } else {
      // Just toggle play/pause
      setIsActive(!isActive);
    }
  };

  const stopFocusSession = () => {
    setIsActive(false);
    setActiveCourse(null);
    setActiveDeck(null);
    setSessionType('focus');
    setCurrentCycle(1);
    setTimeLeft((Number(focusMinutes) || 25) * 60);
  };

  const handleFocusChange = (val: string) => {
    if (val === '') {
      setFocusMinutes('');
      return;
    }
    const mins = parseInt(val);
    if (!isNaN(mins)) {
      setFocusMinutes(mins);
      if (!isActive && sessionType === 'focus') {
        setTimeLeft(mins * 60);
      }
    }
  };

  const handleRestChange = (val: string) => {
    if (val === '') {
      setRestMinutes('');
      return;
    }
    const mins = parseInt(val);
    if (!isNaN(mins)) {
      setRestMinutes(mins);
      if (!isActive && sessionType === 'rest') {
        setTimeLeft(mins * 60);
      }
    }
  };

  const handleTargetCyclesChange = (val: string) => {
    if (val === '') {
      setTargetCycles('');
      return;
    }
    const cycles = parseInt(val);
    if (!isNaN(cycles) && cycles >= 1) {
      setTargetCycles(cycles);
    }
  };

  const handleDeckProgressChange = (courseId: string, deckId: string, delta: number) => {
    setCourses(prev => prev.map(c => {
      if (c.id === courseId) {
        const newDecks = c.decks.map(d => {
          if (d.id === deckId) {
            const newRead = Math.max(0, Math.min(d.total_pages, d.read_pages + delta));
            const isCompleted = newRead === d.total_pages;
            return { ...d, read_pages: newRead, is_completed: isCompleted };
          }
          return d;
        });
        return { ...c, decks: newDecks };
      }
      return c;
    }));
  };

  const toggleDeckCompletion = (courseId: string, deckId: string) => {
    setCourses(prev => prev.map(c => {
      if (c.id === courseId) {
        const newDecks = c.decks.map(d => {
          if (d.id === deckId) {
            return { ...d, is_completed: !d.is_completed, read_pages: !d.is_completed ? d.total_pages : 0 };
          }
          return d;
        });
        return { ...c, decks: newDecks };
      }
      return c;
    }));
  };

  const handleStatusToggle = (id: string) => {
    setCourses(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, status: c.status === 'active' ? 'retake' : 'active' };
      }
      return c;
    }));
  };

  const handleDeleteCourse = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm('Bu dersi ve tüm materyallerini silmek istediğinize emin misiniz?')) {
      setCourses(prev => prev.filter(c => c.id !== id));
      if (activeCourse?.id === id) stopFocusSession();
    }
  };

  const openEditModal = (course: Course, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingCourseId(course.id);
    setFormDecks([...course.decks]);
    setFormAssessments([...course.assessments]);
    setFormCourse({
      ...course,
    });
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingCourseId(null);
    setFormDecks([{ id: Math.random().toString(), name: 'Tüm Konular', total_pages: 100, read_pages: 0, is_completed: false }]);
    setFormAssessments([{ id: Math.random().toString(), name: 'Vize 1', type: 'exam', date: null, weight: 30, is_completed: false }]);
    setFormCourse({
      name: '', credits: 3, difficulty: 5, target_grade: 'BB', status: activeTab, schedule_days: []
    });
    setIsModalOpen(true);
  };

  const handleSaveCourse = () => {
    if (!formCourse.name) return;

    if (editingCourseId) {
      // Edit Existing
      setCourses(prev => prev.map(c => {
        if (c.id === editingCourseId) {
          return {
            ...c,
            name: formCourse.name!,
            credits: formCourse.credits || 3,
            difficulty: formCourse.difficulty || 5,
            decks: formDecks,
            assessments: formAssessments,
            target_grade: formCourse.target_grade || 'BB',
            schedule_days: formCourse.schedule_days || [],
          } as Course;
        }
        return c;
      }));
    } else {
      // Add New
      const addedCourse: Course = {
        id: Math.random().toString(36).substring(7),
        name: formCourse.name!,
        decks: formDecks,
        assessments: formAssessments,
        total_items: 0,
        finished_items: 0,
        difficulty: formCourse.difficulty || 5,
        credits: formCourse.credits || 3,
        target_grade: formCourse.target_grade || 'BB',
        current_avg: 0,
        status: formCourse.status as 'active' | 'retake',
        schedule_days: formCourse.schedule_days || [],
      };
      setCourses([...courses, addedCourse]);
    }

    setIsModalOpen(false);
  };

  const toggleCourseExpand = (id: string) => {
    setExpandedCourseId(prev => prev === id ? null : id);
  };

  if (!isLoaded) return null; // Avoid hydration mismatch

  const displayedCourses = courses.filter(c => c.status === activeTab);
  const sortedCourses = [...displayedCourses].sort((a, b) => calculatePriorityScore(b) - calculatePriorityScore(a));
  const gpaPercentage = (baseGPA / 4.0) * 100;

  const projectedCourses = courses.map(c => ({
    credits: c.credits,
    oldGrade: (c as any).old_grade || 'DD',
    targetGrade: c.target_grade || 'BB',
    isRetake: c.status === 'retake'
  }));
  const expectedGPA = simulateHybridGPA(baseGPA, baseCredits, projectedCourses);

  return (
    <div className="space-y-10 max-w-[1400px] mx-auto z-10 relative pb-20">

      {/* Premium Header */}
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <GraduationCap size={20} />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">Görev Stüdyosu</h1>
          </div>
          <p className="text-slate-500 font-medium text-[15px] mt-1 ml-1">
            Hedefe ulaşmak için tasarlanmış birinci sınıf çalışma ortamı.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-2xl text-[14px] font-semibold transition-all flex items-center gap-2 shadow-xl shadow-slate-900/10 hover:shadow-slate-900/20 active:scale-95"
        >
          <Plus size={18} /> {activeTab === 'active' ? 'Yeni Görev Ekle' : 'Alttan Ders Ekle'}
        </button>
      </header>

      {/* GPA Objective Dashboard - Glassmorphic */}
      <Card className="flex flex-col md:flex-row gap-8 items-center bg-white/60 backdrop-blur-2xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] p-8">
        <div className="w-full md:w-1/3 flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-200/60 pb-6 md:pb-0 md:pr-8">
          <h2 className="text-[12px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-500" /> Kümülatif Veri
          </h2>
          <div className="flex items-baseline gap-3">
            <span className="text-[3.5rem] leading-none font-black tracking-tighter text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
              {baseGPA.toFixed(2)}
            </span>
            <span className="text-emerald-500 font-black text-[2rem] tracking-tight flex items-center bg-emerald-50 px-3 py-1.5 rounded-2xl border border-emerald-100 shadow-sm ml-2">
              <ChevronRight size={24} className="-ml-1 text-emerald-400" /> {expectedGPA.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="w-full md:w-2/3 space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-5">
            <div className="w-full relative group">
              <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest pl-1">Mevcut Ortalama</label>
              <div className="relative">
                <input
                  type="number" step="0.01" value={baseGPA}
                  onChange={(e) => setBaseGPA(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white/50 border border-slate-200/80 rounded-2xl px-4 py-3 text-[15px] font-bold text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-mono shadow-sm"
                />
              </div>
            </div>
            <div className="w-full relative group">
              <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest pl-1">Kredi Hacmi</label>
              <div className="relative">
                <input
                  type="number" value={baseCredits}
                  onChange={(e) => setBaseCredits(parseInt(e.target.value) || 0)}
                  className="w-full bg-white/50 border border-slate-200/80 rounded-2xl px-4 py-3 text-[15px] font-bold text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-mono shadow-sm"
                />
              </div>
            </div>
          </div>

          <div className="relative h-3 bg-slate-100/80 rounded-full overflow-hidden mt-2 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-1000 rounded-full"
              style={{ width: `${gpaPercentage}%` }}
            ></div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/50 rounded-2xl w-fit backdrop-blur-sm">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Aktif Dönem
        </button>
        <button
          onClick={() => setActiveTab('retake')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'retake' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <RotateCcw size={16} /> Alttan Alınanlar
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start">
        {/* Aktif Görevler Listesi (Decks & Accordion) */}
        <div className="xl:col-span-8 space-y-5">
          <div className="space-y-5">
            {sortedCourses.length === 0 ? (
              <div className="text-center p-16 text-slate-400 bg-white/50 rounded-[2rem] border-2 border-dashed border-slate-200/60 font-medium tracking-wide">
                Bu kategoride hiç ders bulunmuyor.
              </div>
            ) : sortedCourses.map((course, idx) => {
              const { total, finished } = getCourseTotals(course);
              const priorityScore = calculatePriorityScore(course);
              const healthPercentage = total > 0 ? (finished / total) * 100 : 0;

              // Find Closest Assessment
              let closestAssessment: Assessment | null = null;
              let minDays = Infinity;

              if (course.assessments && course.assessments.length > 0) {
                course.assessments.forEach(assessment => {
                  if (!assessment.is_completed && assessment.date) {
                    const days = differenceInDays(new Date(assessment.date), new Date());
                    if (days >= 0 && days < minDays) {
                      minDays = days;
                      closestAssessment = assessment;
                    }
                  }
                });
              }

              const isUrgent = idx === 0 && priorityScore > 10 && activeTab === 'active';
              const isExpanded = expandedCourseId === course.id;

              return (
                <div
                  key={course.id}
                  className={`relative group bg-white rounded-[2rem] transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border ${isUrgent ? 'border-amber-500/50' : 'border-slate-100'} overflow-hidden`}
                >
                  {/* Visual indicator line for expanded */}
                  {isExpanded && <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-indigo-500 z-10"></div>}

                  {/* --- MAIN HEADER / ACCORDION TRIGGER --- */}
                  <div
                    onClick={() => toggleCourseExpand(course.id)}
                    className="p-7 cursor-pointer"
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5 md:pl-3">
                      <div className="flex-1">
                        <h3 className="text-[1.2rem] font-bold text-slate-900 tracking-tight flex items-center gap-2">
                          {isUrgent && <AlertCircle size={18} className="text-amber-500" />}
                          {course.name}
                        </h3>
                        <div className="flex flex-wrap gap-2 text-[12px] font-bold text-slate-500 mt-2 tracking-wide uppercase">
                          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-100"><Layers size={13} className="text-indigo-500" /> {course.decks?.length || 0} Alt Materyal</span>

                          {closestAssessment && (
                            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${minDays < 7 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-100'
                              }`}>
                              {(closestAssessment as Assessment).type === 'project' ? <PenTool size={13} className="opacity-70 text-pink-600" /> :
                                (closestAssessment as Assessment).type === 'quiz' ? <AlertCircle size={13} className="opacity-70 text-orange-500" /> :
                                  <Calendar size={13} className="opacity-70 text-red-500" />}
                              {(closestAssessment as Assessment).name}: {format((closestAssessment as Assessment).date!, 'dd MMM')} ({minDays === 0 ? 'Bugün' : minDays > 0 ? `${minDays} Gün` : 'Geçti'})
                            </span>
                          )}

                          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-100"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>Hedef: {course.target_grade}</span>
                        </div>
                      </div>

                      {/* Context Actions */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStatusToggle(course.id); }}
                          className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors uppercase tracking-wider"
                        >
                          {activeTab === 'active' ? 'Alttan Al' : 'Aktife Taşı'}
                        </button>

                        <button onClick={(e) => openEditModal(course, e)} className="text-slate-400 hover:text-blue-600 transition-colors bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <Edit2 size={16} />
                        </button>

                        <button onClick={(e) => handleDeleteCourse(course.id, e)} className="text-slate-400 hover:text-red-500 transition-colors bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <Minus size={16} />
                        </button>

                        <div className="text-right flex-shrink-0 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 ml-2">
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Öncelik Puanı</div>
                          <div className={`text-xl font-bold font-mono text-center leading-none mt-1 ${isUrgent ? 'text-amber-600' : 'text-slate-800'}`}>
                            {priorityScore.toFixed(1)}
                          </div>
                        </div>

                        {/* Chevron Arrow */}
                        <div className={`ml-2 text-slate-300 transition-transform duration-300 ${isExpanded ? '-rotate-180' : ''}`}>
                          <ChevronDown size={24} />
                        </div>
                      </div>
                    </div>

                    {/* High level Progress */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end md:pl-3">
                      <div className="md:col-span-8">
                        <div className="flex justify-between items-center text-[12px] font-bold mb-3">
                          <span className="text-slate-400 uppercase tracking-widest">Kümülatif İlerleme</span>
                          <span className="text-slate-800 text-[13px] font-black w-[100px] text-right font-mono">
                            {finished} / <span className="text-slate-400">{total} Sayfa</span>
                          </span>
                        </div>
                        <Progress value={healthPercentage} indicatorClassName={`bg-gradient-to-r ${healthPercentage < 50 ? 'from-amber-400 to-amber-500' : 'from-blue-500 to-indigo-500'}`} />
                      </div>

                      <div className="md:col-span-4 flex items-center gap-4 m-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); startFocusSession(course, null); }}
                          className={`px-5 py-3.5 rounded-2xl font-bold text-[13px] flex items-center justify-center gap-2 transition-all flex-shrink-0 w-full md:w-auto shadow-sm active:scale-95 ${activeCourse?.id === course.id && isActive && !activeDeck
                            ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 ring-2 ring-indigo-200 ring-offset-2'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100'
                            }`}
                        >
                          {activeCourse?.id === course.id && isActive && !activeDeck ? (
                            <> <Pause size={16} fill="currentColor" /> Tüm Dersi Çalış </>
                          ) : (
                            <> <Play size={16} fill="currentColor" /> Tüm Dersi Çalış </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* --- EXPANDED DECK LIST --- */}
                  <div className={`transition-all duration-300 overflow-hidden bg-slate-50/50 border-t border-slate-100 ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="p-6 md:pl-10 space-y-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Alt Materyaller (Slayt & Dökümanlar)</h4>

                      {course.decks?.length === 0 && (
                        <div className="text-[13px] font-medium text-slate-400 py-3">Henüz hiçbir slayt desteği tanımlamadınız. Lütfen "Düzenle" butonundan ekleyin.</div>
                      )}

                      {course.decks?.map((deck, d_idx) => (
                        <div key={deck.id} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => toggleDeckCompletion(course.id, deck.id)}
                                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${deck.is_completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-emerald-400'}`}
                              >
                                <CheckCircle2 size={14} />
                              </button>
                              <h4 className={`text-[14px] font-bold ${deck.is_completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{deck.name}</h4>
                            </div>
                          </div>

                          <div className="flex items-center justify-between md:justify-end gap-5 w-full md:w-auto">
                            {/* Incremental +/- Buttons */}
                            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-100">
                              <button
                                onClick={() => handleDeckProgressChange(course.id, deck.id, -1)} disabled={deck.is_completed}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors shadow-sm disabled:opacity-50"
                              >
                                <Minus size={14} strokeWidth={2.5} />
                              </button>
                              <span className={`text-[12px] font-black w-[60px] text-center font-mono ${deck.is_completed ? 'text-slate-400' : 'text-slate-700'}`}>
                                {deck.read_pages} <span className="text-slate-400">/ {deck.total_pages}</span>
                              </span>
                              <button
                                onClick={() => handleDeckProgressChange(course.id, deck.id, 1)} disabled={deck.is_completed}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors shadow-sm disabled:opacity-50"
                              >
                                <Plus size={14} strokeWidth={2.5} />
                              </button>
                            </div>

                            {/* Deck Specific Focus Button */}
                            <button
                              onClick={() => startFocusSession(course, deck)}
                              title="Sadece bu materyali çalış"
                              className={`p-2.5 rounded-xl transition-colors shadow-sm active:scale-95 ${activeCourse?.id === course.id && activeDeck?.id === deck.id && isActive
                                ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-200 ring-offset-1'
                                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/10'
                                }`}
                            >
                              {activeCourse?.id === course.id && activeDeck?.id === deck.id && isActive ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Çalışma Seansı Timer - Glassmorphic / Premium */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.05)] rounded-[2.5rem] p-8 min-h-[500px] flex flex-col items-center justify-center sticky top-10">
            {activeCourse ? (
              <div className="w-full relative z-10 flex flex-col items-center">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`text-[11px] font-black uppercase tracking-widest flex items-center gap-2 px-3 py-1.5 rounded-full shadow-sm ${sessionType === 'focus' ? 'text-blue-600 bg-blue-100' : 'text-emerald-600 bg-emerald-100'
                    }`}>
                    {sessionType === 'focus' ? (
                      <><Clock size={14} /> Aktif Odak</>
                    ) : (
                      <><Coffee size={14} /> Mola Zamanı</>
                    )}
                  </div>
                  <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full shadow-sm">
                    Döngü: {currentCycle} / {targetCycles}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-2 text-center px-4 leading-snug">
                  {activeCourse.name}
                </h3>

                {activeDeck ? (
                  <p className="text-[13px] font-bold text-blue-600 mb-10 flex items-center gap-1.5 bg-blue-50 px-3 py-1 rounded-lg">
                    <Layers size={14} /> {activeDeck.name}
                  </p>
                ) : (
                  <div className="mb-10"></div>
                )}

                {/* Timer Display */}
                <div className="relative w-64 h-64 mx-auto flex items-center justify-center mb-10">
                  {/* Background blur glow */}
                  <div className={`absolute inset-0 blur-3xl rounded-full transition-colors duration-1000 ${sessionType === 'focus' ? 'bg-blue-500/15' : 'bg-emerald-500/15'
                    }`}></div>

                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle cx="128" cy="128" r="120" stroke="#f1f5f9" strokeWidth="6" fill="none" />
                    <circle
                      cx="128" cy="128" r="120"
                      stroke={isActive ? (sessionType === 'focus' ? "url(#timerFocus)" : "url(#timerRest)") : "#cbd5e1"}
                      strokeWidth="6" fill="none" strokeLinecap="round"
                      strokeDasharray="754"
                      strokeDashoffset={754 - (timeLeft / ((sessionType === 'focus' ? (Number(focusMinutes) || 25) : (Number(restMinutes) || 5)) * 60)) * 754}
                      className="transition-all duration-1000"
                    />
                    <defs>
                      <linearGradient id="timerFocus" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                      <linearGradient id="timerRest" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className={`text-[4rem] font-black tabular-nums tracking-tighter z-10 bg-clip-text text-transparent ${isActive ? (sessionType === 'focus' ? 'bg-gradient-to-br from-slate-900 to-slate-600' : 'bg-gradient-to-br from-emerald-600 to-emerald-900') : 'bg-slate-400'
                    }`}>
                    {formatTime(timeLeft)}
                  </div>
                </div>

                <div className="flex gap-3 w-full justify-center px-4">
                  <button
                    onClick={() => setIsActive(!isActive)}
                    className={`flex-1 h-14 flex items-center justify-center rounded-2xl text-white transition-colors shadow-lg active:scale-95 ${sessionType === 'focus'
                      ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      }`}
                  >
                    {isActive ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-1" />}
                  </button>
                  <button
                    onClick={stopFocusSession}
                    className="h-14 px-6 flex items-center justify-center rounded-2xl text-[14px] font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors active:scale-95"
                  >
                    <Square size={18} fill="currentColor" className="mr-2" /> Bitir
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 flex flex-col items-center justify-center h-full w-full">
                <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center mb-6 shadow-inner border border-slate-100">
                  <Clock size={32} className="text-slate-300" />
                </div>
                <p className="font-bold text-slate-800 text-[18px]">Odağa Hazırlık</p>
                <p className="text-[14px] mt-2 text-slate-400 leading-relaxed max-w-[220px] text-center font-medium">
                  Derin çalışmaya başlamak için soldan bir ders veya slayt seçin.
                </p>

                <div className="mt-10 w-full px-4 space-y-5">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center gap-4">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                      Çalışma (Dk)
                    </span>
                    <input
                      type="number" value={focusMinutes} min={1} max={120}
                      onChange={(e) => handleFocusChange(e.target.value)}
                      onBlur={() => { if (!focusMinutes) handleFocusChange('25'); }}
                      className="w-16 bg-white border border-slate-200 text-slate-900 font-bold text-center py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center gap-4">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                      Mola (Dk)
                    </span>
                    <input
                      type="number" value={restMinutes} min={1} max={60}
                      onChange={(e) => handleRestChange(e.target.value)}
                      onBlur={() => { if (!restMinutes) handleRestChange('5'); }}
                      className="w-16 bg-white border border-slate-200 text-slate-900 font-bold text-center py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center gap-4">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                      Tekrar (Döngü)
                    </span>
                    <input
                      type="number" value={targetCycles} min={1} max={10}
                      onChange={(e) => handleTargetCyclesChange(e.target.value)}
                      onBlur={() => { if (!targetCycles) handleTargetCyclesChange('1'); }}
                      className="w-16 bg-white border border-slate-200 text-slate-900 font-bold text-center py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ToDo List Widget */}
          <div className="bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.05)] rounded-[2.5rem] p-6 lg:sticky lg:top-[560px]">
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-[14px] font-extrabold text-slate-900 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500" /> Görevler
              </h3>
              <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                {todos.filter(t => t.completed).length} / {todos.length}
              </span>
            </div>

            <div className="space-y-2 mb-4 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
              {todos.length === 0 && (
                <p className="text-center text-[12px] font-medium text-slate-400 py-4">Henüz görev eklenmedi.</p>
              )}
              {todos.map(todo => (
                <div key={todo.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-all group ${todo.completed ? 'bg-slate-50/50 border-transparent' : 'bg-white border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:border-blue-100'}`}>
                  <button
                    onClick={() => setTodos(todos.map(t => t.id === todo.id ? { ...t, completed: !t.completed } : t))}
                    className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${todo.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-emerald-400 text-transparent'}`}
                  >
                    <CheckCircle2 size={12} strokeWidth={3} />
                  </button>
                  <span className={`text-[13px] font-bold leading-tight flex-1 ${todo.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                    {todo.text}
                  </span>
                  <button
                    onClick={() => setTodos(todos.filter(t => t.id !== todo.id))}
                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 translate-y-0.5"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTodo.trim()) return;
                setTodos([...todos, { id: Math.random().toString(), text: newTodo.trim(), completed: false }]);
                setNewTodo('');
              }}
              className="relative"
            >
              <input
                type="text"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-3 text-[13px] font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all pr-12"
                placeholder="Yeni görev ekle..."
              />
              <button
                type="submit"
                disabled={!newTodo.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg transition-colors shadow-sm"
              >
                <Plus size={16} strokeWidth={3} />
              </button>
            </form>
          </div>

        </div>
      </div>

      {/* Premium Add / Edit Modal - ADAPTED FOR DECKS */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-md flex items-center justify-center z-50 p-4 font-sans animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white rounded-[2rem] shadow-[0_20px_60px_rgb(0,0,0,0.1)] p-8 border border-white max-h-[90vh] overflow-y-auto flex flex-col md:flex-row gap-8">

            {/* Left Col: Course Info */}
            <div className="w-full md:w-1/2 space-y-5 border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-6">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 mb-1 tracking-tight">
                  {editingCourseId ? 'Dersi Düzenle' : (activeTab === 'active' ? 'Yeni Ders' : 'Alttan Ders')}
                </h2>
                <p className="text-slate-400 text-[12px] font-medium mb-6">Genel ders bilgilerini girin.</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-widest pl-1">Ders Adı</label>
                <input
                  type="text" value={formCourse.name} onChange={(e) => setFormCourse({ ...formCourse, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-none bg-slate-50 text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-shadow"
                  placeholder="Örn: Veri Yapıları"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-widest pl-1">Kredi</label>
                  <input type="number" value={formCourse.credits} onChange={(e) => setFormCourse({ ...formCourse, credits: parseInt(e.target.value) })} className="w-full px-4 py-3 rounded-xl border-none bg-slate-50 text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-shadow font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-widest pl-1">Zorluk (1-10)</label>
                  <input type="number" min="1" max="10" value={formCourse.difficulty} onChange={(e) => setFormCourse({ ...formCourse, difficulty: parseInt(e.target.value) })} className="w-full px-4 py-3 rounded-xl border-none bg-slate-50 text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-shadow font-mono" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-widest pl-1">Hedef Not</label>
                <select
                  value={formCourse.target_grade}
                  onChange={(e) => setFormCourse({ ...formCourse, target_grade: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-none bg-slate-50 text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-shadow cursor-pointer tracking-wide"
                >
                  {Object.keys(gradeToPoints).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-widest pl-1">
                  Ders Günleri <span className="text-slate-400 font-medium normal-case ml-1">(Pop Quiz Zamanlaması İçin)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { val: 1, label: 'Pzt' }, { val: 2, label: 'Sal' }, { val: 3, label: 'Çar' },
                    { val: 4, label: 'Per' }, { val: 5, label: 'Cum' }, { val: 6, label: 'Cmt' }, { val: 0, label: 'Pzr' }
                  ].map(day => {
                    const isSelected = formCourse.schedule_days?.includes(day.val);
                    return (
                      <button
                        key={day.val}
                        type="button"
                        onClick={() => {
                          const currentDays = formCourse.schedule_days || [];
                          let newDays;
                          if (currentDays.includes(day.val)) {
                            newDays = currentDays.filter(d => d !== day.val);
                          } else {
                            newDays = [...currentDays, day.val];
                          }
                          setFormCourse({ ...formCourse, schedule_days: newDays });
                        }}
                        className={`flex-1 min-w-[36px] px-2 py-2 rounded-xl text-[12px] font-bold transition-all ${isSelected ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                          }`}
                      >
                        {day.label}
                      </button>
                    )
                  })}
                </div>
              </div>

            </div>

            {/* Right Col: Deck & Assessment Management */}
            <div className="w-full md:w-1/2 flex flex-col h-full overflow-y-auto pr-2 custom-scrollbar">

              {/* Assessments Builder */}
              <div className="flex justify-between items-center mb-4 mt-2">
                <h3 className="text-[14px] font-extrabold text-slate-900">Değerlendirmeler (Sınav, Proje)</h3>
                <button
                  onClick={() => setFormAssessments([...formAssessments, { id: Math.random().toString(), name: 'Yeni Sınav', type: 'exam', date: new Date(), weight: 10, is_completed: false }])}
                  className="flex items-center gap-1 text-[11px] font-bold text-pink-600 bg-pink-50 px-2.5 py-1.5 rounded-lg hover:bg-pink-100 transition-colors"
                >
                  <Plus size={14} /> Ekle
                </button>
              </div>

              <div className="space-y-3 mb-8">
                {formAssessments.length === 0 && <p className="text-xs text-slate-400 mt-2">Bu derse ait sınav/proje eklemediniz.</p>}

                {formAssessments.map((assessment, idx) => (
                  <div key={assessment.id} className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 relative group">
                    <button
                      onClick={() => setFormAssessments(formAssessments.filter(a => a.id !== assessment.id))}
                      className="absolute -top-2 -right-2 bg-red-100 text-red-600 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <Minus size={12} strokeWidth={3} />
                    </button>

                    <div className="flex gap-2 mb-2">
                      <select
                        value={assessment.type}
                        onChange={(e) => {
                          const newA = [...formAssessments];
                          newA[idx].type = e.target.value as any;
                          setFormAssessments(newA);
                        }}
                        className="w-24 bg-white px-2 py-2 rounded-lg text-[12px] font-bold text-slate-700 border-none focus:ring-2 focus:ring-pink-100 outline-none shadow-sm"
                      >
                        <option value="exam">Sınav</option>
                        <option value="quiz">Quiz</option>
                        <option value="project">Proje</option>
                      </select>
                      <input
                        type="text" value={assessment.name}
                        onChange={(e) => {
                          const newA = [...formAssessments];
                          newA[idx].name = e.target.value;
                          setFormAssessments(newA);
                        }}
                        className="flex-1 bg-white px-3 py-2 rounded-lg text-[13px] font-bold text-slate-800 border-none focus:ring-2 focus:ring-pink-100 outline-none shadow-sm"
                        placeholder="Örn: Vize 1"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <input
                          type="date"
                          disabled={assessment.date === null}
                          value={assessment.date ? format(assessment.date, 'yyyy-MM-dd') : ''}
                          onChange={(e) => {
                            const newA = [...formAssessments];
                            newA[idx].date = e.target.value ? new Date(e.target.value) : new Date();
                            setFormAssessments(newA);
                          }}
                          className={`w-full bg-white px-2 py-1.5 rounded-lg text-[12px] font-bold border-none focus:ring-2 focus:ring-pink-100 outline-none shadow-sm transition-all ${assessment.date === null ? 'text-slate-300 opacity-50' : 'text-slate-600'}`}
                        />
                      </div>

                      <button
                        title="Tarihi belirsiz (Pop Quiz vs) yapmak için tıklayın."
                        onClick={(e) => {
                          e.preventDefault();
                          const newA = [...formAssessments];
                          if (newA[idx].date === null) {
                            newA[idx].date = new Date(); // Restore date
                          } else {
                            newA[idx].date = null; // Set to dateless
                          }
                          setFormAssessments(newA);
                        }}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-colors border shadow-sm whitespace-nowrap ${assessment.date === null ? 'bg-pink-100 text-pink-700 border-pink-200' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}
                      >
                        Tarihsiz
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-bold text-slate-400">AGRLK:</span>
                        <div className="relative w-16">
                          <input
                            type="number" value={assessment.weight}
                            onChange={(e) => {
                              const newA = [...formAssessments];
                              newA[idx].weight = parseInt(e.target.value) || 0;
                              setFormAssessments(newA);
                            }}
                            className="w-full bg-white px-2 py-1.5 rounded-lg text-[12px] font-mono font-bold text-center border-none focus:ring-2 focus:ring-pink-100 outline-none shadow-sm pr-5"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Decks Builder */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[14px] font-extrabold text-slate-900">Alt Materyaller</h3>
                <button
                  onClick={() => setFormDecks([...formDecks, { id: Math.random().toString(), name: 'Yeni Slayt', total_pages: 50, read_pages: 0, is_completed: false }])}
                  className="flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Plus size={14} /> Ekle
                </button>
              </div>

              <div className="space-y-3">
                {formDecks.length === 0 && <p className="text-xs text-slate-400 mt-2">Dersin içindeki ilk slaytı/dökümanı ekleyin.</p>}

                {formDecks.map((deck, idx) => (
                  <div key={deck.id} className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 relative group">
                    <button
                      onClick={() => setFormDecks(formDecks.filter(d => d.id !== deck.id))}
                      className="absolute -top-2 -right-2 bg-red-100 text-red-600 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Minus size={12} strokeWidth={3} />
                    </button>

                    <input
                      type="text" value={deck.name}
                      onChange={(e) => {
                        const newDecks = [...formDecks];
                        newDecks[idx].name = e.target.value;
                        setFormDecks(newDecks);
                      }}
                      className="w-full bg-white px-3 py-2 rounded-lg text-[13px] font-bold text-slate-800 border-none focus:ring-2 focus:ring-indigo-100 focus:outline-none mb-2 shadow-sm"
                      placeholder="Örn: Hafta 1 Slaytı"
                    />

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 flex-1">Sayfa Sayısı:</span>
                      <input
                        type="number" value={deck.total_pages}
                        onChange={(e) => {
                          const newDecks = [...formDecks];
                          const val = parseInt(e.target.value) || 0;
                          newDecks[idx].total_pages = val;
                          setFormDecks(newDecks);
                        }}
                        className="w-16 bg-white px-2 py-1.5 rounded-lg text-[12px] font-mono font-bold text-center border-none focus:ring-2 focus:ring-indigo-100 focus:outline-none shadow-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex gap-3 pt-4 border-t border-slate-100">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-[14px]">İptal</button>
                <button
                  onClick={handleSaveCourse}
                  className="flex-[2] py-3.5 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10 active:scale-95 flex items-center justify-center gap-2 text-[14px]"
                >
                  <CheckCircle2 size={18} /> {editingCourseId ? 'Güncelle' : 'Kursa Kaydet'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
