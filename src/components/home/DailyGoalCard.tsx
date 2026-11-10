import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Sparkles, 
  CheckCircle2, 
  Plus, 
  RotateCcw, 
  Edit3, 
  Flame, 
  Award, 
  Clock, 
  Check, 
  X,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';

export interface DailyGoal {
  title: string;
  category: string;
  targetMinutes: number;
  completedMinutes: number;
  lastUpdatedDate: string;
  isCompleted: boolean;
}

const DEFAULT_GOAL: DailyGoal = {
  title: 'React Hooks & State Management',
  category: 'Frontend Development',
  targetMinutes: 60,
  completedMinutes: 45,
  lastUpdatedDate: new Date().toISOString().split('T')[0],
  isCompleted: false,
};

export const DailyGoalCard: React.FC = () => {
  const { user, updateUser, setActiveTab } = useApp();

  const [goal, setGoal] = useState<DailyGoal>(() => {
    const saved = localStorage.getItem('ym_daily_goal');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const today = new Date().toISOString().split('T')[0];
        // If from another day, retain settings but reset completed minutes
        if (parsed.lastUpdatedDate !== today) {
          return {
            ...parsed,
            completedMinutes: 0,
            lastUpdatedDate: today,
            isCompleted: false,
          };
        }
        return parsed;
      } catch (e) {
        return DEFAULT_GOAL;
      }
    }
    return DEFAULT_GOAL;
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(goal.title);
  const [editCategory, setEditCategory] = useState(goal.category);
  const [editTarget, setEditTarget] = useState(goal.targetMinutes);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('ym_daily_goal', JSON.stringify(goal));
  }, [goal]);

  const presetGoals = [
    { title: 'React Hooks & State Management', category: 'Frontend Tech', target: 60 },
    { title: 'Python Pandas Data Wrangling', category: 'Data & AI', target: 45 },
    { title: 'Quantitative Aptitude Shortcuts (Govt Exams)', category: 'Govt Prep', target: 60 },
    { title: 'Figma Auto-Layout & UI Systems', category: 'UI/UX Design', target: 45 },
    { title: 'Tally Prime Vouchers & GST Entry', category: 'Finance', target: 30 },
    { title: 'Business English & STAR Interview Prep', category: 'Soft Skills', target: 30 },
  ];

  const percentage = Math.min(100, Math.round((goal.completedMinutes / Math.max(1, goal.targetMinutes)) * 100));

  // Circular progress calculations
  const radius = 42;
  const circumference = 2 * Math.PI * radius; // approx 263.89
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const handleAddMinutes = (mins: number) => {
    const newMinutes = Math.min(goal.targetMinutes * 2, goal.completedMinutes + mins);
    const completedNow = newMinutes >= goal.targetMinutes;

    if (completedNow && !goal.isCompleted) {
      // Fire celebration confetti!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 }
      });
      // Award XP
      const currentBadges = user?.badges || [];
      const currentStreak = user?.streakDays ?? 5;
      updateUser({
        xpPoints: (user?.xpPoints ?? 1250) + 35,
        streakDays: currentStreak < 6 ? currentStreak + 1 : currentStreak,
        badges: currentBadges.includes('Daily Achiever') ? currentBadges : [...currentBadges, 'Daily Achiever']
      });
    }

    setGoal(prev => ({
      ...prev,
      completedMinutes: newMinutes,
      isCompleted: completedNow || prev.isCompleted,
      lastUpdatedDate: new Date().toISOString().split('T')[0],
    }));
  };

  const handleReset = () => {
    setGoal(prev => ({
      ...prev,
      completedMinutes: 0,
      isCompleted: false,
    }));
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;

    setGoal({
      title: editTitle.trim(),
      category: editCategory,
      targetMinutes: Number(editTarget),
      completedMinutes: Math.min(goal.completedMinutes, Number(editTarget)),
      lastUpdatedDate: new Date().toISOString().split('T')[0],
      isCompleted: goal.completedMinutes >= Number(editTarget),
    });
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-5 sm:p-6 overflow-hidden relative">
      
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 rounded-full bg-[#E6F4FF]/50 blur-2xl pointer-events-none" />

      {/* Card Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#FF7A00] flex items-center justify-center border border-orange-200 shadow-2xs">
            <Target className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                Daily Study & Skill Goal
              </h2>
              <span className="text-[10px] font-bold bg-[#E6F4FF] text-[#0284C7] px-2 py-0.5 rounded-full">
                Today
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Track your dedicated learning hours for career placement
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setEditTitle(goal.title);
            setEditCategory(goal.category);
            setEditTarget(goal.targetMinutes);
            setIsEditing(!isEditing);
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-[#FF7A00] hover:bg-orange-50 transition-colors border border-slate-200/80 cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isEditing ? 'Close' : 'Set Goal'}</span>
        </button>
      </div>

      {isEditing ? (
        /* Edit Goal Form */
        <form onSubmit={handleSaveEdit} className="py-4 space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-8">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Goal Title / Focus Area *
              </label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="e.g. React Native, Tally Invoicing, SSC Reasoning..."
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 font-medium"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Target Minutes / Day
              </label>
              <select
                value={editTarget}
                onChange={(e) => setEditTarget(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 font-medium"
              >
                <option value={15}>15 Minutes (Quick Sprint)</option>
                <option value={30}>30 Minutes (Steady)</option>
                <option value={45}>45 Minutes (Recommended)</option>
                <option value={60}>60 Minutes (1 Hour Focus)</option>
                <option value={90}>90 Minutes (Deep Dive)</option>
                <option value={120}>120 Minutes (Placement Prep)</option>
              </select>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400">
              Quick Career Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {presetGoals.map((p, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => {
                    setEditTitle(p.title);
                    setEditCategory(p.category);
                    setEditTarget(p.target);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#E6F4FF] hover:text-[#0284C7] text-slate-600 text-[11px] font-medium transition-colors"
                >
                  {p.title.split(' ')[0]} {p.title.split(' ')[1]} ({p.target}m)
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#FF7A00] hover:bg-[#E06900] text-white text-xs font-bold shadow-md cursor-pointer"
            >
              Update Goal
            </button>
          </div>
        </form>
      ) : (
        /* Progress View */
        <div className="py-3 flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Circular Progress & Percentage */}
          <div className="flex items-center gap-5">
            
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-slate-100"
                />
                {/* Foreground Animated Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className={`transition-all duration-700 ease-out ${
                    percentage >= 100
                      ? 'text-emerald-500'
                      : percentage >= 50
                      ? 'text-[#FF7A00]'
                      : 'text-[#0284C7]'
                  }`}
                />
              </svg>

              {/* Inside Ring Label */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-base sm:text-lg font-black text-slate-900 leading-none">
                  {percentage}%
                </span>
                <span className="text-[10px] font-semibold text-slate-400 mt-0.5">
                  {percentage >= 100 ? 'Done! 🏆' : 'of goal'}
                </span>
              </div>
            </div>

            {/* Goal Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF7A00] bg-orange-50 px-2 py-0.5 rounded-sm">
                  {goal.category}
                </span>
                {goal.completedMinutes >= goal.targetMinutes && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Completed! +35 XP</span>
                  </span>
                )}
              </div>

              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                {goal.title}
              </h3>

              <div className="flex items-center gap-3 text-xs text-slate-500 pt-0.5">
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{goal.completedMinutes} / {goal.targetMinutes} mins completed</span>
                </span>
                <span>•</span>
                <span className="text-slate-400">
                  {Math.max(0, goal.targetMinutes - goal.completedMinutes)} mins left
                </span>
              </div>
            </div>

          </div>

          {/* Quick Increment Actions */}
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
            <button
              onClick={() => handleAddMinutes(15)}
              className="px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#FF7A00] font-bold text-xs border border-orange-200 transition-colors flex items-center gap-1 cursor-pointer"
              title="Add 15 minutes of study"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+15m</span>
            </button>

            <button
              onClick={() => handleAddMinutes(30)}
              className="px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#FF7A00] font-bold text-xs border border-orange-200 transition-colors flex items-center gap-1 cursor-pointer"
              title="Add 30 minutes of study"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+30m</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('courses');
              }}
              className="px-3.5 py-2 rounded-xl bg-[#0284C7] hover:bg-sky-600 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Open courses to study"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Study Module</span>
            </button>

            {goal.completedMinutes > 0 && (
              <button
                onClick={handleReset}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Reset today's progress"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>
      )}

      {/* Motivational Footer Strip */}
      <div className="mt-2 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <Flame className="w-3.5 h-3.5 text-[#FF7A00]" />
          <span>Keep your <strong className="text-slate-800">{user?.streakDays ?? 5}-day streak</strong> active with daily practice.</span>
        </span>
        <button
          onClick={() => setActiveTab('roadmap')}
          className="text-[#FF7A00] font-semibold hover:underline flex items-center gap-0.5"
        >
          <span>View Career Roadmap</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

    </div>
  );
};
