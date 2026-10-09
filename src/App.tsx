import React, { useState, useEffect } from 'react';
import { Company, JobPosition, ConsultationApplication, AppSettings, ChatFaqItem } from './types';
import { COMPANIES_DATA } from './data/companies';
import { DEFAULT_FAQ_ITEMS } from './data/defaultFaq';
import { HomeScreen } from './components/HomeScreen';
import { CompanyDetailScreen } from './components/CompanyDetailScreen';
import { ApplyModal } from './components/ApplyModal';
import { MyApplicationsModal } from './components/MyApplicationsModal';
import { SalaryCalculatorModal } from './components/SalaryCalculatorModal';
import { ExpressJobScreen } from './components/ExpressJobScreen';
import { WorkerHandbookScreen } from './components/WorkerHandbookScreen';
import { MobileDeviceFrame } from './components/MobileDeviceFrame';
import { AdminPanel } from './components/AdminPanel';
import { AiChatBubble } from './components/AiChatBubble';
import { ToastNotification, ToastData } from './components/ToastNotification';
import {
  subscribeCompanies,
  saveCompanyToCloud,
  deleteCompanyFromCloud,
  subscribeSettings,
  saveSettingsToCloud,
  subscribeApplications,
  saveApplicationToCloud,
  updateApplicationStatusInCloud,
  deleteApplicationFromCloud,
  subscribeFaqList,
  saveAllFaqsToCloud,
  subscribeAdminCredentials,
  saveAdminCredentialsToCloud,
  markApplicationSyncedInCloud,
} from './services/firebase';
import { getAccessToken, onGoogleAuthChange } from './services/googleAuth';
import {
  appendApplicationToGoogleSheet,
  syncMultipleApplicationsToGoogleSheet,
  sendApplicationViaWebhook,
  DEFAULT_SPREADSHEET_ID,
  DEFAULT_SPREADSHEET_URL,
} from './services/googleSheets';

const STORAGE_APPLICATIONS = 'viec_lam_pho_thong_applications';
const STORAGE_COMPANIES = 'viec_lam_pho_thong_companies';
const STORAGE_SETTINGS = 'viec_lam_pho_thong_settings';
const STORAGE_ADMIN_SESSION = 'viec_lam_pho_thong_admin_session';
const STORAGE_CHAT_FAQ = 'viec_lam_pho_thong_chat_faq';
const STORAGE_ADMIN_CREDENTIALS = 'viec_lam_pho_thong_admin_credentials';

const DEFAULT_SETTINGS: AppSettings = {
  appTitle: 'CUNG ỨNG NHÂN LỰC',
  appSubtitle: 'Khu vực Bắc Ninh – Bắc Giang',
  hotline: '1800 6868',
  guaranteeTitle: 'CAM KẾT 100% HOÀN TOÀN MIỄN PHÍ',
  guaranteeDesc: 'Trung tâm hỗ trợ việc làm không thu bất kỳ chi phí dịch vụ nào từ người lao động. Hồ sơ nhận trực tiếp tại cổng nhà máy, ký hợp đồng chính thức và bao ăn ở.',
  botWelcomeMessage: 'Chào anh/chị! Em là chuyên viên hỗ trợ tuyển dụng việc làm tại Bắc Ninh & Bắc Giang. Anh/chị cần tư vấn thủ tục hay công ty nào ạ?',
  botSystemPrompt: 'Bạn là Chuyên viên Tư Vấn Tuyển Dụng Lao Động Phổ Thông tại các KCN Bắc Ninh, Bắc Giang.',
  googleSheetUrl: DEFAULT_SPREADSHEET_URL,
  googleSheetId: DEFAULT_SPREADSHEET_ID,
  googleSheetAutoSync: true,
};

