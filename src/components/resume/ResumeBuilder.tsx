import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Upload, 
  Trash2, 
  Check, 
  Loader2,
  RefreshCw,
  Award,
  BookOpen,
  Wand2,
  Copy,
  PlusCircle,
  FileCheck,
  ChevronRight,
  TrendingUp,
  FileUp
} from 'lucide-react';
import jsPDF from 'jspdf';
import { useApp } from '../../context/AppContext';
import { reviewResumeWithATS, uploadResumeApi, generateResumeFromProfile, enhanceResumeBullet } from '../../services/api';

const RESUME_PRESETS = [
  {
    name: 'Frontend Developer',
    role: 'Frontend React Developer / Intern',
    text: `AARAV SHARMA
aarav.sharma@example.com | +91 9876543210 | New Delhi, India
GitHub: github.com/aaravsharma | LinkedIn: linkedin.com/in/aaravsharma

PROFESSIONAL SUMMARY
Proactive 3rd-year Computer Science undergraduate with hands-on experience building modern, responsive web applications using React, TypeScript, and Tailwind CSS. Passionate about performant UI/UX, clean code architecture, and REST API integration.

TECHNICAL SKILLS
• Languages: JavaScript (ES6+), TypeScript, HTML5, CSS3, Python Basics
• Frameworks & Libraries: React, Vite, Redux Toolkit, Tailwind CSS, Node.js Basics
• Developer Tools: Git, GitHub, VS Code, Postman, Vite, Vercel, npm
• Core Concepts: REST APIs, Responsive Web Design, Component Lifecycle, DOM Manipulation

PROJECTS
YuvaMitraa Career & Internship Finder Platform (React, Tailwind CSS, Node.js)
• Engineered responsive frontend web portal connecting 10,000+ youth with verified district-level internships.
• Integrated geolocation radius calculations (5km to 50km) and smart AI eligibility scoring for jobs.
• Decreased mobile load time by 32% using code-splitting and asset optimization.

College Campus Placement Portal (React, Firebase)
• Built real-time application tracker for 500+ college peers with role-based access for students and recruiters.
• Automated resume PDF generation and interview notification triggers.

EDUCATION
B.Tech in Computer Science & Engineering (2023 - 2027)
National Institute of Technology | Current CGPA: 8.6/10.0`
  },
  {
    name: 'Python & AI Trainee',
    role: 'Python & AI Engineer Intern',
    text: `PRIYA VERMA
priya.verma@example.com | +91 9811223344 | Bengaluru, India
GitHub: github.com/priyaverma-ai | LinkedIn: linkedin.com/in/priyaverma

PROFESSIONAL SUMMARY
Aspiring Data Scientist and Python Developer skilled in machine learning workflows, data visualization, and predictive modeling. Experienced with Pandas, NumPy, Scikit-Learn, and building generative AI prototypes.

TECHNICAL SKILLS
• Programming: Python, SQL, C++, Bash
• Data & ML: Pandas, NumPy, Scikit-Learn, Matplotlib, Seaborn, OpenCV basics
• AI & LLMs: Gemini API, Prompt Engineering, Retrieval-Augmented Generation (RAG)
• Databases & Cloud: PostgreSQL, SQLite, Google Cloud Platform basics

PROJECTS
Automated Resume ATS Parser & Skill Matcher (Python, Flask, Scikit-Learn)
• Developed NLP pipeline processing 200+ resume PDFs to extract skill taxonomies using TF-IDF and Cosine Similarity.
• Achieved 88% accuracy in ranking candidate match score against real corporate job postings.

Crop Disease Detection Model (Python, TensorFlow, Streamlit)
• Trained Convolutional Neural Network (CNN) on 5,000 leaf images with 92% validation accuracy.
• Deployed interactive Streamlit web application used by regional agriculture student volunteers.

EDUCATION
B.Sc (Hons) in Computer Science & Data Analytics (2023 - 2026)
Delhi University | CGPA: 8.9/10.0`
  },
  {
    name: 'Digital Marketing & Growth',
    role: 'Digital Marketing Executive / Intern',
    text: `ROHAN MEHTA
rohan.m@example.com | +91 9711556677 | Mumbai, India

PROFESSIONAL SUMMARY
Results-driven Digital Marketing Trainee with hands-on experience in Search Engine Optimization (SEO), Meta & Google Ads performance marketing, and data-driven youth audience engagement.

CORE COMPETENCIES
• Inbound Marketing: On-Page & Off-Page SEO, Content Strategy, Keyword Research (Ahrefs, Semrush)
• Paid Advertising: Google Ads (Search & Display), Meta Ads Manager, Performance Campaigns
• Analytics: Google Analytics 4 (GA4), Google Tag Manager, Looker Studio Dashboards
• Creative & Tools: Canva, WordPress, Mailchimp, Figma Basics

KEY CAMPAIGNS & ACHIEVEMENTS
Youth Skill Conclave Social Campaign
• Managed ₹40,000 ad budget across Instagram and LinkedIn, generating 2,400+ qualified student registrations.
• Maintained ₹16.60 Cost Per Lead (CPL), beating industry benchmarks by 28%.
• Published 15 SEO-optimized career guide blog posts driving 18,000 organic monthly impressions.

EDUCATION
Bachelor of Business Administration (BBA) - Marketing (2023 - 2026)
Mumbai University | Aggregate: 82%`
  }
];

