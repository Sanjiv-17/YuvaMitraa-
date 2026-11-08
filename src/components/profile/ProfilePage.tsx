import React, { useState } from 'react';
import { 
  User, 
  Camera, 
  Upload, 
  FileText, 
  Award, 
  Flame, 
  Check, 
  MapPin, 
  BookOpen, 
  Sparkles,
  Save,
  Trash2,
  Share2,
  ExternalLink,
  Github,
  Linkedin,
  Globe,
  Plus,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ProfilePage: React.FC = () => {
  const { user, updateUser, certificates } = useApp();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [education, setEducation] = useState(user.education);
  const [institution, setInstitution] = useState(user.institution);
  const [location, setLocation] = useState(user.location);
  const [skillsStr, setSkillsStr] = useState(user.skills.join(', '));
  const [interestsStr, setInterestsStr] = useState(user.interests.join(', '));
  const [photoUrl, setPhotoUrl] = useState(user.photoUrl);
  const [resumeFileName, setResumeFileName] = useState(user.resumeFileName);
  const [resumeText, setResumeText] = useState(user.resumeText);
  const [githubUrl, setGithubUrl] = useState('https://github.com/aaravsharma');
  const [linkedinUrl, setLinkedinUrl] = useState('https://linkedin.com/in/aaravsharma');
  const [portfolioUrl, setPortfolioUrl] = useState('https://aaravsharma.dev');
  const [isSaved, setIsSaved] = useState(false);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  const avatarPresets = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80'
  ];

  // Calculate profile completeness
  const calculateCompleteness = () => {
    let score = 20; // base
    if (name) score += 15;
    if (email && phone) score += 15;
    if (education && institution) score += 15;
    if (skillsStr.length > 5) score += 15;
    if (resumeText.length > 20) score += 10;
    if (githubUrl || linkedinUrl) score += 10;
    return Math.min(100, score);
  };

  const completeness = calculateCompleteness();

  const handlePhotoUploadSim = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setPhotoUrl(uploadEvent.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResumeUploadSim = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setResumeFileName(file.name);
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          const raw = uploadEvent.target.result as string;
          setResumeText(prev => `${file.name.toUpperCase()}\nParsed content preview:\n${raw.slice(0, 400)}...\n\n${prev}`);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleShareOnWhatsApp = (certTitle: string, certCode: string) => {
    const text = `Check out my verified digital certificate in "${certTitle}" from YuvaMitraa National Youth Mission! Verification code: ${certCode}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleShareOnLinkedIn = (certTitle: string) => {
    const text = `Proud to earn my verified certificate in ${certTitle} through YuvaMitraa! #SkillsForYouth #PMInternship`;
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://yuvamitraa.gov.in')}&summary=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({
      name,
      email,
      phone,
      education,
      institution,
      location,
      photoUrl,
      resumeFileName,
      resumeText,
      skills: skillsStr.split(',').map(s => s.trim()).filter(Boolean),
      interests: interestsStr.split(',').map(s => s.trim()).filter(Boolean),
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-[#FF7A00] text-xs font-bold mb-1.5">
            <User className="w-3.5 h-3.5" />
            <span>Verified Candidate Credentials</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Student Profile & Digital Portfolio
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Keep your credentials, verified certificates, and resume updated for automated recruiter AI screening
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-[#FF7A00] font-bold text-xs rounded-xl border border-orange-200 shadow-2xs">
            <Flame className="w-4 h-4 fill-[#FF7A00]" />
            <span>{user.streakDays}-Day Streak</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-[#0284C7] font-bold text-xs rounded-xl border border-sky-200 shadow-2xs">
            <Award className="w-4 h-4" />
            <span>{user.xpPoints} XP</span>
          </div>
        </div>
      </div>

      {/* Profile Completeness Card */}
      <div className="bg-gradient-to-r from-orange-50 via-amber-50/50 to-white p-4.5 rounded-3xl border border-orange-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="text-xs font-black text-slate-800">Profile Completeness: {completeness}%</span>
            {completeness >= 85 && (
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                ✓ Recruiter Ready
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            High profile completeness increases your candidate visibility on recruiter search algorithms by 3.5x.
          </p>
        </div>

        <div className="w-full sm:w-64 space-y-1">
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#FF7A00] to-emerald-500 transition-all duration-500 rounded-full"
              style={{ width: `${completeness}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
            <span>Basic</span>
            <span>Intermediate</span>
            <span className="text-emerald-600 font-bold">Verified Pro</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        
        {/* Profile Card & Avatar */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center md:items-start gap-6">
          
          <div className="flex flex-col items-center space-y-2">
            <div className="relative group">
              <img
                src={photoUrl}
                alt={name}
                className="w-24 h-24 rounded-3xl object-cover border-2 border-orange-400 shadow-md ring-4 ring-orange-100"
              />
              <label className="absolute inset-0 bg-black/40 rounded-3xl flex flex-col items-center justify-center text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="w-5 h-5 mb-1" />
                <span>Change Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUploadSim}
                  className="hidden"
                />
              </label>
            </div>

            <div className="text-[10px] text-slate-400 font-medium">Preset Avatars:</div>
            <div className="flex items-center gap-1.5">
              {avatarPresets.map((av, idx) => (
                <img
                  key={idx}
                  src={av}
                  alt="preset"
                  onClick={() => setPhotoUrl(av)}
                  className={`w-6 h-6 rounded-full object-cover cursor-pointer border ${
                    photoUrl === av ? 'border-[#FF7A00] ring-2 ring-orange-200 scale-110' : 'border-slate-200 opacity-60 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5 text-center md:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <h2 className="text-lg font-black text-slate-900">{name}</h2>
              <span className="text-[10px] font-bold bg-[#E6F4FF] text-[#0284C7] px-2 py-0.5 rounded-full">
                Active Student
              </span>
            </div>

            <p className="text-xs text-slate-600 font-semibold">{education}</p>
            <p className="text-xs text-slate-400">{institution}</p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 pt-2">
              {user.badges.map((b, i) => (
                <span key={i} className="text-[10px] bg-orange-50 text-[#FF7A00] border border-orange-200 px-2.5 py-0.5 rounded-lg font-bold shadow-2xs">
                  🎖️ {b}
                </span>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 bg-gradient-to-r from-[#FF7A00] to-[#E06900] text-white text-xs font-bold rounded-2xl shadow-md shadow-orange-500/20 hover:shadow-orange-500/35 transition-all flex items-center gap-1.5 self-center md:self-start cursor-pointer"
          >
            {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{isSaved ? 'Saved Successfully!' : 'Save Profile Changes'}</span>
          </button>

        </div>

        {/* Personal & Academic Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              Personal & Contact Information
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] focus:bg-white text-slate-800 font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] focus:bg-white text-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] focus:bg-white text-slate-800 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Current City / Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] focus:bg-white text-slate-800 font-medium"
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              Academic & Skills
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Current Degree / Education</label>
              <input
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] focus:bg-white text-slate-800 font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">College / University</label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] focus:bg-white text-slate-800 font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Skills (comma-separated for AI Matcher)
              </label>
              <input
                type="text"
                value={skillsStr}
                onChange={(e) => setSkillsStr(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] focus:bg-white text-slate-800 font-medium"
              />
            </div>
          </div>

        </div>

        {/* Portfolio & Social Presence */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
            Portfolio & Social Presence
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                <Github className="w-3.5 h-3.5 text-slate-700" />
                <span>GitHub Profile</span>
              </label>
              <input
                type="text"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/username"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                <Linkedin className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>LinkedIn Profile</span>
              </label>
              <input
                type="text"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/username"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                <span>Personal Website</span>
              </label>
              <input
                type="text"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="https://myportfolio.dev"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00]"
              />
            </div>
          </div>
        </div>

        {/* Resume Upload and Preview Section */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Uploaded Resume for 1-Click Applications & AI Review
              </h3>
              <p className="text-[11px] text-slate-500">Supported formats: PDF, DOCX, TXT</p>
            </div>

            <label className="px-4 py-2 rounded-xl bg-[#E6F4FF] hover:bg-sky-100 text-[#0284C7] font-bold text-xs border border-sky-200 transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload New File</span>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleResumeUploadSim}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <FileText className="w-5 h-5 text-[#FF7A00]" />
            <div className="flex-1">
              <span className="font-bold text-slate-800">{resumeFileName}</span>
              <span className="text-[10px] text-slate-400 block">Ready for automated parsing</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Parsed Text Preview (Used by Gemini for Eligibility Checks):
            </label>
            <textarea
              rows={6}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800"
            />
          </div>
        </div>

        {/* Verified Certificates Showcase with 1-Click Social Sharing */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#FF7A00]" />
                <span>Verified Digital Certificates ({certificates.length})</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Issued with cryptographic QR codes verified on YuvaMitraa Government portal
              </p>
            </div>
          </div>

          {certificates.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No certificates yet. Complete course quizzes to earn verified digital credentials.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {certificates.map((cert) => (
                <div key={cert.id} className="p-4 bg-gradient-to-br from-orange-50/60 to-white rounded-2xl border border-orange-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] bg-white border border-orange-200 text-[#FF7A00] font-black px-2 py-0.5 rounded-md">
                      Score: {cert.scorePercentage}%
                    </span>
                    <span className="text-[10px] text-slate-400">{cert.issueDate}</span>
                  </div>

                  <p className="text-xs font-bold text-slate-900 line-clamp-2">{cert.courseTitle}</p>
                  <p className="text-[10px] font-mono text-slate-500">ID: {cert.certificateCode}</p>

                  <div className="pt-2 border-t border-orange-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleShareOnWhatsApp(cert.courseTitle, cert.certificateCode)}
                      className="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 cursor-pointer"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShareOnLinkedIn(cert.courseTitle)}
                      className="text-[10px] text-[#0284C7] hover:text-sky-700 font-bold flex items-center gap-1 bg-sky-50 px-2 py-1 rounded-lg border border-sky-200 cursor-pointer"
                    >
                      <Linkedin className="w-3 h-3" />
                      <span>LinkedIn</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </form>

    </div>
  );
};
