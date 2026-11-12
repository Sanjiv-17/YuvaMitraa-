import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Bot, 
  User as UserIcon,
  Loader2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { askStudyAssistant } from '../../services/api';

export const FloatingChat: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { language, user } = useApp();
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string; time: string }>>([
    {
      sender: 'assistant',
      text: `Namaste ${user.name.split(' ')[0]}! 🙏 I am your YuvaMitraa AI Study & Career Mentor. How can I help you skill up today? You can ask about internship preparation, syllabus doubts, interview practice, or government schemes.`,
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
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

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

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [language]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setMessages(prev => [
        ...prev,
        {
          id: `notif-${Date.now()}`,
          sender: 'assistant',
          text: language === 'Kannada' 
            ? 'ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆ ಬೆಂಬಲಿತವಾಗಿಲ್ಲ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸಂದೇಶವನ್ನು ಟೈಪ್ ಮಾಡಿ.' 
            : 'Voice input is not supported in this browser. Please type your query in the message box.',
          time: 'Now'
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
      } catch (e) {
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

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || isLoading) return;

    const userMsg = {
      sender: 'user' as const,
      text: textToSend.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ sender: m.sender, text: m.text }));
      const reply = await askStudyAssistant(
        textToSend.trim(),
        history,
        language,
        {
          name: user.name,
          education: user.education,
          skills: user.skills,
          location: user.location
        }
      );

      const assistantMsg = {
        sender: 'assistant' as const,
        text: reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: 'I am here to help you skill up and get hired! Try asking about React internships, SSC CGL preparation, or resume optimization.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const starterPrompts = [
    'How do I crack a Frontend React internship?',
    'Explain the syllabus & prep strategy for SSC CGL',
    'Give me 5 behavioral interview tips (STAR method)',
    'Which Government youth scholarships are open right now?'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 sm:inset-auto sm:right-6 sm:bottom-6 z-50 w-full sm:w-[440px] h-full sm:h-[620px] bg-white sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FF7A00] to-[#E06900] text-white p-4 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm">YuvaMitraa AI Assistant</h3>
              <span className="text-[10px] bg-white/25 px-1.5 py-0.5 rounded-sm font-semibold">
                {language}
              </span>
            </div>
            <p className="text-[11px] text-orange-100 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              Online Mentor • Ask anything
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setMessages([messages[0]])}
            title="Reset Chat"
            className="p-1.5 rounded-lg text-orange-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-orange-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
                msg.sender === 'user'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gradient-to-br from-[#0284C7] to-sky-600 text-white shadow-xs'
              }`}
            >
              {msg.sender === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div className={`max-w-[82%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs ${
              msg.sender === 'user'
                ? 'bg-[#FF7A00] text-white rounded-tr-xs'
                : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
            }`}>
              <div className="whitespace-pre-wrap">{msg.text}</div>
              
              <div className={`flex items-center justify-between gap-2 mt-1.5 pt-1 text-[10px] ${
                msg.sender === 'user' ? 'text-orange-200' : 'text-slate-400 border-t border-slate-100'
              }`}>
                <span>{msg.time}</span>
                {msg.sender === 'assistant' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(msg.text)}
                      className="p-1 rounded-sm hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Copy response"
                    >
                      <span>Copy</span>
                    </button>
                    <button
                      onClick={() => handleSpeakText(msg.text)}
                      className="p-1 rounded-sm hover:bg-slate-100 text-slate-500 hover:text-[#0284C7] transition-colors flex items-center gap-1 cursor-pointer"
                      title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                    >
                      {isSpeaking ? <VolumeX className="w-3 h-3 text-red-500" /> : <Volume2 className="w-3 h-3" />}
                      <span>Listen</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 p-2">
            <Loader2 className="w-4 h-4 text-[#FF7A00] animate-spin" />
            <span>YuvaMitraa is thinking in {language}...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="px-3 py-2 bg-white border-t border-slate-100 overflow-x-auto flex gap-1.5 shrink-0 no-scrollbar">
        {[
          '💼 How do I crack a React internship?',
          '📄 Review my resume bullet points',
          '🎯 5 behavioral interview STAR tips',
          '🇮🇳 PM Internship Scheme Eligibility',
          '📚 UPSC / SSC CGL study roadmap'
        ].map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt.replace(/^[^\w]+/, ''))}
            className="text-[11px] whitespace-nowrap bg-orange-50 hover:bg-orange-100 text-[#FF7A00] px-2.5 py-1 rounded-full border border-orange-200 font-semibold transition-colors cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div className="p-3 bg-white border-t border-slate-200 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <button
            type="button"
            onClick={toggleListening}
            className={`p-2.5 rounded-xl border transition-all ${
              isListening
                ? 'bg-red-500 text-white border-red-500 animate-pulse'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
            }`}
            title={isListening ? 'Stop listening' : 'Speak your question'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isListening ? 'Listening to your voice...' : `Ask anything in ${language}...`}
            className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-slate-900 border border-slate-200 focus:border-[#FF7A00] rounded-xl outline-hidden transition-all"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-2.5 rounded-xl bg-[#FF7A00] hover:bg-[#E06900] disabled:opacity-40 text-white shadow-md shadow-orange-500/20 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
};
