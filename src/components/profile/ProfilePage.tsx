import React, { useState, useEffect } from 'react';
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
  Briefcase,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { openExternalUrl } from '../../utils/navigation';
import { extractPdfResumeText } from '../../utils/resumeParser';
import {
  auth,
  onAuthStateChanged,
  syncUserProfileToFirestore,
  saveExtractedResumeToFirestore,
  getSavedResumeFromFirestore,
  deleteSavedResumeFromFirestore
} from '../../services/firebase';
import { 
  uploadProfilePhotoApi, 
  uploadResumeApi, 
  updateProfileApi,
  changePasswordApi,
  logoutAllApi,
  deleteAccountApi,
  saveStudentProjectApi
} from '../../services/api';
import { StudentProject } from '../../types';
import { LastUpdatedBadge } from '../common/LastUpdatedBadge';

export const ProfilePage: React.FC = () => {
  const { user, updateUser, certificates, authToken, logout, applications, savedJobIds, setActiveTab, recommendationsBundle } = useApp();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [age, setAge] = useState<number | string>(user?.age ?? '');
  const [education, setEducation] = useState(user?.education || '');
  const [institution, setInstitution] = useState(user?.institution || user?.college || '');
  const [course, setCourse] = useState(user?.course || '');
  const [branch, setBranch] = useState(user?.branch || '');
  const [studyYear, setStudyYear] = useState(user?.studyYear || '');
  const [rollNumber, setRollNumber] = useState(user?.rollNumber || '');
  const [cgpa, setCgpa] = useState(user?.cgpa || '');
  const [graduationYear, setGraduationYear] = useState(user?.graduationYear || '');
  const [location, setLocation] = useState(user?.location || '');
  const [preferredLocation, setPreferredLocation] = useState(user?.preferredLocation || '');
  const [workModePreference, setWorkModePreference] = useState<'Online' | 'Offline' | 'Hybrid' | 'Any'>(
    user?.workModePreference || 'Any'
  );
  const [skillsStr, setSkillsStr] = useState((user?.skills || []).join(', '));
  const [nonTechnicalSkillsStr, setNonTechnicalSkillsStr] = useState((user?.nonTechnicalSkills || []).join(', '));
  const [interestsStr, setInterestsStr] = useState((user?.interests || []).join(', '));
  const [preferredDomain, setPreferredDomain] = useState(user?.preferredDomain || '');
  const [preferredRolesStr, setPreferredRolesStr] = useState((user?.preferredRoles || []).join(', '));
  const [careerGoals, setCareerGoals] = useState(user?.careerGoals || '');
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl || '');
  const [resumeFileName, setResumeFileName] = useState(user?.resumeFileName || '');
  const [resumeText, setResumeText] = useState(user?.resumeText || '');
  const [resumeUpdatedAt, setResumeUpdatedAt] = useState(user?.resumeUpdatedAt || '');
  const [profileUpdatedAt, setProfileUpdatedAt] = useState(user?.profileUpdatedAt || user?.updatedAt || '');
  const [githubUrl, setGithubUrl] = useState(user?.githubUrl || '');
  const [linkedinUrl, setLinkedinUrl] = useState(user?.linkedinUrl || '');
  const [portfolioUrl, setPortfolioUrl] = useState(user?.portfolioUrl || '');

  // Client-side PDF resume extraction & Firestore status states
  const [isReadingResume, setIsReadingResume] = useState(false);
  const [isDeletingResume, setIsDeletingResume] = useState(false);
  const [resumeSectionError, setResumeSectionError] = useState<string | null>(null);
  const [resumeSectionSuccess, setResumeSectionSuccess] = useState<string | null>(null);
  const [resumeSignInPrompt, setResumeSignInPrompt] = useState<string | null>(null);

  // Projects state
  const [projects, setProjects] = useState<StudentProject[]>(user?.projects || []);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    technologies: '',
    githubLink: '',
    liveLink: ''
  });

  useEffect(() => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setPhone(user?.phone || '');
    setAge(user?.age ?? '');
    setEducation(user?.education || '');
    setInstitution(user?.institution || user?.college || '');
    setCourse(user?.course || '');
    setBranch(user?.branch || '');
    setStudyYear(user?.studyYear || '');
    setRollNumber(user?.rollNumber || '');
    setCgpa(user?.cgpa || '');
    setGraduationYear(user?.graduationYear || '');
    setLocation(user?.location || '');
    setPreferredLocation(user?.preferredLocation || '');
    setWorkModePreference(user?.workModePreference || 'Any');
    setSkillsStr((user?.skills || []).join(', '));
    setNonTechnicalSkillsStr((user?.nonTechnicalSkills || []).join(', '));
    setInterestsStr((user?.interests || []).join(', '));
    setPreferredDomain(user?.preferredDomain || '');
    setPreferredRolesStr((user?.preferredRoles || []).join(', '));
    setCareerGoals(user?.careerGoals || '');
    setPhotoUrl(user?.photoUrl || '');
    setResumeFileName(user?.resumeFileName || '');
    setResumeText(user?.resumeText || '');
    setResumeUpdatedAt(user?.resumeUpdatedAt || '');
    setProfileUpdatedAt(user?.profileUpdatedAt || user?.updatedAt || '');
    setGithubUrl(user?.githubUrl || '');
    setLinkedinUrl(user?.linkedinUrl || '');
    setPortfolioUrl(user?.portfolioUrl || '');
    setProjects(user?.projects || []);
  }, [
    user?.id,
    user?.email,
    user?.resumeFileName,
    user?.resumeText,
    user?.resumeUpdatedAt,
    user?.profileUpdatedAt,
    user?.updatedAt,
    user?.preferredDomain,
    user?.careerGoals,
    user?.workModePreference
  ]);

  // Auto-fill Resume Content on load strictly for the currently authenticated user's UID
  useEffect(() => {
    let cancelled = false;
    const expectedUid = user?.id;
    if (!expectedUid) return;

    const loadSavedResume = async (uid: string) => {
      if (!uid || uid !== expectedUid) return;
      try {
        const saved = await getSavedResumeFromFirestore(uid);
        if (cancelled) return;
        if (!auth.currentUser || auth.currentUser.uid !== uid || user?.id !== uid) return;
        if (saved && saved.text) {
          setResumeFileName(saved.fileName || 'resume.pdf');
          setResumeText(saved.text);
          setResumeUpdatedAt(saved.updatedAt || '');
          updateUser({
            resumeFileName: saved.fileName,
            resumeText: saved.text,
            resumeUpdatedAt: saved.updatedAt,
          });
        }
      } catch {
        // Non-fatal read error
      }
    };

    if (auth.currentUser && auth.currentUser.uid === expectedUid) {
      void loadSavedResume(auth.currentUser.uid);
    }

    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser && fbUser.uid === expectedUid) {
        setResumeSignInPrompt(null);
        void loadSavedResume(fbUser.uid);
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [user?.id]);
  
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
  const [showLogoutAllModal, setShowLogoutAllModal] = useState(false);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);

  const avatarPresets = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80'
  ];

  // Calculate profile completeness
  const calculateCompleteness = () => {
    let score = 15;
    if (name) score += 10;
    if (email && phone) score += 10;
    if (education && institution && (course || branch)) score += 15;
    if (skillsStr.trim().length > 2) score += 15;
    if (interestsStr.trim().length > 2 || preferredDomain.trim().length > 2) score += 10;
    if (careerGoals.trim().length > 5) score += 10;
    if (resumeText.trim().length > 20) score += 10;
    if (preferredRolesStr.trim().length > 2 || preferredLocation.trim().length > 2) score += 5;
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
          setErrorNotice(null);
          try {
            let resolvedUpdatedAt = '';
            if (authToken) {
              const res = await uploadProfilePhotoApi(authToken, dataUrl);
              resolvedUpdatedAt = res?.profileUpdatedAt || res?.user?.profileUpdatedAt || '';
            }
            if (auth.currentUser && auth.currentUser.uid === user?.id) {
              const fsRes = await syncUserProfileToFirestore(
                auth.currentUser.uid,
                { photoUrl: dataUrl },
                { markProfileUpdated: true }
              );
              if (fsRes?.profileUpdatedAt) {
                resolvedUpdatedAt = fsRes.profileUpdatedAt;
              }
            }
            const nextProfileTs = resolvedUpdatedAt || new Date().toISOString();
            setPhotoUrl(dataUrl);
            setProfileUpdatedAt(nextProfileTs);
            updateUser({ photoUrl: dataUrl, profileUpdatedAt: nextProfileTs });
            setSuccessNotice('Profile photo updated successfully!');
            setTimeout(() => setSuccessNotice(null), 3000);
          } catch (err: any) {
            setErrorNotice(err?.message || 'Failed to upload profile photo.');
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Client-side PDF extraction using pdf.js + Firestore serverTimestamp() persistence
  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input value so re-selecting the same PDF file triggers onChange again
    e.target.value = '';
    if (!file) return;

    setErrorNotice(null);
    setSuccessNotice(null);
    setResumeSectionError(null);
    setResumeSectionSuccess(null);
    setResumeSignInPrompt(null);
    setIsReadingResume(true);

    try {
      const extracted = await extractPdfResumeText(file);

      setResumeText(extracted.text);
      setResumeFileName(extracted.fileName);

      if (typeof auth.authStateReady === 'function') {
        await auth.authStateReady();
      }

      const currentUser = auth.currentUser;
      if (!currentUser) {
        if (authToken) {
          const apiRes = await uploadResumeApi(authToken, {
            resumeFileName: extracted.fileName,
            resumeText: extracted.text,
          });
          const serverTs = apiRes?.resumeUpdatedAt || apiRes?.user?.resumeUpdatedAt || new Date().toISOString();
          setResumeUpdatedAt(serverTs);
          updateUser({
            resumeFileName: extracted.fileName,
            resumeText: extracted.text,
            resumeUpdatedAt: serverTs,
          });
          setResumeSectionSuccess('Resume loaded & saved ✓');
          setSuccessNotice('Resume loaded & saved ✓');
          return;
        }
        setResumeSectionSuccess('Resume loaded ✓');
        setResumeSignInPrompt('Sign in to save your resume.');
        return;
      }

      const saved = await saveExtractedResumeToFirestore(currentUser.uid, {
        fileName: extracted.fileName,
        text: extracted.text,
      });

      setResumeFileName(saved.fileName);
      setResumeText(saved.text);
      setResumeUpdatedAt(saved.updatedAt);

      updateUser({
        resumeFileName: saved.fileName,
        resumeText: saved.text,
        resumeUpdatedAt: saved.updatedAt,
      });

      if (authToken) {
        uploadResumeApi(authToken, {
          resumeFileName: saved.fileName,
          resumeText: saved.text,
          resumeUpdatedAt: saved.updatedAt,
        }).catch(() => {
          // Non-fatal if Express session was reset; Firestore remains authoritative
        });
      }

      setResumeSectionSuccess('Resume loaded ✓');
      setSuccessNotice('Resume loaded ✓');
    } catch (err: any) {
      const msg =
        err?.message ||
        'No readable text found in this PDF. Please paste your resume text manually in the Resume Content box.';
      setResumeSectionError(msg);
      setErrorNotice(msg);
    } finally {
      setIsReadingResume(false);
    }
  };

  // Delete saved resume text from Firestore (users/{uid}/resume/current)
  const handleDeleteResume = async () => {
    setErrorNotice(null);
    setSuccessNotice(null);
    setResumeSectionError(null);
    setResumeSectionSuccess(null);
    setResumeSignInPrompt(null);
    setIsDeletingResume(true);

    try {
      if (auth.currentUser) {
        await deleteSavedResumeFromFirestore(auth.currentUser.uid);
      }

      setResumeFileName('');
      setResumeText('');
      setResumeUpdatedAt('');

      updateUser({
        resumeFileName: '',
        resumeText: '',
        resumeUpdatedAt: '',
      });

      if (authToken) {
        uploadResumeApi(authToken, {
          resumeFileName: '',
          resumeText: '',
          resumeUpdatedAt: '',
        }).catch(() => {});
      }

      const deletedMsg = 'Saved resume removed from your account.';
      setResumeSectionSuccess(deletedMsg);
      setSuccessNotice(deletedMsg);
    } catch (err: any) {
      const msg = err?.message || 'Failed to delete saved resume. Please try again.';
      setResumeSectionError(msg);
      setErrorNotice(msg);
    } finally {
      setIsDeletingResume(false);
    }
  };

  // Save profile changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorNotice(null);

    const parsedSkills = skillsStr.split(',').map(s => s.trim()).filter(Boolean);
    const parsedNonTechSkills = nonTechnicalSkillsStr.split(',').map(s => s.trim()).filter(Boolean);
    const parsedInterests = interestsStr.split(',').map(s => s.trim()).filter(Boolean);
    const parsedPreferredRoles = preferredRolesStr.split(',').map(s => s.trim()).filter(Boolean);
    const parsedAge = age !== '' && Number(age) >= 13 && Number(age) <= 120 ? Number(age) : undefined;
    const safeWorkMode: 'Online' | 'Offline' | 'Hybrid' | 'Any' =
      workModePreference === 'Online' || workModePreference === 'Offline' || workModePreference === 'Hybrid' || workModePreference === 'Any'
        ? workModePreference
        : 'Any';

    const updatedData = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      ...(parsedAge ? { age: parsedAge } : {}),
      education: education.trim(),
      institution: institution.trim(),
      college: institution.trim(),
      course: course.trim(),
      branch: branch.trim(),
      studyYear: studyYear.trim(),
      rollNumber: rollNumber.trim(),
      cgpa: cgpa.trim(),
      graduationYear: graduationYear.trim(),
      location: location.trim(),
      preferredLocation: preferredLocation.trim(),
      workModePreference: safeWorkMode,
      preferredDomain: preferredDomain.trim(),
      careerGoals: careerGoals.trim(),
      photoUrl,
      resumeFileName,
      resumeUpdatedAt,
      resumeText,
      skills: parsedSkills,
      nonTechnicalSkills: parsedNonTechSkills,
      interests: parsedInterests,
      preferredRoles: parsedPreferredRoles,
      projects,
      githubUrl: githubUrl.trim(),
      linkedinUrl: linkedinUrl.trim(),
      portfolioUrl: portfolioUrl.trim()
    };

    try {
      let nextResumeUpdatedAt = resumeUpdatedAt;
      let nextResumeFileName = resumeFileName;
      const resumeTextChanged = resumeText.trim() !== (user?.resumeText || '').trim();

      if (resumeTextChanged && resumeText.trim().length > 0) {
        const effectiveFileName = resumeFileName || 'resume.txt';
        if (auth.currentUser && auth.currentUser.uid === user?.id) {
          const savedResume = await saveExtractedResumeToFirestore(auth.currentUser.uid, {
            fileName: effectiveFileName,
            text: resumeText.trim(),
          });
          nextResumeUpdatedAt = savedResume.updatedAt;
          nextResumeFileName = savedResume.fileName;
          if (authToken) {
            uploadResumeApi(authToken, {
              resumeFileName: savedResume.fileName,
              resumeText: savedResume.text,
              resumeUpdatedAt: savedResume.updatedAt,
            }).catch(() => {});
          }
        } else if (authToken) {
          const resumeRes = await uploadResumeApi(authToken, {
            resumeFileName: effectiveFileName,
            resumeText: resumeText.trim(),
          });
          nextResumeUpdatedAt = resumeRes?.resumeUpdatedAt || resumeRes?.user?.resumeUpdatedAt || new Date().toISOString();
          nextResumeFileName = effectiveFileName;
        }
      }

      const payloadToPersist = {
        ...updatedData,
        resumeFileName: nextResumeFileName,
        resumeUpdatedAt: nextResumeUpdatedAt,
      };

      let fsResult: any = null;
      let apiResult: any = null;

      const saveTasks: Promise<void>[] = [];
      if (auth.currentUser && auth.currentUser.uid === user?.id) {
        saveTasks.push(
          syncUserProfileToFirestore(auth.currentUser.uid, payloadToPersist, { markProfileUpdated: true }).then((res) => {
            fsResult = res;
          })
        );
      }
      if (authToken) {
        saveTasks.push(
          updateProfileApi(authToken, { ...payloadToPersist, markProfileUpdated: true }).then((res) => {
            apiResult = res;
          })
        );
      }
      if (saveTasks.length > 0) {
        await Promise.all(saveTasks);
      }

      const nextProfileUpdatedAt =
        fsResult?.profileUpdatedAt ||
        apiResult?.profileUpdatedAt ||
        apiResult?.user?.profileUpdatedAt ||
        fsResult?.updatedAt ||
        new Date().toISOString();

      setProfileUpdatedAt(nextProfileUpdatedAt);
      setResumeFileName(nextResumeFileName);
      setResumeUpdatedAt(nextResumeUpdatedAt);

      updateUser({
        ...payloadToPersist,
        profileUpdatedAt: nextProfileUpdatedAt,
        updatedAt: nextProfileUpdatedAt,
      });
      setIsSaved(true);
      setSuccessNotice('Profile saved! AI internship recommendations are updating automatically for your updated skills & goals.');
      setTimeout(() => {
        setIsSaved(false);
        setSuccessNotice(null);
      }, 4000);
    } catch (err: any) {
      setErrorNotice(err?.message || 'Failed to save profile details. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.title.trim()) return;
    setErrorNotice(null);
    const proj: StudentProject = {
      id: `proj-${Date.now()}`,
      title: newProject.title.trim(),
      description: newProject.description.trim(),
      technologies: newProject.technologies.split(',').map(t => t.trim()).filter(Boolean),
      githubLink: newProject.githubLink.trim() || undefined,
      liveLink: newProject.liveLink.trim() || undefined
    };
    try {
      const updated = [proj, ...projects];
      let resolvedUpdatedAt = '';
      if (authToken) {
        const res = await saveStudentProjectApi(authToken, proj);
        resolvedUpdatedAt = res?.profileUpdatedAt || res?.user?.profileUpdatedAt || '';
      }
      if (auth.currentUser && auth.currentUser.uid === user?.id) {
        const fsRes = await syncUserProfileToFirestore(
          auth.currentUser.uid,
          { projects: updated },
          { markProfileUpdated: true }
        );
        if (fsRes?.profileUpdatedAt) {
          resolvedUpdatedAt = fsRes.profileUpdatedAt;
        }
      }
      const nextProfileTs = resolvedUpdatedAt || new Date().toISOString();
      setProjects(updated);
      setProfileUpdatedAt(nextProfileTs);
      updateUser({ projects: updated, profileUpdatedAt: nextProfileTs });
      setShowAddProjectModal(false);
      setNewProject({ title: '', description: '', technologies: '', githubLink: '', liveLink: '' });
      setSuccessNotice('Project added to your portfolio successfully!');
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (err: any) {
      setErrorNotice(err?.message || 'Failed to save project.');
    }
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
  const handleLogoutAll = () => {
    setShowLogoutAllModal(true);
  };

  const confirmLogoutAll = async () => {
    setLogoutAllLoading(true);
    try {
      if (authToken) {
        await logoutAllApi(authToken);
      }
      logout();
    } catch {
      logout();
    } finally {
      setLogoutAllLoading(false);
      setShowLogoutAllModal(false);
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
    openExternalUrl(url);
  };

  const handleShareOnLinkedIn = (certTitle: string) => {
    const text = `Proud to earn my verified certificate in ${certTitle} through YuvaMitraa! #SkillsForYouth #PMInternship`;
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://yuvamitraa.gov.in')}&summary=${encodeURIComponent(text)}`;
    openExternalUrl(url);
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
            <span>{user?.streakDays ?? 0}-Day Streak</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 dark:bg-sky-950/40 text-[#0284C7] font-bold text-xs rounded-xl border border-sky-200 dark:border-sky-800 shadow-2xs">
            <Award className="w-4 h-4" />
            <span>{user?.xpPoints ?? 0} XP</span>
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
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={name || 'Profile'}
                  className="w-24 h-24 rounded-3xl object-cover border-2 border-orange-400 shadow-md ring-4 ring-orange-100 dark:ring-slate-700"
                />
              ) : (
                <div className="w-24 h-24 rounded-3xl bg-[#FF7A00] text-white text-3xl font-black flex items-center justify-center border-2 border-orange-400 shadow-md ring-4 ring-orange-100 dark:ring-slate-700">
                  {(name || 'Y').charAt(0).toUpperCase()}
                </div>
              )}
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
              {(user?.badges || []).map((b, i) => (
                <span key={i} className="text-[10px] bg-orange-50 dark:bg-orange-950/60 text-[#FF7A00] border border-orange-200 dark:border-orange-800 px-2.5 py-0.5 rounded-lg font-bold shadow-2xs">
                  🎖️ {b}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end gap-2 self-center md:self-start">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-gradient-to-r from-[#FF7A00] to-[#E06900] text-white text-xs font-bold rounded-2xl shadow-md shadow-orange-500/20 hover:shadow-orange-500/35 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{isSaved ? 'Saved Successfully!' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </div>

        {/* Profile Last Updated Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 -mt-3">
          <LastUpdatedBadge
            label="Profile"
            timestamp={profileUpdatedAt}
            emptyText="Not updated yet"
          />
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
              Academic Qualifications &amp; College Details
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Education Qualification
              </label>
              <input
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="e.g. Undergraduate (B.Tech / B.Com / B.Sc / Diploma)"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                College / University Name
              </label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g. Delhi Technological University"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 dark:text-white font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Degree</label>
                <input
                  type="text"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="e.g. B.Tech, BCA, B.Com"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Branch / Specialization</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="e.g. Computer Science & Engineering"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 dark:text-white font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Current Semester / Year</label>
                <input
                  type="text"
                  value={studyYear}
                  onChange={(e) => setStudyYear(e.target.value)}
                  placeholder="e.g. 3rd Year / Sem 6"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Roll / Student ID</label>
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. 2023CSB1042"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 dark:text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Cumulative CGPA / %</label>
                <input
                  type="text"
                  value={cgpa}
                  onChange={(e) => setCgpa(e.target.value)}
                  placeholder="e.g. 8.8 / 10"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Graduation Year</label>
                <input
                  type="text"
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                  placeholder="e.g. 2026"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 dark:text-white font-mono"
                />
              </div>
            </div>
          </div>

        </div>

        {/* AI Internship Matching Preferences & Skills */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-orange-200/80 dark:border-slate-700 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#FF7A00]" />
                <span>AI Internship Matching Profile (Skills, Interests &amp; Career Goals)</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Powers your weighted 40% Skills / 25% Interest / 20% Education / 10% Career Goal / 5% Location match score.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('jobs')}
              className="px-3.5 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/60 hover:bg-orange-100 text-[#FF7A00] font-bold text-xs border border-orange-200 dark:border-orange-800 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>View AI Matches ({recommendationsBundle?.recommendations?.length ?? 0})</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Technical Skills (comma-separated)
              </label>
              <input
                type="text"
                value={skillsStr}
                onChange={(e) => setSkillsStr(e.target.value)}
                placeholder="Java, Python, C, HTML, CSS, React, AI/ML, SQL"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Non-Technical Skills (comma-separated)
              </label>
              <input
                type="text"
                value={nonTechnicalSkillsStr}
                onChange={(e) => setNonTechnicalSkillsStr(e.target.value)}
                placeholder="Communication, Leadership, Teamwork, Presentation, Problem Solving"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Areas of Interest (comma-separated)
              </label>
              <input
                type="text"
                value={interestsStr}
                onChange={(e) => setInterestsStr(e.target.value)}
                placeholder="Web Development, Artificial Intelligence, Data Science, FinTech, UI/UX"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Preferred Internship Domain
              </label>
              <input
                type="text"
                value={preferredDomain}
                onChange={(e) => setPreferredDomain(e.target.value)}
                placeholder="e.g. Full-Stack Engineering, AI & Data Analytics, Digital Marketing, Finance"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Preferred Internship Location
              </label>
              <input
                type="text"
                value={preferredLocation}
                onChange={(e) => setPreferredLocation(e.target.value)}
                placeholder="e.g. Bengaluru, Delhi NCR, Mumbai, Remote / Pan-India"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Online / Offline Work Mode Preference
              </label>
              <select
                value={workModePreference}
                onChange={(e) => setWorkModePreference(e.target.value as 'Online' | 'Offline' | 'Hybrid' | 'Any')}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 dark:text-white font-medium cursor-pointer"
              >
                <option value="Any">Any (Flexible — Online, Offline &amp; Hybrid)</option>
                <option value="Online">Online / Remote Only</option>
                <option value="Offline">Offline / In-Office</option>
                <option value="Hybrid">Hybrid (In-Office + Remote)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Preferred Job &amp; Internship Roles (comma-separated)
              </label>
              <input
                type="text"
                value={preferredRolesStr}
                onChange={(e) => setPreferredRolesStr(e.target.value)}
                placeholder="Frontend Developer Intern, Python AI Intern, Data Analyst"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Career Goals &amp; Learning Objectives
              </label>
              <textarea
                rows={2}
                value={careerGoals}
                onChange={(e) => setCareerGoals(e.target.value)}
                placeholder="e.g. Build production React & AI applications, gain hands-on backend API experience, and qualify for a full-time software engineering role."
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

        {/* Projects Portfolio Section */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#FF7A00]" />
                <span>Hands-on Engineering Projects ({projects.length})</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Showcase your technical builds, GitHub repos, and live deployed demonstrations to corporate recruiters.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddProjectModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Project</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5 hover:border-orange-300 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{proj.title}</h4>
                  <div className="flex items-center gap-1.5">
                    {proj.githubLink && (
                      <a
                        href={proj.githubLink}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-black"
                        title="GitHub Repo"
                      >
                        <Github className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {proj.liveLink && (
                      <a
                        href={proj.liveLink}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded-lg bg-orange-100 dark:bg-orange-950 text-orange-600 hover:text-orange-700"
                        title="Live Demo"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {proj.description}
                </p>

                <div className="flex flex-wrap gap-1 pt-1">
                  {proj.technologies.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* My Applications & Interview Schedule Tracker */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-[#0284C7]" />
                <span>My Applications & Interview Schedule ({applications.length})</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Track status updates, recruiter screening reviews, and scheduled interview meetings in real-time.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {applications.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4">No applications submitted yet. Browse opportunities to apply.</p>
            ) : (
              applications.map((app) => (
                <div key={app.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">{app.jobTitle}</h4>
                      <span className="text-xs font-semibold text-slate-500">• {app.company}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Applied on {app.appliedDate}
                      {app.matchScore && <span> • Match Score: <strong className="text-emerald-600">{app.matchScore}%</strong></span>}
                    </div>

                    {app.interviewDate && (
                      <div className="mt-2 p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200 flex items-center gap-2">
                        <span>📅 <strong>Interview Scheduled:</strong> {app.interviewDate} at {app.interviewTime}</span>
                        {app.interviewLinkOrVenue && (
                          <a
                            href={app.interviewLinkOrVenue}
                            target="_blank"
                            rel="noreferrer"
                            className="font-bold underline text-purple-700 dark:text-purple-300 ml-2"
                          >
                            Join Meeting Link →
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold self-start sm:self-auto ${
                    app.status === 'Selected' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                    app.status === 'Interview' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' :
                    app.status === 'Shortlisted' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' :
                    app.status === 'Rejected' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' :
                    'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}>
                    {app.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Resume PDF Text Extraction & Saved Content Section */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Resume PDF &amp; Extracted Content
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Upload a PDF (up to 5 MB). Text is extracted on your device.
              </p>
            </div>

            <label
              className={`px-4 py-2 rounded-xl bg-[#E6F4FF] dark:bg-sky-950 hover:bg-sky-100 text-[#0284C7] dark:text-sky-300 font-bold text-xs border border-sky-200 dark:border-sky-800 transition-colors flex items-center gap-1.5 self-start sm:self-auto ${
                isReadingResume ? 'opacity-60 pointer-events-none' : 'cursor-pointer'
              }`}
            >
              {isReadingResume ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : resumeFileName ? (
                <RefreshCw className="w-3.5 h-3.5" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>{isReadingResume ? 'Reading resume...' : resumeFileName ? 'Replace PDF Resume' : 'Select PDF Resume'}</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleResumeUpload}
                disabled={isReadingResume}
                className="hidden"
              />
            </label>
          </div>

          {/* Reading Resume Progress Indicator */}
          {isReadingResume && (
            <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs font-bold text-sky-800 dark:text-sky-200 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#0284C7] shrink-0" />
              <span>Reading resume...</span>
            </div>
          )}

          {/* Inline Success, Sign-In Prompt & Error Messages */}
          {resumeSectionSuccess && !isReadingResume && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{resumeSectionSuccess}</span>
            </div>
          )}

          {resumeSignInPrompt && (
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between gap-2">
              <span className="font-semibold">{resumeSignInPrompt}</span>
              <button
                type="button"
                onClick={() => setResumeSignInPrompt(null)}
                className="text-amber-700 dark:text-amber-300 font-bold text-[11px] hover:underline shrink-0 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {resumeSectionError && (
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span className="font-semibold">{resumeSectionError}</span>
              </div>
              <button
                type="button"
                onClick={() => setResumeSectionError(null)}
                className="text-red-700 dark:text-red-300 font-bold text-[11px] hover:underline shrink-0 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Saved Resume Summary Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-[#FF7A00]" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                  {resumeFileName
                    ? `Saved resume: ${resumeFileName}`
                    : 'No PDF resume loaded yet'}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Upload a PDF (up to 5 MB). Text is extracted on your device.
                </span>
              </div>
            </div>

            {(resumeFileName || resumeText.trim().length > 0) && (
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  type="button"
                  onClick={handleDeleteResume}
                  disabled={isDeletingResume || isReadingResume}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-300 font-bold text-[11px] border border-rose-200 dark:border-rose-800 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isDeletingResume ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Resume Content (Editable — Used for ATS &amp; Eligibility Checks):
            </label>
            <textarea
              rows={5}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Upload a PDF to extract text automatically, or paste your resume text manually..."
              className="w-full p-3 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Resume Last Updated Footer */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2">
            <LastUpdatedBadge
              label="Resume"
              timestamp={resumeUpdatedAt}
              emptyText="Not uploaded yet"
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

      {/* LOGOUT ALL DEVICES CONFIRMATION MODAL */}
      {showLogoutAllModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center gap-3 text-[#FF7A00] mb-3">
              <LogOut className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Log Out From All Devices</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              Are you sure you want to log out from all active sessions? You will need to sign in again on this device.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutAllModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={logoutAllLoading}
                onClick={confirmLogoutAll}
                className="px-5 py-2 text-xs font-bold bg-[#FF7A00] hover:bg-[#E06900] text-white rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                {logoutAllLoading ? 'Signing Out...' : 'Log Out All Devices'}
              </button>
            </div>
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

      {/* ADD PROJECT MODAL */}
      {showAddProjectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-orange-500" />
                Add Hands-On Project
              </h3>
              <button
                type="button"
                onClick={() => setShowAddProjectModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Project Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Task Queue / E-Commerce Microservice"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Tech Stack (comma-separated)</label>
                <input
                  type="text"
                  placeholder="React, TypeScript, Node.js, PostgreSQL"
                  value={newProject.technologies}
                  onChange={(e) => setNewProject({ ...newProject, technologies: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">GitHub Repo Link</label>
                  <input
                    type="url"
                    placeholder="https://github.com/..."
                    value={newProject.githubLink}
                    onChange={(e) => setNewProject({ ...newProject, githubLink: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Live URL / Demo Link</label>
                  <input
                    type="url"
                    placeholder="https://demo.app"
                    value={newProject.liveLink}
                    onChange={(e) => setNewProject({ ...newProject, liveLink: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Short Description & Highlights</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe architectural challenges solved, metrics, or core features..."
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddProjectModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow"
                >
                  Save to Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
};
