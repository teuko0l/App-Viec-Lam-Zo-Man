import React, { useState, useEffect, useRef } from 'react';
import { Company, ConsultationApplication, AppSettings, ChatFaqItem } from '../types';
import {
  Lock,
  LogOut,
  Building2,
  Users,
  Settings,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Upload,
  CheckCircle,
  Briefcase,
  Clock,
  GraduationCap,
  Bot,
  Sparkles,
  HelpCircle,
  RotateCcw,
  Tag,
  Eye,
  EyeOff,
  KeyRound,
  ShieldAlert,
  Camera,
  Image as ImageIcon,
  Palette,
  Link as LinkIcon,
  DollarSign,
  Gift,
  FileText,
  Bus,
  Utensils,
  Bed,
  CheckCircle2,
  ListPlus,
  ShieldCheck,
  ClipboardList,
  MapPin,
  Navigation,
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { ZoManLogo } from './ZoManLogo';
import { UploadKnowledgeCard } from './UploadKnowledgeCard';
import { DEFAULT_FAQ_ITEMS } from '../data/defaultFaq';
import {
  initAuth,
  onGoogleAuthChange,
  googleSignIn,
  logoutGoogle,
  getAccessToken,
} from '../services/googleAuth';
import {
  appendApplicationToGoogleSheet,
  syncMultipleApplicationsToGoogleSheet,
  DEFAULT_SPREADSHEET_ID,
  DEFAULT_SPREADSHEET_URL,
  extractSpreadsheetId,
} from '../services/googleSheets';
import { markApplicationSyncedInCloud } from '../services/firebase';

// Danh sách mã màu thương hiệu đề xuất
const LOGO_COLOR_PRESETS = [
  { name: 'Xanh Samsung', value: '#034EA2' },
  { name: 'Tím Foxconn', value: '#C026D3' },
  { name: 'Đỏ Luxshare', value: '#DC2626' },
  { name: 'Xanh Goertek', value: '#059669' },
  { name: 'Cam vàng', value: '#D97706' },
  { name: 'Xanh ngọc', value: '#0D9488' },
  { name: 'Xanh Navy', value: '#1D4ED8' },
  { name: 'Chàm Indigo', value: '#4F46E5' },
  { name: 'Đen than', value: '#1E293B' },
  { name: 'Hồng Rose', value: '#E11D48' },
];

// Nén và xử lý ảnh logo để không làm tràn localStorage
const processLogoImageFile = (file: File, callback: (dataUrl: string) => void) => {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const rawData = e.target?.result as string;
    if (!rawData) return;
    const img = new Image();
    img.onload = () => {
      const maxDim = 320;
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const isPng = file.type === 'image/png';
        const compressedData = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.88);
        callback(compressedData);
      } else {
        callback(rawData);
      }
    };
    img.onerror = () => {
      callback(rawData);
    };
    img.src = rawData;
  };
  reader.readAsDataURL(file);
};

interface Props {
  companies: Company[];
  applications: ConsultationApplication[];
  appSettings: AppSettings;
  faqList: ChatFaqItem[];
  isAdminLoggedIn: boolean;
  adminUsername: string;
  adminRecoveryKey: string;
  onLogin: (u: string, p: string) => boolean;
  onLogout: () => void;
  onUpdateCompany: (company: Company) => void;
  onAddCompany: (company: Company) => void;
  onDeleteCompany: (id: string) => void;
  onUpdateApplicationStatus: (id: string, status: ConsultationApplication['status']) => void;
  onDeleteApplication: (id: string) => void;
  onSaveSettings: (settings: AppSettings) => void;
  onUpdateFaqList: (faqList: ChatFaqItem[]) => void;
  onUpdateAdminCredentials: (
    newUsername: string,
    currentPass: string,
    newPassword: string,
    newRecoveryKey?: string
  ) => boolean;
  onRecoverPassword: (
    targetUser: string,
    recoveryCode: string,
    newPassword: string
  ) => boolean;
}

