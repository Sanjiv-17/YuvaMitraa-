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
  ArrowRight,
  Copy,
  Check,
  PlusCircle,
  Briefcase,
  BookOpen,
  TrendingUp,
  Award,
  History,
  MessageSquare,
  Trash2,
  ExternalLink,
  Code2,
  CheckCheck,
  Wand2,
  Layers,
  GraduationCap,
  Target,
  Clock,
  Sparkle,
  Volume1
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  askStudyAssistantDetailed, 
  requestTtsAudio, 
  fetchPersonalizedRecommendations, 
  generatePersonalizedLearningPlan 
} from '../../services/api';
import { ResumeBuilder } from '../resume/ResumeBuilder';
import { MockInterview } from '../interview/MockInterview';
import { CareerRoadmap } from '../roadmap/CareerRoadmap';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  time: string;
  language?: string;
  suggestedQuestions?: string[];
  relatedOpportunities?: string[];
}

interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
  language: 'English' | 'Kannada';
}

export const AIAssistantSection: React.FC<{ 
  initialSubTab?: 'chat' | 'guidance' | 'resume' | 'interview' | 'learning' | 'roadmap' 
}> = ({
  initialSubTab = 'chat'
}) => {
  const { user, language: appLanguage, setActiveTab, setSelectedJobForDetail } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'guidance' | 'resume' | 'interview' | 'learning' | 'roadmap'>(
    initialSubTab
  );

  // Chat Language (English or Kannada)
  const [chatLanguage, setChatLanguage] = useState<'English' | 'Kannada'>(
    appLanguage === 'Kannada' ? 'Kannada' : 'English'
  );

  // Initial welcome message per language
  const getWelcomeText = (lang: 'English' | 'Kannada', name: string) => {
    const firstName = name ? name.split(' ')[0] : 'Student';
    if (lang === 'Kannada') {
      return `ನಮಸ್ಕಾರ ${firstName}! 🙏 ನಾನು ನಿಮ್ಮ ಯುವಮಿತ್ರ (YuvaMitraa) ಅಧಿಕೃತ ಎಐ ಕರಿಯರ್ ಮೆಂಟರ್.

ನಿಮ್ಮ ವಿದ್ಯಾಭ್ಯಾಸ, ಆಸಕ್ತಿ ಮತ್ತು ಕೌಶಲ್ಯಗಳಿಗೆ ತಕ್ಕಂತೆ ನಾನು ನೆರವಾಗಬಲ್ಲೆ:
• ಸೂಕ್ತವಾದ ಇಂಟರ್ನ್‌ಶಿಪ್ ಮತ್ತು ಉದ್ಯೋಗಾವಕಾಶಗಳು
• ತಾಂತ್ರಿಕ ಮತ್ತು HR ಇಂಟರ್ವ್ಯೂ ತಯಾರಿ
• ATS-ಸ್ನೇಹಿ ರೆಸ್ಯೂಮೆ ಸುಧಾರಣೆ
• ಹಂತ-ಹಂತದ ಕರಿಯರ್ ಕಲಿಕಾ ಮಾರ್ಗಸೂಚಿ
• ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು ಮತ್ತು ವಿದ್ಯಾರ್ಥಿವೇತನಗಳು

ಕನ್ನಡ ಅಥವಾ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ನಿಮ್ಮ ಯಾವುದೇ ಪ್ರಶ್ನೆಯನ್ನು ಕೇಳಿ ಅಥವಾ ಕೆಳಗಿನ ಪ್ರಾಂಪ್ಟ್‌ಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ!`;
    }
    return `Namaste ${firstName}! 🙏 I am your YuvaMitraa AI Career Mentor.

I analyze your verified profile to provide tailored guidance:
• Discover genuine, verified internships & jobs matching your branch
• Practice technical & HR mock interviews with instant feedback
• Generate and optimize your resume for recruiter ATS systems
• Step-by-step career mastery roadmaps and skill learning plans
• Guidance on government schemes (PMKVY, PM Internship Scheme, NAPS)

Feel free to ask me anything in English or Kannada, or click one of the suggested prompts below!`;
  };

  // Sessions and Active Chat state
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('ym_chat_sessions');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    return `session-${Date.now()}`;
  });

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: `msg-${Date.now()}`,
      sender: 'assistant',
      text: getWelcomeText(chatLanguage, user.name),
      time: 'Just now',
      language: chatLanguage
    }
  ]);

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<string | null>(null);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Recommendations state (for Guidance tab)
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);

  // Skill plan state (for Learning tab)
  const [learningPlanTarget, setLearningPlanTarget] = useState(user.preferredRoles?.[0] || 'Frontend React Developer');
  const [learningHours, setLearningHours] = useState(10);
  const [learningPlan, setLearningPlan] = useState<any | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Auto-scroll on new message
  useEffect(() => {
    if (activeSubTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, activeSubTab]);

  // Persist session to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      const firstUserMsg = messages.find(m => m.sender === 'user');
      const title = firstUserMsg 
        ? firstUserMsg.text.slice(0, 36) + (firstUserMsg.text.length > 36 ? '...' : '')
        : (chatLanguage === 'Kannada' ? 'ಹೊಸ ಸಂಭಾಷಣೆ' : 'New Career Chat');

      const updatedSession: ChatSession = {
        id: currentSessionId,
        title,
        updatedAt: new Date().toISOString(),
        messages,
        language: chatLanguage
      };

      setSessions(prev => {
        const filtered = prev.filter(s => s.id !== currentSessionId);
        const updated = [updatedSession, ...filtered].slice(0, 15);
        localStorage.setItem('ym_chat_sessions', JSON.stringify(updated));
        return updated;
      });
    }
  }, [messages, currentSessionId, chatLanguage]);

  // Speech Recognition Setup (Kannada & English)
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = chatLanguage === 'Kannada' ? 'kn-IN' : 'en-IN';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(prev => prev ? `${prev} ${transcript}` : transcript);
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
    }
  }, [chatLanguage]);

  // Fetch Career Recommendations on Guidance tab click
  useEffect(() => {
    if (activeSubTab === 'guidance' && recommendations.length === 0) {
      loadRecommendations();
    }
  }, [activeSubTab]);

  const loadRecommendations = async () => {
    setIsLoadingRecs(true);
    try {
      const recs = await fetchPersonalizedRecommendations(user);
      setRecommendations(recs);
    } catch (err) {
      console.warn('Failed to load personalized recommendations:', err);
    } finally {
      setIsLoadingRecs(false);
    }
  };

  const handleGenerateLearningPlan = async () => {
    setIsLoadingPlan(true);
    try {
      const plan = await generatePersonalizedLearningPlan(
        learningPlanTarget,
        learningHours,
        chatLanguage,
        user.skills
      );
      setLearningPlan(plan);
    } catch (err) {
      console.warn('Failed to generate learning plan:', err);
    } finally {
      setIsLoadingPlan(false);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'assistant',
          text: chatLanguage === 'Kannada' 
            ? 'ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಧ್ವನಿ ಇನ್‌ಪುಟ್ ಬೆಂಬಲಿತವಾಗಿಲ್ಲ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಕೆಳಗೆ ಟೈಪ್ ಮಾಡಿ.'
            : 'Voice input is not supported in this browser environment. Please type your message in the chat box.',
          time: 'Just now',
          language: chatLanguage
        }
      ]);
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

  // Dual-mode Voice Speaker: Backend Gemini TTS (WAV) with Web Speech fallback
  const handleSpeakText = async (text: string, msgId: string) => {
    if (speakingMessageId === msgId) {
      // Stop current playback
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setSpeakingMessageId(null);
      return;
    }

    // Stop any existing sound
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setSpeakingMessageId(msgId);

    try {
      // Attempt backend Gemini TTS first
      const cleanText = text.replace(/[*#_`]/g, '').slice(0, 350);
      const ttsResult = await requestTtsAudio(cleanText, chatLanguage);

      if (ttsResult && ttsResult.audioBase64) {
        const audioSrc = `data:${ttsResult.format || 'audio/wav'};base64,${ttsResult.audioBase64}`;
        const audio = new Audio(audioSrc);
        audioPlayerRef.current = audio;
        audio.onended = () => setSpeakingMessageId(null);
        audio.onerror = () => {
          fallbackWebSpeech(cleanText);
        };
        await audio.play();
        return;
      }
    } catch (err) {
      console.warn('Backend TTS notice, using client speech synthesis:', err);
    }

    // Client fallback via SpeechSynthesis
    fallbackWebSpeech(text.replace(/[*#_`]/g, '').slice(0, 350));
  };

  const fallbackWebSpeech = (plainText: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(plainText);
      utterance.lang = chatLanguage === 'Kannada' ? 'kn-IN' : 'en-IN';
      utterance.rate = 1.0;
      utterance.onend = () => setSpeakingMessageId(null);
      utterance.onerror = () => setSpeakingMessageId(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setSpeakingMessageId(null);
    }
  };

  const handleSendMessage = async (customQuery?: string) => {
    const textToSend = (customQuery || inputText).trim();
    if (!textToSend || isLoading) return;

    setInputText('');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      time
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ sender: m.sender, text: m.text }));
      const res = await askStudyAssistantDetailed(textToSend, history, chatLanguage, user);

      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        text: res.reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language: res.language || chatLanguage,
        suggestedQuestions: res.suggestedQuestions,
        relatedOpportunities: res.relatedOpportunities
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: chatLanguage === 'Kannada'
            ? 'ಸರ್ವರ್ ಸಂಪರ್ಕದಲ್ಲಿ ತೊಂದರೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಇಂಟರ್ನೆಟ್ ಸಂಪರ್ಕವನ್ನು ಪರಿಶೀಲಿಸಿ ಅಥವಾ ಮರುಪ್ರಯತ್ನಿಸಿ.'
            : 'I encountered an issue connecting to the AI Mentor server. Please check your internet connection or try again.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (isLoading || messages.length < 2) return;
    const lastUserMsg = [...messages].reverse().find(m => m.sender === 'user');
    if (!lastUserMsg) return;

    // Remove the last assistant message
    setMessages(prev => {
      const copy = [...prev];
      if (copy[copy.length - 1].sender === 'assistant') {
        copy.pop();
      }
      return copy;
    });

    setIsLoading(true);
    try {
      const history = messages.slice(0, -1).map(m => ({ sender: m.sender, text: m.text }));
      const res = await askStudyAssistantDetailed(lastUserMsg.text, history, chatLanguage, user);

      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        text: res.reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language: res.language || chatLanguage,
        suggestedQuestions: res.suggestedQuestions,
        relatedOpportunities: res.relatedOpportunities
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      // Keep previous
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyCode = (code: string, codeId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIndex(codeId);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  const handleStartNewChat = () => {
    const newId = `session-${Date.now()}`;
    setCurrentSessionId(newId);
    setMessages([
      {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text: getWelcomeText(chatLanguage, user.name),
        time: 'Just now',
        language: chatLanguage
      }
    ]);
    setShowHistoryDrawer(false);
  };

  const handleLoadSession = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setChatLanguage(session.language || 'English');
    setShowHistoryDrawer(false);
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== sessionId);
    setSessions(updated);
    localStorage.setItem('ym_chat_sessions', JSON.stringify(updated));
    if (currentSessionId === sessionId) {
      handleStartNewChat();
    }
  };

  const handleConfirmClearChat = () => {
    setMessages([
      {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text: getWelcomeText(chatLanguage, user.name),
        time: 'Just now',
        language: chatLanguage
      }
    ]);
    setShowClearConfirm(false);
  };

  // Render Rich Message Body with code blocks & bullet formatting
  const renderMessageContent = (text: string, msgId: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);

    return (
      <div className="space-y-2 text-xs sm:text-sm leading-relaxed">
        {parts.map((part, idx) => {
          if (part.startsWith('```') && part.endsWith('```')) {
            const raw = part.slice(3, -3);
            const firstLineBreak = raw.indexOf('\n');
            const lang = firstLineBreak !== -1 ? raw.slice(0, firstLineBreak).trim() : '';
            const code = firstLineBreak !== -1 ? raw.slice(firstLineBreak + 1) : raw;
            const codeKey = `${msgId}-code-${idx}`;

            return (
              <div key={idx} className="my-3 rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900 text-slate-100 font-mono text-xs">
                <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-800/80 border-b border-slate-700/60 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-[#FF7A00]" />
                    <span className="uppercase font-semibold">{lang || 'CODE'}</span>
                  </span>
                  <button
                    onClick={() => handleCopyCode(code.trim(), codeKey)}
                    className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedCodeIndex === codeKey ? (
                      <>
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3.5 overflow-x-auto text-[11px] sm:text-xs font-mono leading-relaxed text-emerald-300">
                  {code.trim()}
                </pre>
              </div>
            );
          }

          // Format regular text lines (detect bullet points, numbered items, and bolding)
          const lines = part.split('\n');
          return (
            <div key={idx} className="space-y-1">
              {lines.map((line, lIdx) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={lIdx} className="h-1.5" />;

                // Bold regex parser (**word**)
                const renderFormattedLine = (str: string) => {
                  const segments = str.split(/(\*\*.*?\*\*)/g);
                  return segments.map((seg, sIdx) => {
                    if (seg.startsWith('**') && seg.endsWith('**')) {
                      return <strong key={sIdx} className="font-bold text-slate-900 dark:text-white">{seg.slice(2, -2)}</strong>;
                    }
                    return seg;
                  });
                };

                if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                  return (
                    <div key={lIdx} className="flex items-start gap-2 pl-1 my-1">
                      <span className="text-[#FF7A00] mt-1 shrink-0">•</span>
                      <span>{renderFormattedLine(trimmed.replace(/^[-•*]\s*/, ''))}</span>
                    </div>
                  );
                }

                if (/^\d+\.\s/.test(trimmed)) {
                  const match = trimmed.match(/^(\d+\.)\s*(.*)$/);
                  return (
                    <div key={lIdx} className="flex items-start gap-2 pl-1 my-1">
                      <span className="font-bold text-[#FF7A00] shrink-0">{match?.[1]}</span>
                      <span>{renderFormattedLine(match?.[2] || '')}</span>
                    </div>
                  );
                }

                return <p key={lIdx}>{renderFormattedLine(trimmed)}</p>;
              })}
            </div>
          );
        })}
      </div>
    );
  };

  // Quick Prompt pills (adapt when language changes)
  const QUICK_PROMPTS_ENGLISH = [
    'What genuine internships match my current profile?',
    'How do I crack a technical interview for a fresher role?',
    'Give me 5 ATS resume optimization tips for tech roles',
    'Explain the PM Internship Scheme eligibility & stipend',
    'Create a 4-week learning roadmap for full-stack React'
  ];

  const QUICK_PROMPTS_KANNADA = [
    'ನನ್ನ ಪ್ರೊಫೈಲ್‌ಗೆ ಸೂಕ್ತವಾದ ಇಂಟರ್ನ್‌ಶಿಪ್‌ಗಳು ಯಾವುವು?',
    'ರೆಸ್ಯೂಮೆ ATS ಸ್ಕೋರ್ ಹೆಚ್ಚಿಸಲು 5 ಸಲಹೆಗಳು ನೀಡಿ',
    'ಟೆಕ್ನಿಕಲ್ ಇಂಟರ್ವ್ಯೂನಲ್ಲಿ ಸಾಮಾನ್ಯವಾಗಿ ಕೇಳುವ ಪ್ರಶ್ನೆಗಳು',
    'ಪಿಎಂ ಇಂಟರ್ನ್‌ಶಿಪ್ ಯೋಜನೆಯ ನಿಯಮಗಳು ಮತ್ತು ಸ್ಟೈಪೆಂಡ್ ತಿಳಿಸಿ',
    'ರಿಯಾಕ್ಟ್ ಮತ್ತು ವೆಬ್ ಡೆವಲಪ್ಮೆಂಟ್ ಕಲಿಯಲು 4 ವಾರಗಳ ಯೋಜನೆ'
  ];

  const currentPrompts = chatLanguage === 'Kannada' ? QUICK_PROMPTS_KANNADA : QUICK_PROMPTS_ENGLISH;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Sub-Navigation */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00] text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gemini 3.8 Flash • AI Career Mentor</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>YuvaMitraa AI Career Mentor</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Live Backend
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Your 24/7 intelligent career mentor for personalized guidance, genuine job matching, ATS resume optimization, mock interviews, and learning plans.
            </p>
          </div>

          {/* Quick Profile Summary Badge */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF7A00] to-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              {user.name.charAt(0)}
            </div>
            <div className="text-left text-xs">
              <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                <span>{user.name}</span>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded">
                  {user.branch ? user.branch.split(' ')[0] : 'Student'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                {user.college || 'National Institute of Technology'}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
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
            <span>AI Career Chat & Voice</span>
          </button>

          <button
            onClick={() => setActiveSubTab('guidance')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'guidance'
                ? 'bg-[#FF7A00] text-white shadow-md shadow-orange-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Personalized Job Match</span>
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
            <span>AI Resume Builder</span>
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
            <span>AI Interview Coach</span>
          </button>

          <button
            onClick={() => setActiveSubTab('learning')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'learning'
                ? 'bg-[#FF7A00] text-white shadow-md shadow-orange-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Skill Learning Plan</span>
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

      {/* SUB-TAB 1: AI CAREER CHAT & VOICE ASSISTANT */}
      {activeSubTab === 'chat' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col h-[700px] overflow-hidden relative">
          
          {/* Top Chat Bar: Mentor Status, Language Switcher, Actions */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40 gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF7A00] to-amber-500 text-white flex items-center justify-center shadow-xs">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>AI Career Mentor</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Natural conversation • English & ಕನ್ನಡ • Voice enabled
                </p>
              </div>
            </div>

            {/* Language Toggle + History + Clear Buttons */}
            <div className="flex items-center gap-2">
              {/* Language Switcher */}
              <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-300/60 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setChatLanguage('English');
                    if (messages.length <= 1) {
                      setMessages([{
                        id: `msg-${Date.now()}`,
                        sender: 'assistant',
                        text: getWelcomeText('English', user.name),
                        time: 'Just now',
                        language: 'English'
                      }]);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    chatLanguage === 'English'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChatLanguage('Kannada');
                    if (messages.length <= 1) {
                      setMessages([{
                        id: `msg-${Date.now()}`,
                        sender: 'assistant',
                        text: getWelcomeText('Kannada', user.name),
                        time: 'Just now',
                        language: 'Kannada'
                      }]);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    chatLanguage === 'Kannada'
                      ? 'bg-[#FF7A00] text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  ಕನ್ನಡ
                </button>
              </div>

              {/* Chat History Drawer Toggle */}
              <button
                type="button"
                onClick={() => setShowHistoryDrawer(prev => !prev)}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer relative"
                title="Chat History"
              >
                <History className="w-4 h-4" />
                {sessions.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#FF7A00]" />
                )}
              </button>

              {/* New / Reset Chat Button */}
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Clear Conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Suggested Questions Bar */}
          <div className="px-4 py-2.5 bg-orange-50/50 dark:bg-slate-800/20 border-b border-orange-100/50 dark:border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-[11px] font-bold text-[#FF7A00] uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> {chatLanguage === 'Kannada' ? 'ಸಲಹೆ ಪ್ರಶ್ನೆಗಳು:' : 'Suggested Questions:'}
            </span>
            {currentPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-orange-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300 hover:border-[#FF7A00] hover:text-[#FF7A00] transition-colors shrink-0 cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat History Slide-Over Drawer */}
          {showHistoryDrawer && (
            <div className="absolute top-[65px] right-0 bottom-0 w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 z-20 shadow-xl flex flex-col p-4 animate-in slide-in-from-right duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-1.5 font-bold text-sm text-slate-800 dark:text-white">
                  <History className="w-4 h-4 text-[#FF7A00]" />
                  <span>Saved Chat History ({sessions.length})</span>
                </div>
                <button
                  onClick={handleStartNewChat}
                  className="px-2.5 py-1 rounded-lg bg-[#FF7A00] hover:bg-[#E06900] text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>New Chat</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-3 space-y-2">
                {sessions.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    No saved chats yet. Start asking career questions!
                  </div>
                ) : (
                  sessions.map(s => (
                    <div
                      key={s.id}
                      onClick={() => handleLoadSession(s)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer group flex items-start justify-between gap-2 ${
                        s.id === currentSessionId
                          ? 'border-[#FF7A00] bg-orange-50/60 dark:bg-slate-700/60'
                          : 'border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/30'
                      }`}
                    >
                      <div className="space-y-1 overflow-hidden">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {s.title}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                          <span>{new Date(s.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                          <span>•</span>
                          <span className="font-semibold">{s.language || 'English'}</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDeleteSession(s.id, e)}
                        className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Delete Chat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Clear Confirmation Modal */}
          {showClearConfirm && (
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-2xs z-30 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-sm w-full space-y-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Clear Current Conversation?
                </h4>
                <p className="text-xs text-slate-500">
                  This will reset the active chat screen. Your past saved sessions will remain in your chat history drawer.
                </p>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmClearChat}
                    className="px-3.5 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold cursor-pointer transition-colors"
                  >
                    Yes, Clear
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              const isSpeaking = speakingMessageId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                    isUser 
                      ? 'bg-slate-800 text-white font-bold text-xs' 
                      : 'bg-gradient-to-tr from-[#FF7A00] to-amber-500 text-white shadow-xs'
                  }`}>
                    {isUser ? user.name.charAt(0) : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div className={`max-w-[85%] sm:max-w-[78%] rounded-3xl p-4 sm:p-5 shadow-2xs ${
                    isUser
                      ? 'bg-[#FF7A00] text-white rounded-tr-none'
                      : 'bg-slate-50 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200/70 dark:border-slate-700/70'
                  }`}>
                    {/* Content */}
                    {isUser ? (
                      <p className="text-xs sm:text-sm whitespace-pre-line leading-relaxed">
                        {msg.text}
                      </p>
                    ) : (
                      renderMessageContent(msg.text, msg.id)
                    )}

                    {/* Inline Genuine Opportunities recommendations if attached */}
                    {!isUser && msg.relatedOpportunities && msg.relatedOpportunities.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
                        <span className="text-[11px] font-bold text-[#FF7A00] flex items-center gap-1">
                          <Briefcase className="w-3 h-3" /> Verified Opportunities Mentioned:
                        </span>
                        <div className="space-y-1.5">
                          {msg.relatedOpportunities.map((opp, idx) => (
                            <div
                              key={idx}
                              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] flex items-center justify-between gap-2"
                            >
                              <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                                {opp}
                              </span>
                              <button
                                onClick={() => setActiveTab('opportunities')}
                                className="px-2 py-1 rounded-lg bg-orange-100 hover:bg-orange-200 text-[#FF7A00] font-bold shrink-0 text-[10px] cursor-pointer flex items-center gap-1"
                              >
                                <span>View</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggested follow-up buttons */}
                    {!isUser && msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Suggested Next Steps:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.suggestedQuestions.map((q, qIdx) => (
                            <button
                              key={qIdx}
                              onClick={() => handleSendMessage(q)}
                              className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#FF7A00] hover:text-[#FF7A00] text-slate-700 dark:text-slate-300 text-[10px] font-semibold transition-colors cursor-pointer text-left"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bottom Metadata & Action Bar */}
                    <div className={`flex items-center justify-between mt-3 pt-2 text-[10px] border-t ${
                      isUser 
                        ? 'border-orange-400/40 text-orange-100' 
                        : 'border-slate-200/50 dark:border-slate-700/50 text-slate-400'
                    }`}>
                      <span>{msg.time}</span>

                      {!isUser && (
                        <div className="flex items-center gap-2">
                          {/* Listen Voice Response */}
                          <button
                            type="button"
                            onClick={() => handleSpeakText(msg.text, msg.id)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                              isSpeaking 
                                ? 'bg-orange-100 text-[#FF7A00] font-bold' 
                                : 'hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-500'
                            }`}
                            title="Listen to voice response"
                          >
                            {isSpeaking ? (
                              <>
                                <VolumeX className="w-3.5 h-3.5 text-[#FF7A00]" />
                                <span className="text-[9px]">Stop</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3.5 h-3.5" />
                                <span className="text-[9px]">Listen</span>
                              </>
                            )}
                          </button>

                          {/* Copy Response */}
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.text, msg.id)}
                            className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer flex items-center gap-1"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-[9px] text-emerald-500 font-bold">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span className="text-[9px]">Copy</span>
                              </>
                            )}
                          </button>

                          {/* Regenerate Response button on the latest message */}
                          {messages[messages.length - 1].id === msg.id && (
                            <button
                              type="button"
                              onClick={handleRegenerate}
                              disabled={isLoading}
                              className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-40"
                              title="Regenerate this response"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span className="text-[9px]">Retry</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF7A00] to-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-3xl rounded-tl-none p-4 border border-slate-200/60 dark:border-slate-700 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#FF7A00]" />
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                    {chatLanguage === 'Kannada' 
                      ? 'ಯುವಮಿತ್ರ ಎಐ ನಿಮ್ಮ ಪ್ರಶ್ನೆಗೆ ಉತ್ತರಿಸುತ್ತಿದೆ...' 
                      : 'YuvaMitraa AI Mentor is analyzing and crafting guidance...'}
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
          >
            {/* Mic Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-1 ${
                isListening 
                  ? 'bg-red-500 text-white border-red-500 animate-pulse ring-4 ring-red-100' 
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={isListening ? 'Listening...' : 'Voice input (English or Kannada)'}
            >
              <Mic className="w-4 h-4" />
              {isListening && <span className="text-[10px] font-bold hidden sm:inline">Listening...</span>}
            </button>

            {/* Input field */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                chatLanguage === 'Kannada'
                  ? 'ಯುವಮಿತ್ರ ಎಐ ಮೆಂಟರ್ ಬಳಿ ಕರಿಯರ್ ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಿ (ಕನ್ನಡದಲ್ಲಿ)...'
                  : 'Ask your AI career mentor anything about jobs, interviews, resume, or syllabus...'
              }
              className="flex-1 text-xs sm:text-sm px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 border border-transparent focus:border-[#FF7A00] outline-none transition-all"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="px-4 sm:px-5 py-3 rounded-2xl bg-[#FF7A00] hover:bg-[#E06900] disabled:opacity-40 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-md shadow-orange-500/20 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      )}

      {/* SUB-TAB 2: PERSONALIZED CAREER GUIDANCE & JOB MATCH */}
      {activeSubTab === 'guidance' && (
        <div className="space-y-6">
          {/* Profile Analysis Banner */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified Profile Evaluated</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Personalized Career Guidance & Match Engine
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
                We continuously compare your education at <strong>{user.college || 'NIT Delhi'}</strong>, branch <strong>{user.branch || 'CSE'}</strong>, and verified skills against live corporate and government openings. Zero fake jobs.
              </p>
            </div>

            <button
              onClick={loadRecommendations}
              disabled={isLoadingRecs}
              className="px-4 py-2.5 rounded-2xl bg-[#FF7A00] hover:bg-[#E06900] text-white font-bold text-xs shadow-md shadow-orange-500/20 flex items-center gap-2 cursor-pointer transition-all self-start md:self-auto disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoadingRecs ? 'animate-spin' : ''}`} />
              <span>{isLoadingRecs ? 'Analyzing...' : 'Re-run Match Engine'}</span>
            </button>
          </div>

          {/* Student Profile Strength Snapshot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Degree & College</span>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">
                {user.branch || 'B.Tech CSE'}
              </div>
              <span className="text-[11px] text-slate-500 truncate block mt-0.5">
                {user.college || 'NIT Delhi'}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Academic Standing</span>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                CGPA: {user.cgpa || '8.7'} / 10.0
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Class of {user.graduationYear || '2026'}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Verified Skills</span>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                {user.skills?.length || 8} Technical Skills
              </div>
              <span className="text-[11px] text-[#FF7A00] font-semibold mt-0.5 block truncate">
                {(user.skills || []).slice(0, 3).join(', ')}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Market Match Status</span>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Placement Ready</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Top 15% Candidate Tier
              </span>
            </div>
          </div>

          {/* Matched Genuine Opportunities List */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#FF7A00]" />
                  <span>Ranked Genuine Opportunities for You</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Extracted from our verified corporate portal and government feeds.
                </p>
              </div>
            </div>

            {isLoadingRecs ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-[#FF7A00]" />
                <p className="text-xs font-semibold">AI Matchmaker evaluating genuine opportunities...</p>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Click "Re-run Match Engine" above to compute live compatibility rankings!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendations.map((opp, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-[#FF7A00]/50 transition-all bg-slate-50/50 dark:bg-slate-850 flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {opp.type || 'Internship'}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                            {opp.title}
                          </h4>
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {opp.company} • {opp.location}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                            {opp.matchScore}%
                          </span>
                          <span className="text-[9px] block text-slate-400 font-bold uppercase">Match</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                        <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                          Why you match:
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {opp.matchReason || 'Strong skill overlap with your technical background and engineering coursework.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                        <span>Stipend / Salary:</span>
                        <span className="text-[#FF7A00]">{opp.stipend || 'Competitive'}</span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[10px] text-slate-400">
                        Source: {opp.source || 'YuvaMitraa Verified'}
                      </span>
                      <button
                        onClick={() => {
                          setActiveTab('opportunities');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[#FF7A00] hover:bg-[#E06900] text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                      >
                        <span>Apply on Platform</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: AI RESUME BUILDER */}
      {activeSubTab === 'resume' && <ResumeBuilder />}

      {/* SUB-TAB 4: AI MOCK INTERVIEW */}
      {activeSubTab === 'interview' && <MockInterview />}

      {/* SUB-TAB 5: SKILL DEVELOPMENT & LEARNING PLANS */}
      {activeSubTab === 'learning' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00] text-xs font-bold mb-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>AI Skill Accelerator</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Personalized 4-Week Skill Development Plan
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Generate an actionable weekly curriculum with recommended YuvaMitraa courses, hands-on tasks, and capstone project milestones.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
              <div className="sm:col-span-7">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Target Skill or Career Role:
                </label>
                <input
                  type="text"
                  value={learningPlanTarget}
                  onChange={(e) => setLearningPlanTarget(e.target.value)}
                  placeholder="e.g. Full Stack Developer, Cloud Architect, AI Engineer..."
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#FF7A00] font-semibold text-slate-800 dark:text-white"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Weekly Commitment:
                </label>
                <select
                  value={learningHours}
                  onChange={(e) => setLearningHours(Number(e.target.value))}
                  className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#FF7A00] font-semibold text-slate-800 dark:text-white"
                >
                  <option value={5}>5 Hours / Week</option>
                  <option value={10}>10 Hours / Week</option>
                  <option value={15}>15 Hours / Week</option>
                  <option value={20}>20 Hours / Week</option>
                </select>
              </div>

              <div className="sm:col-span-2 flex items-end">
                <button
                  onClick={handleGenerateLearningPlan}
                  disabled={isLoadingPlan}
                  className="w-full py-2.5 rounded-xl bg-[#FF7A00] hover:bg-[#E06900] disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-orange-500/20 cursor-pointer"
                >
                  {isLoadingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>{isLoadingPlan ? 'Generating...' : 'Create Plan'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Generated Learning Plan Output */}
          {learningPlan && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {learningPlan.planTitle}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Commitment: {learningPlan.weeklyCommitment} • Capstone: {learningPlan.capstoneProjectIdea}
                  </p>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00] text-xs font-bold self-start sm:self-auto">
                  {learningPlan.successMetric}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {learningPlan.weeks?.map((week: any, wIdx: number) => {
                  const taskKey = `task-${wIdx}`;
                  const isChecked = completedTasks.includes(taskKey);

                  return (
                    <div
                      key={wIdx}
                      className={`p-5 rounded-3xl border transition-all ${
                        isChecked 
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800' 
                          : 'bg-slate-50/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-extrabold text-[#FF7A00]">
                          Week {week.weekNumber}
                        </span>
                        <button
                          onClick={() => {
                            setCompletedTasks(prev => 
                              prev.includes(taskKey) ? prev.filter(t => t !== taskKey) : [...prev, taskKey]
                            );
                          }}
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg cursor-pointer flex items-center gap-1 transition-colors ${
                            isChecked
                              ? 'bg-emerald-500 text-white'
                              : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          <span>{isChecked ? 'Completed' : 'Mark Done'}</span>
                        </button>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                        {week.focusArea}
                      </h4>

                      <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 mb-3">
                        {week.learningObjectives?.map((obj: string, oIdx: number) => (
                          <div key={oIdx} className="flex items-start gap-1.5">
                            <span className="text-[#FF7A00] mt-0.5">•</span>
                            <span>{obj}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1 text-[11px]">
                        <div className="text-slate-500">
                          <strong className="text-slate-700 dark:text-slate-300">Hands-on Task:</strong> {week.handsOnTask}
                        </div>
                        <div className="text-slate-500">
                          <strong className="text-slate-700 dark:text-slate-300">Recommended Courses:</strong> {(week.recommendedYuvaCourses || []).join(', ')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 6: CAREER ROADMAP */}
      {activeSubTab === 'roadmap' && <CareerRoadmap />}
    </div>
  );
};