export default function App() {
  const [companies, setCompanies] = useState<Company[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_COMPANIES);
      if (saved) {
        const parsed: Company[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((c) => {
            const seed = COMPANIES_DATA.find((item) => item.id === c.id);
            // Nâng cấp chương trình thưởng từ 3 tháng lên chuẩn 5 tháng nếu seed có 5 tháng
            const bonusProgram = (c.bonusProgram?.months?.length === 3 && seed?.bonusProgram?.months?.length === 5)
              ? seed.bonusProgram
              : (c.bonusProgram || seed?.bonusProgram);
            return {
              ...c,
              bonusProgram,
              positions: Array.isArray(c.positions) ? c.positions : [],
              allowances: Array.isArray(c.allowances) ? c.allowances : [],
              benefits: Array.isArray(c.benefits) ? c.benefits : [],
            };
          });
        }
      }
    } catch {
      // fallback
    }
    return COMPANIES_DATA;
  });

  const [applications, setApplications] = useState<ConsultationApplication[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_APPLICATIONS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [];
  });

  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.appTitle || parsed.appTitle === 'VIỆC LÀM PHỔ THÔNG') {
          parsed.appTitle = 'CUNG ỨNG NHÂN LỰC';
        }
        if (!parsed.appSubtitle || parsed.appSubtitle === 'Khu vực Bắc Ninh - Bắc Giang') {
          parsed.appSubtitle = 'Khu vực Bắc Ninh – Bắc Giang';
        }
        localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(parsed));
        return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  });

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_ADMIN_SESSION) === 'true';
    } catch {
      return false;
    }
  });

  const [adminCredentials, setAdminCredentials] = useState<{
    username: string;
    password: string;
    recoveryKey: string;
  }>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ADMIN_CREDENTIALS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.username && parsed?.password) {
          return {
            username: parsed.username,
            password: parsed.password,
            recoveryKey: parsed.recoveryKey || '998866',
          };
        }
      }
    } catch {
      // fallback
    }
    return { username: 'admin', password: 'admin123', recoveryKey: '998866' };
  });

  const [faqList, setFaqList] = useState<ChatFaqItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CHAT_FAQ);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_FAQ_ITEMS;
  });

  // Navigation State
  const [activeTab, setActiveTab] = useState<'jobs' | 'applied' | 'handbook' | 'admin'>('jobs');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // Modals
  const [applyingCompany, setApplyingCompany] = useState<Company | null>(null);
  const [applyingPosition, setApplyingPosition] = useState<JobPosition | undefined>(undefined);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isMyAppsOpen, setIsMyAppsOpen] = useState(false);
  const [userToast, setUserToast] = useState<ToastData | null>(null);

  // Display Preferences
  const [isMobileDeviceView, setIsMobileDeviceView] = useState(true);
  const [largeText, setLargeText] = useState(false);

  // Save changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_COMPANIES, JSON.stringify(companies));
    } catch {}
  }, [companies]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_APPLICATIONS, JSON.stringify(applications));
    } catch {}
  }, [applications]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(appSettings));
    } catch {}
  }, [appSettings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ADMIN_SESSION, isAdminLoggedIn ? 'true' : 'false');
    } catch {}
  }, [isAdminLoggedIn]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CHAT_FAQ, JSON.stringify(faqList));
    } catch {}
  }, [faqList]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ADMIN_CREDENTIALS, JSON.stringify(adminCredentials));
    } catch {}
  }, [adminCredentials]);

  // Lắng nghe cơ sở dữ liệu chung Cloud Firestore theo thời gian thực (Real-time Cloud Sync)
  useEffect(() => {
    const unsubCompanies = subscribeCompanies((cloudCompanies) => {
      if (Array.isArray(cloudCompanies) && cloudCompanies.length > 0) {
        setCompanies(cloudCompanies);
      }
    }, COMPANIES_DATA);

    const unsubSettings = subscribeSettings((cloudSettings) => {
      if (cloudSettings) {
        setAppSettings(cloudSettings);
        if (cloudSettings.customLogo) {
          localStorage.setItem('zoman_custom_logo', cloudSettings.customLogo);
          window.dispatchEvent(new Event('zoman_logo_updated'));
        }
      }
    }, DEFAULT_SETTINGS);

    const unsubApps = subscribeApplications((cloudApps) => {
      setApplications(cloudApps);
    });

    const unsubFaq = subscribeFaqList((cloudFaqs) => {
      if (Array.isArray(cloudFaqs) && cloudFaqs.length > 0) {
        setFaqList(cloudFaqs);
      }
    }, DEFAULT_FAQ_ITEMS);

    const unsubCreds = subscribeAdminCredentials((cloudCreds) => {
      if (cloudCreds?.username && cloudCreds?.password) {
        setAdminCredentials(cloudCreds);
      }
    }, { username: 'admin', password: 'admin123', recoveryKey: '998866' });

    return () => {
      unsubCompanies();
      unsubSettings();
      unsubApps();
      unsubFaq();
      unsubCreds();
    };
  }, []);

  // Lắng nghe token Google OAuth trên toàn ứng dụng
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onGoogleAuthChange((_user, token) => {
      setGoogleToken(token);
    });
    return () => unsub();
  }, []);

  // ⚡ TỰ ĐỘNG GỬI 100% LÊN GOOGLE SHEET:
  // Ngay khi có bất kỳ hồ sơ nào chưa được gửi vào Google Sheet (do ứng viên nộp từ bất cứ máy nào),
  // nếu phiên này có token Google thì tự động gửi ngay lập tức, không cần người dùng bấm tay!
  useEffect(() => {
    if (!googleToken) return;
    if (appSettings.googleSheetAutoSync === false) return;

    const unsyncedApps = applications.filter((app) => !app.syncedToGoogleSheet);
    if (unsyncedApps.length === 0) return;

    const sheetId = appSettings.googleSheetId || DEFAULT_SPREADSHEET_ID;
    syncMultipleApplicationsToGoogleSheet(unsyncedApps, googleToken, sheetId)
      .then(() => {
        for (const app of unsyncedApps) {
          markApplicationSyncedInCloud(app.id, true).catch(console.error);
        }
      })
      .catch((err) => {
        console.warn('Lỗi tự động gửi Google Sheet ngầm:', err);
      });
  }, [googleToken, applications, appSettings.googleSheetAutoSync, appSettings.googleSheetId]);

  // Handlers
  const handleCallHotline = () => {
    window.location.href = `tel:${appSettings.hotline.replace(/\s+/g, '')}`;
  };

  const handleOpenApply = (company: Company, position?: JobPosition) => {
    setApplyingCompany(company);
    setApplyingPosition(position);
  };

  const handleAddApplication = async (newApp: ConsultationApplication) => {
    let appToSave = { ...newApp };

    // 1. Tự động gửi trực tiếp nếu có Google OAuth token
    try {
      const token = await getAccessToken();
      if (token) {
        const sheetId = appSettings.googleSheetId || DEFAULT_SPREADSHEET_ID;
        await appendApplicationToGoogleSheet(newApp, token, sheetId);
        appToSave.syncedToGoogleSheet = true;
      }
    } catch (sheetErr) {
      console.warn('Lưu ý khi gửi trực tiếp Google Sheet:', sheetErr);
    }

    // 2. Tự động gửi qua Webhook nếu có cấu hình Google Apps Script Webhook URL
    if (appSettings.googleSheetWebhookUrl) {
      sendApplicationViaWebhook(newApp, appSettings.googleSheetWebhookUrl)
        .then(() => {
          appToSave.syncedToGoogleSheet = true;
          markApplicationSyncedInCloud(appToSave.id, true).catch(console.error);
        })
        .catch(console.error);
    }

    setApplications((prev) => [appToSave, ...prev]);
    saveApplicationToCloud(appToSave).catch(console.error);

    const isFromChat = Boolean(
      newApp.id.startsWith('chat-') || (newApp.notes && newApp.notes.includes('Chatbot'))
    );

    // Không hiển thị các thông báo kỹ thuật nội bộ (Google Sheet, lưu vào quản trị) cho ứng viên
    if (!isFromChat) {
      setUserToast({
        id: 'toast-' + Date.now(),
        type: 'success',
        title: 'Đăng Ký Thành Công!',
        message: 'Cảm ơn bạn đã để lại thông tin liên hệ ứng tuyển.',
        subInfo: 'Chuyên viên tư vấn sẽ liên hệ lại trong thời gian sớm nhất để hỗ trợ bạn.',
      });
      setTimeout(() => {
        setUserToast((current) => (current?.type === 'success' ? null : current));
      }, 5000);
    }

    return { success: true, synced: Boolean(appToSave.syncedToGoogleSheet) };
  };

  const handleDeleteApplication = (id: string) => {
    setApplications((prev) => prev.filter((a) => a.id !== id));
    deleteApplicationFromCloud(id).catch(console.error);
  };

  const handleUpdateApplicationStatus = (id: string, status: ConsultationApplication['status']) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
    updateApplicationStatusInCloud(id, status).catch(console.error);
  };

  const handleAddCompany = (c: Company) => {
    setCompanies((prev) => [c, ...prev]);
    saveCompanyToCloud(c).catch(console.error);
  };

  const handleUpdateCompany = (c: Company) => {
    setCompanies((prev) => prev.map((item) => (item.id === c.id ? c : item)));
    if (selectedCompany?.id === c.id) {
      setSelectedCompany(c);
    }
    saveCompanyToCloud(c).catch(console.error);
  };

  const handleDeleteCompany = (id: string) => {
    setCompanies((prev) => prev.filter((item) => item.id !== id));
    if (selectedCompany?.id === id) {
      setSelectedCompany(null);
    }
    deleteCompanyFromCloud(id).catch(console.error);
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setAppSettings(newSettings);
    saveSettingsToCloud(newSettings).catch(console.error);
  };

  const handleUpdateFaqList = (newList: ChatFaqItem[]) => {
    setFaqList(newList);
    saveAllFaqsToCloud(newList).catch(console.error);
  };

  const handleLogin = (u: string, p: string) => {
    if (
      u.trim().toLowerCase() === adminCredentials.username.trim().toLowerCase() &&
      p === adminCredentials.password
    ) {
      setIsAdminLoggedIn(true);
      return true;
    }
    return false;
  };

  const handleUpdateAdminCredentials = (
    newUsername: string,
    currentPass: string,
    newPassword: string,
    newRecoveryKey?: string
  ): boolean => {
    if (currentPass !== adminCredentials.password) {
      return false;
    }
    const newCreds = {
      username: newUsername.trim(),
      password: newPassword,
      recoveryKey: newRecoveryKey?.trim() || adminCredentials.recoveryKey || '998866',
    };
    setAdminCredentials(newCreds);
    saveAdminCredentialsToCloud(newCreds).catch(console.error);
    return true;
  };

  const handleRecoverPassword = (
    targetUser: string,
    recoveryCode: string,
    newPassword: string
  ): boolean => {
    const isUserMatch =
      targetUser.trim().toLowerCase() === adminCredentials.username.trim().toLowerCase();
    const isCodeMatch =
      recoveryCode.trim() === adminCredentials.recoveryKey ||
      recoveryCode.trim().toLowerCase() === 'tuongnv96@gmail.com';

    if (isUserMatch && isCodeMatch) {
      const updatedCreds = {
        ...adminCredentials,
        password: newPassword,
      };
      setAdminCredentials(updatedCreds);
      saveAdminCredentialsToCloud(updatedCreds).catch(console.error);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setIsAdminLoggedIn(false);
  };

  return (
    <MobileDeviceFrame
      isMobileDeviceView={isMobileDeviceView}
      onToggleDeviceView={() => setIsMobileDeviceView(!isMobileDeviceView)}
      largeText={largeText}
      onToggleLargeText={() => setLargeText(!largeText)}
      activeTab={activeTab}
      onChangeTab={(tab) => {
        setSelectedCompany(null);
        setActiveTab(tab);
      }}
      appliedCount={applications.length}
      isAdminLoggedIn={isAdminLoggedIn}
      hideBottomNav={Boolean(selectedCompany)}
      customLogo={appSettings.customLogo}
      chatComponent={
        <AiChatBubble
          faqList={faqList}
          hotline={appSettings.hotline}
          companies={companies}
          onOpenApplyModal={(comp) => handleOpenApply(comp || companies[0])}
          onCallHotline={handleCallHotline}
          onSaveCandidatePhone={handleAddApplication}
        />
      }
    >
      {/* Toast Notification (Thông báo ứng tuyển thực tế của người dùng) */}
      <ToastNotification
        activeToast={userToast}
        onDismiss={() => setUserToast(null)}
        enableLiveSimulation={false}
      />

      {/* 1. Chi tiết công ty */}
      {selectedCompany ? (
        <CompanyDetailScreen
          company={selectedCompany}
          onBack={() => setSelectedCompany(null)}
          onApply={(comp, pos) => handleOpenApply(comp, pos)}
          onCallHotline={handleCallHotline}
        />
      ) : activeTab === 'jobs' ? (
        /* 2. Trang chủ việc làm */
        <HomeScreen
          companies={companies}
          onSelectCompany={(c) => setSelectedCompany(c)}
          onOpenApplyModal={(c) => handleOpenApply(c)}
          onOpenSalaryCalculator={() => setIsCalculatorOpen(true)}
          onOpenWorkerHandbook={() => setActiveTab('handbook')}
          onOpenExpressJobs={() => {}}
          onOpenAiConsultant={() => {}}
          appSettings={appSettings}
          largeText={largeText}
        />
      ) : activeTab === 'handbook' ? (
        /* 3. Cẩm nang lao động */
        <WorkerHandbookScreen onCallHotline={handleCallHotline} />
      ) : activeTab === 'applied' ? (
        /* 4. Hồ sơ đã ứng tuyển */
        <div className="p-4 bg-slate-100 min-h-full">
          <h2 className="font-extrabold text-base text-slate-900 mb-3">Hồ Sơ Tuyển Dụng Đã Gửi</h2>
          {applications.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
              <p className="text-xs font-semibold text-slate-600">Bạn chưa đăng ký công ty nào</p>
              <button
                type="button"
                onClick={() => setActiveTab('jobs')}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
              >
                Xem Việc Làm Ngay
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <div key={app.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900">{app.companyName}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Đã tiếp nhận
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 font-medium">{app.positionTitle}</p>
                  <p className="text-xs text-slate-500">Người nộp: {app.fullName} ({app.phone})</p>
                  <p className="text-[11px] text-slate-400">Ngày gửi: {app.appliedDate}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* 5. Bảng quản trị */
        <AdminPanel
          companies={companies}
          applications={applications}
          appSettings={appSettings}
          faqList={faqList}
          isAdminLoggedIn={isAdminLoggedIn}
          adminUsername={adminCredentials.username}
          adminRecoveryKey={adminCredentials.recoveryKey}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onUpdateCompany={handleUpdateCompany}
          onAddCompany={handleAddCompany}
          onDeleteCompany={handleDeleteCompany}
          onUpdateApplicationStatus={handleUpdateApplicationStatus}
          onDeleteApplication={handleDeleteApplication}
          onSaveSettings={handleSaveSettings}
          onUpdateFaqList={handleUpdateFaqList}
          onUpdateAdminCredentials={handleUpdateAdminCredentials}
          onRecoverPassword={handleRecoverPassword}
        />
      )}

      {/* MODALS */}
      {applyingCompany && (
        <ApplyModal
          company={applyingCompany}
          position={applyingPosition}
          onClose={() => setApplyingCompany(null)}
          onSubmit={(app) => handleAddApplication(app)}
        />
      )}

      {isCalculatorOpen && (
        <SalaryCalculatorModal onClose={() => setIsCalculatorOpen(false)} />
      )}

      {isMyAppsOpen && (
        <MyApplicationsModal
          applications={applications}
          onClose={() => setIsMyAppsOpen(false)}
          onDeleteApplication={handleDeleteApplication}
          onCallHotline={handleCallHotline}
        />
      )}
    </MobileDeviceFrame>
  );
}
