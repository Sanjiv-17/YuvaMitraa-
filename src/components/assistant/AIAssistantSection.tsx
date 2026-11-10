import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Sparkles, 
  FileText, 
  Mic, 
  Compass, 
  Send, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Loader2, 
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { askStudyAssistant } from '../../services/api';
import { ResumeBuilder } from '../resume/ResumeBuilder';
import { MockInterview } from '../interview/MockInterview';
import { CareerRoadmap } from '../roadmap/CareerRoadmap';

export const AIAssistantSection: React.FC<{ initialSubTab?: 'chat' | 'resume' | 'interview' | 'roadmap' }> = ({
  initialSubTab = 'chat'
}) => {
  const { user, language } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'resume' | 'interview' | 'roadmap'>(initialSubTab);

  // Chat State
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string; time: string }>>([
    {
      sender: 'assistant',
      text: `Namaste ${user.name.split(' ')[0]}! 🙏 I am your YuvaMitraa AI Career & Study Mentor. How can I help you accelerate your career today? Ask about interview questions, internship preparation, syllabus concepts, resume optimization, or government schemes.`,
      time: 'Just now'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeSubTab === 'chat') {
      scrollToBottom();
    }
  }, [messages, activeSubTab]);

  // Voice recognition setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language === 'Hindi' ? 'hi-IN' : 'en-IN';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(prev => prev ? `${prev} ${transcript}` : transcript);
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
    }
  }, [language]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please type your query.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  const handleSpeakText = (text: string) => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'Hindi' ? 'hi-IN' : 'en-IN';
      utterance.rate = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMsg = inputText.trim();
    setInputText('');

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { sender: 'user', text: userMsg, time }]);
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ sender: m.sender, text: m.text }));
      const reply = await askStudyAssistant(userMsg, history, language, user);
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: 'I encountered an error connecting to the AI Mentor server. Please check your internet connection or try again.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const QUICK_PROMPTS = [
    'How do I crack a React frontend internship interview?',
    'What skills are required for Data Analyst roles in India?',
    'Explain PM Internship Scheme eligibility and stipend.',
    'Give me top 5 questions asked in campus placements.'
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Sub-Navigation */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00] text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gemini 3.8 Flash AI Assistant</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              AI Career Assistant & Mentor
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Your 24/7 dedicated mentor for career guidance, ATS resume optimization, mock interviews, and personalized career roadmaps.
            </p>
          </div>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-t border-slate-100 dark:border-slate-800 pt-4">
          <button
            onClick={() => setActiveSubTab('chat')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'chat'
                ? 'bg-[#FF7A00] text-white shadow-md shadow-orange-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>AI Career Chat</span>
          </button>

          <button
            onClick={() => setActiveSubTab('resume')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'resume'
                ? 'bg-[#FF7A00] text-white shadow-md shadow-orange-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>AI Resume & ATS Checker</span>
          </button>

          <button
            onClick={() => setActiveSubTab('interview')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'interview'
                ? 'bg-[#FF7A00] text-white shadow-md shadow-orange-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>AI Mock Interview</span>
          </button>

          <button
            onClick={() => setActiveSubTab('roadmap')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'roadmap'
                ? 'bg-[#FF7A00] text-white shadow-md shadow-orange-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Career Roadmap</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div>
        {activeSubTab === 'chat' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col h-[650px] overflow-hidden">
            {/* Chat Top Banner */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FF7A00] text-white flex items-center justify-center shadow-xs">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">AI Study & Career Mentor</h3>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Online • Responding in {language}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setMessages([messages[0]])}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Clear Chat History"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>

            {/* Quick Prompts */}
            <div className="px-4 py-2.5 bg-orange-50/50 dark:bg-slate-800/20 border-b border-orange-100/50 dark:border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none">
              <span className="text-[11px] font-bold text-[#FF7A00] uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Quick Prompts:
              </span>
              {QUICK_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInputText(prompt);
                  }}
                  className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-orange-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300 hover:border-[#FF7A00] hover:text-[#FF7A00] transition-colors shrink-0 cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {messages.map((msg, index) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={index}
                    className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isUser 
                        ? 'bg-slate-800 text-white' 
                        : 'bg-[#FF7A00] text-white shadow-xs'
                    }`}>
                      {isUser ? <span className="text-xs font-bold">{user.name.charAt(0)}</span> : <Bot className="w-4 h-4" />}
                    </div>

                    <div className={`max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? 'bg-[#FF7A00] text-white rounded-tr-none'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200/60 dark:border-slate-700'
                    }`}>
                      <p className="whitespace-pre-line">{msg.text}</p>
                      
                      <div className={`flex items-center justify-between mt-2 pt-1 text-[10px] ${
                        isUser ? 'text-orange-200' : 'text-slate-400'
                      }`}>
                        <span>{msg.time}</span>
                        {!isUser && (
                          <button
                            onClick={() => handleSpeakText(msg.text)}
                            className="p-1 hover:text-[#FF7A00] transition-colors ml-2"
                            title="Listen to response"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#FF7A00]" />
                  <span>AI Mentor is crafting guidance...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isListening 
                    ? 'bg-red-500 text-white border-red-500 animate-pulse' 
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Voice Input"
              >
                <Mic className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Ask your career mentor anything in ${language}...`}
                className="flex-1 text-xs sm:text-sm px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 border border-transparent focus:border-[#FF7A00] outline-none transition-all"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="p-2.5 sm:px-5 sm:py-2.5 rounded-2xl bg-[#FF7A00] hover:bg-[#E06900] disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-orange-500/20 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        )}

        {activeSubTab === 'resume' && <ResumeBuilder />}
        {activeSubTab === 'interview' && <MockInterview />}
        {activeSubTab === 'roadmap' && <CareerRoadmap />}
      </div>
    </div>
  );
};
