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
  AlertCircle,
  Lock,
  LogOut,
  ShieldAlert,
  Loader2,
  Briefcase
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  uploadProfilePhotoApi, 
  uploadResumeApi, 
  updateProfileApi,
  changePasswordApi,
  logoutAllApi,
  deleteAccountApi
} from '../../services/api';

export const ProfilePage: React.FC = () => {
  const { user, updateUser, certificates, authToken, logout, applications, savedJobIds } = useApp();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [age, setAge] = useState<number | string>(user?.age ?? 21);
  const [education, setEducation] = useState(user?.education || '');
  const [institution, setInstitution] = useState(user?.institution || user?.college || '');
  const [location, setLocation] = useState(user?.location || '');
  const [skillsStr, setSkillsStr] = useState((user?.skills || []).join(', '));
  const [interestsStr, setInterestsStr] = useState((user?.interests || []).join(', '));
  const [preferredRolesStr, setPreferredRolesStr] = useState((user?.preferredRoles || ['Software Engineer', 'Frontend Developer']).join(', '));
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80');
  const [resumeFileName, setResumeFileName] = useState(user?.resumeFileName || 'Resume.pdf');
  const [resumeText, setResumeText] = useState(user?.resumeText || '');
  const [githubUrl, setGithubUrl] = useState('https://github.com/profile');
  const [linkedinUrl, setLinkedinUrl] = useState('https://linkedin.com/in/profile');
  const [portfolioUrl, setPortfolioUrl] = useState('https://portfolio.dev');
  
  // Status states
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Security modals & forms
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const avatarPresets = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80'
  ];

  // Calculate profile completeness
  const calculateCompleteness = () => {
    let score = 20;
    if (name) score += 15;
    if (email && phone) score += 15;
    if (education && institution) score += 15;
    if (skillsStr.length > 5) score += 15;
    if (resumeText.length > 20) score += 10;
    if (preferredRolesStr.length > 5) score += 10;
    return Math.min(100, score);
  };

  const completeness = calculateCompleteness();

  // Photo upload handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = async (uploadEvent) => {
        if (uploadEvent.target?.result) {
          const dataUrl = uploadEvent.target.result as string;
          setPhotoUrl(dataUrl);
          updateUser({ photoUrl: dataUrl });
          if (authToken) {
            try {
              await uploadProfilePhotoApi(authToken, dataUrl);
              setSuccessNotice('Profile photo updated successfully!');
              setTimeout(() => setSuccessNotice(null), 3000);
            } catch (err: any) {
              console.warn('Photo API upload notice:', err.message);
            }
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Resume upload handler
  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setResumeFileName(file.name);
      const reader = new FileReader();
      reader.onload = async (uploadEvent) => {
        if (uploadEvent.target?.result) {
          const raw = uploadEvent.target.result as string;
          const updatedResumeText = `${file.name.toUpperCase()}\nParsed content preview:\n${raw.slice(0, 400)}...\n\n${resumeText || ''}`;
          setResumeText(updatedResumeText);
          updateUser({
            resumeFileName: file.name,
            resumeText: updatedResumeText
          });
          if (authToken) {
            try {
              await uploadResumeApi(authToken, file.name, updatedResumeText);
              setSuccessNotice(`Resume "${file.name}" uploaded and synced with backend.`);
              setTimeout(() => setSuccessNotice(null), 3500);
            } catch (err: any) {
              console.warn('Resume sync notice:', err.message);
            }
          }
        }
      };
      reader.readAsText(file);
    }
  };

  // Save profile changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorNotice(null);

    const parsedSkills = skillsStr.split(',').map(s => s.trim()).filter(Boolean);
    const parsedInterests = interestsStr.split(',').map(s => s.trim()).filter(Boolean);
    const parsedPreferredRoles = preferredRolesStr.split(',').map(s => s.trim()).filter(Boolean);

    const updatedData = {
      name,
      email,
      phone,
      age: Number(age) || 21,
      education,
      institution,
      college: institution,
      location,
      photoUrl,
      resumeFileName,
      resumeText,
      skills: parsedSkills,
      interests: parsedInterests,
      preferredRoles: parsedPreferredRoles
    };

    updateUser(updatedData);

    if (authToken) {
      try {
        await updateProfileApi(authToken, updatedData);
      } catch (err: any) {
        console.warn('Backend profile update note:', err.message);
      }
    }

    setIsSaving(false);
    setIsSaved(true);
    setSuccessNotice('Profile details saved successfully!');
    setTimeout(() => {
      setIsSaved(false);
      setSuccessNotice(null);
    }, 3000);
  };

  // Change password handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setErrorNotice('Please fill all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorNotice('New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorNotice('New password must be at least 6 characters.');
      return;
    }

    try {
      setPasswordLoading(true);
      setErrorNotice(null);
      if (authToken) {
        await changePasswordApi(authToken, currentPassword, newPassword);
      }
      setShowChangePasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessNotice('Password updated successfully!');
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to update password. Verify current password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Logout from all devices
  const handleLogoutAll = async () => {
    if (!confirm('Are you sure you want to log out from all devices? You will need to sign in again.')) return;
    try {
      if (authToken) {
        await logoutAllApi(authToken);
      }
      logout();
    } catch (err) {
      logout();
    }
  };

  // Delete account permanently
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setErrorNotice('Please type DELETE to confirm permanent account deletion.');
      return;
    }

    try {
      setDeleteLoading(true);
      if (authToken) {
        await deleteAccountApi(authToken);
      }
      logout();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to delete account.');
      setDeleteLoading(false);
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-['Poppins',sans-serif]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[#FF7A00] text-xs font-bold mb-1.5">
            <User className="w-3.5 h-3.5" />
            <span>Verified Candidate Credentials</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            User Profile & Account Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Manage your personal information, resume, career preferences, and security settings
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00] font-bold text-xs rounded-xl border border-orange-200 dark:border-orange-800 shadow-2xs">
            <Flame className="w-4 h-4 fill-[#FF7A00]" />
            <span>{user?.streakDays ?? 1}-Day Streak</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 dark:bg-sky-950/40 text-[#0284C7] font-bold text-xs rounded-xl border border-sky-200 dark:border-sky-800 shadow-2xs">
            <Award className="w-4 h-4" />
            <span>{user?.xpPoints ?? 500} XP</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{successNotice}</span>
        </div>
      )}

      {errorNotice && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span className="font-semibold">{errorNotice}</span>
        </div>
      )}

      {/* Activity Summary Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center text-[#FF7A00]">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-black text-slate-900 dark:text-white block leading-tight">
              {applications.length}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Applications Sent</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center text-[#0284C7]">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-black text-slate-900 dark:text-white block leading-tight">
              {(user?.enrolledCourses || []).length}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Enrolled Courses</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-black text-slate-900 dark:text-white block leading-tight">
              {savedJobIds.length}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Saved Jobs</span>
          </div>
        </div>
      </div>

      {/* Profile Completeness Card */}
      <div className="bg-gradient-to-r from-orange-50 via-amber-50/50 to-white dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-800 p-4.5 rounded-3xl border border-orange-200 dark:border-slate-700 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="text-xs font-black text-slate-800 dark:text-slate-200">Profile Completeness: {completeness}%</span>
            {completeness >= 85 && (
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                ✓ Recruiter Ready
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            High profile completeness increases your candidate visibility on recruiter AI search algorithms by 3.5x.
          </p>
        </div>

        <div className="w-full sm:w-64 space-y-1">
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
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
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-center md:items-start gap-6">
          
          <div className="flex flex-col items-center space-y-2">
            <div className="relative group">
              <img
                src={photoUrl}
                alt={name}
                className="w-24 h-24 rounded-3xl object-cover border-2 border-orange-400 shadow-md ring-4 ring-orange-100 dark:ring-slate-700"
              />
              <label className="absolute inset-0 bg-black/40 rounded-3xl flex flex-col items-center justify-center text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="w-5 h-5 mb-1" />
                <span>Change Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="text-[10px] text-slate-400 font-medium">Quick Avatars:</div>
            <div className="flex items-center gap-1.5">
              {avatarPresets.map((av, idx) => (
                <img
                  key={idx}
                  src={av}
                  alt="preset"
                  onClick={() => {
                    setPhotoUrl(av);
                    updateUser({ photoUrl: av });
                  }}
                  className={`w-6 h-6 rounded-full object-cover cursor-pointer border ${
                    photoUrl === av ? 'border-[#FF7A00] ring-2 ring-orange-200 scale-110' : 'border-slate-200 opacity-60 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5 text-center md:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">{name}</h2>
              <span className="text-[10px] font-bold bg-[#E6F4FF] dark:bg-sky-950 text-[#0284C7] dark:text-sky-300 px-2 py-0.5 rounded-full">
                Active Member
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">{education}</p>
            <p className="text-xs text-slate-400">{institution}</p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 pt-2">
              {(user?.badges || ['New Explorer', 'Profile Complete']).map((b, i) => (
                <span key={i} className="text-[10px] bg-orange-50 dark:bg-orange-950/60 text-[#FF7A00] border border-orange-200 dark:border-orange-800 px-2.5 py-0.5 rounded-lg font-bold shadow-2xs">
                  🎖️ {b}
                </span>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-gradient-to-r from-[#FF7A00] to-[#E06900] text-white text-xs font-bold rounded-2xl shadow-md shadow-orange-500/20 hover:shadow-orange-500/35 transition-all flex items-center gap-1.5 self-center md:self-start cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{isSaved ? 'Saved Successfully!' : 'Save Profile Changes'}</span>
          </button>
        </div>

        {/* Personal & Academic Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-2">
              Personal & Contact Information
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 dark:text-white font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 dark:text-white font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Age (Years)</label>
                <input
                  type="number"
                  min={15}
                  max={60}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Current City / Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 dark:text-white font-medium"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-2">
              Academic & Career Aspirations
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Current Degree / Education</label>
              <input
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">College / University</label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Preferred Job & Internship Roles (comma-separated)
              </label>
              <input
                type="text"
                value={preferredRolesStr}
                onChange={(e) => setPreferredRolesStr(e.target.value)}
                placeholder="Software Engineer, Data Analyst, Product Intern"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Skills (comma-separated for AI Matcher)
              </label>
              <input
                type="text"
                value={skillsStr}
                onChange={(e) => setSkillsStr(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 dark:text-white font-medium"
              />
            </div>
          </div>

        </div>

        {/* Portfolio & Social Presence */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-2">
            Portfolio & Social Presence
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1">
                <Github className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                <span>GitHub Profile</span>
              </label>
              <input
                type="text"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/username"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1">
                <Linkedin className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>LinkedIn Profile</span>
              </label>
              <input
                type="text"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/username"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1">
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                <span>Personal Website</span>
              </label>
              <input
                type="text"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="https://myportfolio.dev"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Resume Upload and Preview Section */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Uploaded Resume for 1-Click Applications & AI Review
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Supported formats: PDF, DOCX, TXT</p>
            </div>

            <label className="px-4 py-2 rounded-xl bg-[#E6F4FF] dark:bg-sky-950 hover:bg-sky-100 text-[#0284C7] dark:text-sky-300 font-bold text-xs border border-sky-200 dark:border-sky-800 transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload New File (PDF)</span>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleResumeUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
            <FileText className="w-5 h-5 text-[#FF7A00]" />
            <div className="flex-1">
              <span className="font-bold text-slate-800 dark:text-slate-200">{resumeFileName}</span>
              <span className="text-[10px] text-slate-400 block">Ready for automated parsing & eligibility matching</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Parsed Text Preview (Used by Gemini for Eligibility Checks):
            </label>
            <textarea
              rows={5}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="w-full p-3 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        {/* Verified Certificates Showcase */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#FF7A00]" />
                <span>Verified Digital Certificates ({certificates.length})</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Issued with cryptographic QR codes verified on YuvaMitraa Government portal
              </p>
            </div>
          </div>

          {certificates.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No certificates yet. Complete course quizzes with 70%+ score to earn verified digital credentials.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {certificates.map((cert) => (
                <div key={cert.id} className="p-4 bg-gradient-to-br from-orange-50/60 to-white dark:from-slate-900 dark:to-slate-850 rounded-2xl border border-orange-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] bg-white dark:bg-slate-800 border border-orange-200 dark:border-slate-700 text-[#FF7A00] font-black px-2 py-0.5 rounded-md">
                      Score: {cert.scorePercentage}%
                    </span>
                    <span className="text-[10px] text-slate-400">{cert.issueDate}</span>
                  </div>

                  <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">{cert.courseTitle}</p>
                  <p className="text-[10px] font-mono text-slate-500">ID: {cert.certificateCode}</p>

                  <div className="pt-2 border-t border-orange-100 dark:border-slate-700 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleShareOnWhatsApp(cert.courseTitle, cert.certificateCode)}
                      className="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShareOnLinkedIn(cert.courseTitle)}
                      className="text-[10px] text-[#0284C7] hover:text-sky-700 font-bold flex items-center gap-1 bg-sky-50 dark:bg-sky-950 px-2 py-1 rounded-lg border border-sky-200 dark:border-sky-800 cursor-pointer"
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

        {/* Security & Account Management Card */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-2 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#FF7A00]" />
            <span>Account Security & Privacy Settings</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setShowChangePasswordModal(true)}
              className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-orange-300 bg-slate-50/50 dark:bg-slate-900/50 text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-white mb-1">
                <Lock className="w-4 h-4 text-[#FF7A00]" />
                <span>Change Password</span>
              </div>
              <p className="text-[11px] text-slate-500">Update your account login password</p>
            </button>

            <button
              type="button"
              onClick={handleLogoutAll}
              className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-orange-300 bg-slate-50/50 dark:bg-slate-900/50 text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-white mb-1">
                <LogOut className="w-4 h-4 text-amber-600" />
                <span>Logout All Devices</span>
              </div>
              <p className="text-[11px] text-slate-500">Invalidate sessions across all phones & browsers</p>
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="p-3.5 rounded-2xl border border-rose-200 dark:border-rose-900 hover:border-rose-400 bg-rose-50/30 dark:bg-rose-950/20 text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 font-bold text-xs text-rose-600 dark:text-rose-400 mb-1">
                <Trash2 className="w-4 h-4" />
                <span>Delete Account</span>
              </div>
              <p className="text-[11px] text-slate-500">Permanently erase your account and data</p>
            </button>
          </div>
        </div>

      </form>

      {/* CHANGE PASSWORD MODAL */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Change Account Password</h3>
            <p className="text-xs text-slate-500 mb-4">Enter your current password and choose a new secure password.</p>

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#FF7A00]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">New Password (min 6 characters)</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#FF7A00]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#FF7A00]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-5 py-2 text-xs font-bold bg-[#FF7A00] text-white rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-rose-200 dark:border-rose-900 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Account Permanently</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
              This action cannot be undone. All your job applications, saved opportunities, uploaded resume, and earned certificates will be permanently erased.
            </p>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Type <strong className="text-rose-600">DELETE</strong> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 outline-none mb-4"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmText !== 'DELETE' || deleteLoading}
                onClick={handleDeleteAccount}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
