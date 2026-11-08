import React from 'react';
import { 
  X, 
  Moon, 
  Sun, 
  Type, 
  Globe, 
  MapPin, 
  ShieldCheck, 
  Check, 
  Download,
  WifiOff
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Language } from '../../types';

export const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { 
    darkMode, 
    toggleDarkMode, 
    fontSize, 
    setFontSize, 
    language, 
    setLanguage, 
    userLocation, 
    refreshUserLocation 
  } = useApp();

  if (!isOpen) return null;

  const languages: Language[] = [
    'English', 'Hindi', 'Marathi', 'Gujarati', 'Bengali', 
    'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Punjabi', 'Odia', 'Urdu'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Settings & Accessibility
            </h2>
            <p className="text-xs text-slate-500">Configure theme, display scaling, and language</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dark Mode Option */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-3">
            {darkMode ? <Moon className="w-5 h-5 text-amber-500" /> : <Sun className="w-5 h-5 text-amber-500" />}
            <div>
              <h4 className="text-xs font-bold text-slate-800">Theme Appearance</h4>
              <p className="text-[11px] text-slate-500">
                {darkMode ? 'Dark Mode Active' : 'Light Mode Active'}
              </p>
            </div>
          </div>

          <button
            onClick={toggleDarkMode}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
              darkMode ? 'bg-[#FF7A00] justify-end' : 'bg-slate-300 justify-start'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-white shadow-md" />
          </button>
        </div>

        {/* Accessibility Font Size */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Type className="w-4 h-4 text-[#0284C7]" />
            <span>Font Size Scaling</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(['normal', 'large', 'xlarge'] as const).map((size) => (
              <button
                key={size}
                onClick={() => setFontSize(size)}
                className={`py-2 px-3 text-xs font-bold rounded-xl border capitalize transition-all ${
                  fontSize === size
                    ? 'border-[#FF7A00] bg-orange-50 text-[#FF7A00]'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                {size === 'normal' ? 'Standard (100%)' : size === 'large' ? 'Large (110%)' : 'Extra Large (125%)'}
              </button>
            ))}
          </div>
        </div>

        {/* Primary Language */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Globe className="w-4 h-4 text-emerald-600" />
            <span>Language Preference</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 rounded-2xl border border-slate-200">
            {languages.map((l) => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                className={`p-2 rounded-xl text-xs font-semibold text-center transition-all ${
                  language === l
                    ? 'bg-[#FF7A00] text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Offline Friendly Cache Status */}
        <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-emerald-800">
            <WifiOff className="w-4 h-4" />
            <span>Saved Courses Offline Cache: <strong>Active</strong></span>
          </div>
          <span className="text-[10px] text-emerald-700 font-bold bg-white px-2 py-0.5 rounded-sm">
            Local Storage
          </span>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-[#FF7A00] hover:bg-[#E06900] text-white text-xs font-bold shadow-md cursor-pointer"
        >
          Save & Close
        </button>

      </div>
    </div>
  );
};
