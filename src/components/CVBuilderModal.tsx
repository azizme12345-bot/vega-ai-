import React, { useState } from 'react';
import { X, Sparkles, FileText, Download, Copy, Check, Upload, Briefcase, GraduationCap, User, Phone, Mail, MapPin } from 'lucide-react';
import { SupportedLanguage } from '../types';

interface CVBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateCV: (prompt: string, attachedFile?: File) => void;
  language: SupportedLanguage;
}

export const CVBuilderModal: React.FC<CVBuilderModalProps> = ({
  isOpen,
  onClose,
  onGenerateCV,
  language,
}) => {
  const isUrdu = language === 'ur-PK';

  const [fullName, setFullName] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [summary, setSummary] = useState('');
  const [skills, setSkills] = useState('');
  const [experience, setExperience] = useState('');
  const [education, setEducation] = useState('');
  const [cvLanguage, setCvLanguage] = useState<'english' | 'urdu'>('english');
  const [cvStyle, setCvStyle] = useState<'modern' | 'executive' | 'technical' | 'creative'>('modern');
  const [uploadedCvFile, setUploadedCvFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleFillSample = () => {
    if (cvLanguage === 'urdu') {
      setFullName('محمد علی خان');
      setTargetRole('سنیئر سافٹ ویئر انجینئر / ویب ڈیولپر');
      setEmail('ali.khan@example.com');
      setPhone('+92 300 1234567');
      setLocation('لاہور، پاکستان');
      setSummary('۵ سال کا تجربہ رکھنے والا ایک پرعزم اور پرجوش سافٹ ویئر انجینئر جو جدید ویب ٹیکنالوجیز اور کلاؤڈ کمپیوٹنگ میں مہارت رکھتا ہے۔');
      setSkills('جاوا اسکرپٹ، ری ایکٹ، نوڈ جے ایس، ٹائپ اسکرپٹ، پائتھن، ایس کیو ایل، گٹ، کلاؤڈ سروسز');
      setExperience('سافٹ ویئر انجینئر - ٹیک سلوشنز (۲۰۲۱ تا حال)\n• جدید ویب ایپلی کیشنز تیار کیں\n• ٹیم کی رہنمائی اور کلائنٹ کمیونیکیشن');
      setEducation('بی ایس کمپیوٹر سائنس - پنجاب یونیورسٹی، لاہور (۲۰۱۷ - ۲۰۲۱)');
    } else {
      setFullName('Muhammad Ali Khan');
      setTargetRole('Senior Full-Stack Software Engineer');
      setEmail('ali.khan@example.com');
      setPhone('+92 300 1234567');
      setLocation('Lahore, Pakistan');
      setSummary('Results-driven Senior Software Engineer with 5+ years of experience designing, developing, and deploying scalable web applications and cloud architectures.');
      setSkills('React, TypeScript, Node.js, Next.js, Python, PostgreSQL, Docker, AWS, RESTful APIs, Git');
      setExperience('Senior Software Engineer — TechSolutions Ltd (2022 - Present)\n• Architected and shipped 4 enterprise SaaS applications serving 100k+ monthly active users.\n• Mentored junior developers and improved sprint velocity by 25%.\n\nSoftware Developer — Apex Systems (2019 - 2022)\n• Built full-stack features using React and Node.js.');
      setEducation('BS Computer Science — University of the Punjab (2015 - 2019) • CGPA 3.8/4.0');
    }
  };

  const handleGenerate = () => {
    const prompt = `Please build a professional, ATS-friendly, comprehensive, and high-impact Curriculum Vitae (CV / Resume) in ${cvLanguage === 'urdu' ? 'Urdu (اردو)' : 'English'} with a ${cvStyle} style.

Here are the details:
- **Full Name**: ${fullName || 'Professional Candidate'}
- **Target Job Title**: ${targetRole || 'Professional'}
- **Contact Details**: Email: ${email || 'N/A'} | Phone: ${phone || 'N/A'} | Location: ${location || 'N/A'}
- **Professional Summary**: ${summary || 'High-performing professional seeking impactful opportunities.'}
- **Key Skills & Competencies**: ${skills || 'Problem Solving, Communication, Leadership'}
- **Work Experience**:
${experience || 'Experience in relevant industry roles with proven achievements.'}
- **Education & Certifications**:
${education || 'Relevant academic qualification and continuous learning.'}

Requirements for the CV output:
1. Provide a modern, clean Markdown layout with clear headers, bullet points, and achievements.
2. Optimize language with strong action verbs, quantifiable achievements, and ATS keyword density.
3. Include an "Advice & Interview Tips" section at the bottom for this specific role.
${cvLanguage === 'urdu' ? '4. اردو میں بہترین اور معیاری پروفیشنل الفاظ کا انتخاب کریں۔' : ''}`;

    onGenerateCV(prompt, uploadedCvFile || undefined);
    onClose();
  };

  const handleAnalyzeExistingCv = () => {
    if (!uploadedCvFile) return;

    const prompt = `Please analyze and audit this uploaded CV/Resume (${uploadedCvFile.name}) in detail:
1. **Overall ATS Score & Critique (1-100)**
2. **Key Strengths**: What stands out positively.
3. **Critical Improvements Needed**: Formatting, phrasing, gaps, or weak bullet points.
4. **Improved & Polished Rewrite**: Provide an updated, modern version of this CV with enhanced action verbs and professional formatting.
${isUrdu ? '5. تمام تجاویز اردو میں واضح اور آسان زبان میں پیش کریں۔' : ''}`;

    onGenerateCV(prompt, uploadedCvFile);
    onClose();
  };

  return (
    <div
      id="cv-builder-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="cv-builder-modal-container"
        className="bg-neutral-900 border border-neutral-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-neutral-100">
                {isUrdu ? 'پروفیشنل سی وی میکر (AI CV Builder)' : 'Professional AI CV / Resume Builder'}
              </h2>
              <p className="text-xs text-neutral-400">
                {isUrdu ? 'چند منٹوں میں معیاری سی وی بنائیں یا موجودہ کا تجزیہ کروائیں' : 'Create an ATS-friendly CV or audit your existing resume'}
              </p>
            </div>
          </div>
          <button
            id="close-cv-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            title="بند کریں / Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
          {/* Top action bar: Fill sample & Language */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-neutral-800/60 rounded-xl border border-neutral-700/50">
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400 font-medium">
                {isUrdu ? 'سی وی کی زبان:' : 'CV Language:'}
              </span>
              <button
                type="button"
                onClick={() => setCvLanguage('english')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                  cvLanguage === 'english'
                    ? 'bg-blue-600 text-white'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/50'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setCvLanguage('urdu')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                  cvLanguage === 'urdu'
                    ? 'bg-blue-600 text-white'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/50'
                }`}
              >
                اردو (Urdu)
              </button>
            </div>

            <button
              type="button"
              id="fill-sample-cv-btn"
              onClick={handleFillSample}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isUrdu ? 'نمونہ ڈیٹا بھریں (Auto-fill)' : 'Fill Sample Data'}</span>
            </button>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                {isUrdu ? 'پورا نام (Full Name) *' : 'Full Name *'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={isUrdu ? 'مثال: محمد علی' : 'e.g. Alex Johnson'}
                  className="w-full bg-neutral-800/80 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                {isUrdu ? 'مطلوبہ عہدہ / جاب ٹائٹل (Target Role) *' : 'Target Role / Job Title *'}
              </label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder={isUrdu ? 'مثال: گرافک ڈیزائنر / اکاؤنٹنٹ' : 'e.g. Frontend Developer'}
                className="w-full bg-neutral-800/80 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                {isUrdu ? 'ای میل (Email)' : 'Email'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@email.com"
                className="w-full bg-neutral-800/80 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                {isUrdu ? 'فون نمبر (Phone)' : 'Phone'}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+92 300 0000000"
                className="w-full bg-neutral-800/80 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                {isUrdu ? 'شہر / ملک (Location)' : 'City / Country'}
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={isUrdu ? 'لاہور، پاکستان' : 'Karachi, Pakistan'}
                className="w-full bg-neutral-800/80 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              {isUrdu ? 'پروفیشنل خلاصہ (Professional Summary)' : 'Professional Summary'}
            </label>
            <textarea
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={isUrdu ? 'اپنے کیریئر کا مختصر تعارف لکھیں...' : 'Brief overview of your expertise, achievements, and core strengths...'}
              className="w-full bg-neutral-800/80 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              {isUrdu ? 'مہارتیں (Key Skills - کوما لگا کر لکھیں)' : 'Key Skills (comma-separated)'}
            </label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder={isUrdu ? 'مثال: مینجمنٹ، ایکسل، انگریزی، گرافکس' : 'e.g. React, Node.js, Project Management, Excel'}
              className="w-full bg-neutral-800/80 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              {isUrdu ? 'کام کا تجربہ (Work Experience)' : 'Work Experience'}
            </label>
            <textarea
              rows={3}
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder={isUrdu ? 'کمپنی، عہدہ، سال اور اہم کارکردگی لکھیں...' : 'Company name, job title, dates, and key accomplishments...'}
              className="w-full bg-neutral-800/80 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              {isUrdu ? 'تعلیم اور اسناد (Education & Certifications)' : 'Education & Certifications'}
            </label>
            <input
              type="text"
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              placeholder={isUrdu ? 'ڈگری، ادارہ، سال' : 'Degree, University, Graduation Year'}
              className="w-full bg-neutral-800/80 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Option to Upload & Review Existing CV */}
          <div className="pt-2 border-t border-neutral-800">
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              {isUrdu ? 'یا اپنی موجودہ سی وی (تصویر یا پی ڈی ایف) اپ لوڈ کریں:' : 'Or Upload Existing CV (Photo or PDF) to Audit & Upgrade:'}
            </label>
            <div className="flex items-center gap-3">
              <label
                htmlFor="cv-file-upload-input"
                className="flex items-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 rounded-xl cursor-pointer text-xs text-neutral-300 transition-colors"
              >
                <Upload className="w-4 h-4 text-blue-400" />
                <span>{uploadedCvFile ? uploadedCvFile.name : (isUrdu ? 'فائل منتخب کریں (PDF / تصویر)' : 'Select PDF or Photo')}</span>
              </label>
              <input
                id="cv-file-upload-input"
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setUploadedCvFile(file);
                }}
              />
              {uploadedCvFile && (
                <button
                  type="button"
                  onClick={handleAnalyzeExistingCv}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium transition-colors"
                >
                  {isUrdu ? '🔍 اس سی وی کا جائزہ لیں' : '🔍 Audit This CV'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-neutral-800 bg-neutral-900/90">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            {isUrdu ? 'منسوخ کریں' : 'Cancel'}
          </button>

          <button
            type="button"
            id="generate-cv-submit-btn"
            onClick={handleGenerate}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.01]"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isUrdu ? '✨ مکمل سی وی جنریٹ کریں' : '✨ Generate Full CV with AI'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
