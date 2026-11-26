import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Download, 
  Share2, 
  CheckCircle, 
  QrCode, 
  ExternalLink,
  ShieldCheck,
  Upload,
  Trash2,
  X,
  FileCheck,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Certificate } from '../../types';
import { openExternalUrl } from '../../utils/navigation';

export const CertificateView: React.FC = () => {
  const { certificates, user, setActiveTab, uploadCertificate, deleteCertificate } = useApp();
  const [activeCert, setActiveCert] = useState<Certificate | null>(
    certificates[0] || null
  );

  // Upload External Certificate Modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadIssuer, setUploadIssuer] = useState('');
  const [uploadDate, setUploadDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [uploadCode, setUploadCode] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Always keep activeCert strictly synchronized with the current user's certificates list
  useEffect(() => {
    if (certificates.length === 0) {
      setActiveCert(null);
      return;
    }
    setActiveCert((prev) => {
      if (!prev) return certificates[0];
      const match = certificates.find((c) => c.id === prev.id);
      return match || certificates[0];
    });
  }, [certificates, user?.id]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    const trimmedTitle = uploadTitle.trim();
    const trimmedIssuer = uploadIssuer.trim();
    if (!trimmedTitle || !trimmedIssuer) {
      setUploadError('Please provide both the certificate title and issuing organization.');
      return;
    }

    const trimmedUrl = uploadUrl.trim();
    if (trimmedUrl && !/^https?:\/\//i.test(trimmedUrl)) {
      setUploadError('Credential verification URL must start with http:// or https://');
      return;
    }

    setIsUploading(true);
    try {
      const created = await uploadCertificate({
        courseTitle: trimmedTitle,
        issuer: trimmedIssuer,
        issueDate: uploadDate || new Date().toISOString().split('T')[0],
        certificateCode: uploadCode.trim() || undefined,
        credentialUrl: trimmedUrl || undefined,
        fileName: uploadFileName || undefined,
      });
      setActiveCert(created);
      setUploadTitle('');
      setUploadIssuer('');
      setUploadDate(new Date().toISOString().split('T')[0]);
      setUploadCode('');
      setUploadUrl('');
      setUploadFileName('');
      setShowUploadModal(false);
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to save certificate. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmDelete = async (certId: string) => {
    setIsDeleting(true);
    try {
      await deleteCertificate(certId);
      setConfirmDeleteId(null);
    } catch {
      // Non-fatal
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadPDF = async (cert: Certificate) => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    // Outer and Inner borders
    doc.setDrawColor(255, 122, 0); // Primary Orange
    doc.setLineWidth(3);
    doc.rect(10, 10, width - 20, height - 20);

    doc.setDrawColor(2, 132, 199); // Accent Blue
    doc.setLineWidth(0.8);
    doc.rect(13, 13, width - 26, height - 26);

    // Decorative corner flourishes
    doc.setFillColor(255, 245, 235);
    doc.rect(14, 14, 15, 15, 'F');
    doc.rect(width - 29, 14, 15, 15, 'F');
    doc.rect(14, height - 29, 15, 15, 'F');
    doc.rect(width - 29, height - 29, 15, 15, 'F');

    const issuerHeading =
      cert.source === 'uploaded' && cert.issuer
        ? cert.issuer.toUpperCase()
        : 'YUVAMITRAA SKILL FOUNDATION';

    // Header Title
    doc.setTextColor(23, 23, 23);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(issuerHeading, width / 2, 35, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(
      cert.source === 'uploaded'
        ? 'Verified Student Credential Record on YuvaMitraa'
        : 'National Youth Skill Development & Internship Mission',
      width / 2,
      42,
      { align: 'center' }
    );

    // Certificate of Achievement
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 122, 0);
    doc.text('CERTIFICATE OF ACHIEVEMENT & EXCELLENCE', width / 2, 58, { align: 'center' });

    // Body Text
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('This is proudly presented to verify that', width / 2, 70, { align: 'center' });

    // Student Name
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text((cert.studentName || user?.name || 'Student').toUpperCase(), width / 2, 85, { align: 'center' });

    // Underline for student name
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(width / 2 - 60, 89, width / 2 + 60, 89);

    // Course Title
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('has successfully completed the comprehensive curriculum and passed the examination for', width / 2, 102, { align: 'center' });

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(2, 132, 199);
    doc.text(cert.courseTitle, width / 2, 116, { align: 'center' });

    // Score & Details
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const gradeLine =
      cert.source === 'uploaded'
        ? `Issuing Organization: ${cert.issuer || cert.instructor} | Uploaded Credential`
        : `Passing Grade: ${cert.scorePercentage}% | Evaluation Standard: Industry Verified`;
    doc.text(gradeLine, width / 2, 126, { align: 'center' });

    // Signatures & Metadata Block
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);

    // Left: Date & ID
    doc.text(`Issue Date: ${cert.issueDate}`, 25, 160);
    doc.text(`Certificate Code: ${cert.certificateCode}`, 25, 166);
    doc.text(`Verification URL: ${cert.credentialUrl || 'yuvamitraa.gov.in/verify'}`, 25, 172);

    // Center: Official Seal Simulation
    doc.setDrawColor(255, 122, 0);
    doc.setLineWidth(1.5);
    doc.circle(width / 2, 164, 14);
    doc.setFontSize(7);
    doc.setTextColor(255, 122, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('YUVAMITRAA', width / 2, 162, { align: 'center' });
    doc.text('VERIFIED SEAL', width / 2, 167, { align: 'center' });

    // Right: Instructor signature
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text((cert.issuer || cert.instructor || 'YuvaMitraa').split('(')[0], width - 25, 162, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(cert.source === 'uploaded' ? 'External Issuing Authority' : 'Authorized Academic Evaluator', width - 25, 168, { align: 'right' });
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.5);
    doc.line(width - 70, 155, width - 25, 155);

    // Save PDF
    doc.save(`YuvaMitraa_Certificate_${cert.certificateCode}.pdf`);
  };

  const handleShareCertificate = (cert: Certificate) => {
    const text =
      cert.source === 'uploaded'
        ? `Check out my verified credential in "${cert.courseTitle}" issued by ${cert.issuer || cert.instructor} on my YuvaMitraa portfolio! Code: ${cert.certificateCode}`
        : `I just earned an official verified certificate in "${cert.courseTitle}" with ${cert.scorePercentage}% on YuvaMitraa! Verify Code: ${cert.certificateCode}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    openExternalUrl(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            My Verified Certificates
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Your private earned and uploaded credentials linked exclusively to your YuvaMitraa account
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              setUploadError(null);
              setShowUploadModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold border border-slate-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5 text-[#0284C7]" />
            <span>Upload Certificate</span>
          </button>
          <button
            onClick={() => setActiveTab('courses')}
            className="px-4 py-2 rounded-xl bg-orange-50 text-[#FF7A00] hover:bg-orange-100 text-xs font-bold border border-orange-200 cursor-pointer"
          >
            Earn Another Certificate
          </button>
        </div>
      </div>

      {certificates.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 space-y-3">
          <Award className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Certificates Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Complete any of our free courses and score 70% or higher on the final exam, or upload external certificates you have already earned.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
            <button
              onClick={() => setActiveTab('courses')}
              className="px-6 py-2.5 bg-[#FF7A00] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
            >
              Browse Free Courses
            </button>
            <button
              onClick={() => {
                setUploadError(null);
                setShowUploadModal(true);
              }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#0284C7]" />
              <span>Upload External Certificate</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Certificate Selection List */}
          <div className="lg:col-span-4 space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
              Your Certificates ({certificates.length})
            </div>

            {certificates.map((cert) => {
              const isSelected = activeCert?.id === cert.id;
              const isUploaded = cert.source === 'uploaded';
              return (
                <div
                  key={cert.id}
                  onClick={() => setActiveCert(cert)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#FF7A00] bg-white shadow-md ring-2 ring-orange-200'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold text-[#FF7A00] bg-orange-50 px-2 py-0.5 rounded-sm">
                      {cert.certificateCode}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {cert.issueDate}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 mt-2 line-clamp-2">
                    {cert.courseTitle}
                  </h3>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
                    {isUploaded ? (
                      <span className="text-[#0284C7] font-semibold flex items-center gap-1">
                        <FileCheck className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[140px]">{cert.issuer || 'Uploaded'}</span>
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{cert.scorePercentage}% Score</span>
                      </span>
                    )}
                    <span className="text-[#0284C7] font-semibold">View &amp; PDF</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Certificate Canvas / High-Fidelity Preview */}
          <div className="lg:col-span-8">
            {activeCert && (
              <div className="space-y-4">
                
                {/* Visual Certificate Frame */}
                <div className="bg-white rounded-3xl border-4 border-orange-400 p-6 sm:p-10 shadow-2xl relative overflow-hidden text-center space-y-6">
                  
                  {/* Outer subtle watermarked background */}
                  <div className="absolute inset-0 bg-[radial-gradient(#E2E8F0_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

                  {/* Header Badge */}
                  <div className="relative z-10 flex flex-col items-center justify-center space-y-1">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF7A00] to-[#E06900] text-white flex items-center justify-center shadow-md">
                      <Award className="w-7 h-7" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#FF7A00] pt-1">
                      {activeCert.source === 'uploaded' && activeCert.issuer
                        ? activeCert.issuer
                        : 'YuvaMitraa Skill Foundation'}
                    </span>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                      {activeCert.source === 'uploaded'
                        ? 'UPLOADED CREDENTIAL RECORD'
                        : 'CERTIFICATE OF EXCELLENCE'}
                    </h2>
                  </div>

                  {/* Recipient info */}
                  <div className="relative z-10 space-y-2">
                    <p className="text-xs text-slate-500 italic">This is proudly awarded to</p>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight border-b-2 border-orange-200 pb-2 inline-block px-6">
                      {activeCert.studentName}
                    </div>
                    <p className="text-xs text-slate-600 max-w-md mx-auto pt-2">
                      {activeCert.source === 'uploaded'
                        ? 'for completing and earning the verified external credential in'
                        : 'for demonstrating verified proficiency and completing the curriculum in'}
                    </p>
                    <h3 className="text-base sm:text-lg font-bold text-[#0284C7]">
                      {activeCert.courseTitle}
                    </h3>
                    {activeCert.fileName && (
                      <p className="text-[11px] text-slate-400">
                        Attached file: <span className="font-mono text-slate-600">{activeCert.fileName}</span>
                      </p>
                    )}
                  </div>

                  {/* Badges & QR */}
                  <div className="relative z-10 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
                    <div className="space-y-1">
                      <div className="text-[11px] text-slate-500">
                        Certificate ID: <strong className="text-slate-800">{activeCert.certificateCode}</strong>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Issue Date: <strong className="text-slate-800">{activeCert.issueDate}</strong>
                      </div>
                      <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>
                          {activeCert.source === 'uploaded'
                            ? 'Stored Privately Under Your Account'
                            : 'Cryptographically & QR Verified'}
                        </span>
                      </div>
                    </div>

                    {/* QR Code Graphic Box */}
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
                      <QrCode className="w-10 h-10 text-slate-700" />
                      <div className="text-[9px] text-slate-500">
                        Scan to verify<br />
                        <strong className="text-slate-700 font-bold">yuvamitraa.gov.in</strong>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Actions: Download PDF, Share, External Verify, Delete */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-xs text-slate-600">
                    High-resolution official PDF for print and digital portfolios.
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {activeCert.credentialUrl && /^https?:\/\//i.test(activeCert.credentialUrl) && (
                      <button
                        onClick={() => openExternalUrl(activeCert.credentialUrl!)}
                        className="px-3.5 py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#0284C7] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Verify Link</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleShareCertificate(activeCert)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </button>

                    <button
                      onClick={() => handleDownloadPDF(activeCert)}
                      className="px-5 py-2.5 rounded-xl bg-[#FF7A00] hover:bg-[#E06900] text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Official PDF</span>
                    </button>

                    {activeCert.source === 'uploaded' && (
                      confirmDeleteId === activeCert.id ? (
                        <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-xl">
                          <span className="text-[11px] font-semibold text-rose-700">Remove?</span>
                          <button
                            onClick={() => handleConfirmDelete(activeCert.id)}
                            disabled={isDeleting}
                            className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold hover:bg-rose-700 cursor-pointer disabled:opacity-50"
                          >
                            {isDeleting ? '...' : 'Yes'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded-lg bg-white text-slate-600 text-[11px] font-bold border border-slate-200 cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(activeCert.id)}
                          className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                          title="Delete uploaded certificate"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>
      )}

      {/* Upload External Certificate Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900">Upload External Certificate</h2>
                <p className="text-[11px] text-slate-500">
                  Saved privately under your account only
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Certificate / Course Title *
                </label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. NPTEL Python for Data Science"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Issuing Organization *
                </label>
                <input
                  type="text"
                  required
                  value={uploadIssuer}
                  onChange={(e) => setUploadIssuer(e.target.value)}
                  placeholder="e.g. IIT Madras / Coursera / AWS / AICTE"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={uploadDate}
                    onChange={(e) => setUploadDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Credential ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={uploadCode}
                    onChange={(e) => setUploadCode(e.target.value)}
                    placeholder="e.g. NPTEL-2026-441"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Verification URL (Optional)
                </label>
                <input
                  type="url"
                  value={uploadUrl}
                  onChange={(e) => setUploadUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Certificate File Reference (PDF / Image, Optional)
                </label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setUploadFileName(file ? file.name : '');
                  }}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-[#FF7A00] hover:file:bg-orange-100"
                />
                {uploadFileName && (
                  <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                    Selected: {uploadFileName}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 rounded-xl bg-[#FF7A00] hover:bg-[#E06900] text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Save Certificate</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
