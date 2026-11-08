import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  Award, 
  Play, 
  RotateCcw, 
  Loader2, 
  Volume2,
  VolumeX,
  MessageSquare,
  Timer,
  Layers,
  ChevronRight,
  TrendingUp,
  Volume1
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { practiceMockInterview } from '../../services/api';

const INTERVIEW_STAGES = [
  { id: 'screening', label: 'Round 1: Screening & HR', desc: 'Background, cultural fit, strengths & career goals' },
  { id: 'technical', label: 'Round 2: Technical Depth', desc: 'Core domain questions, architecture & problem solving' },
  { id: 'behavioral', label: 'Round 3: STAR Behavioral', desc: 'Conflict resolution, leadership & deadline pressure' }
];

export const MockInterview: React.FC = () => {
  const { user, updateUser } = useApp();

  const roleOptions = [
    'Frontend React Developer',
    'Python & AI Trainee',
    'Digital Marketing Associate',
    'Financial Analyst & Tally',
    'Customer Success Specialist',
    'Government Aptitude & General Knowledge'
  ];

  const initialQuestions: Record<string, Record<string, string>> = {
    'Frontend React Developer': {
      screening: 'Could you give a brief 1-minute introduction of yourself and why you want to work as a Frontend React Developer?',
      technical: 'Can you explain the difference between state and props in React, and how you decide where state should live in a component tree?',
      behavioral: 'Tell me about a time you faced a difficult UI layout bug or merge conflict close to a deadline. How did you resolve it?'
    },
    'Python & AI Trainee': {
      screening: 'What sparked your interest in Python and AI, and what machine learning projects have you built recently?',
      technical: 'How do you handle missing or null data when working with Pandas DataFrames in Python, and when would you drop vs impute values?',
      behavioral: 'Describe a project where your initial model had poor accuracy. What steps did you take to diagnose and improve performance?'
    },
    'Digital Marketing Associate': {
      screening: 'Walk me through your background in social media and content marketing. What campaigns are you most proud of?',
      technical: 'How would you measure the return on ad spend (ROAS) for an Instagram campaign with a monthly budget of ₹20,000?',
      behavioral: 'Tell me about a campaign that underperformed. How did you pivot the creative copy or audience targeting?'
    },
    'Financial Analyst & Tally': {
      screening: 'Why are you pursuing a career in corporate accounting and financial reporting?',
      technical: 'Can you explain the three Golden Rules of Accounting with practical examples of ledger vouchers in Tally?',
      behavioral: 'Tell me about an instance where you identified a reconciliation discrepancy in accounts. How did you trace and correct it?'
    },
    'Customer Success Specialist': {
      screening: 'What makes you an effective communicator, and how do you build rapport with clients over calls and email?',
      technical: 'What key metrics do you track to measure customer health and satisfaction (e.g., CSAT, NPS, churn rate)?',
      behavioral: 'Tell me about a time a customer was angry with a technical outage. How did you de-escalate and restore their trust?'
    },
    'Government Aptitude & General Knowledge': {
      screening: 'Why are you aspiring for public service and administrative roles in India?',
      technical: 'Explain the constitutional significance of the Fundamental Rights in Article 19, and the reasonable restrictions that apply.',
      behavioral: 'If faced with competing public priorities and limited district budget, how would you prioritize welfare allocation?'
    }
  };

  const [selectedRole, setSelectedRole] = useState(roleOptions[0]);
  const [selectedStage, setSelectedStage] = useState('screening');
  const [currentQuestion, setCurrentQuestion] = useState(initialQuestions[roleOptions[0]]['screening']);
  const [userAnswer, setUserAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeakingModel, setIsSpeakingModel] = useState<number | null>(null);
  const [questionCount, setQuestionCount] = useState(1);
  const [timerSeconds, setTimerSeconds] = useState(90);
  const [isTimerActive, setIsTimerActive] = useState(false);

  const [interviewHistory, setInterviewHistory] = useState<Array<{
    question: string;
    answer: string;
    score: number;
    feedback: string;
    improvedAnswer: string;
    stage: string;
  }>>([]);

  const recognitionRef = useRef<any>(null);

  // Sync question when role or stage changes
  useEffect(() => {
    const q = initialQuestions[selectedRole]?.[selectedStage] || initialQuestions[roleOptions[0]]['screening'];
    setCurrentQuestion(q);
    setUserAnswer('');
    setTimerSeconds(90);
    setIsTimerActive(false);
  }, [selectedRole, selectedStage]);

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timerSeconds]);

  // Voice speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setUserAnswer(prev => prev ? `${prev} ${transcript}` : transcript);
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Voice recognition not available. Please type your response.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        if (!isTimerActive) setIsTimerActive(true);
      } catch (e) {
        setIsListening(false);
      }
    }
  };

  const speakQuestion = (text: string) => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const speakModelAnswer = (text: string, index: number) => {
    if ('speechSynthesis' in window) {
      if (isSpeakingModel === index) {
        window.speechSynthesis.cancel();
        setIsSpeakingModel(null);
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.onend = () => setIsSpeakingModel(null);
      utterance.onerror = () => setIsSpeakingModel(null);
      setIsSpeakingModel(index);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setIsTimerActive(false);

    try {
      const data = await practiceMockInterview(
        selectedRole,
        currentQuestion,
        userAnswer,
        `${selectedStage}-q${questionCount}`
      );

      const entry = {
        question: currentQuestion,
        answer: userAnswer,
        score: data.score,
        feedback: data.feedback,
        improvedAnswer: data.improvedAnswer,
        stage: selectedStage
      };

      setInterviewHistory(prev => [entry, ...prev]);
      setUserAnswer('');
      setQuestionCount(prev => prev + 1);
      setTimerSeconds(90);

      if (data.nextQuestion) {
        setCurrentQuestion(data.nextQuestion);
      }

      // Award XP
      updateUser({
        xpPoints: user.xpPoints + 75,
        badges: user.badges.includes('Interview Ace') ? user.badges : [...user.badges, 'Interview Ace']
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-[#FF7A00] text-xs font-bold mb-1.5">
            <Mic className="w-3.5 h-3.5" />
            <span>AI Voice & Speech Interview Coach</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>AI Mock Interview Simulator</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Practice answering real employer questions via voice or text with instant scoring and STAR exemplars
          </p>
        </div>

        {/* Role Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-bold text-slate-500">Target Role:</span>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="py-2 px-3 text-xs font-bold bg-white border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 shadow-xs cursor-pointer"
          >
            {roleOptions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Round / Stage Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {INTERVIEW_STAGES.map((st) => (
          <button
            key={st.id}
            onClick={() => setSelectedStage(st.id)}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              selectedStage === st.id
                ? 'bg-gradient-to-br from-orange-50 to-amber-50/60 border-[#FF7A00] shadow-xs ring-2 ring-orange-200'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-black ${selectedStage === st.id ? 'text-[#FF7A00]' : 'text-slate-800'}`}>
                {st.label}
              </span>
              {selectedStage === st.id && (
                <span className="w-2 h-2 rounded-full bg-[#FF7A00] animate-pulse" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{st.desc}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Active Question & Input */}
        <div className="lg:col-span-7 space-y-4">
          
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
            
            {/* Question Card */}
            <div className="bg-gradient-to-br from-orange-50/90 via-amber-50/50 to-white p-5 rounded-2xl border border-orange-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-[#FF7A00] uppercase tracking-wider bg-white px-2.5 py-0.5 rounded-md shadow-2xs border border-orange-100">
                    Question #{questionCount}
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold capitalize">
                    {selectedStage} Round
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Practice Timer */}
                  <button
                    onClick={() => setIsTimerActive(!isTimerActive)}
                    className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/80 border border-slate-200 text-slate-600 hover:bg-white"
                    title="Toggle 90s Timer"
                  >
                    <Timer className="w-3.5 h-3.5 text-[#FF7A00]" />
                    <span>{timerSeconds}s</span>
                  </button>

                  <button
                    onClick={() => speakQuestion(currentQuestion)}
                    className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-700 hover:text-[#0284C7] text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-200/80 cursor-pointer"
                    title="Read aloud"
                  >
                    {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-red-500" /> : <Volume2 className="w-3.5 h-3.5 text-[#0284C7]" />}
                    <span className="text-[11px]">Listen</span>
                  </button>
                </div>
              </div>

              <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                &quot;{currentQuestion}&quot;
              </h2>
            </div>

            {/* Answer Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Your Response (Speak via Mic or Type):
                </label>
                <span className="text-[11px] text-slate-400 font-medium">
                  {userAnswer.split(/\s+/).filter(Boolean).length} words
                </span>
              </div>

              <textarea
                value={userAnswer}
                onChange={(e) => {
                  setUserAnswer(e.target.value);
                  if (!isTimerActive && e.target.value.length === 1) setIsTimerActive(true);
                }}
                rows={6}
                placeholder={isListening ? 'Listening to your microphone... Speak clearly.' : 'Type your answer or click "Speak Answer" to dictate response...'}
                className="w-full p-4 text-xs bg-slate-50 border border-slate-200 rounded-2xl outline-hidden focus:border-[#FF7A00] focus:bg-white text-slate-900 leading-relaxed transition-all"
              />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={toggleListening}
                className={`py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  isListening
                    ? 'bg-red-500 text-white border-red-500 animate-pulse'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-[#FF7A00]" />}
                <span>{isListening ? 'Stop Recording' : 'Speak Answer'}</span>
              </button>

              <button
                onClick={handleSubmitAnswer}
                disabled={!userAnswer.trim() || isSubmitting}
                className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#E06900] disabled:opacity-40 text-white text-xs font-bold shadow-md shadow-orange-500/20 hover:shadow-orange-500/35 transition-all flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Evaluating with AI...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit & Get Evaluation (+75 XP)</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </div>

        {/* Right Column: Instant Feedback & History */}
        <div className="lg:col-span-5 space-y-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            Interview Evaluation History ({interviewHistory.length})
          </div>

          {interviewHistory.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#FF7A00] flex items-center justify-center mx-auto">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                Awaiting First Answer
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Submit an answer to question #1. Gemini AI will evaluate your clarity, relevance, and suggest an improved STAR exemplar answer.
              </p>
            </div>
          ) : (
            interviewHistory.map((item, idx) => (
              <div
                key={idx}
                className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4 animate-in fade-in"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Question #{interviewHistory.length - idx} • {item.stage}
                  </span>
                  <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full text-xs font-black text-[#FF7A00]">
                    <span>Score: {item.score} / 10</span>
                  </div>
                </div>

                <p className="text-xs font-bold text-slate-900 italic">
                  &quot;{item.question}&quot;
                </p>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600">
                  <strong className="text-slate-800 block mb-0.5">Your Spoken Answer:</strong>
                  {item.answer}
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>AI Feedback & Coaching:</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                    {item.feedback}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-[#0284C7] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Model STAR Exemplar Answer:</span>
                    </div>

                    <button
                      onClick={() => speakModelAnswer(item.improvedAnswer, idx)}
                      className="text-[10px] text-[#0284C7] hover:underline flex items-center gap-1 font-semibold"
                    >
                      {isSpeakingModel === idx ? <VolumeX className="w-3 h-3 text-red-500" /> : <Volume1 className="w-3 h-3" />}
                      <span>{isSpeakingModel === idx ? 'Stop' : 'Listen'}</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-800 leading-relaxed bg-[#E6F4FF]/70 p-3.5 rounded-xl border border-sky-100 font-medium">
                    {item.improvedAnswer}
                  </p>
                </div>

              </div>
            ))
          )}
        </div>

      </div>

    </div>
  );
};