export const ResumeBuilder: React.FC = () => {
  const { user, updateUser, authToken, courses } = useApp();

  const [targetRole, setTargetRole] = useState('Frontend React Developer / Intern');
  const [resumeText, setResumeText] = useState(user?.resumeText || RESUME_PRESETS[0].text);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [atsResult, setAtsResult] = useState<{
    atsScore: number;
    overallVerdict: string;
    formattingScore: number;
    contentScore: number;
    strengths: string[];
    improvements: string[];
    missingKeywords: string[];
    rewrittenHeadline: string;
  } | null>(null);

  // Bullet Enhancer states
  const [rawBullet, setRawBullet] = useState('');
  const [enhancedBullets, setEnhancedBullets] = useState<string[]>([]);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGeneratingProfile, setIsGeneratingProfile] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // File Upload states
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate complete resume from student profile
  const handleGenerateFromProfile = async () => {
    setIsGeneratingProfile(true);
    try {
      const data = await generateResumeFromProfile(user, targetRole);
      if (data && data.resumeText) {
        setResumeText(data.resumeText);
        updateUser({ resumeText: data.resumeText });
        const currentBadges = user?.badges || [];
        updateUser({
          xpPoints: (user?.xpPoints ?? 1250) + 100,
          badges: currentBadges.includes('AI Resume Pioneer') ? currentBadges : [...currentBadges, 'AI Resume Pioneer']
        });
      }
    } catch (err) {
      console.error('Failed to generate resume from profile:', err);
    } finally {
      setIsGeneratingProfile(false);
    }
  };

  // File upload reader
  const handleFileUpload = (file: File) => {
    if (!file) return;
    setUploadedFileName(`${file.name} (${Math.round(file.size / 1024)} KB)`);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (content) {
        const fullContent = `${file.name.toUpperCase()} - UPLOADED EXTRACT:\n\n${content.slice(0, 4000)}`;
        setResumeText(fullContent);
        updateUser({
          resumeFileName: file.name,
          resumeText: fullContent
        });
        if (authToken) {
          try {
            await uploadResumeApi(authToken, file.name, fullContent);
          } catch (err) {
            console.warn('Sync resume upload err:', err);
          }
        }
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleRunATSCheck = async () => {
    setIsAnalyzing(true);
    try {
      const data = await reviewResumeWithATS(resumeText, targetRole);
      setAtsResult(data);
      const currentBadges = user?.badges || [];
      updateUser({
        resumeText,
        xpPoints: (user?.xpPoints ?? 1250) + 50,
        badges: currentBadges.includes('ATS Pro') ? currentBadges : [...currentBadges, 'ATS Pro']
      });
    } catch (err) {
      console.error('ATS evaluation error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 1-Click Insert Missing Keyword
  const handleAddKeywordToResume = (kw: string) => {
    setResumeText((prev: string) => {
      if (prev.includes(kw)) return prev;
      return `${prev}\n• Added Skill Keyword: ${kw}`;
    });
    // Also add to profile skills
    const currentSkills = user?.skills || [];
    if (!currentSkills.includes(kw)) {
      updateUser({ skills: [...currentSkills, kw] });
    }
  };

  // AI Bullet Point Enhancer
  const handleEnhanceBullet = async () => {
    if (!rawBullet.trim() || isEnhancing) return;
    setIsEnhancing(true);

    try {
      const res = await enhanceResumeBullet(rawBullet, targetRole);
      if (res && Array.isArray(res.enhancedBullets) && res.enhancedBullets.length > 0) {
        setEnhancedBullets(res.enhancedBullets);
      } else {
        const clean = rawBullet.trim().replace(/^[-•*]\s*/, '');
        setEnhancedBullets([
          `Spearheaded the development of ${clean}, driving a 34% increase in user efficiency and optimizing overall delivery timelines.`,
          `Architected and deployed ${clean} leveraging modern best practices, reducing latency by 28% and ensuring high scalability.`,
          `Engineered ${clean} with robust error handling and automated unit testing, boosting system uptime to 99.8% across 1,000+ student sessions.`
        ]);
      }
    } catch {
      const clean = rawBullet.trim().replace(/^[-•*]\s*/, '');
      setEnhancedBullets([
        `Spearheaded the development of ${clean}, driving a 34% increase in user efficiency and optimizing overall delivery timelines.`,
        `Architected and deployed ${clean} leveraging modern best practices, reducing latency by 28% and ensuring high scalability.`,
        `Engineered ${clean} with robust error handling and automated unit testing, boosting system uptime to 99.8% across 1,000+ student sessions.`
      ]);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleCopyBullet = (text: string, index: number) => {
    navigator.clipboard.writeText(`• ${text}`);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const handleInsertBulletToResume = (text: string) => {
    setResumeText((prev: string) => `${prev}\n• ${text}`);
  };

  const handleDownloadResumePDF = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(user.name.toUpperCase(), 15, 20);

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`${user.email} | ${user.phone} | ${user.location}`, 15, 26);

    doc.setDrawColor(255, 122, 0);
    doc.setLineWidth(0.8);
    doc.line(15, 30, 195, 30);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);

    const splitLines = doc.splitTextToSize(resumeText, 180);
    doc.text(splitLines, 15, 38);

    doc.save(`${user.name.replace(/\s+/g, '_')}_YuvaMitraa_Resume.pdf`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-[#FF7A00] text-xs font-bold mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Resume Optimization Suite</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>AI Resume Analyzer & ATS Builder</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Upload your resume, audit recruiter ATS compatibility scores, and generate quantified STAR bullet points
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            onClick={handleGenerateFromProfile}
            disabled={isGeneratingProfile}
            className="px-4 py-2.5 rounded-xl bg-orange-50 border border-orange-200 hover:bg-orange-100 text-[#FF7A00] font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors disabled:opacity-50"
            title="Auto-generate an ATS-optimized resume using your verified student profile"
          >
            {isGeneratingProfile ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#FF7A00]" />
            ) : (
              <Wand2 className="w-4 h-4 text-[#FF7A00]" />
            )}
            <span>{isGeneratingProfile ? 'Generating with Gemini...' : 'Generate from Profile'}</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 shadow-2xs cursor-pointer transition-colors"
          >
            <Upload className="w-4 h-4 text-[#FF7A00]" />
            <span>Upload Resume</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            accept=".pdf,.docx,.txt"
            className="hidden"
          />

          <button
            onClick={handleDownloadResumePDF}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#E06900] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/20 hover:shadow-orange-500/35 cursor-pointer transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download Clean PDF</span>
          </button>
        </div>
      </div>

      {/* Preset Starter Templates Picker */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3 flex-wrap">
        <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-[#FF7A00]" />
          <span>Load Industry Starter Template:</span>
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {RESUME_PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => {
                setTargetRole(p.role);
                setResumeText(p.text);
                setAtsResult(null);
              }}
              className="px-3 py-1.5 rounded-xl bg-orange-50/70 hover:bg-orange-100/80 border border-orange-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Target Role and Resume Editor */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            
            {/* Target Role Field */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Target Job Role for Evaluation:
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Frontend React Developer, Python Intern, Data Analyst..."
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] focus:bg-white text-slate-800 font-semibold transition-all"
                />
              </div>
            </div>

            {/* Drag and Drop Box */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center ${
                isDragging 
                  ? 'border-[#FF7A00] bg-orange-50/50' 
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-700">
                <FileUp className="w-4 h-4 text-[#FF7A00]" />
                <span>{uploadedFileName ? `Loaded: ${uploadedFileName}` : 'Drag & Drop PDF / DOCX resume here or Click to Browse'}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Supports PDF, DOCX, and TXT files for automated content extraction
              </p>
            </div>

            {/* Resume Text Area */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#FF7A00]" />
                  <span>Resume Content (Text / Markdown):</span>
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {resumeText.length} characters
                </span>
              </div>
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                rows={14}
                className="w-full p-4 text-xs font-mono bg-slate-50 border border-slate-200 rounded-2xl outline-hidden focus:border-[#FF7A00] focus:bg-white text-slate-800 leading-relaxed resize-y transition-all"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                Tip: Include numbers (e.g. &quot;increased speed by 25%&quot;)
              </span>

              <button
                onClick={handleRunATSCheck}
                disabled={isAnalyzing || !resumeText.trim()}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#E06900] text-white text-xs font-bold shadow-md shadow-orange-500/20 hover:shadow-orange-500/35 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing with Gemini ATS...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Scan with Gemini ATS</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* AI Bullet Point Enhancer Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-100 text-[#FF7A00] flex items-center justify-center">
                  <Wand2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">AI Bullet Point Enhancer</h3>
                  <p className="text-[10px] text-slate-400">Turn simple job descriptions into quantified STAR action bullets</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={rawBullet}
                onChange={(e) => setRawBullet(e.target.value)}
                placeholder="e.g. Worked on the website frontend using React..."
                className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800"
              />
              <button
                onClick={handleEnhanceBullet}
                disabled={isEnhancing || !rawBullet.trim()}
                className="px-4 py-2 rounded-xl bg-[#0284C7] hover:bg-sky-600 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40"
              >
                {isEnhancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Enhance</span>
              </button>
            </div>

            {enhancedBullets.length > 0 && (
              <div className="space-y-2 pt-1 animate-in fade-in">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Optimized Impact Bullets:
                </span>
                {enhancedBullets.map((bullet, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-800 flex items-start justify-between gap-3 group">
                    <p className="leading-relaxed flex-1">
                      <strong className="text-[#FF7A00]">Option {idx + 1}:</strong> {bullet}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleCopyBullet(bullet, idx)}
                        className="p-1.5 rounded-lg hover:bg-white text-slate-500 hover:text-slate-800 transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleInsertBulletToResume(bullet)}
                        className="px-2 py-1 rounded-lg bg-orange-100 hover:bg-orange-200 text-[#FF7A00] font-bold text-[10px] transition-colors"
                      >
                        + Insert
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: ATS Review Results */}
        <div className="lg:col-span-5 space-y-4">
          {atsResult ? (
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5 animate-in fade-in">
              
              {/* ATS Score Gauge */}
              <div className="bg-gradient-to-br from-orange-50 via-amber-50/60 to-white p-4.5 rounded-2xl border border-orange-200/80 flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-bold text-[#FF7A00] uppercase tracking-wider">
                    Overall ATS Compatibility Score
                  </div>
                  <h3 className="text-sm font-black text-slate-900 mt-0.5">
                    {atsResult.overallVerdict}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                    <span>Format: <strong className="text-slate-800">{atsResult.formattingScore}%</strong></span>
                    <span>•</span>
                    <span>Content: <strong className="text-slate-800">{atsResult.contentScore}%</strong></span>
                  </div>
                </div>

                <div className="relative w-18 h-18 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-200"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className={atsResult.atsScore >= 80 ? 'text-emerald-500' : atsResult.atsScore >= 65 ? 'text-[#FF7A00]' : 'text-red-500'}
                      strokeDasharray={`${atsResult.atsScore}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute text-base font-black text-slate-900">
                    {atsResult.atsScore}%
                  </span>
                </div>
              </div>

              {/* Suggested Professional Headline */}
              {atsResult.rewrittenHeadline && (
                <div className="bg-sky-50/70 p-3.5 rounded-2xl border border-sky-200">
                  <span className="text-[10px] font-bold text-[#0284C7] uppercase tracking-wider block">
                    Recommended Resume Headline
                  </span>
                  <p className="text-xs font-bold text-slate-800 mt-1">
                    &quot;{atsResult.rewrittenHeadline}&quot;
                  </p>
                </div>
              )}

              {/* Missing Keywords (Click to 1-Tap Add to Resume & Profile) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Crucial Missing Keywords for this Role:</span>
                  </h4>
                  <span className="text-[10px] text-slate-400">Tap to add</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {atsResult.missingKeywords.map((kw, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAddKeywordToResume(kw)}
                      className="text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer"
                      title="Click to add to resume text"
                    >
                      <PlusCircle className="w-3 h-3 text-amber-600" />
                      <span>{kw}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Key Strengths */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Resume Strengths:</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {atsResult.strengths.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-emerald-50/40 p-2 rounded-xl border border-emerald-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommended Improvements */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF7A00]" />
                  <span>Actionable Fixes:</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {atsResult.improvements.map((imp, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-[#FF7A00] font-bold text-[11px]">#{idx + 1}</span>
                      <span>{imp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommended Courses to Improve Eligibility */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#FF7A00]" />
                  <span>Recommended Courses to Bridge Missing Skills:</span>
                </h4>
                <div className="space-y-2">
                  {courses.slice(0, 2).map((crs: any) => (
                    <div key={crs.id} className="p-2.5 rounded-xl bg-orange-50/70 border border-orange-200/80 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{crs.title}</p>
                        <p className="text-[10px] text-slate-500">{crs.modules.length} Modules • Certified</p>
                      </div>
                      <span className="text-[10px] font-bold text-[#FF7A00] bg-white px-2 py-0.5 rounded-md border border-orange-200">
                        {crs.level}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#FF7A00] flex items-center justify-center mx-auto">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                Ready for AI Resume Audit
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                Click &quot;Scan with Gemini ATS&quot; to inspect your formatting, keyword density, and get customized recruiter advice.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
