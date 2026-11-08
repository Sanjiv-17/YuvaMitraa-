import React from 'react';
import { Briefcase, Check, ArrowRight, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Language } from '../../types';

export const FirstLaunchModal: React.FC = () => {
  const { isFirstLaunch, dismissFirstLaunch, language, setLanguage } = useApp();

  if (!isFirstLaunch) return null;

  const languages: { code: Language; label: string; native: string }[] = [
    { code: 'English', label: 'English', native: 'English' },
    { code: 'Hindi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'Marathi', label: 'Marathi', native: 'मराठी' },
    { code: 'Gujarati', label: 'Gujarati', native: 'ગુજરાતી' },
    { code: 'Bengali', label: 'Bengali', native: 'বাংলা' },
    { code: 'Tamil', label: 'Tamil', native: 'தமிழ்' },
    { code: 'Telugu', label: 'Telugu', native: 'తెలుగు' },
    { code: 'Kannada', label: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'Malayalam', label: 'Malayalam', native: 'മലയാളം' },
    { code: 'Punjabi', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
    { code: 'Odia', label: 'Odia', native: 'ଓଡ଼ିଆ' },
    { code: 'Urdu', label: 'Urdu', native: 'اردو' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-8 border border-slate-100 text-center relative overflow-hidden">
        
        {/* Decorative Top Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-[#FF7A00] text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Welcome to Bharat’s Youth Platform</span>
        </div>

        {/* Brand Header */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <img
            src="/logo.png"
            alt="YuvaMitraa Logo"
            className="w-14 h-14 object-contain rounded-2xl drop-shadow-md"
          />
          <div className="text-left">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Yuva<span className="text-[#FF7A00]">Mitraa</span>
            </h1>
            <p className="text-xs font-semibold text-[#0284C7]">
              Learn • Skill • Work • Grow
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
          Please select your preferred language. You can change this anytime from the top bar.
        </p>

        {/* Language Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-6 max-h-64 overflow-y-auto p-1">
          {languages.map((item) => {
            const isSelected = language === item.code;
            return (
              <button
                key={item.code}
                onClick={() => setLanguage(item.code)}
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-[#FF7A00] bg-orange-50/70 text-[#FF7A00] shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-700'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">{item.native}</div>
                  <div className="text-[10px] text-slate-400">{item.label}</div>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-[#FF7A00] text-white flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Confirm Button */}
        <button
          onClick={dismissFirstLaunch}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#E06900] text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
        >
          <span>Continue in {language}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
};
