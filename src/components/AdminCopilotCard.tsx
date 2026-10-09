import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Building2,
  ArrowRight,
  Zap,
  Info,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import { Company } from '../types';
import {
  executeAdminCopilot,
  CopilotResult,
} from '../services/adminCopilot';

interface Props {
  companies: Company[];
  onUpdateCompany: (company: Company) => void;
  onAddCompany: (company: Company) => void;
  onDeleteCompany?: (companyId: string) => void;
}

export const AdminCopilotCard: React.FC<Props> = ({
  companies,
  onUpdateCompany,
  onAddCompany,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [lastResult, setLastResult] = useState<CopilotResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ id: string; text: string; time: string; summary: string }>>([]);

  const samplePrompts = [
    'Sửa công ty Foxconn giảm thưởng xuống 1.2tr',
    'Sửa Samsung tăng lương lên 11-15 triệu, KTX miễn phí 100%',
    'Sửa Shopee VSIP tăng thu nhập lên 11 - 16 triệu',
    'Ẩn công ty Goertek Quế Võ (đã tuyển đủ chỉ tiêu)',
    'Mở lại công ty Goertek Quế Võ',
    'Thêm công ty Pegatron ở KCN Đình Trám lương 9 - 14 triệu, hỗ trợ KTX',
  ];

  const handleExecute = async (inputCommand?: string) => {
    const textToProcess = (inputCommand || prompt).trim();
    if (!textToProcess) return;

    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage('Đang phân tích cú pháp & nội dung bằng AI...');

    try {
      // 1. Phân tích lệnh với Copilot
      const result = await executeAdminCopilot(textToProcess, companies);
      setStatusMessage('Đang tìm kiếm bản ghi & áp dụng thay đổi...');

      // 2. Thực thi cập nhật dữ liệu vào hệ thống và Cloud Firestore
      if (result.action === 'create') {
        const newComp = result.updates as Company;
        onAddCompany(newComp);
      } else if (result.action === 'update' || result.action === 'toggle_hidden') {
        const targetId = result.targetCompanyId;
        const existing = companies.find((c) => c.id === targetId);

        if (existing) {
          const updatedComp: Company = {
            ...existing,
            ...result.updates,
          };
          onUpdateCompany(updatedComp);
        } else {
          throw new Error(`Không tìm thấy công ty có ID "${targetId}" trong danh sách.`);
        }
      }

      setLastResult(result);
      setHistory((prev) => [
        {
          id: 'hist-' + Date.now(),
          text: textToProcess,
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          summary: result.summary,
        },
        ...prev.slice(0, 4),
      ]);
      setPrompt('');
    } catch (err: any) {
      console.error('Lỗi khi thực thi Copilot:', err);
      setErrorMessage(err.message || 'Đã có lỗi xảy ra khi phân tích yêu cầu.');
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-xl border-2 border-indigo-400/40 relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center font-black shadow-lg shrink-0">
            <Sparkles className="w-5 h-5 text-amber-900 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                Admin Copilot · Trợ Lý Nhập Liệu AI
              </h3>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/40">
                Tự Động 100%
              </span>
            </div>
            <p className="text-xs text-blue-200 mt-0.5 font-normal">
              Ra lệnh tiếng Việt tự nhiên hoặc dán bài tuyển dụng thô — AI tự tìm đúng bản ghi và cập nhật ngay.
            </p>
          </div>
        </div>

        <div className="text-[11px] text-blue-200/80 bg-white/10 px-2.5 py-1 rounded-xl backdrop-blur-xs flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-yellow-300" />
          <span>Không cần mở form thủ công</span>
        </div>
      </div>

      {/* Input Box */}
      <div className="relative z-10 space-y-2.5">
        <div className="relative">
          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleExecute();
              }
            }}
            placeholder="Ví dụ: 'Sửa công ty Foxconn giảm thưởng xuống 1.2tr' hoặc 'Shopee tăng lương 11-15tr' hoặc dán cả đoạn bài đăng tuyển dụng vào đây..."
            className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-indigo-400/30 rounded-2xl text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 shadow-inner resize-none font-normal leading-relaxed"
          />

          <div className="flex items-center justify-between mt-1 text-[11px] text-blue-200/70">
            <span>Mẹo: Nhấn <strong>Ctrl + Enter</strong> để thực thi nhanh</span>
            {prompt.length > 0 && <span>{prompt.length} ký tự</span>}
          </div>
        </div>

        {/* Suggestion Chips */}
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-blue-200/80 mb-1.5 font-medium">
            <Info className="w-3.5 h-3.5 text-blue-300" />
            <span>Mẫu câu lệnh thường dùng (Bấm để thử ngay):</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {samplePrompts.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPrompt(s);
                  handleExecute(s);
                }}
                className="text-[11px] px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-blue-100 transition-all cursor-pointer active:scale-95 text-left"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            disabled={isLoading || !prompt.trim()}
            onClick={() => handleExecute()}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                <span>{statusMessage || 'AI Đang Xử Lý...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Phân Tích & Cập Nhật Tức Thì (Copilot)</span>
              </>
            )}
          </button>

          {prompt && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setPrompt('')}
              className="px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              title="Xóa trắng"
            >
              Hủy
            </button>
          )}
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Không thể thực hiện yêu cầu:</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Success / Result Feedback Card */}
        {lastResult && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-400/40 text-emerald-100 text-xs space-y-2 animate-in zoom-in-98 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-extrabold text-white text-xs sm:text-sm">
                  {lastResult.summary}
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/30">
                {lastResult.source === 'ai_gemini' ? 'Gemini AI' : 'Copilot Engine'}
              </span>
            </div>

            {/* Target Company details */}
            <div className="flex items-center gap-2 text-[11px] text-emerald-200/90 pt-1 border-t border-emerald-500/20">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Công ty: <strong className="text-white">{lastResult.targetCompanyName}</strong></span>
              {lastResult.targetCompanyId && (
                <span className="text-[10px] text-emerald-400/80">({lastResult.targetCompanyId})</span>
              )}
            </div>

            {/* List of Changes */}
            {lastResult.changes.length > 0 && (
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/80 block">
                  Chi tiết các trường đã tự động cập nhật:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {lastResult.changes.map((chg, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-xl bg-black/30 border border-emerald-400/20 text-[11px] flex items-center justify-between gap-1"
                    >
                      <span className="text-emerald-200 font-medium">{chg.label}:</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {chg.oldValue !== undefined && (
                          <>
                            <span className="text-slate-400 line-through text-[10px] truncate max-w-[80px]">
                              {String(chg.oldValue)}
                            </span>
                            <ArrowRight className="w-3 h-3 text-emerald-400" />
                          </>
                        )}
                        <span className="text-amber-300 font-bold">
                          {String(chg.newValue)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* History of recent Copilot actions */}
        {history.length > 0 && (
          <div className="pt-2 border-t border-white/10 text-[11px] text-blue-200/70">
            <span className="font-bold block mb-1 text-blue-100">Lịch sử lệnh Copilot gần đây:</span>
            <div className="space-y-1">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between text-[10px] bg-white/5 px-2 py-1 rounded-lg">
                  <span className="text-white font-medium truncate max-w-[70%]">“{h.text}”</span>
                  <span className="text-emerald-300 font-semibold">{h.summary}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
