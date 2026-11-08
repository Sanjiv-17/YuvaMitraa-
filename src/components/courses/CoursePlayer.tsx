import React, { useState } from 'react';
import { 
  ArrowLeft, 
  CheckCircle, 
  CheckCircle2, 
  Circle, 
  HelpCircle, 
  Award, 
  Play, 
  FileText, 
  Check, 
  X, 
  Sparkles,
  ChevronRight,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { Course, CourseModule, QuizQuestion } from '../../types';

export const CoursePlayer: React.FC = () => {
  const { 
    selectedCourseForPlayer, 
    setSelectedCourseForPlayer, 
    setActiveTab, 
    issueCertificate,
    user 
  } = useApp();

  const course = selectedCourseForPlayer;

  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'learn' | 'module-quiz' | 'final-exam' | 'passed-congrats'>('learn');
  
  // Module Quiz state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [showModuleQuizResults, setShowModuleQuizResults] = useState(false);

  // Final Exam state
  const [examAnswers, setExamAnswers] = useState<Record<string, number>>({});
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [examScorePercent, setExamScorePercent] = useState(0);
  const [generatedCertCode, setGeneratedCertCode] = useState<string>('');

  if (!course) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
        <p className="text-slate-600 font-semibold">No course selected</p>
        <button
          onClick={() => setActiveTab('courses')}
          className="mt-4 px-4 py-2 bg-[#FF7A00] text-white rounded-xl text-xs font-bold"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  const currentModule = course.modules[activeModuleIndex] || course.modules[0];

  const handleModuleQuizSelect = (questionId: string, optionIndex: number) => {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleModuleQuizSubmit = () => {
    setShowModuleQuizResults(true);
  };

  const handleExamOptionSelect = (questionId: string, optionIndex: number) => {
    setExamAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleFinalExamSubmit = () => {
    let correctCount = 0;
    course.finalExam.forEach((q) => {
      if (examAnswers[q.id] === q.correctOptionIndex) {
        correctCount++;
      }
    });

    const percent = Math.round((correctCount / course.finalExam.length) * 100);
    setExamScorePercent(percent);
    setExamSubmitted(true);

    if (percent >= course.passMarkPercentage) {
      // Trigger confetti!
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });

      const cert = issueCertificate(course, percent);
      setGeneratedCertCode(cert.certificateCode);
      setViewMode('passed-congrats');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('courses')}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] font-bold text-[#0284C7] bg-[#E6F4FF] px-2 py-0.5 rounded-sm">
              {course.category}
            </span>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 line-clamp-1 mt-0.5">
              {course.title}
            </h1>
          </div>
        </div>

        {/* Action Switcher: Learn vs Final Exam */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              setViewMode('learn');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              viewMode === 'learn' || viewMode === 'module-quiz'
                ? 'bg-[#E6F4FF] text-[#0284C7] border border-sky-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Module Lessons
          </button>

          <button
            onClick={() => {
              setViewMode('final-exam');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'final-exam' || viewMode === 'passed-congrats'
                ? 'bg-[#FF7A00] text-white shadow-xs'
                : 'bg-orange-50 text-[#FF7A00] hover:bg-orange-100'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Final Certification Exam</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout: Sidebar Modules vs Active Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Modules Playlist */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800">Course Syllabus</span>
              <span className="text-[11px] font-medium text-slate-400">
                {course.modules.length} Modules
              </span>
            </div>

            <div className="space-y-2">
              {course.modules.map((mod, idx) => {
                const isSelected = activeModuleIndex === idx && (viewMode === 'learn' || viewMode === 'module-quiz');
                return (
                  <div
                    key={mod.id}
                    onClick={() => {
                      setActiveModuleIndex(idx);
                      setViewMode('learn');
                      setShowModuleQuizResults(false);
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#FF7A00] bg-orange-50/50 shadow-2xs'
                        : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Module {idx + 1}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500">
                        {mod.durationMinutes} mins
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-800 mt-1 line-clamp-1">
                      {mod.title}
                    </h4>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px]">
                      <span className="text-slate-500 flex items-center gap-1">
                        <FileText className="w-3 h-3 text-slate-400" />
                        <span>Interactive Lecture</span>
                      </span>
                      <span className="text-[#0284C7] font-semibold flex items-center gap-1">
                        <HelpCircle className="w-3 h-3" />
                        <span>{mod.quiz.length} Questions</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Exam Box */}
            <div
              onClick={() => setViewMode('final-exam')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                viewMode === 'final-exam'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-purple-200 bg-gradient-to-r from-purple-50/50 to-indigo-50/50 hover:border-purple-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-purple-900">Final Assessment</h4>
                  <p className="text-[10px] text-purple-700">70% score required for Certificate</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Side: Active Content Panel */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Passed Congratulations View */}
          {viewMode === 'passed-congrats' && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 text-center space-y-4 shadow-xl animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <Award className="w-8 h-8 stroke-[2.5]" />
              </div>

              <div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Examination Passed with {examScorePercent}%!
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                  Congratulations, {user.name}! 🎓
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mt-1">
                  You have successfully passed <strong className="text-slate-800">{course.title}</strong>. Your verifiable certificate ID is <strong className="text-[#FF7A00]">{generatedCertCode}</strong>.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                <button
                  onClick={() => setActiveTab('certificates')}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-[#FF7A00] to-[#E06900] text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-500/25 cursor-pointer"
                >
                  View & Download Certificate PDF
                </button>
                <button
                  onClick={() => setViewMode('learn')}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm"
                >
                  Review Module Material
                </button>
              </div>
            </div>
          )}

          {/* Final Exam View */}
          {viewMode === 'final-exam' && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6 shadow-xs">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Comprehensive Certification Examination
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Answer all questions. Minimum passing mark is <strong>{course.passMarkPercentage}%</strong>.
                </p>
              </div>

              <div className="space-y-6">
                {course.finalExam.map((q, idx) => (
                  <div key={q.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="text-xs font-bold text-slate-800 flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] shrink-0 font-bold">
                        {idx + 1}
                      </span>
                      <span>{q.question}</span>
                    </div>

                    <div className="space-y-2 pt-1">
                      {q.options.map((opt, oIdx) => {
                        const isChosen = examAnswers[q.id] === oIdx;
                        const isCorrect = q.correctOptionIndex === oIdx;

                        let style = 'bg-white border-slate-200 hover:border-purple-300 text-slate-700';
                        if (examSubmitted) {
                          if (isCorrect) style = 'bg-emerald-50 border-emerald-400 text-emerald-800 font-bold';
                          else if (isChosen && !isCorrect) style = 'bg-red-50 border-red-300 text-red-700';
                        } else if (isChosen) {
                          style = 'bg-purple-50 border-purple-500 text-purple-900 font-semibold';
                        }

                        return (
                          <div
                            key={oIdx}
                            onClick={() => !examSubmitted && handleExamOptionSelect(q.id, oIdx)}
                            className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-colors ${style}`}
                          >
                            <span>{opt}</span>
                            {examSubmitted && isCorrect && <Check className="w-4 h-4 text-emerald-600" />}
                            {examSubmitted && isChosen && !isCorrect && <X className="w-4 h-4 text-red-500" />}
                          </div>
                        );
                      })}
                    </div>

                    {examSubmitted && (
                      <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-200/60">
                        <strong>Explanation:</strong> {q.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {!examSubmitted ? (
                <button
                  onClick={handleFinalExamSubmit}
                  disabled={Object.keys(examAnswers).length < course.finalExam.length}
                  className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
                >
                  Submit Final Exam & Generate Certificate
                </button>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="text-xs">
                    Score: <strong>{examScorePercent}%</strong> ({examScorePercent >= course.passMarkPercentage ? 'Passed' : 'Need 70% to pass'})
                  </div>
                  {examScorePercent < course.passMarkPercentage && (
                    <button
                      onClick={() => {
                        setExamAnswers({});
                        setExamSubmitted(false);
                      }}
                      className="px-4 py-2 bg-[#FF7A00] text-white text-xs font-bold rounded-xl"
                    >
                      Retry Exam
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Module Learn View */}
          {viewMode === 'learn' && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6 shadow-xs">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-[#FF7A00] uppercase tracking-wider">
                    Module {activeModuleIndex + 1}
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                    {currentModule.title}
                  </h2>
                </div>

                <button
                  onClick={() => setViewMode('module-quiz')}
                  className="px-4 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#FF7A00] font-bold text-xs border border-orange-200 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Take Module Quiz ({currentModule.quiz.length} Qs)</span>
                </button>
              </div>

              {/* Video Player (if available) or Interactive Lecture Header */}
              {currentModule.videoUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5 text-[#FF7A00] fill-[#FF7A00]" />
                      <span>Video Masterclass Lesson</span>
                    </span>
                    <span className="text-slate-400 font-normal">HD Streaming Enabled</span>
                  </div>
                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-md">
                    <iframe
                      src={currentModule.videoUrl}
                      title={currentModule.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-50/70 to-amber-50/50 border border-orange-200/70 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF7A00] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Structured Interactive Module Lecture</h4>
                    <p className="text-[11px] text-slate-600">
                      Carefully curated concepts, practical examples, and interview-ready notes by industry practitioners.
                    </p>
                  </div>
                </div>
              )}

              {/* Lesson Text / Reading content */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Lesson Notes & Core Principles
                </h3>
                <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100 font-sans">
                  {currentModule.content}
                </div>
              </div>

              {/* Key Takeaways Card */}
              <div className="bg-[#E6F4FF]/70 p-4 sm:p-5 rounded-2xl border border-sky-200/80 space-y-2">
                <h4 className="text-xs font-bold text-[#0284C7] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Key Practical Takeaways for Interviews</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {currentModule.keyTakeaways.map((point, pIdx) => (
                    <li key={pIdx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0284C7] mt-0.5 shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Navigation Bottom Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  disabled={activeModuleIndex === 0}
                  onClick={() => {
                    setActiveModuleIndex(prev => prev - 1);
                    setShowModuleQuizResults(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-30 rounded-xl transition-colors"
                >
                  Previous Module
                </button>

                <button
                  onClick={() => setViewMode('module-quiz')}
                  className="px-5 py-2.5 rounded-xl bg-[#FF7A00] hover:bg-[#E06900] text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all flex items-center gap-1.5"
                >
                  <span>Practice Module Quiz</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* Module Quiz View */}
          {viewMode === 'module-quiz' && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6 shadow-xs animate-in fade-in">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Module {activeModuleIndex + 1} Practice Quiz
                  </h3>
                  <p className="text-xs text-slate-500">Test your comprehension before proceeding</p>
                </div>
                <button
                  onClick={() => setViewMode('learn')}
                  className="text-xs font-semibold text-[#0284C7] hover:underline"
                >
                  Back to Lesson
                </button>
              </div>

              <div className="space-y-4">
                {currentModule.quiz.map((q, qIdx) => (
                  <div key={q.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="text-xs font-bold text-slate-800 flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-orange-100 text-[#FF7A00] flex items-center justify-center text-[10px] shrink-0 font-bold">
                        {qIdx + 1}
                      </span>
                      <span>{q.question}</span>
                    </div>

                    <div className="space-y-1.5">
                      {q.options.map((opt, oIdx) => {
                        const isChosen = selectedAnswers[q.id] === oIdx;
                        const isCorrect = q.correctOptionIndex === oIdx;

                        let style = 'bg-white border-slate-200 text-slate-700';
                        if (showModuleQuizResults) {
                          if (isCorrect) style = 'bg-emerald-50 border-emerald-400 text-emerald-800 font-bold';
                          else if (isChosen && !isCorrect) style = 'bg-red-50 border-red-300 text-red-700';
                        } else if (isChosen) {
                          style = 'bg-orange-50 border-orange-400 text-orange-900 font-semibold';
                        }

                        return (
                          <div
                            key={oIdx}
                            onClick={() => !showModuleQuizResults && handleModuleQuizSelect(q.id, oIdx)}
                            className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-colors ${style}`}
                          >
                            <span>{opt}</span>
                            {showModuleQuizResults && isCorrect && <Check className="w-4 h-4 text-emerald-600" />}
                            {showModuleQuizResults && isChosen && !isCorrect && <X className="w-4 h-4 text-red-500" />}
                          </div>
                        );
                      })}
                    </div>

                    {showModuleQuizResults && (
                      <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/70">
                        <span className="font-semibold text-slate-800">Explanation:</span> {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                {!showModuleQuizResults ? (
                  <button
                    onClick={handleModuleQuizSubmit}
                    disabled={Object.keys(selectedAnswers).length < currentModule.quiz.length}
                    className="w-full py-3 rounded-xl bg-[#FF7A00] hover:bg-[#E06900] disabled:opacity-40 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    Check Answers
                  </button>
                ) : (
                  <div className="w-full flex items-center justify-between gap-3">
                    <button
                      onClick={() => {
                        setSelectedAnswers({});
                        setShowModuleQuizResults(false);
                      }}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Retry Quiz
                    </button>
                    {activeModuleIndex < course.modules.length - 1 ? (
                      <button
                        onClick={() => {
                          setActiveModuleIndex(prev => prev + 1);
                          setViewMode('learn');
                          setShowModuleQuizResults(false);
                        }}
                        className="px-5 py-2.5 bg-[#FF7A00] text-white text-xs font-bold rounded-xl shadow-xs"
                      >
                        Proceed to Next Module
                      </button>
                    ) : (
                      <button
                        onClick={() => setViewMode('final-exam')}
                        className="px-5 py-2.5 bg-purple-600 text-white text-xs font-bold rounded-xl shadow-xs"
                      >
                        Ready for Final Exam!
                      </button>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