export const AdminPanel: React.FC<Props> = ({
  companies,
  applications,
  appSettings,
  faqList,
  isAdminLoggedIn,
  adminUsername,
  adminRecoveryKey,
  onLogin,
  onLogout,
  onUpdateCompany,
  onAddCompany,
  onDeleteCompany,
  onUpdateApplicationStatus,
  onDeleteApplication,
  onSaveSettings,
  onUpdateFaqList,
  onUpdateAdminCredentials,
  onRecoverPassword,
}) => {
  const [activeTab, setActiveTab] = useState<'companies' | 'applications' | 'faq' | 'settings'>('companies');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Forgot password modal state (Khôi phục mật khẩu có điều kiện)
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotUser, setForgotUser] = useState('');
  const [forgotRecoveryCode, setForgotRecoveryCode] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  // Settings form
  const [settingsForm, setSettingsForm] = useState<AppSettings>(appSettings);
  const [savedSettingsMsg, setSavedSettingsMsg] = useState(false);

  // Security Credentials Change Form
  const [newAdminUser, setNewAdminUser] = useState(adminUsername);
  const [currentAdminPassword, setCurrentAdminPassword] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [newRecoveryKeyInput, setNewRecoveryKeyInput] = useState(adminRecoveryKey);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showRecoveryKey, setShowRecoveryKey] = useState(false);
  const [credChangeMsg, setCredChangeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit / Add Company modal
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isNewCompany, setIsNewCompany] = useState(false);
  const [companyFilter, setCompanyFilter] = useState<'all' | 'active' | 'hidden'>('all');
  const [hideToggleToast, setHideToggleToast] = useState<string | null>(null);

  // Policy Form Helpers for Allowances, Benefits, Positions
  const [newAllowanceTitle, setNewAllowanceTitle] = useState('');
  const [newAllowanceAmount, setNewAllowanceAmount] = useState('');
  const [newBenefitTitle, setNewBenefitTitle] = useState('');
  const [newBenefitDesc, setNewBenefitDesc] = useState('');
  const [newPositionTitle, setNewPositionTitle] = useState('');
  const [newPositionVacancies, setNewPositionVacancies] = useState<number>(50);
  const [newPositionSalary, setNewPositionSalary] = useState('');

  const handleToggleHideCompany = (c: Company) => {
    const nextHidden = !c.hidden;
    const updated = { ...c, hidden: nextHidden };
    onUpdateCompany(updated);
    setHideToggleToast(
      nextHidden
        ? `Đã ẩn công ty "${c.shortName}" khỏi danh sách tuyển dụng!`
        : `Đã mở hiển thị lại công ty "${c.shortName}" trên trang tuyển dụng!`
    );
    setTimeout(() => setHideToggleToast(null), 3000);
  };

  // Quick Logo Edit Modal (Sửa nhanh logo công ty)
  const [quickLogoCompany, setQuickLogoCompany] = useState<Company | null>(null);
  const [quickLogoSuccess, setQuickLogoSuccess] = useState<string>('');

  // Edit / Add FAQ modal (Bộ câu hỏi AI)
  const [editingFaq, setEditingFaq] = useState<ChatFaqItem | null>(null);
  const [isNewFaq, setIsNewFaq] = useState(false);
  const [faqKeywordsInput, setFaqKeywordsInput] = useState('');
  const [faqSuccessMsg, setFaqSuccessMsg] = useState('');

  // Google Sheets integration state
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [googleSyncMsg, setGoogleSyncMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncingAppId, setSyncingAppId] = useState<string | null>(null);
  const [showSyncAllModal, setShowSyncAllModal] = useState(false);

  // Lắng nghe trạng thái đăng nhập Google Auth (In-memory token)
  useEffect(() => {
    const unsub = onGoogleAuthChange((user, token) => {
      setGoogleUser(user);
      setGoogleToken(token);
    });
    return () => unsub();
  }, []);

  // Tự động đồng bộ các hồ sơ chưa được gửi lên Google Sheet khi admin kết nối Google
  useEffect(() => {
    if (!googleToken) return;
    const unsynced = applications.filter((a) => !a.syncedToGoogleSheet);
    if (unsynced.length > 0 && appSettings.googleSheetAutoSync !== false) {
      const sheetId = appSettings.googleSheetId || DEFAULT_SPREADSHEET_ID;
      syncMultipleApplicationsToGoogleSheet(unsynced, googleToken, sheetId)
        .then(() => {
          for (const a of unsynced) {
            markApplicationSyncedInCloud(a.id, true).catch(console.error);
          }
          setGoogleSyncMsg({
            type: 'success',
            text: `Đã tự động gửi ${unsynced.length} hồ sơ mới vào Google Sheet!`,
          });
          setTimeout(() => setGoogleSyncMsg(null), 4000);
        })
        .catch((err) => {
          console.warn('Lỗi tự động gửi Google Sheet:', err);
        });
    }
  }, [googleToken, applications.length]);

  const handleGoogleSignIn = async () => {
    setIsGoogleSigningIn(true);
    setGoogleSyncMsg(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        setGoogleSyncMsg({
          type: 'success',
          text: `Đã kết nối tài khoản Google (${res.user.email}) với Google Sheets thành công!`,
        });
        setTimeout(() => setGoogleSyncMsg(null), 5000);
      }
    } catch (err: any) {
      setGoogleSyncMsg({
        type: 'error',
        text: err?.message || 'Đăng nhập Google thất bại. Vui lòng kiểm tra lại quyền.',
      });
      setTimeout(() => setGoogleSyncMsg(null), 5000);
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logoutGoogle();
      setGoogleUser(null);
      setGoogleToken(null);
      setGoogleSyncMsg({
        type: 'success',
        text: 'Đã đăng xuất tài khoản Google.',
      });
      setTimeout(() => setGoogleSyncMsg(null), 3000);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSyncSingleApp = async (app: ConsultationApplication) => {
    setSyncingAppId(app.id);
    setGoogleSyncMsg(null);
    try {
      let token = googleToken;
      if (!token) {
        token = await getAccessToken();
      }
      if (!token) {
        const res = await googleSignIn();
        if (res) {
          token = res.accessToken;
          setGoogleUser(res.user);
          setGoogleToken(token);
        } else {
          throw new Error('Vui lòng đăng nhập Google để cấp quyền gửi dữ liệu vào bảng tính.');
        }
      }
      const sheetId = appSettings.googleSheetId || DEFAULT_SPREADSHEET_ID;
      await appendApplicationToGoogleSheet(app, token, sheetId);
      await markApplicationSyncedInCloud(app.id, true);
      setGoogleSyncMsg({
        type: 'success',
        text: `✓ Đã gửi hồ sơ của "${app.fullName}" vào Google Sheet thành công!`,
      });
      setTimeout(() => setGoogleSyncMsg(null), 4000);
    } catch (err: any) {
      setGoogleSyncMsg({
        type: 'error',
        text: err?.message || 'Không thể gửi hồ sơ lên Google Sheet. Vui lòng thử lại.',
      });
    } finally {
      setSyncingAppId(null);
    }
  };

  // User confirmation dialog before bulk mutating operation (BẮT BUỘC THEO QUY CHUẨN)
  const handleConfirmSyncAll = async () => {
    setShowSyncAllModal(false);
    setIsSyncingAll(true);
    setGoogleSyncMsg(null);
    try {
      let token = googleToken;
      if (!token) {
        token = await getAccessToken();
      }
      if (!token) {
        const res = await googleSignIn();
        if (res) {
          token = res.accessToken;
          setGoogleUser(res.user);
          setGoogleToken(token);
        } else {
          throw new Error('Vui lòng kết nối Google để cấp quyền đồng bộ.');
        }
      }
      const sheetId = appSettings.googleSheetId || DEFAULT_SPREADSHEET_ID;
      const res = await syncMultipleApplicationsToGoogleSheet(applications, token, sheetId);
      for (const a of applications) {
        markApplicationSyncedInCloud(a.id, true).catch(console.error);
      }
      setGoogleSyncMsg({
        type: 'success',
        text: `✓ Đã đồng bộ thành công ${res.successCount} hồ sơ lên Google Sheet!`,
      });
      setTimeout(() => setGoogleSyncMsg(null), 5000);
    } catch (err: any) {
      setGoogleSyncMsg({
        type: 'error',
        text: err?.message || 'Lỗi khi đồng bộ hồ sơ lên Google Sheet.',
      });
    } finally {
      setIsSyncingAll(false);
    }
  };

  useEffect(() => {
    setSettingsForm(appSettings);
  }, [appSettings]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onLogin(username, password);
    if (!success) {
      setErrorMsg('Tên đăng nhập hoặc mật khẩu không đúng!');
    } else {
      setErrorMsg('');
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(settingsForm);
    setSavedSettingsMsg(true);
    setTimeout(() => setSavedSettingsMsg(false), 2000);
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    if (isNewCompany) {
      onAddCompany(editingCompany);
    } else {
      onUpdateCompany(editingCompany);
    }
    setEditingCompany(null);
  };

  const handleSaveQuickLogo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickLogoCompany) return;
    onUpdateCompany(quickLogoCompany);
    setQuickLogoSuccess(`✓ Đã lưu thành công logo cho ${quickLogoCompany.shortName}!`);
    setTimeout(() => {
      setQuickLogoSuccess('');
      setQuickLogoCompany(null);
    }, 1200);
  };

  // FAQ Handlers (Huấn luyện bộ câu hỏi AI)
  const handleOpenAddFaq = () => {
    setIsNewFaq(true);
    setFaqKeywordsInput('');
    setEditingFaq({
      id: 'faq-' + Date.now(),
      question: '',
      keywords: [],
      answer: '',
      category: 'general',
    });
  };

  const handleOpenEditFaq = (item: ChatFaqItem) => {
    setIsNewFaq(false);
    setFaqKeywordsInput((item.keywords || []).join(', '));
    setEditingFaq({ ...item });
  };

  const handleSaveFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFaq || !editingFaq.question.trim() || !editingFaq.answer.trim()) return;

    const parsedKeywords = faqKeywordsInput
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const updatedItem: ChatFaqItem = {
      ...editingFaq,
      question: editingFaq.question.trim(),
      keywords: parsedKeywords.length > 0 ? parsedKeywords : [editingFaq.question.trim().toLowerCase()],
      answer: editingFaq.answer.trim(),
    };

    let updatedList: ChatFaqItem[];
    if (isNewFaq) {
      updatedList = [updatedItem, ...faqList];
      setFaqSuccessMsg('✓ AI đã học thành công câu hỏi mới!');
    } else {
      updatedList = faqList.map((item) => (item.id === updatedItem.id ? updatedItem : item));
      setFaqSuccessMsg('✓ Đã cập nhật câu trả lời của AI!');
    }

    onUpdateFaqList(updatedList);
    setEditingFaq(null);
    setTimeout(() => setFaqSuccessMsg(''), 3000);
  };

  const handleDeleteFaq = (id: string) => {
    const updatedList = faqList.filter((item) => item.id !== id);
    onUpdateFaqList(updatedList);
    setFaqSuccessMsg('✓ Đã xóa câu hỏi khỏi bộ nhớ của AI!');
    setTimeout(() => setFaqSuccessMsg(''), 3000);
  };

  const handleResetFaqToDefault = () => {
    if (window.confirm('Khôi phục lại toàn bộ bộ câu hỏi tuyển dụng chuẩn cho AI?')) {
      onUpdateFaqList(DEFAULT_FAQ_ITEMS);
      setFaqSuccessMsg('✓ Đã khôi phục bộ câu hỏi mẫu chuẩn cho AI!');
      setTimeout(() => setFaqSuccessMsg(''), 3000);
    }
  };

  const handleChangeCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUser.trim()) {
      setCredChangeMsg({ type: 'error', text: 'Tên tài khoản quản trị không được để trống!' });
      return;
    }
    if (newAdminPassword.length < 4) {
      setCredChangeMsg({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 4 ký tự!' });
      return;
    }
    if (newAdminPassword !== confirmAdminPassword) {
      setCredChangeMsg({ type: 'error', text: 'Mật khẩu xác nhận không trùng khớp!' });
      return;
    }

    const success = onUpdateAdminCredentials(
      newAdminUser.trim(),
      currentAdminPassword,
      newAdminPassword,
      newRecoveryKeyInput.trim()
    );
    if (success) {
      setCredChangeMsg({ type: 'success', text: '✓ Đã cập nhật thành công tài khoản, mật khẩu và mã bảo mật mới!' });
      setCurrentAdminPassword('');
      setNewAdminPassword('');
      setConfirmAdminPassword('');
      setTimeout(() => setCredChangeMsg(null), 4000);
    } else {
      setCredChangeMsg({ type: 'error', text: 'Mật khẩu hiện tại không đúng, vui lòng kiểm tra lại!' });
    }
  };

  const handleExecutePasswordRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!forgotUser.trim()) {
      setForgotError('Vui lòng nhập tên tài khoản quản trị!');
      return;
    }
    if (!forgotRecoveryCode.trim()) {
      setForgotError('Vui lòng nhập Mã bảo mật khôi phục bí mật!');
      return;
    }
    if (forgotNewPass.length < 4) {
      setForgotError('Mật khẩu mới phải có tối thiểu 4 ký tự!');
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      setForgotError('Xác nhận mật khẩu mới không trùng khớp!');
      return;
    }

    const isSuccess = onRecoverPassword(
      forgotUser.trim(),
      forgotRecoveryCode.trim(),
      forgotNewPass
    );

    if (isSuccess) {
      setForgotSuccess('✓ Xác thực thành công! Mật khẩu quản trị mới đã được thiết lập lại.');
      setUsername(forgotUser.trim());
      setPassword(forgotNewPass);
      setTimeout(() => {
        setIsForgotModalOpen(false);
        setForgotError('');
        setForgotSuccess('');
        setForgotRecoveryCode('');
        setForgotNewPass('');
        setForgotConfirmPass('');
      }, 1500);
    } else {
      setForgotError('✕ Mã bảo mật khôi phục hoặc tài khoản không đúng! Yêu cầu khôi phục bị từ chối.');
    }
  };

  if (!isAdminLoggedIn) {
    return (
      <div className="p-6 max-w-sm mx-auto my-12 bg-white rounded-3xl shadow-xl border border-slate-200">
        <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-3">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-center font-black text-base text-slate-900 mb-1">Đăng Nhập Quản Trị Viên</h2>
        <p className="text-center text-xs text-slate-500 mb-4">Quản lý việc làm, hồ sơ lao động & cài đặt ZôMAN</p>

        {errorMsg && (
          <div className="p-2.5 mb-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold text-center border border-red-200 animate-in fade-in duration-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tài khoản quản trị:</label>
            <input
              type="text"
              required
              placeholder="Nhập tên đăng nhập..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Mật khẩu:</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer mt-2 active:scale-95 transition-all"
          >
            Đăng Nhập
          </button>
        </form>

        {/* Chân trang đăng nhập bảo mật - Yêu cầu xác thực có điều kiện khi quên mật khẩu */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400 font-medium">Bảo mật xác thực cấp cao</span>
          <button
            type="button"
            onClick={() => {
              setIsForgotModalOpen(true);
              setForgotError('');
              setForgotSuccess('');
              setForgotUser(username || '');
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Quên mật khẩu?</span>
          </button>
        </div>

        {/* Modal Khôi Phục Mật Khẩu Có Điều Kiện Xác Thực */}
        {isForgotModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3">
            <form
              onSubmit={handleExecutePasswordRecovery}
              className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-3.5 animate-in fade-in zoom-in-95 duration-200 text-left"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Khôi Phục Mật Khẩu</h3>
                    <p className="text-[10px] text-slate-500">Xác thực điều kiện bảo mật quản trị</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-snug">
                Để bảo vệ an toàn, bạn bắt buộc phải nhập đúng <strong>Tên tài khoản</strong> và <strong>Mã bảo mật khôi phục (Master PIN)</strong> của quản trị viên.
              </div>

              {forgotError && (
                <div className="p-2 bg-red-50 text-red-700 rounded-xl text-xs font-semibold border border-red-200">
                  {forgotError}
                </div>
              )}

              {forgotSuccess && (
                <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200">
                  {forgotSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. Tên tài khoản quản trị:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tên tài khoản..."
                  value={forgotUser}
                  onChange={(e) => setForgotUser(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  2. Mã bảo mật khôi phục (Master PIN):
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nhập mã bảo mật (6 số hoặc email)..."
                  value={forgotRecoveryCode}
                  onChange={(e) => setForgotRecoveryCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    3. Mật khẩu mới:
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Mật khẩu mới..."
                    value={forgotNewPass}
                    onChange={(e) => setForgotNewPass(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    4. Xác nhận:
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Nhập lại..."
                    value={forgotConfirmPass}
                    onChange={(e) => setForgotConfirmPass(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95"
                >
                  Xác Thực & Đổi Mật Khẩu
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-slate-100 pb-20">
      {/* Top Bar Admin */}
      <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2">
          <ZoManLogo size={30} imageUrl={appSettings.customLogo} showShadow={false} />
          <div>
            <h2 className="font-extrabold text-sm leading-tight">Bảng Điều Khiển Quản Trị</h2>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Đồng bộ Cloud Firestore (Mọi thiết bị)</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-1 px-2.5 py-1 bg-red-600/80 hover:bg-red-600 rounded-lg text-xs font-bold"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Đăng xuất</span>
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-2 sticky top-[48px] z-20">
        <button
          type="button"
          onClick={() => setActiveTab('companies')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'companies' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Công ty ({companies.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('applications')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all relative ${
            activeTab === 'applications' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Hồ sơ ({applications.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('faq')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all relative ${
            activeTab === 'faq' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-emerald-400" />
          <span>Bộ Câu Hỏi AI ({faqList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'settings' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Cài đặt ZôMAN</span>
        </button>
      </div>

      {/* Tab 1: Companies */}
      {activeTab === 'companies' && (
        <div className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">Danh Sách Công Ty Tuyển Dụng</h3>
              <p className="text-[11px] text-slate-500">
                Tổng cộng {companies.length} công ty ({companies.filter((c) => !c.hidden).length} đang tuyển, {companies.filter((c) => c.hidden).length} tạm ẩn)
              </p>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {/* Lọc trạng thái nhanh */}
              <div className="bg-slate-200/80 p-0.5 rounded-xl flex items-center text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setCompanyFilter('all')}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    companyFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả ({companies.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCompanyFilter('active')}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    companyFilter === 'active' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Đang tuyển ({companies.filter((c) => !c.hidden).length})
                </button>
                <button
                  type="button"
                  onClick={() => setCompanyFilter('hidden')}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    companyFilter === 'hidden' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Đã ẩn ({companies.filter((c) => c.hidden).length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsNewCompany(true);
                  setEditingCompany({
                    id: 'cty-' + Date.now(),
                    name: '',
                    shortName: '',
                    industry: '',
                    employmentType: 'pho_thong',
                    educationReq: 'Không yêu cầu bằng cấp',
                    contractType: 'Hợp đồng lao động chính thức',
                    badge: 'Bao ăn ở 100% · Nhận việc trong ngày',
                    dormitoryInfo: 'Ký túc xá miễn phí có điều hòa máy giặt',
                    mealInfo: 'Bao cơm ca miễn phí 100%',
                    logoText: 'NEW',
                    logoBgColor: '#2563eb',
                    logoTextColor: '#ffffff',
                    location: 'Bắc Ninh',
                    industrialPark: 'KCN Yên Phong 1',
                    mapsUrl: '',
                    bonusProgram: {
                      enabled: true,
                      title: 'CHƯƠNG TRÌNH THƯỞNG NỔI BẬT (5 THÁNG)',
                      totalBonusText: '15.000.000 đ',
                      months: [
                        { month: 1, companyBonus: '2.000.000 đ', supplierBonus: '2.000.000 đ', note: 'Thưởng gia nhập & đi làm ngay' },
                        { month: 2, companyBonus: '2.000.000 đ', supplierBonus: '1.000.000 đ', note: 'Thưởng duy trì chuyên cần tháng 2' },
                        { month: 3, companyBonus: '2.000.000 đ', supplierBonus: '1.000.000 đ', note: 'Thưởng hoàn thành 3 tháng làm việc' },
                        { month: 4, companyBonus: '2.000.000 đ', supplierBonus: '1.000.000 đ', note: 'Thưởng gắn bó tháng 4' },
                        { month: 5, companyBonus: '2.000.000 đ', supplierBonus: '1.000.000 đ', note: 'Thưởng gắn bó tháng 5' },
                      ],
                      conditionNote: 'Tổng thưởng trong 5 tháng sẽ nhận được toàn bộ số tiền thưởng đó (15.000.000 đ). Tiền thưởng được tính gộp chi trả theo từng tháng cùng kỳ lương khi người lao động đi làm đủ chuyên cần.',
                    },
                    salaryRange: '9.000.000 - 13.000.000 đ/tháng',
                    minSalary: 9000000,
                    maxSalary: 13000000,
                    basicSalary: '5.400.000 đ/tháng',
                    basicSalaryNum: 5400000,
                    attendanceBonus: '800.000 đ/tháng',
                    attendanceBonusNum: 800000,
                    allowances: [{ title: 'Tiền cơm trưa', amount: 'Bao cơm' }],
                    benefits: [{ icon: 'Building2', title: 'KTX Miễn Phí', description: 'Có điều hòa máy giặt' }],
                    positions: [{ title: 'Công nhân sản xuất', vacancies: 100, salary: '9 - 13 triệu', requirements: [], description: [] }],
                  });
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Công Ty</span>
              </button>
            </div>
          </div>

          {/* Thông báo 1-chạm Ẩn / Mở lại công ty */}
          {hideToggleToast && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl text-xs font-bold flex items-center justify-between shadow-2xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>{hideToggleToast}</span>
              </div>
              <button
                type="button"
                onClick={() => setHideToggleToast(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="space-y-2">
            {companies
              .filter((c) => {
                if (companyFilter === 'active') return !c.hidden;
                if (companyFilter === 'hidden') return Boolean(c.hidden);
                return true;
              })
              .map((c) => (
              <div
                key={c.id}
                className={`p-3 bg-white rounded-2xl border shadow-xs flex items-center justify-between gap-3 hover:border-slate-300 transition-colors ${
                  c.hidden ? 'border-amber-300 bg-amber-50/25' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    onClick={() => setQuickLogoCompany({ ...c })}
                    className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer overflow-hidden relative group/logo border border-slate-200 shadow-xs hover:ring-2 hover:ring-blue-500 transition-all bg-white"
                    style={{
                      backgroundColor: c.imageUrl ? '#ffffff' : (c.logoBgColor || '#2563eb'),
                      color: c.logoTextColor || '#fff',
                    }}
                    title="Bấm vào đây để đổi logo công ty"
                  >
                    {c.imageUrl ? (
                      <img src={c.imageUrl} alt={c.shortName} className="w-full h-full object-contain p-1" />
                    ) : (
                      c.logoText
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/logo:opacity-100 flex flex-col items-center justify-center transition-opacity text-white text-[9px] font-bold">
                      <Camera className="w-3.5 h-3.5 mb-0.5" />
                      <span>Đổi</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5 flex-wrap">
                      <span>{c.shortName}</span>
                      {c.imageUrl && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded font-semibold">
                          Ảnh logo
                        </span>
                      )}
                      {c.hidden ? (
                        <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.2 rounded-full inline-flex items-center gap-1 border border-amber-300">
                          <EyeOff className="w-2.5 h-2.5 text-amber-700" />
                          <span>Đã tạm ẩn</span>
                        </span>
                      ) : (
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full inline-flex items-center gap-1 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>Đang tuyển</span>
                        </span>
                      )}
                    </h4>
                    <span className="text-[11px] text-slate-500 block">{c.industrialPark} ({c.location})</span>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded inline-block ${
                        c.employmentType === 'thoi_vu' ? 'bg-orange-100 text-orange-700' : c.employmentType === 'hanh_chinh' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {c.employmentType === 'thoi_vu' ? 'Thời vụ' : c.employmentType === 'hanh_chinh' ? 'Hành chính' : 'Phổ thông'}
                      </span>
                      {c.badge && (
                        <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-300 font-bold px-1.5 py-0.2 rounded-full inline-block">
                          {c.badge}
                        </span>
                      )}
                      {c.mapsUrl && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold px-1.5 py-0.2 rounded-full inline-flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                          <span>Google Maps</span>
                        </span>
                      )}
                      {c.bonusProgram?.enabled && (
                        <span className="text-[10px] bg-amber-50 text-amber-900 border border-amber-300 font-bold px-1.5 py-0.2 rounded-full inline-flex items-center gap-1">
                          <Gift className="w-2.5 h-2.5 text-amber-600" />
                          <span>Gói thưởng {c.bonusProgram.totalBonusText || `${c.bonusProgram.months?.length || 5} tháng`} ({c.bonusProgram.months?.length || 5} tháng)</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Nút 1-chạm Ẩn / Mở lại công ty */}
                  <button
                    type="button"
                    onClick={() => handleToggleHideCompany(c)}
                    className={`px-2.5 py-1.5 rounded-xl cursor-pointer flex items-center gap-1.5 text-[11px] font-bold border transition-all active:scale-95 shadow-2xs ${
                      c.hidden
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                    }`}
                    title={c.hidden ? 'Bấm 1 chạm để mở tuyển dụng lại trên trang tìm việc' : 'Bấm 1 chạm để ẩn công ty này khi ngừng tuyển'}
                  >
                    {c.hidden ? (
                      <>
                        <Eye className="w-3.5 h-3.5 text-white" />
                        <span>Hiện Lại</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                        <span className="hidden sm:inline">Ẩn Tin</span>
                        <span className="sm:hidden">Ẩn</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuickLogoCompany({ ...c })}
                    className="px-2 py-1.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg cursor-pointer flex items-center gap-1 text-[11px] font-bold transition-colors"
                    title="Đổi logo công ty"
                  >
                    <Camera className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="hidden sm:inline">Sửa Logo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewCompany(false);
                      setEditingCompany({ ...c });
                    }}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                    title="Chỉnh sửa toàn bộ thông tin"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteCompany(c.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                    title="Xóa công ty"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Applications */}
      {activeTab === 'applications' && (
        <div className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Danh Sách Ứng Viên Gửi Hồ Sơ</h3>
              <p className="text-[11px] text-slate-500">
                Toàn bộ hồ sơ ứng viên đăng ký từ website sẽ được lưu trữ và tự động gửi vào Google Sheets.
              </p>
            </div>
            <a
              href={appSettings.googleSheetUrl || DEFAULT_SPREADSHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Mở Google Sheet ↗</span>
            </a>
          </div>

          {/* KHỐI KẾT NỐI & TỰ ĐỘNG GỬI GOOGLE SHEETS */}
          <div className="p-4 bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 border border-emerald-200 rounded-3xl space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-xs text-emerald-950 uppercase tracking-wide">
                      Tự Động Gửi Dữ Liệu Vào Google Sheets (100% Tự Động)
                    </h4>
                    {googleToken ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                        Đang Tự Động Gửi
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                        Chờ cấp quyền 1 lần
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-emerald-900 mt-0.5">
                    {googleToken ? (
                      <span className="text-emerald-800 font-medium">
                        ✓ Khi ứng viên nộp thông tin, hệ thống tự động ghi 1 dòng mới vào Google Sheet mà không cần bấm thủ công.
                      </span>
                    ) : (
                      <span className="text-amber-800">
                        Bấm nút <strong>Đăng nhập Google</strong> dưới đây để cấp quyền 1 lần. Sau đó hệ thống sẽ tự động gửi 100% hồ sơ ứng viên!
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    ID bảng tính: <code className="font-mono bg-emerald-100/80 px-1 py-0.5 rounded text-[10px] text-emerald-900">{appSettings.googleSheetId || DEFAULT_SPREADSHEET_ID}</code>
                  </p>
                </div>
              </div>

              {/* Hàng nút bấm đăng nhập Google hoặc đồng bộ tất cả */}
              <div className="flex items-center gap-2 flex-wrap">
                {!googleToken ? (
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleSigningIn}
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-900 border border-emerald-400 rounded-xl text-xs font-black shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                  >
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 shrink-0">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                    <span>{isGoogleSigningIn ? 'Đang kết nối...' : 'Đăng nhập Google (Bật Tự Động)'}</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowSyncAllModal(true)}
                      disabled={isSyncingAll || applications.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                      title="Gửi lại toàn bộ danh sách hồ sơ vào Google Sheet phòng trường hợp muốn nạp lại"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                      <span>Gửi Lại Toàn Bộ ({applications.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleGoogleLogout}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-emerald-100 rounded-lg cursor-pointer transition-colors"
                      title={`Đăng xuất (${googleUser?.email || ''})`}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Thông báo kết quả đồng bộ */}
            {googleSyncMsg && (
              <div
                className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200 ${
                  googleSyncMsg.type === 'success'
                    ? 'bg-white text-emerald-800 border border-emerald-300 shadow-xs'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {googleSyncMsg.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{googleSyncMsg.text}</span>
              </div>
            )}
          </div>

          {applications.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              Chưa có hồ sơ đăng ký nào.
            </div>
          ) : (
            applications.map((app) => (
              <div key={app.id} className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-xs text-slate-900">{app.fullName} - {app.phone}</h4>
                      {(app.id.startsWith('chat-') || (app.notes && app.notes.includes('Chatbot'))) && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 inline-flex items-center gap-1">
                          <Bot className="w-3 h-3 text-purple-600" />
                          <span>Thu thập qua Chatbot</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-blue-600 font-medium">
                      Ứng tuyển: <strong>{app.companyName}</strong> ({app.positionTitle})
                    </p>
                    <p className="text-[10px] text-slate-400">Năm sinh: {app.birthYear} · Ngày nộp: {app.appliedDate}</p>
                    {app.notes && <p className="text-[11px] text-slate-600 italic">Ghi chú: {app.notes}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteApplication(app.id)}
                    className="text-slate-400 hover:text-red-500 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">Trạng thái:</span>
                    <select
                      value={app.status}
                      onChange={(e) => onUpdateApplicationStatus(app.id, e.target.value as any)}
                      className="text-[11px] px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                    >
                      <option value="pending">Chờ xử lý</option>
                      <option value="contacted">Đã liên hệ</option>
                      <option value="interview_scheduled">Đã hẹn lịch phỏng vấn</option>
                      <option value="rejected">Từ chối / Hủy</option>
                    </select>
                  </div>

                  {/* Trạng thái Google Sheet */}
                  <div className="flex items-center gap-2">
                    {app.syncedToGoogleSheet ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Đã lưu trên Google Sheet</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSyncSingleApp(app)}
                        disabled={syncingAppId === app.id}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                        title="Đẩy hồ sơ này vào Google Sheet"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                        <span>{syncingAppId === app.id ? 'Đang gửi...' : 'Gửi lên Sheet ↗'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: FAQ / Bộ Câu Hỏi AI (Nhân Viên Tư Vấn) */}
      {activeTab === 'faq' && (
        <div className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-blue-600" />
                <span>Huấn Luyện Bộ Câu Hỏi Cho AI (Nhân Viên Tư Vấn)</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                AI sẽ tự động học các câu hỏi và từ khóa dưới đây để tư vấn tức thì cho người tìm việc
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetFaqToDefault}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                title="Khôi phục lại bộ câu hỏi mẫu"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Khôi Phục Mẫu</span>
              </button>
              <button
                type="button"
                onClick={handleOpenAddFaq}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Dạy Thêm Câu Hỏi Mới</span>
              </button>
            </div>
          </div>

          {/* Khu Vực Tải Lên File Tri Thức (Upload Knowledge File) Cho Admin */}
          <UploadKnowledgeCard
            currentFaqs={faqList}
            onImportSuccess={(newFaqList, count) => {
              onUpdateFaqList(newFaqList);
              setFaqSuccessMsg(`✓ Đã nạp thành công ${count} câu hỏi vào AI! Dữ liệu Cloud Firestore đã được đồng bộ tự động.`);
              setTimeout(() => setFaqSuccessMsg(''), 4000);
            }}
          />

          {faqSuccessMsg && (
            <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 border border-emerald-200 animate-in fade-in duration-200">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{faqSuccessMsg}</span>
            </div>
          )}

          <div className="space-y-2.5">
            {faqList.map((item, idx) => (
              <div
                key={item.id}
                className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <h4 className="font-bold text-xs text-slate-900 leading-snug">
                      {item.question}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditFaq(item)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                      title="Chỉnh sửa câu hỏi"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFaq(item.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                      title="Xóa câu hỏi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Câu trả lời AI */}
                <div className="p-2.5 bg-slate-50 rounded-xl text-xs text-slate-700 leading-relaxed border border-slate-100">
                  <span className="font-bold text-blue-700 block mb-0.5 text-[11px]">
                    Câu trả lời của AI:
                  </span>
                  {item.answer}
                </div>

                {/* Từ khóa nhận diện */}
                {item.keywords && item.keywords.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-1 text-[10px]">
                    <span className="text-slate-400 font-medium">Từ khóa nhận diện:</span>
                    {item.keywords.map((kw, kwIdx) => (
                      <span
                        key={kwIdx}
                        className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono border border-slate-200"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Settings */}
      {activeTab === 'settings' && (
        <div className="p-4 space-y-4 max-w-lg">
          <form onSubmit={handleSaveSettings} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm text-slate-800 pb-2 border-b border-slate-100">
              Cài Đặt Hệ Thống & Logo ZôMAN
            </h3>

            {savedSettingsMsg && (
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>Đã lưu thành công cài đặt hệ thống!</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tiêu đề lớn ứng dụng:</label>
              <input
                type="text"
                value={settingsForm.appTitle}
                onChange={(e) => setSettingsForm({ ...settingsForm, appTitle: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phụ đề khu vực địa bàn:</label>
              <input
                type="text"
                value={settingsForm.appSubtitle}
                onChange={(e) => setSettingsForm({ ...settingsForm, appSubtitle: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại Hotline:</label>
              <input
                type="text"
                value={settingsForm.hotline}
                onChange={(e) => setSettingsForm({ ...settingsForm, hotline: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-red-600"
              />
            </div>

            {/* CÀI ĐẶT GOOGLE SHEETS */}
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-3xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span className="font-black text-xs text-emerald-950 uppercase tracking-wider">
                    LIÊN KẾT GOOGLE SHEETS LƯU TRỮ HỒ SƠ
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded-full">
                  Tự động đồng bộ
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Mỗi khi ứng viên gửi thông tin đăng ký ứng tuyển, ngoài việc tạo 1 hồ sơ lưu trữ trong quản trị, hệ thống sẽ tự động gửi thêm 1 bản vào bảng Google Sheet này.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Đường dẫn (URL) bảng Google Sheets:
                </label>
                <input
                  type="text"
                  value={settingsForm.googleSheetUrl || ''}
                  onChange={(e) => {
                    const url = e.target.value;
                    const id = extractSpreadsheetId(url);
                    setSettingsForm({
                      ...settingsForm,
                      googleSheetUrl: url,
                      googleSheetId: id,
                    });
                  }}
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-500">
                    ID bảng tính: <code className="text-emerald-700 font-bold">{settingsForm.googleSheetId || DEFAULT_SPREADSHEET_ID}</code>
                  </span>
                  <a
                    href={settingsForm.googleSheetUrl || DEFAULT_SPREADSHEET_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-emerald-700 hover:underline font-bold inline-flex items-center gap-1"
                  >
                    <span>Mở bảng tính</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={settingsForm.googleSheetAutoSync !== false}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        googleSheetAutoSync: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Tự động gửi hồ sơ ứng viên mới lên Google Sheets (Khuyên dùng)</span>
                </label>
              </div>

              <div className="pt-2 border-t border-emerald-200/60">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Đường dẫn Webhook Google Apps Script (Tùy chọn - Nhận dữ liệu 24/7 không cần đăng nhập):
                </label>
                <input
                  type="text"
                  value={settingsForm.googleSheetWebhookUrl || ''}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      googleSheetWebhookUrl: e.target.value,
                    })
                  }
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Nếu bạn cấu hình thêm Apps Script Webhook, ứng viên nộp hồ sơ sẽ luôn gửi thẳng vào Google Sheet 24/7 ngay cả khi không có ai mở trang quản trị.
                </p>
              </div>
            </div>

            {/* Logo Settings - Dành riêng cho Quản trị viên */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-blue-950 uppercase tracking-wider">
                  QUẢN LÝ LOGO THƯƠNG HIỆU ZÔMAN (ĐÃ TÁCH NỀN)
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-200/60 text-blue-800 rounded-full">
                  Chỉ Quản Trị Viên
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tải lên trực tiếp file ảnh logo ZôMan bạn đã tách nền (.PNG / .JPG / .SVG) từ máy tính. Logo sẽ được cập nhật đồng bộ ngay lập tức trên toàn bộ ứng dụng (Trang chủ, Khung di động, Bảng điều khiển).
              </p>

              <div className="flex items-center gap-4 pt-1">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center p-1.5 border border-blue-300 bg-white shadow-sm shrink-0"
                  style={{
                    backgroundImage: 'repeating-conic-gradient(#f1f5f9 0% 25%, #e2e8f0 0% 50%)',
                    backgroundSize: '12px 12px',
                  }}
                  title="Xem trước trên nền trong suốt"
                >
                  <ZoManLogo size={52} imageUrl={settingsForm.customLogo} showShadow={false} />
                </div>

                <div className="flex-1 space-y-2">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md">
                    <Upload className="w-4 h-4" />
                    <span>Tải Lên Ảnh Logo Mới (.PNG)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          processLogoImageFile(file, (dataUrl) => {
                            const newSettings: AppSettings = {
                              ...settingsForm,
                              customLogo: dataUrl,
                            };
                            setSettingsForm(newSettings);
                            onSaveSettings(newSettings);
                            localStorage.setItem('zoman_custom_logo', dataUrl);
                            window.dispatchEvent(new Event('zoman_logo_updated'));
                            setSavedSettingsMsg(true);
                            setTimeout(() => setSavedSettingsMsg(false), 2500);
                          });
                        }
                      }}
                    />
                  </label>

                  {settingsForm.customLogo || (typeof window !== 'undefined' && localStorage.getItem('zoman_custom_logo')) ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                        ✓ Đang dùng ảnh logo tải lên (Đã đồng bộ Cloud)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const newSettings: AppSettings = {
                            ...settingsForm,
                            customLogo: '',
                          };
                          setSettingsForm(newSettings);
                          onSaveSettings(newSettings);
                          localStorage.removeItem('zoman_custom_logo');
                          window.dispatchEvent(new Event('zoman_logo_updated'));
                          setSavedSettingsMsg(true);
                          setTimeout(() => setSavedSettingsMsg(false), 2500);
                        }}
                        className="text-[11px] text-red-600 hover:underline font-bold cursor-pointer"
                      >
                        Khôi phục logo mặc định
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">
                      Đang sử dụng logo vector mặc định chuẩn đã tách nền.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* THAY ĐỔI TÀI KHOẢN & MẬT KHẨU QUẢN TRỊ */}
            <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-3xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  <span className="font-black text-xs text-amber-950 uppercase tracking-wider">
                    ĐỔI TÀI KHOẢN & MẬT KHẨU QUẢN TRỊ
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-200/80 text-amber-900 rounded-full">
                  Bảo Mật
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bạn có thể đổi tên đăng nhập và mật khẩu mới cho trang quản trị để bảo vệ dữ liệu việc làm.
              </p>

              {credChangeMsg && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    credChangeMsg.type === 'success'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-red-100 text-red-800 border border-red-300'
                  }`}
                >
                  {credChangeMsg.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{credChangeMsg.text}</span>
                </div>
              )}

              <div className="space-y-2.5 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên tài khoản quản trị mới:
                  </label>
                  <input
                    type="text"
                    value={newAdminUser}
                    onChange={(e) => setNewAdminUser(e.target.value)}
                    placeholder="admin"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mật khẩu hiện tại (để xác nhận):
                  </label>
                  <input
                    type="password"
                    value={currentAdminPassword}
                    onChange={(e) => setCurrentAdminPassword(e.target.value)}
                    placeholder="Nhập mật khẩu đang dùng..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mật khẩu mới:
                    </label>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      placeholder="Tối thiểu 4 ký tự..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Xác nhận mật khẩu:
                    </label>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={confirmAdminPassword}
                      onChange={(e) => setConfirmAdminPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Mã bảo mật khôi phục bí mật (Master Recovery PIN):</span>
                    <button
                      type="button"
                      onClick={() => setShowRecoveryKey(!showRecoveryKey)}
                      className="text-[11px] text-amber-800 hover:underline font-bold"
                    >
                      {showRecoveryKey ? 'Ẩn mã' : 'Hiện mã'}
                    </button>
                  </label>
                  <input
                    type={showRecoveryKey ? 'text' : 'password'}
                    value={newRecoveryKeyInput}
                    onChange={(e) => setNewRecoveryKeyInput(e.target.value)}
                    placeholder="Mã số bí mật (ví dụ: 998866)..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-[10px] text-amber-800 mt-1">
                    Bảo mật tuyệt đối: Chỉ người có mã này mới có thể khôi phục lại mật khẩu khi quên.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showNewPassword}
                      onChange={(e) => setShowNewPassword(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-amber-600"
                    />
                    <span>Hiện mật khẩu mới</span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleChangeCredentials}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Cập Nhật Tài Khoản & Mật Khẩu Mới</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Cài Đặt Hệ Thống</span>
            </button>
          </form>
        </div>
      )}

      {/* Edit Company Modal */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3">
          <form
            onSubmit={handleSaveCompany}
            className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl max-h-[90vh] overflow-y-auto space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900">
                {isNewCompany ? 'Thêm Công Ty Mới' : 'Chỉnh Sửa Công Ty'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingCompany(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* TRẠNG THÁI TUYỂN DỤNG: ĐANG TUYỂN / TẠM ẨN */}
            <div className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
              editingCompany.hidden
                ? 'bg-amber-50/90 border-amber-300'
                : 'bg-emerald-50/90 border-emerald-200'
            }`}>
              <div className="flex items-center gap-2">
                {editingCompany.hidden ? (
                  <EyeOff className="w-4 h-4 text-amber-700 shrink-0" />
                ) : (
                  <Eye className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    {editingCompany.hidden ? 'Trạng thái: Tạm dừng tuyển (Đã ẩn)' : 'Trạng thái: Đang công khai tuyển dụng'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {editingCompany.hidden ? 'Người tìm việc sẽ không thấy công ty này' : 'Hiển thị bình thường cho người tìm việc'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingCompany({ ...editingCompany, hidden: !editingCompany.hidden })}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95 border ${
                  editingCompany.hidden
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs'
                    : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 shadow-xs'
                }`}
              >
                {editingCompany.hidden ? 'Bật Tuyển Lại' : 'Tạm Ẩn Tin'}
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tên đầy đủ công ty:</label>
              <input
                type="text"
                required
                value={editingCompany.name}
                onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tên ngắn gọn hiển thị:</label>
              <input
                type="text"
                required
                value={editingCompany.shortName}
                onChange={(e) => setEditingCompany({ ...editingCompany, shortName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
              />
            </div>

            {/* NGÀNH NGHỀ / LĨNH VỰC SẢN XUẤT (Ảnh 15.png) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                  <span>Ngành nghề / Lĩnh vực hoạt động:</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Hiển thị cạnh icon cặp táp ở thẻ việc làm</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Gia công & Sản xuất linh kiện vi mạch điện tử Apple..."
                value={editingCompany.industry || ''}
                onChange={(e) => setEditingCompany({ ...editingCompany, industry: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-2xs"
              />
              {/* Gợi ý ngành nghề phổ biến 1-chạm */}
              <div className="flex flex-wrap gap-1 pt-0.5">
                {[
                  'Gia công & Sản xuất linh kiện vi mạch điện tử Apple',
                  'Lắp ráp Điện thoại thông minh & Thiết bị công nghệ cao',
                  'Sản xuất thiết bị âm thanh, tai nghe thông minh',
                  'May mặc & Thời trang xuất khẩu',
                  'Chế biến & Đóng gói thực phẩm sạch',
                  'Cơ khí chính xác & Chế tạo khuôn mẫu',
                  'Kho vận hậu cần & Giao nhận TMĐT',
                ].map((presetIndustry) => (
                  <button
                    key={presetIndustry}
                    type="button"
                    onClick={() => setEditingCompany({ ...editingCompany, industry: presetIndustry })}
                    className="text-[10px] bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 px-2 py-0.5 rounded-lg cursor-pointer transition-colors active:scale-95"
                  >
                    + {presetIndustry}
                  </button>
                ))}
              </div>
            </div>

            {/* CẤU HÌNH & CHỈNH SỬA LOGO CÔNG TY */}
            <div className="p-3.5 bg-gradient-to-br from-slate-50 to-blue-50/60 border border-blue-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-blue-950 flex items-center gap-1.5 uppercase tracking-wide">
                  <Camera className="w-3.5 h-3.5 text-blue-600" />
                  <span>Logo Công Ty Tuyển Dụng</span>
                </label>
                <span className="text-[10px] text-blue-800 bg-blue-100/90 font-bold px-2 py-0.5 rounded-full">
                  {editingCompany.imageUrl ? 'Đang dùng file ảnh' : 'Logo huy hiệu chữ'}
                </span>
              </div>

              {/* Live Preview */}
              <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center font-black text-base shadow-xs shrink-0 overflow-hidden border border-slate-200"
                  style={{
                    backgroundColor: editingCompany.imageUrl ? '#ffffff' : (editingCompany.logoBgColor || '#2563eb'),
                    color: editingCompany.logoTextColor || '#ffffff',
                  }}
                >
                  {editingCompany.imageUrl ? (
                    <img
                      src={editingCompany.imageUrl}
                      alt="Logo preview"
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    editingCompany.logoText || 'CTY'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-bold text-slate-800 block">Xem trước hiển thị thực tế</span>
                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                    {editingCompany.imageUrl
                      ? 'Ảnh logo sắc nét, căn giữa và đồng bộ toàn hệ thống.'
                      : `Huy hiệu màu ${editingCompany.logoBgColor || '#2563eb'} với chữ "${editingCompany.logoText || 'CTY'}"`}
                  </p>
                  {editingCompany.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setEditingCompany({ ...editingCompany, imageUrl: undefined })}
                      className="mt-1.5 text-[11px] text-red-600 hover:text-red-700 font-bold underline cursor-pointer"
                    >
                      Xóa ảnh, chuyển về logo chữ
                    </button>
                  )}
                </div>
              </div>

              {/* Tải lên file ảnh */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  1. Tải ảnh logo từ máy / điện thoại (.PNG, .JPG, .SVG, .WebP):
                </label>
                <label className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white border-2 border-dashed border-blue-400 hover:border-blue-600 hover:bg-blue-50/40 rounded-xl text-xs font-bold text-blue-700 cursor-pointer transition-all">
                  <Upload className="w-4 h-4 text-blue-600" />
                  <span>{editingCompany.imageUrl ? 'Chọn File Ảnh Khác Để Thay Thế' : 'Bấm Để Chọn File Ảnh Logo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        processLogoImageFile(file, (dataUrl) => {
                          setEditingCompany({ ...editingCompany, imageUrl: dataUrl });
                        });
                      }
                    }}
                  />
                </label>
              </div>

              {/* Hoặc nhập link ảnh trực tuyến */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  2. Hoặc dán link ảnh logo online (URL):
                </label>
                <div className="relative">
                  <input
                    type="url"
                    placeholder="https://example.com/logo-cong-ty.png"
                    value={editingCompany.imageUrl || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, imageUrl: e.target.value.trim() || undefined })}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                  <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              {/* Cấu hình chữ viết tắt & Màu nền khi không có ảnh */}
              <div className="pt-2 border-t border-blue-200/60 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Chữ viết tắt (khi không có ảnh):
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="SEV, FOX, LUX..."
                      value={editingCompany.logoText || ''}
                      onChange={(e) => setEditingCompany({ ...editingCompany, logoText: e.target.value.toUpperCase() })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Màu chữ:
                    </label>
                    <select
                      value={editingCompany.logoTextColor || '#FFFFFF'}
                      onChange={(e) => setEditingCompany({ ...editingCompany, logoTextColor: e.target.value })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                    >
                      <option value="#FFFFFF">Trắng (#FFFFFF)</option>
                      <option value="#000000">Đen (#000000)</option>
                      <option value="#FACC15">Vàng (#FACC15)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Màu nền nhận diện thương hiệu:</span>
                    <span className="font-mono text-[10px] text-slate-500">{editingCompany.logoBgColor || '#2563eb'}</span>
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {LOGO_COLOR_PRESETS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setEditingCompany({ ...editingCompany, logoBgColor: color.value })}
                        className={`w-6 h-6 rounded-lg border-2 transition-transform cursor-pointer ${
                          (editingCompany.logoBgColor || '#2563eb').toLowerCase() === color.value.toLowerCase()
                            ? 'scale-110 border-blue-900 shadow-sm'
                            : 'border-white hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                    <div className="relative inline-flex items-center">
                      <input
                        type="color"
                        value={editingCompany.logoBgColor || '#2563eb'}
                        onChange={(e) => setEditingCompany({ ...editingCompany, logoBgColor: e.target.value })}
                        className="w-7 h-7 rounded-lg cursor-pointer border border-slate-300 p-0.5"
                        title="Chọn màu tùy ý"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phân hệ việc làm:</label>
                <select
                  value={editingCompany.employmentType || 'pho_thong'}
                  onChange={(e) => setEditingCompany({ ...editingCompany, employmentType: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-bold"
                >
                  <option value="pho_thong">Phổ thông</option>
                  <option value="thoi_vu">Thời vụ</option>
                  <option value="hanh_chinh">Hành chính</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tỉnh / Thành phố:</label>
                <select
                  value={editingCompany.location}
                  onChange={(e) => setEditingCompany({ ...editingCompany, location: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold"
                >
                  <option value="Bắc Ninh">Bắc Ninh</option>
                  <option value="Bắc Giang">Bắc Giang</option>
                </select>
              </div>
            </div>

            {/* CHÍNH SÁCH ĐÃI NGỘ & HUY HIỆU NỔI BẬT (Ảnh 10.png) */}
            <div className="p-3.5 bg-gradient-to-br from-amber-50 to-orange-50/70 border border-amber-300/80 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-amber-950 flex items-center gap-1.5 uppercase tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Chính Sách Nổi Bật / Huy Hiệu Vàng (Thẻ Việc Làm)</span>
                </label>
                <span className="text-[10px] text-amber-900 bg-amber-200/80 font-bold px-2 py-0.5 rounded-full">
                  Badge hiển thị
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                Chính sách ưu đãi riêng của từng doanh nghiệp (hiển thị nổi bật trên thẻ việc làm như ảnh mẫu).
              </p>

              <div>
                <input
                  type="text"
                  placeholder="Ví dụ: Bao ăn ở 100% · Nhận việc trong ngày"
                  value={editingCompany.badge || ''}
                  onChange={(e) => setEditingCompany({ ...editingCompany, badge: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-amber-400 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                />
              </div>

              {/* Xem trước huy hiệu thực tế */}
              <div className="flex items-center gap-2 p-2 bg-white/90 border border-amber-200 rounded-xl">
                <span className="text-[10px] text-slate-500 font-bold shrink-0">Xem trước:</span>
                {editingCompany.badge ? (
                  <span className="bg-amber-50 text-amber-700 border border-amber-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
                    {editingCompany.badge}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">Chưa nhập chính sách nổi bật</span>
                )}
                {editingCompany.badge && (
                  <button
                    type="button"
                    onClick={() => setEditingCompany({ ...editingCompany, badge: '' })}
                    className="text-[10px] text-red-500 hover:text-red-700 font-bold underline ml-auto cursor-pointer"
                  >
                    Xóa chính sách
                  </button>
                )}
              </div>

              {/* Gợi ý chính sách nhanh để chọn 1 chạm */}
              <div>
                <span className="text-[10px] font-bold text-slate-600 block mb-1">
                  Gợi ý chính sách thông dụng (bấm để tự động điền):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Bao ăn ở 100% · Nhận việc trong ngày',
                    'Ký túc xá 5 sao & Tuyển trực tiếp',
                    'Hỗ trợ xe đưa đón & Thưởng chuyên cần cao',
                    'Phỏng vấn đi làm ngay · Không qua môi giới',
                    'Bao cơm ca miễn phí 100% · Nhận CCCD',
                    'Thưởng Tết cao · Đóng BHXH 100%',
                  ].map((presetText) => (
                    <button
                      key={presetText}
                      type="button"
                      onClick={() => setEditingCompany({ ...editingCompany, badge: presetText })}
                      className="text-[10px] bg-white hover:bg-amber-100 text-amber-900 border border-amber-300/90 px-2 py-1 rounded-lg font-medium cursor-pointer transition-all active:scale-95 shadow-2xs"
                    >
                      + {presetText}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Khu công nghiệp:</label>
                <input
                  type="text"
                  value={editingCompany.industrialPark}
                  onChange={(e) => setEditingCompany({ ...editingCompany, industrialPark: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mức thu nhập:</label>
                <input
                  type="text"
                  value={editingCompany.salaryRange}
                  onChange={(e) => setEditingCompany({ ...editingCompany, salaryRange: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-red-600"
                />
              </div>
            </div>

            {/* ĐƯỜNG DẪN GOOGLE MAPS (MAPS URL) */}
            <div className="p-3.5 bg-gradient-to-br from-emerald-50/70 via-slate-50 to-teal-50/70 border border-emerald-300 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-emerald-950 flex items-center gap-1.5 uppercase tracking-wide">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>Đường dẫn Google Maps (Maps URL)</span>
                </label>
                <span className="text-[10px] text-emerald-800 bg-emerald-100 font-bold px-2 py-0.5 rounded-full shrink-0">
                  {editingCompany.mapsUrl?.trim() ? 'Đã nhập link' : 'Tự động tìm kiếm'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                Dán trực tiếp link bản đồ chính xác vào hệ thống (giúp xử lý các công ty mới mở hoặc chưa xuất hiện chuẩn trên Google).
              </p>
              <div>
                <input
                  type="url"
                  placeholder="Ví dụ: https://maps.app.goo.gl/... hoặc https://www.google.com/maps/..."
                  value={editingCompany.mapsUrl || ''}
                  onChange={(e) => setEditingCompany({ ...editingCompany, mapsUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-emerald-400 rounded-xl text-xs text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                />
              </div>

              {/* Ghi chú & Nút kiểm tra mở thử */}
              <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px]">
                {editingCompany.mapsUrl?.trim() ? (
                  <>
                    <span className="text-emerald-700 font-medium flex items-center gap-1 truncate">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">Hệ thống sẽ ưu tiên mở chính xác link này cho ứng viên</span>
                    </span>
                    <a
                      href={editingCompany.mapsUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shrink-0 flex items-center gap-1 shadow-2xs"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Thử mở link</span>
                    </a>
                  </>
                ) : (
                  <span className="text-slate-500 italic text-[10px]">
                    💡 Nếu để trống, khi ứng viên bấm &apos;Chỉ đường Google Maps&apos;, hệ thống sẽ tự động tìm kiếm theo tên và địa chỉ công ty.
                  </span>
                )}
              </div>
            </div>

            {/* MÔ TẢ CÔNG VIỆC CHI TIẾT (Hiển thị khi ấn vào công ty) */}
            <div className="p-3.5 bg-gradient-to-br from-indigo-50/60 via-slate-50 to-blue-50/60 border border-indigo-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-black text-indigo-950 flex items-center gap-1.5 uppercase tracking-wide">
                    <ClipboardList className="w-4 h-4 text-indigo-600" />
                    <span>Mô Tả Công Việc Chi Tiết (Khi ấn vào công ty)</span>
                  </label>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Nội dung công việc thực tế, thao tác hàng ngày, môi trường làm việc để người lao động đọc khi xem chi tiết.
                  </p>
                </div>
                <span className="text-[10px] text-indigo-800 bg-indigo-100 font-bold px-2 py-0.5 rounded-full shrink-0">
                  Mô tả tuyển dụng
                </span>
              </div>

              <div>
                <textarea
                  rows={5}
                  placeholder={`Nhập các gạch đầu dòng mô tả công việc (ví dụ:
• Thao tác lắp ráp linh kiện điện tử trong phòng sạch có máy lạnh mát mẻ.
• Kiểm tra ngoại quan sản phẩm (mắt thường hoặc kính lúp), dán tem nhãn mác.
• Đóng gói thành phẩm vào thùng carton chuyển sang kho.
• Không yêu cầu kinh nghiệm, công việc nhẹ nhàng ngồi ghế, được đào tạo tận tình từ đầu.)`}
                  value={editingCompany.jobDescription || ''}
                  onChange={(e) => setEditingCompany({ ...editingCompany, jobDescription: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-xl text-xs text-slate-900 leading-relaxed placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs font-normal"
                />
              </div>

              {/* Xem trước thực tế */}
              <div className="p-2.5 bg-white rounded-xl border border-indigo-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Xem trước hiển thị với người lao động:</span>
                  {editingCompany.jobDescription && (
                    <button
                      type="button"
                      onClick={() => setEditingCompany({ ...editingCompany, jobDescription: '' })}
                      className="text-[10px] text-red-500 hover:text-red-700 font-bold underline cursor-pointer"
                    >
                      Xóa nội dung
                    </button>
                  )}
                </div>
                <div className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-2 rounded-lg border border-slate-100">
                  {editingCompany.jobDescription || (
                    <span className="text-slate-400 italic">
                      Chưa có mô tả riêng (hệ thống sẽ hiển thị mô tả mẫu chuẩn tự động).
                    </span>
                  )}
                </div>
              </div>

              {/* Mẫu mô tả gợi ý 1-chạm theo ngành nghề */}
              <div>
                <span className="text-[10px] font-bold text-slate-600 block mb-1">
                  Mẫu mô tả công việc soạn sẵn (bấm để áp dụng nhanh):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    {
                      name: 'Điện tử (Samsung, Foxconn...)',
                      text: `• Thao tác lắp ráp linh kiện điện thoại, tai nghe và bo mạch trong phòng sạch máy lạnh điều hòa.
• Kiểm tra ngoại quan sản phẩm, dán tem nhãn mác và đóng gói vào hộp thành phẩm.
• Được đào tạo tay nghề miễn phí 100% từ ngày đầu, công việc nhẹ nhàng ngồi ghế mát mẻ, không nặng nhọc.`,
                    },
                    {
                      name: 'May mặc / Giày da',
                      text: `• Vận hành máy may 1 kim, vắt sổ hoặc kiểm hàng thành phẩm theo chuyền may.
• Cắt chỉ thừa, gấp xếp quần áo vào túi nilon bao bì và đóng thùng carton xuất khẩu.
• Môi trường xưởng rộng rãi, quạt gió làm mát công nghiệp, có thợ may lành nghề kèm cặp.`,
                    },
                    {
                      name: 'Cơ khí / Vận hành máy',
                      text: `• Đứng máy dập, máy tiện CNC đơn giản hoặc gá phôi sản phẩm vào khuôn tự động.
• Đo kiểm kích thước chi tiết bằng thước kẹp theo bảng hướng dẫn kỹ thuật.
• Trang bị đầy đủ bảo hộ lao động: găng tay chống cắt, kính bảo hộ, giày mũi sắt miễn phí.`,
                    },
                    {
                      name: 'Kho vận / Đóng gói bưu kiện',
                      text: `• Nhận đơn hàng, phân loại và đóng gói bưu kiện, dán mã vận đơn barcode.
• Sắp xếp hàng hóa lên giá kệ kho bằng xe đẩy tay hoặc xe kéo tiện lợi.
• Môi trường kho hiện đại, năng động, kiểm đếm hàng chính xác bằng máy quét cầm tay.`,
                    },
                    {
                      name: 'Chế biến thực phẩm',
                      text: `• Tham gia các công đoạn sơ chế, đóng hộp, dán nhãn bao bì thực phẩm sạch theo dây chuyền.
• Đảm bảo vệ sinh an toàn thực phẩm, cấp phát đồng phục bảo hộ tiệt trùng miễn phí.
• Công việc ổn định quanh năm, nhận việc ngay sau khi nộp CCCD.`,
                    },
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setEditingCompany({ ...editingCompany, jobDescription: preset.text })}
                      className="text-[10px] bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-200 px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-all active:scale-95 shadow-2xs"
                    >
                      + Mẫu {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 1. CHÍNH SÁCH LƯƠNG CƠ BẢN, CHUYÊN CẦN & CA KÍP & HỢP ĐỒNG */}
            <div className="p-3.5 bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>1. Chính Sách Lương, Thưởng & Ca Kíp</span>
                </span>
                <span className="text-[10px] text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded-full">
                  Lương & Quy Định
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Lương cơ bản:
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 5.800.000 đ/tháng"
                    value={editingCompany.basicSalary || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, basicSalary: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Thưởng chuyên cần:
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 1.000.000 đ/tháng"
                    value={editingCompany.attendanceBonus || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, attendanceBonus: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Chính sách ca làm việc & Tăng ca:</span>
                  <span className="text-[10px] text-slate-400 font-normal">Ca kíp nhà máy</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Làm 2 ca 3 kíp, xoay ca 1 tuần/lần, tăng ca 2-4h/ngày (hưởng 150%-200% lương)"
                  value={editingCompany.workShiftInfo || ''}
                  onChange={(e) => setEditingCompany({ ...editingCompany, workShiftInfo: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900"
                />
                <div className="flex flex-wrap gap-1 mt-1">
                  {[
                    '2 ca ngày/đêm (08:00 - 17:00 & 20:00 - 05:00), tăng ca 2-4h',
                    'Hành chính 8h/ngày, nghỉ 4 ngày Chủ nhật',
                    '3 ca 4 kíp, nghỉ luân phiên 2 ngày/tuần',
                  ].map((presetShift) => (
                    <button
                      key={presetShift}
                      type="button"
                      onClick={() => setEditingCompany({ ...editingCompany, workShiftInfo: presetShift })}
                      className="text-[9px] bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 px-2 py-0.5 rounded cursor-pointer transition-colors"
                    >
                      + {presetShift}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Loại hợp đồng & Thử việc:
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: HĐLĐ chính thức, thử việc 100% lương"
                    value={editingCompany.contractType || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, contractType: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Yêu cầu bằng cấp:
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Không yêu cầu bằng cấp"
                    value={editingCompany.educationReq || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, educationReq: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* 2. CHÍNH SÁCH ĂN Ở & XE ĐƯA ĐÓN */}
            <div className="p-3.5 bg-gradient-to-br from-slate-50 to-emerald-50/30 border border-slate-200 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                  <span>2. Chính Sách Ăn Ở & Xe Đưa Đón</span>
                </span>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                  Phúc Lợi Đời Sống
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Chính sách Ký túc xá (KTX):
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: KTX miễn phí 100% có điều hòa, bình nóng lạnh, máy giặt, wifi tốc độ cao"
                  value={editingCompany.dormitoryInfo || ''}
                  onChange={(e) => setEditingCompany({ ...editingCompany, dormitoryInfo: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Chính sách Cơm ca:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Bao cơm ca miễn phí 100% tại canteen (trưa + tăng ca cấp thêm suất ăn nhẹ)"
                  value={editingCompany.mealInfo || ''}
                  onChange={(e) => setEditingCompany({ ...editingCompany, mealInfo: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Chính sách Xe đưa đón công nhân:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Có xe đưa đón miễn phí các tuyến huyện Bắc Ninh, Bắc Giang, Lạng Sơn"
                  value={editingCompany.transportationInfo || ''}
                  onChange={(e) => setEditingCompany({ ...editingCompany, transportationInfo: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>
            </div>

            {/* CHƯƠNG TRÌNH THƯỞNG NỔI BẬT (LINH HOẠT 1 ĐẾN 5+ THÁNG - KHÔNG GIỚI HẠN) */}
            <div className="p-3.5 bg-gradient-to-br from-amber-50/90 via-orange-50/60 to-yellow-50/90 border-2 border-amber-300 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      <span>Chương Trình Thưởng Nổi Bật</span>
                      <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded text-[10px] font-black">
                        Hỗ trợ 5 tháng & tùy biến
                      </span>
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      Cài đặt linh hoạt 3 tháng, 5 tháng hoặc số tháng bất kỳ theo chính sách từng công ty
                    </p>
                  </div>
                </div>

                {/* Nút bật/tắt chương trình thưởng */}
                <label className="inline-flex items-center gap-1.5 cursor-pointer bg-white px-2.5 py-1 rounded-xl border border-amber-300 shadow-2xs">
                  <input
                    type="checkbox"
                    checked={Boolean(editingCompany.bonusProgram?.enabled)}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      const current = editingCompany.bonusProgram || {
                        enabled: true,
                        title: 'CHƯƠNG TRÌNH THƯỞNG NỔI BẬT (5 THÁNG)',
                        totalBonusText: '15.000.000 đ',
                        months: [
                          { month: 1, companyBonus: '2.000.000 đ', supplierBonus: '2.000.000 đ', note: 'Thưởng gia nhập & đi làm ngay' },
                          { month: 2, companyBonus: '2.000.000 đ', supplierBonus: '1.000.000 đ', note: 'Thưởng duy trì chuyên cần tháng 2' },
                          { month: 3, companyBonus: '2.000.000 đ', supplierBonus: '1.000.000 đ', note: 'Thưởng hoàn thành 3 tháng làm việc' },
                          { month: 4, companyBonus: '2.000.000 đ', supplierBonus: '1.000.000 đ', note: 'Thưởng gắn bó tháng 4' },
                          { month: 5, companyBonus: '2.000.000 đ', supplierBonus: '1.000.000 đ', note: 'Thưởng gắn bó tháng 5' },
                        ],
                        conditionNote: 'Tổng thưởng trong 5 tháng sẽ nhận được toàn bộ số tiền thưởng đó (15.000.000 đ). Tiền thưởng được tính gộp chi trả theo từng tháng cùng kỳ lương khi người lao động đi làm đủ chuyên cần.',
                      };
                      setEditingCompany({
                        ...editingCompany,
                        bonusProgram: { ...current, enabled },
                      });
                    }}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-xs font-bold text-amber-950">
                    {editingCompany.bonusProgram?.enabled ? 'Đang bật thưởng' : 'Tắt chương trình'}
                  </span>
                </label>
              </div>

              {editingCompany.bonusProgram?.enabled && (() => {
                const program = editingCompany.bonusProgram!;
                const monthsList = program.months || [];
                const currentMonthCount = monthsList.length;

                // Hàm phân tích tiền sang số nguyên
                const parseNum = (str?: string) => {
                  if (!str) return 0;
                  const num = parseInt(str.replace(/[^\d]/g, ''), 10);
                  if (isNaN(num)) return 0;
                  if (num < 100) return num * 1000000;
                  return num;
                };

                // Tính tổng cộng
                let sumCompany = 0;
                let sumSupplier = 0;
                monthsList.forEach((m) => {
                  sumCompany += parseNum(m.companyBonus);
                  sumSupplier += parseNum(m.supplierBonus);
                });
                const totalCalculated = sumCompany + sumSupplier;

                // Hàm chuyển đổi số tháng nhanh (1..12 tháng)
                const setMonthCount = (targetCount: number) => {
                  if (targetCount < 1) return;
                  let newMonths = [...monthsList];
                  if (targetCount > newMonths.length) {
                    for (let i = newMonths.length + 1; i <= targetCount; i++) {
                      newMonths.push({
                        month: i,
                        companyBonus: '2.000.000 đ',
                        supplierBonus: i === 1 ? '2.000.000 đ' : '1.000.000 đ',
                        note: i === 1 ? 'Thưởng gia nhập & đi làm ngay' : `Thưởng chuyên cần tháng ${i}`,
                      });
                    }
                  } else if (targetCount < newMonths.length) {
                    newMonths = newMonths.slice(0, targetCount);
                  }

                  let newSum = 0;
                  newMonths.forEach((m) => {
                    newSum += parseNum(m.companyBonus) + parseNum(m.supplierBonus);
                  });
                  const formattedTotal = newSum > 0 ? `${newSum.toLocaleString('vi-VN')} đ` : `${targetCount * 3}.000.000 đ`;

                  setEditingCompany({
                    ...editingCompany,
                    bonusProgram: {
                      ...program,
                      months: newMonths,
                      title: `CHƯƠNG TRÌNH THƯỞNG NỔI BẬT (${targetCount} THÁNG)`,
                      totalBonusText: formattedTotal,
                      conditionNote: `Tổng thưởng trong ${targetCount} tháng sẽ nhận được toàn bộ số tiền thưởng đó (${formattedTotal}). Tiền thưởng được tính gộp chi trả theo từng tháng cùng kỳ lương khi người lao động đi làm đủ chuyên cần.`,
                    },
                  });
                };

                return (
                  <div className="space-y-3 pt-1 border-t border-amber-200/80">
                    {/* BỘ CHỌN SỐ THÁNG NHANH (1-CLICK SWITCHER) */}
                    <div className="p-3 bg-white/90 rounded-xl border border-amber-300 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <div className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                            <span>⚡ Chọn số tháng áp dụng thưởng:</span>
                            <span className="px-2 py-0.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-md text-xs font-black shadow-2xs">
                              {currentMonthCount} THÁNG
                            </span>
                          </div>
                          <p className="text-[10px] text-amber-800 mt-0.5">
                            Hệ thống tự động sinh số tháng và phân bổ tiền thưởng chuẩn (bấm 5 tháng hoặc tùy biến)
                          </p>
                        </div>

                        {/* Nút tăng giảm số tháng thủ công */}
                        <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                          <span className="text-[10px] font-bold text-amber-900 mr-1">Tùy biến:</span>
                          <button
                            type="button"
                            onClick={() => setMonthCount(Math.max(1, currentMonthCount - 1))}
                            disabled={currentMonthCount <= 1}
                            className="w-6 h-6 rounded bg-white hover:bg-amber-100 disabled:opacity-40 text-amber-900 font-black text-xs border border-amber-300 flex items-center justify-center cursor-pointer"
                            title="Giảm 1 tháng"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-xs font-black text-slate-800">
                            {currentMonthCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => setMonthCount(currentMonthCount + 1)}
                            className="w-6 h-6 rounded bg-amber-600 hover:bg-amber-700 text-white font-black text-xs flex items-center justify-center cursor-pointer shadow-2xs"
                            title="Tăng thêm 1 tháng"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Các nút bấm chọn số tháng nhanh */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-amber-100">
                        <span className="text-[10px] font-bold text-slate-500">Chọn nhanh:</span>
                        {[
                          { count: 5, label: '⭐ Chuẩn 5 Tháng (15 Triệu)', isBest: true },
                          { count: 3, label: '3 Tháng (10 Triệu)', isBest: false },
                          { count: 4, label: '4 Tháng (12 Triệu)', isBest: false },
                          { count: 6, label: '6 Tháng (18 Triệu)', isBest: false },
                        ].map((opt) => (
                          <button
                            key={opt.count}
                            type="button"
                            onClick={() => setMonthCount(opt.count)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              currentMonthCount === opt.count
                                ? 'bg-amber-600 text-white shadow-xs scale-105 ring-2 ring-amber-400'
                                : opt.isBest
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 font-extrabold'
                                : 'bg-white hover:bg-amber-50 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* TIÊU ĐỀ & TỔNG GÓI THƯỞNG */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Tiêu đề hiển thị chương trình:
                        </label>
                        <input
                          type="text"
                          value={program.title || ''}
                          onChange={(e) => {
                            setEditingCompany({
                              ...editingCompany,
                              bonusProgram: {
                                ...program,
                                title: e.target.value,
                              },
                            });
                          }}
                          placeholder={`Ví dụ: CHƯƠNG TRÌNH THƯỞNG NỔI BẬT (${currentMonthCount} THÁNG)`}
                          className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-xl text-xs text-slate-900 font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                          <span>Tổng gói thưởng hiển thị:</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (totalCalculated > 0) {
                                setEditingCompany({
                                  ...editingCompany,
                                  bonusProgram: {
                                    ...program,
                                    totalBonusText: `${totalCalculated.toLocaleString('vi-VN')} đ`,
                                  },
                                });
                              }
                            }}
                            className="text-[10px] text-blue-700 hover:underline font-bold cursor-pointer"
                          >
                            ⚡ Áp dụng tổng tính được ({totalCalculated.toLocaleString('vi-VN')} đ)
                          </button>
                        </label>
                        <input
                          type="text"
                          value={program.totalBonusText || ''}
                          onChange={(e) => {
                            setEditingCompany({
                              ...editingCompany,
                              bonusProgram: {
                                ...program,
                                totalBonusText: e.target.value,
                              },
                            });
                          }}
                          placeholder="Ví dụ: 15.000.000 đ"
                          className="w-full px-2.5 py-1.5 bg-white border border-amber-400 rounded-xl text-xs text-red-600 font-black"
                        />
                      </div>
                    </div>

                    {/* BẢNG TỔNG KẾT PHÂN BỔ THƯỞNG (Live Breakdown) */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 bg-white/90 rounded-xl border border-amber-200 text-xs">
                      <div className="bg-blue-50/70 p-2 rounded-lg border border-blue-200">
                        <span className="text-[10px] text-blue-700 font-bold block">Tổng Công ty ({currentMonthCount} tháng):</span>
                        <span className="text-xs font-black text-blue-800">{sumCompany.toLocaleString('vi-VN')} đ</span>
                      </div>
                      <div className="bg-amber-50/70 p-2 rounded-lg border border-amber-300">
                        <span className="text-[10px] text-red-700 font-bold block">Tổng ZôMAN ({currentMonthCount} tháng):</span>
                        <span className="text-xs font-black text-red-600">{sumSupplier.toLocaleString('vi-VN')} đ</span>
                      </div>
                      <div className="bg-gradient-to-r from-red-600 to-amber-600 text-white p-2 rounded-lg text-center flex flex-col justify-center shadow-2xs">
                        <span className="text-[10px] font-bold text-amber-100 uppercase">Toàn bộ gói ({currentMonthCount} tháng)</span>
                        <span className="text-xs font-black">{totalCalculated.toLocaleString('vi-VN')} đ</span>
                      </div>
                    </div>

                    {/* DANH SÁCH CHI TIẾT TỪNG THÁNG */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5">
                          <span>Chi tiết phân bổ thưởng ({currentMonthCount} tháng):</span>
                          <span className="text-[10px] text-amber-800 font-normal">
                            (Tháng 1 đến Tháng {currentMonthCount})
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setMonthCount(currentMonthCount + 1)}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Thêm Tháng {currentMonthCount + 1}</span>
                        </button>
                      </div>

                      {monthsList.map((m, idx) => {
                        const cNum = parseNum(m.companyBonus);
                        const sNum = parseNum(m.supplierBonus);
                        const mTotal = cNum + sNum;

                        return (
                          <div
                            key={idx}
                            className="p-2.5 bg-white rounded-xl border border-amber-200/80 shadow-2xs space-y-2 relative"
                          >
                            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                              <div className="flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-md bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                                  {m.month}
                                </span>
                                <span className="text-xs font-black text-amber-900">
                                  Tháng {m.month} đi làm
                                </span>
                                {mTotal > 0 && (
                                  <span className="text-[10px] font-black text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded">
                                    Tổng: {mTotal.toLocaleString('vi-VN')} đ
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  placeholder="Ghi chú tháng này (ví dụ: Thưởng nhận việc ngay)"
                                  value={m.note || ''}
                                  onChange={(e) => {
                                    const months = [...monthsList];
                                    months[idx] = { ...months[idx], note: e.target.value };
                                    setEditingCompany({
                                      ...editingCompany,
                                      bonusProgram: {
                                        ...program,
                                        months,
                                      },
                                    });
                                  }}
                                  className="text-[10px] px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 w-36 sm:w-52 text-right"
                                />
                                {monthsList.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = monthsList
                                        .filter((_, i) => i !== idx)
                                        .map((item, newIdx) => ({ ...item, month: newIdx + 1 }));
                                      setEditingCompany({
                                        ...editingCompany,
                                        bonusProgram: {
                                          ...program,
                                          months: updated,
                                          title: `CHƯƠNG TRÌNH THƯỞNG NỔI BẬT (${updated.length} THÁNG)`,
                                        },
                                      });
                                    }}
                                    className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer transition-colors"
                                    title="Xóa tháng này"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {/* Công ty thưởng */}
                              <div>
                                <label className="block text-[10px] font-bold text-blue-900 mb-0.5 flex items-center justify-between">
                                  <span className="flex items-center gap-1">
                                    <Building2 className="w-3 h-3 text-blue-600" />
                                    <span>Công ty thưởng:</span>
                                  </span>
                                  <span className="text-[9px] text-blue-600 font-normal">
                                    (Ví dụ: 2.000.000 đ)
                                  </span>
                                </label>
                                <input
                                  type="text"
                                  value={m.companyBonus}
                                  onChange={(e) => {
                                    const months = [...monthsList];
                                    months[idx] = { ...months[idx], companyBonus: e.target.value };
                                    setEditingCompany({
                                      ...editingCompany,
                                      bonusProgram: {
                                        ...program,
                                        months,
                                      },
                                    });
                                  }}
                                  placeholder="2.000.000 đ"
                                  className="w-full px-2 py-1 bg-blue-50/50 border border-blue-200 rounded-lg text-xs font-bold text-blue-800"
                                />
                              </div>

                              {/* Nhà cung ứng ZôMAN thưởng */}
                              <div>
                                <label className="block text-[10px] font-bold text-amber-950 mb-0.5 flex items-center justify-between">
                                  <span className="flex items-center gap-1">
                                    <Gift className="w-3 h-3 text-red-600" />
                                    <span>ZôMAN thưởng:</span>
                                  </span>
                                  <span className="text-[9px] text-red-600 font-normal">
                                    (Ví dụ: 1.000.000 đ)
                                  </span>
                                </label>
                                <input
                                  type="text"
                                  value={m.supplierBonus}
                                  onChange={(e) => {
                                    const months = [...monthsList];
                                    months[idx] = { ...months[idx], supplierBonus: e.target.value };
                                    setEditingCompany({
                                      ...editingCompany,
                                      bonusProgram: {
                                        ...program,
                                        months,
                                      },
                                    });
                                  }}
                                  placeholder="1.000.000 đ"
                                  className="w-full px-2 py-1 bg-amber-50/50 border border-amber-300 rounded-lg text-xs font-black text-red-600"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Nút bấm to ở dưới để thêm tiếp tháng */}
                      <button
                        type="button"
                        onClick={() => setMonthCount(currentMonthCount + 1)}
                        className="w-full py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-dashed border-amber-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Thêm Tháng {currentMonthCount + 1} (Không giới hạn số tháng, hỗ trợ 5, 6, 7+ tháng tùy ý)</span>
                      </button>
                    </div>

                    {/* Cơ chế & Điều kiện nhận thưởng */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-700">
                          Cơ chế & Điều kiện nhận toàn bộ thưởng:
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const formatted = totalCalculated > 0 ? `${totalCalculated.toLocaleString('vi-VN')} đ` : `${currentMonthCount * 3}.000.000 đ`;
                            setEditingCompany({
                              ...editingCompany,
                              bonusProgram: {
                                ...program,
                                conditionNote: `Tổng thưởng trong ${currentMonthCount} tháng sẽ nhận được toàn bộ số tiền thưởng đó (${formatted}). Tiền thưởng được tính gộp chi trả theo từng tháng cùng kỳ lương khi người lao động đi làm đủ chuyên cần.`,
                              },
                            });
                          }}
                          className="text-[10px] text-blue-700 hover:underline font-bold cursor-pointer"
                        >
                          ⚡ Tự điền nội dung chuẩn cho {currentMonthCount} tháng
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={program.conditionNote || ''}
                        onChange={(e) => {
                          setEditingCompany({
                            ...editingCompany,
                            bonusProgram: {
                              ...program,
                              conditionNote: e.target.value,
                            },
                          });
                        }}
                        placeholder={`Ví dụ: Tổng thưởng trong ${currentMonthCount} tháng sẽ nhận được toàn bộ số tiền thưởng đó. Tiền thưởng được tính gộp chi trả theo từng tháng cùng kỳ lương khi người lao động đi làm đủ chuyên cần.`}
                        className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-xl text-xs text-slate-900 leading-relaxed placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 3. QUẢN LÝ DANH SÁCH CÁC KHOẢN PHỤ CẤP & TRỢ CẤP (Allowances) */}
            <div className="p-3.5 bg-gradient-to-br from-slate-50 to-amber-50/30 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                    <span>3. Các Khoản PhỤ Cấp & Trợ Cấp ({editingCompany.allowances?.length || 0})</span>
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Tùy biến từng khoản phụ cấp riêng biệt cho công ty này
                  </p>
                </div>
              </div>

              {/* Danh sách phụ cấp hiện tại */}
              <div className="space-y-1.5">
                {(editingCompany.allowances || []).map((al, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-[10px] shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-800 truncate">{al.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-slate-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                        {al.amount}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const list = [...(editingCompany.allowances || [])];
                          list.splice(idx, 1);
                          setEditingCompany({ ...editingCompany, allowances: list });
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer transition-colors"
                        title="Xóa phụ cấp này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {(!editingCompany.allowances || editingCompany.allowances.length === 0) && (
                  <p className="text-xs text-slate-400 italic py-1">Chưa có phụ cấp nào. Vui lòng thêm bên dưới.</p>
                )}
              </div>

              {/* Thêm mới phụ cấp */}
              <div className="p-2.5 bg-white rounded-xl border border-dashed border-amber-300 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">Thêm khoản phụ cấp mới:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Tên phụ cấp (vd: Tiền nhà ở)"
                    value={newAllowanceTitle}
                    onChange={(e) => setNewAllowanceTitle(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Mức tiền (vd: 500.000 đ/tháng)"
                    value={newAllowanceAmount}
                    onChange={(e) => setNewAllowanceAmount(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!newAllowanceTitle.trim()) return;
                    const list = [...(editingCompany.allowances || [])];
                    list.push({
                      title: newAllowanceTitle.trim(),
                      amount: newAllowanceAmount.trim() || 'Thỏa thuận',
                    });
                    setEditingCompany({ ...editingCompany, allowances: list });
                    setNewAllowanceTitle('');
                    setNewAllowanceAmount('');
                  }}
                  className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  + Thêm Khoản Phụ Cấp Này
                </button>
              </div>

              {/* Gợi ý phụ cấp nhanh */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 block mb-1">Gợi ý phụ cấp thông dụng (bấm để thêm ngay):</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { title: 'Tiền nhà ở', amount: '500.000 đ/tháng' },
                    { title: 'Tiền xăng xe / Đi lại', amount: '400.000 đ/tháng' },
                    { title: 'Phụ cấp chuyên cần', amount: '1.000.000 đ/tháng' },
                    { title: 'Phụ cấp ca đêm', amount: '30% - 50% lương' },
                    { title: 'Phụ cấp thâm niên', amount: '200.000 - 500.000 đ' },
                    { title: 'Trợ cấp nuôi con nhỏ', amount: '100.000 đ/cháu' },
                    { title: 'Phụ cấp độc hại / Phòng sạch', amount: '300.000 đ/tháng' },
                  ].map((preset) => (
                    <button
                      key={preset.title}
                      type="button"
                      onClick={() => {
                        const list = [...(editingCompany.allowances || [])];
                        list.push(preset);
                        setEditingCompany({ ...editingCompany, allowances: list });
                      }}
                      className="text-[10px] bg-white hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-200 px-2 py-0.5 rounded-lg cursor-pointer transition-all active:scale-95 shadow-2xs"
                    >
                      + {preset.title} ({preset.amount})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. QUẢN LÝ CHẾ ĐỘ ĐÃI NGỘ & PHÚC LỢI (Benefits) */}
            <div className="p-3.5 bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>4. Chế Độ Đãi Ngộ & Quyền Lợi ({editingCompany.benefits?.length || 0})</span>
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Các chính sách bảo hiểm, thưởng tết, sinh hoạt riêng của công ty
                  </p>
                </div>
              </div>

              {/* Danh sách đãi ngộ hiện tại */}
              <div className="space-y-1.5">
                {(editingCompany.benefits || []).map((bf, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-2 p-2 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs"
                  >
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-slate-800">{bf.title}</div>
                        <div className="text-[11px] text-slate-500">{bf.description}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const list = [...(editingCompany.benefits || [])];
                        list.splice(idx, 1);
                        setEditingCompany({ ...editingCompany, benefits: list });
                      }}
                      className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer transition-colors shrink-0"
                      title="Xóa quyền lợi này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {(!editingCompany.benefits || editingCompany.benefits.length === 0) && (
                  <p className="text-xs text-slate-400 italic py-1">Chưa có quyền lợi nào. Vui lòng thêm bên dưới.</p>
                )}
              </div>

              {/* Thêm mới đãi ngộ */}
              <div className="p-2.5 bg-white rounded-xl border border-dashed border-blue-300 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">Thêm chính sách đãi ngộ mới:</span>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    placeholder="Tiêu đề quyền lợi (vd: Đóng BHXH đầy đủ)"
                    value={newBenefitTitle}
                    onChange={(e) => setNewBenefitTitle(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                  <input
                    type="text"
                    placeholder="Mô tả chi tiết (vd: Đóng BHXH, BHYT, BHTN 100% theo luật lao động)"
                    value={newBenefitDesc}
                    onChange={(e) => setNewBenefitDesc(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!newBenefitTitle.trim()) return;
                    const list = [...(editingCompany.benefits || [])];
                    list.push({
                      icon: 'CheckCircle2',
                      title: newBenefitTitle.trim(),
                      description: newBenefitDesc.trim() || 'Hưởng đầy đủ theo quy chế công ty',
                    });
                    setEditingCompany({ ...editingCompany, benefits: list });
                    setNewBenefitTitle('');
                    setNewBenefitDesc('');
                  }}
                  className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  + Thêm Chế Độ Đãi Ngộ Này
                </button>
              </div>

              {/* Gợi ý đãi ngộ nhanh */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 block mb-1">Gợi ý đãi ngộ phổ biến (bấm để thêm ngay):</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { title: 'Bảo hiểm XH đầy đủ', description: 'Đóng BHXH, BHYT, BHTN theo luật sau thời gian thử việc' },
                    { title: 'Ký túc xá miễn phí', description: 'Trang bị điều hòa, nóng lạnh, máy giặt, phòng tắm riêng' },
                    { title: 'Bao cơm ca 100%', description: 'Miễn phí cơm trưa tại căng tin sạch sẽ và suất ăn tăng ca' },
                    { title: 'Thưởng Tết & Tháng 13', description: 'Thưởng tết cao và xét tăng lương định kỳ hàng năm' },
                    { title: 'Xe đưa đón công nhân', description: 'Tuyến xe buýt công ty đưa đón miễn phí khắp các huyện' },
                    { title: 'Quà sinh nhật & Lễ tết', description: 'Tặng quà các dịp sinh nhật, 1/5, 2/9, Trung thu...' },
                  ].map((preset) => (
                    <button
                      key={preset.title}
                      type="button"
                      onClick={() => {
                        const list = [...(editingCompany.benefits || [])];
                        list.push({ icon: 'CheckCircle2', ...preset });
                        setEditingCompany({ ...editingCompany, benefits: list });
                      }}
                      className="text-[10px] bg-white hover:bg-blue-100 text-slate-700 hover:text-blue-900 border border-slate-200 px-2 py-0.5 rounded-lg cursor-pointer transition-all active:scale-95 shadow-2xs"
                    >
                      + {preset.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 5. QUẢN LÝ VỊ TRÍ TUYỂN DỤNG & CHỈ TIÊU (Positions) */}
            <div className="p-3.5 bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>5. Vị Trí Đang Tuyển Dụng ({editingCompany.positions?.length || 0})</span>
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Các vị trí công việc mà ứng viên có thể bấm chọn nộp hồ sơ
                  </p>
                </div>
              </div>

              {/* Danh sách vị trí hiện tại */}
              <div className="space-y-1.5">
                {(editingCompany.positions || []).map((pos, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800">{pos.title}</div>
                      <div className="text-[11px] text-slate-500">
                        Chỉ tiêu: <span className="font-bold text-slate-700">{pos.vacancies || 10} người</span> · Lương:{' '}
                        <span className="font-bold text-red-600">{pos.salary}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const list = [...(editingCompany.positions || [])];
                        list.splice(idx, 1);
                        setEditingCompany({ ...editingCompany, positions: list });
                      }}
                      className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer transition-colors shrink-0"
                      title="Xóa vị trí này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {(!editingCompany.positions || editingCompany.positions.length === 0) && (
                  <p className="text-xs text-slate-400 italic py-1">Chưa có vị trí tuyển dụng. Vui lòng thêm bên dưới.</p>
                )}
              </div>

              {/* Thêm mới vị trí */}
              <div className="p-2.5 bg-white rounded-xl border border-dashed border-indigo-300 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">Thêm vị trí tuyển dụng mới:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-1">
                    <input
                      type="text"
                      placeholder="Tên vị trí (vd: Công nhân lắp ráp)"
                      value={newPositionTitle}
                      onChange={(e) => setNewPositionTitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Chỉ tiêu (số người)"
                      value={newPositionVacancies || ''}
                      onChange={(e) => setNewPositionVacancies(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Mức lương (vd: 9 - 13 triệu)"
                      value={newPositionSalary}
                      onChange={(e) => setNewPositionSalary(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!newPositionTitle.trim()) return;
                    const list = [...(editingCompany.positions || [])];
                    list.push({
                      title: newPositionTitle.trim(),
                      vacancies: Number(newPositionVacancies) || 10,
                      salary: newPositionSalary.trim() || editingCompany.salaryRange || '9.000.000 - 13.000.000 đ',
                      requirements: [],
                      description: [],
                    });
                    setEditingCompany({ ...editingCompany, positions: list });
                    setNewPositionTitle('');
                    setNewPositionVacancies(50);
                    setNewPositionSalary('');
                  }}
                  className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  + Thêm Vị Trí Tuyển Dụng Này
                </button>
              </div>

              {/* Gợi ý vị trí nhanh */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 block mb-1">Gợi ý vị trí phổ biến (bấm để thêm ngay):</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { title: 'Công nhân sản xuất / Lắp ráp', vacancies: 100, salary: editingCompany.salaryRange || '9 - 13 triệu' },
                    { title: 'Công nhân đóng gói sản phẩm', vacancies: 50, salary: '8.5 - 12 triệu' },
                    { title: 'Thao tác máy tự động SMT', vacancies: 30, salary: '9.5 - 14 triệu' },
                    { title: 'Kiểm tra chất lượng QA / QC', vacancies: 20, salary: '10 - 15 triệu' },
                    { title: 'Nhân viên kho vận & Bốc xếp', vacancies: 25, salary: '9 - 13.5 triệu' },
                  ].map((preset) => (
                    <button
                      key={preset.title}
                      type="button"
                      onClick={() => {
                        const list = [...(editingCompany.positions || [])];
                        list.push({ requirements: [], description: [], ...preset });
                        setEditingCompany({ ...editingCompany, positions: list });
                      }}
                      className="text-[10px] bg-white hover:bg-indigo-100 text-slate-700 hover:text-indigo-900 border border-slate-200 px-2 py-0.5 rounded-lg cursor-pointer transition-all active:scale-95 shadow-2xs"
                    >
                      + {preset.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingCompany(null)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
              >
                Lưu Thông Tin
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quick Logo Edit Modal (Hộp thoại sửa nhanh logo công ty) */}
      {quickLogoCompany && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 animate-in fade-in duration-200">
          <form
            onSubmit={handleSaveQuickLogo}
            className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Sửa Logo Doanh Nghiệp
                  </h3>
                  <p className="text-[11px] text-blue-600 font-semibold">{quickLogoCompany.shortName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickLogoCompany(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {quickLogoSuccess && (
              <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{quickLogoSuccess}</span>
              </div>
            )}

            {/* Live Preview */}
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm shrink-0 overflow-hidden border border-slate-300 bg-white"
                style={{
                  backgroundColor: quickLogoCompany.imageUrl ? '#ffffff' : (quickLogoCompany.logoBgColor || '#2563eb'),
                  color: quickLogoCompany.logoTextColor || '#ffffff',
                }}
              >
                {quickLogoCompany.imageUrl ? (
                  <img
                    src={quickLogoCompany.imageUrl}
                    alt={quickLogoCompany.shortName}
                    className="w-full h-full object-contain p-1.5"
                  />
                ) : (
                  quickLogoCompany.logoText || 'CTY'
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900">{quickLogoCompany.shortName}</span>
                  {quickLogoCompany.imageUrl ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.2 rounded">
                      File ảnh logo
                    </span>
                  ) : (
                    <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.2 rounded">
                      Huy hiệu chữ & màu
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Logo sẽ được đồng bộ ngay trên Trang chủ, Trang chi tiết và hồ sơ ứng tuyển.
                </p>
                {quickLogoCompany.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setQuickLogoCompany({ ...quickLogoCompany, imageUrl: undefined })}
                    className="text-[11px] text-red-600 hover:text-red-700 font-bold underline mt-1 cursor-pointer block"
                  >
                    Gỡ ảnh logo (Quay lại logo chữ)
                  </button>
                )}
              </div>
            </div>

            {/* Tải lên file ảnh mới */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                1. Tải lên file ảnh logo mới (.PNG tách nền, .JPG, .SVG, .WebP):
              </label>
              <label className="flex items-center justify-center gap-2 p-3 bg-blue-50/70 border-2 border-dashed border-blue-400 hover:border-blue-600 rounded-2xl text-xs font-bold text-blue-700 cursor-pointer transition-all active:scale-[0.98]">
                <Upload className="w-4 h-4 text-blue-600" />
                <span>{quickLogoCompany.imageUrl ? 'Chọn File Khác Để Thay Thế' : 'Bấm Để Tải File Ảnh Từ Máy / ĐT'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      processLogoImageFile(file, (dataUrl) => {
                        setQuickLogoCompany({ ...quickLogoCompany, imageUrl: dataUrl });
                      });
                    }
                  }}
                />
              </label>
            </div>

            {/* Dán link ảnh */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                2. Hoặc dán link ảnh logo online (URL):
              </label>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={quickLogoCompany.imageUrl || ''}
                  onChange={(e) => setQuickLogoCompany({ ...quickLogoCompany, imageUrl: e.target.value.trim() || undefined })}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
                <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            {/* Cấu hình logo chữ & màu */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-indigo-600" />
                <span>Tùy chỉnh Logo chữ & màu sắc</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Chữ viết tắt:
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="SEV, FOX, LUX..."
                    value={quickLogoCompany.logoText || ''}
                    onChange={(e) => setQuickLogoCompany({ ...quickLogoCompany, logoText: e.target.value.toUpperCase() })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Màu chữ:
                  </label>
                  <select
                    value={quickLogoCompany.logoTextColor || '#FFFFFF'}
                    onChange={(e) => setQuickLogoCompany({ ...quickLogoCompany, logoTextColor: e.target.value })}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  >
                    <option value="#FFFFFF">Trắng (#FFFFFF)</option>
                    <option value="#000000">Đen (#000000)</option>
                    <option value="#FACC15">Vàng (#FACC15)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Màu nền thương hiệu:</span>
                  <span className="font-mono text-[10px] text-slate-500">{quickLogoCompany.logoBgColor || '#2563eb'}</span>
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {LOGO_COLOR_PRESETS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setQuickLogoCompany({ ...quickLogoCompany, logoBgColor: color.value })}
                      className={`w-6 h-6 rounded-lg border-2 transition-transform cursor-pointer ${
                        (quickLogoCompany.logoBgColor || '#2563eb').toLowerCase() === color.value.toLowerCase()
                          ? 'scale-110 border-blue-900 shadow-sm'
                          : 'border-white hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                  <div className="relative inline-flex items-center">
                    <input
                      type="color"
                      value={quickLogoCompany.logoBgColor || '#2563eb'}
                      onChange={(e) => setQuickLogoCompany({ ...quickLogoCompany, logoBgColor: e.target.value })}
                      className="w-7 h-7 rounded-lg cursor-pointer border border-slate-300 p-0.5"
                      title="Chọn mã màu tùy chỉnh"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setQuickLogoCompany(null)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu Logo Doanh Nghiệp</span>
              </button>
            </div>
          </form>
        </div>
      )}
      {editingFaq && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3">
          <form
            onSubmit={handleSaveFaq}
            className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl max-h-[90vh] overflow-y-auto space-y-3.5 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    {isNewFaq ? 'Dạy Thêm Câu Hỏi Cho AI' : 'Chỉnh Sửa Bộ Câu Hỏi AI'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Nhân viên tư vấn sẽ học câu trả lời này</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingFaq(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Câu hỏi ứng viên thường hỏi:
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Chưa có CCCD hoặc chỉ có giấy hẹn có đi làm được không?"
                value={editingFaq.question}
                onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Từ khóa nhận diện mở rộng:</span>
                <span className="text-[10px] text-slate-400 font-normal">Cách nhau bằng dấu phẩy</span>
              </label>
              <input
                type="text"
                placeholder="cccd, can cuoc, giay hen, mat cccd, vneid"
                value={faqKeywordsInput}
                onChange={(e) => setFaqKeywordsInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Gợi ý: Nhập các từ mà ứng viên hay gõ tắt để AI dễ dàng đối soát thông minh.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Câu trả lời chuẩn của Nhân viên tư vấn:
              </label>
              <textarea
                required
                rows={4}
                placeholder="Nhập nội dung tư vấn chính xác, rõ ràng, chi tiết quyền lợi cho ứng viên..."
                value={editingFaq.answer}
                onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Danh mục câu hỏi:</label>
              <select
                value={editingFaq.category}
                onChange={(e) => setEditingFaq({ ...editingFaq, category: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold"
              >
                <option value="general">Quy định & Thắc mắc chung</option>
                <option value="cccd">Hồ sơ & Giấy tờ CCCD</option>
                <option value="salary">Tiền lương, Thưởng & Tăng ca OT</option>
                <option value="dormitory">Ký túc xá, Ăn ở & Xe đưa đón</option>
              </select>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingFaq(null)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu & Cho AI Học Ngay</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL XÁC NHẬN ĐỒNG BỘ TOÀN BỘ HỒ SƠ LÊN GOOGLE SHEET (BẮT BUỘC THEO QUY CHUẨN MUTATING API) */}
      {showSyncAllModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Xác Nhận Gửi Hồ Sơ Vào Google Sheet?
                </h3>
                <p className="text-xs text-slate-500">
                  Hệ thống sẽ thêm mới {applications.length} hồ sơ ứng viên vào bảng tính Google Sheets.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Số lượng hồ sơ:</span>
                <strong className="text-slate-900 font-bold">{applications.length} hồ sơ ứng viên</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Bảng tính nhận:</span>
                <span className="font-mono text-emerald-700 text-[11px] truncate max-w-[200px]">
                  {appSettings.googleSheetId || DEFAULT_SPREADSHEET_ID}
                </span>
              </div>
              <div className="pt-1.5 text-[11px] text-slate-500 border-t border-slate-200/60 leading-relaxed">
                * Thao tác này sẽ ghi các dòng dữ liệu mới vào bảng tính Google Sheets được cấu hình. Bạn có thể kiểm tra trực tiếp trên Google Sheets ngay sau khi gửi.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSyncAllModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmSyncAll}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Xác Nhận Gửi Vào Sheet</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
