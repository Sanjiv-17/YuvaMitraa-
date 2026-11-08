import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Calendar, 
  TrendingUp, 
  Award, 
  Briefcase,
  Loader2,
  BookOpen,
  CheckSquare,
  Square,
  PlusCircle,
  Check,
  DollarSign
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateCareerRoadmap } from '../../services/api';

export const CareerRoadmap: React.FC = () => {
  const { setActiveTab, user, updateUser } = useApp();

  const presets = [
    'Frontend React Developer',
    'Python & AI Data Specialist',
    'Digital Marketing & Growth Lead',
    'Chartered Accountant & Tally Specialist',
    'Civil Services (UPSC / State PSC) Aspirant',
    'UI/UX Product Designer'
  ];

  const [careerGoal, setCareerGoal] = useState(presets[0]);
  const [currentLevel, setCurrentLevel] = useState('Beginner');
  const [isGenerating, setIsGenerating] = useState(false);
  const [completedPhases, setCompletedPhases] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('ym_roadmap_completed');
      return saved ? JSON.parse(saved) : [1];
    } catch {
      return [1];
    }
  });

  const [roadmap, setRoadmap] = useState<{
    title: string;
    estimatedMonths: number;
    summary: string;
    targetStartingSalary: string;
    phases: Array<{
      phaseNumber: number;
      phaseName: string;
      duration: string;
      goal: string;
      keySkills: string[];
      recommendedProjects: string[];
      milestoneQuizTopic: string;
    }>;
    topAdvice: string;
  } | null>(null);

  // Sync completed phases to localStorage
  useEffect(() => {
    localStorage.setItem('ym_roadmap_completed', JSON.stringify(completedPhases));
  }, [completedPhases]);

  const togglePhaseComplete = (phaseNumber: number) => {
    setCompletedPhases(prev => {
      const isAlready = prev.includes(phaseNumber);
      if (isAlready) {
        return prev.filter(p => p !== phaseNumber);
      } else {
        // Award XP
        updateUser({
          xpPoints: user.xpPoints + 100,
          badges: user.badges.includes('Roadmap Pioneer') ? user.badges : [...user.badges, 'Roadmap Pioneer']
        });
        return [...prev, phaseNumber];
      }
    });
  };

  const handleAddSkillsToProfile = (skills: string[]) => {
    const newSkills = Array.from(new Set([...user.skills, ...skills]));
    updateUser({ skills: newSkills });
  };

  const handleGenerate = async (customGoal?: string) => {
    const goal = customGoal || careerGoal;
    setIsGenerating(true);
    try {
      const data = await generateCareerRoadmap(goal, currentLevel);
      setRoadmap(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const progressPercent = roadmap 
    ? Math.round((completedPhases.length / Math.max(1, roadmap.phases.length)) * 100) 
    : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-[#FF7A00] text-xs font-bold mb-1.5">
            <Compass className="w-3.5 h-3.5" />
            <span>AI Career Architecture</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>AI Career Learning Roadmap</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Personalized milestone blueprint with interactive phase completion, capstone projects, and salary benchmarks
          </p>
        </div>
      </div>

      {/* Goal Input & Presets */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8">
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Your Target Career Goal:
            </label>
            <input
              type="text"
              value={careerGoal}
              onChange={(e) => setCareerGoal(e.target.value)}
              placeholder="e.g. Cloud Solutions Architect, Full Stack Developer, Banking Officer..."
              className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] focus:bg-white font-semibold text-slate-800 transition-all"
            />
          </div>

          <div className="sm:col-span-4 flex items-end">
            <button
              onClick={() => handleGenerate()}
              disabled={isGenerating || !careerGoal.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#E06900] text-white font-bold text-xs shadow-md shadow-orange-500/20 hover:shadow-orange-500/35 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Roadmap...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate AI Roadmap</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1">
          <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">
            Popular Tracks:
          </span>
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => {
                setCareerGoal(p);
                handleGenerate(p);
              }}
              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-orange-50 hover:text-[#FF7A00] text-slate-600 text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Generated Roadmap Display */}
      {roadmap ? (
        <div className="space-y-6 animate-in fade-in">
          
          {/* Summary Overview Card */}
          <div className="bg-gradient-to-r from-[#FF7A00] via-orange-500 to-amber-500 text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="inline-flex items-center gap-1.5 bg-black/20 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tailored by Gemini 3.8 Flash</span>
              </div>

              {/* Progress Pill */}
              <div className="bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                <span>Milestone Progress:</span>
                <span className="text-white font-black">{progressPercent}%</span>
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-black">
              {roadmap.title}
            </h2>

            <p className="text-xs sm:text-sm text-orange-100 max-w-2xl font-medium leading-relaxed">
              {roadmap.summary}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span className="text-xs bg-white text-[#FF7A00] px-3.5 py-1.5 rounded-xl font-bold shadow-xs flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Timeline: ~{roadmap.estimatedMonths} Months</span>
              </span>
              <span className="text-xs bg-white/20 px-3.5 py-1.5 rounded-xl font-bold backdrop-blur-xs flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Target Entry: {roadmap.targetStartingSalary}</span>
              </span>
            </div>
          </div>

          {/* Timeline Phases with Interactive Checkbox */}
          <div className="space-y-4">
            {roadmap.phases.map((phase) => {
              const isDone = completedPhases.includes(phase.phaseNumber);

              return (
                <div
                  key={phase.phaseNumber}
                  className={`bg-white p-6 rounded-3xl border transition-all space-y-4 ${
                    isDone 
                      ? 'border-emerald-300 bg-emerald-50/20 shadow-xs' 
                      : 'border-slate-200/90 shadow-2xs hover:border-[#FF7A00]/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => togglePhaseComplete(phase.phaseNumber)}
                        className={`w-9 h-9 rounded-xl font-black text-sm flex items-center justify-center transition-all cursor-pointer ${
                          isDone
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : 'bg-orange-50 text-[#FF7A00] border border-orange-200 hover:bg-orange-100'
                        }`}
                        title={isDone ? 'Mark as In-Progress' : 'Mark as Completed'}
                      >
                        {isDone ? <Check className="w-5 h-5 stroke-[3]" /> : `#${phase.phaseNumber}`}
                      </button>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Phase {phase.phaseNumber} • {phase.duration}
                        </span>
                        <h3 className={`text-sm font-bold ${isDone ? 'text-emerald-950 line-through opacity-80' : 'text-slate-900'}`}>
                          {phase.phaseName}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                        Goal: {phase.goal}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Skills */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 block">
                          Key Competencies:
                        </span>
                        <button
                          onClick={() => handleAddSkillsToProfile(phase.keySkills)}
                          className="text-[10px] text-[#FF7A00] hover:underline font-bold flex items-center gap-0.5"
                        >
                          <PlusCircle className="w-3 h-3" />
                          <span>Add to Profile</span>
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {phase.keySkills.map((sk, sIdx) => (
                          <span
                            key={sIdx}
                            className="text-xs font-medium bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200/60"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Projects */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-700 block">
                        Capstone Portfolio Deliverables:
                      </span>
                      <ul className="space-y-1.5 text-xs text-slate-600">
                        {phase.recommendedProjects.map((proj, pIdx) => (
                          <li key={pIdx} className="flex items-start gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FF7A00] mt-1.5 shrink-0" />
                            <span>{proj}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs flex-wrap gap-2">
                    <span className="text-slate-500">
                      Milestone Assessment: <strong className="text-slate-800">{phase.milestoneQuizTopic}</strong>
                    </span>
                    <button
                      onClick={() => setActiveTab('courses')}
                      className="text-xs font-bold text-[#0284C7] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Take Recommended Course</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>

          {/* Top Mentor Advice */}
          {roadmap.topAdvice && (
            <div className="bg-[#E6F4FF] p-5 rounded-3xl border border-sky-200 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-[#0284C7] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-[#0284C7] uppercase tracking-wider">
                  Mentor Golden Rule:
                </h4>
                <p className="text-xs font-bold text-slate-800 mt-1">
                  &quot;{roadmap.topAdvice}&quot;
                </p>
              </div>
            </div>
          )}

        </div>
      ) : (
        <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-500 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#FF7A00] flex items-center justify-center mx-auto">
            <Compass className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Generate Your Tailored Career Plan
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Choose any dream role and get an exact step-by-step 4-phase learning journey with capstone projects and placement guidelines.
          </p>
          <button
            onClick={() => handleGenerate()}
            className="mt-3 px-6 py-2.5 bg-gradient-to-r from-[#FF7A00] to-[#E06900] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer hover:shadow-lg transition-all"
          >
            Generate Frontend Developer Plan
          </button>
        </div>
      )}

    </div>
  );
};
