import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  Database,
  Sparkles,
  X,
  FileSpreadsheet,
  Code,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { ChatFaqItem } from '../types';
import {
  parseKnowledgeFile,
  ParseResult,
  downloadSampleCsv,
} from '../services/knowledgeFileParser';

interface Props {
  currentFaqs: ChatFaqItem[];
  onImportSuccess: (newFaqList: ChatFaqItem[], count: number) => void;
}

export const UploadKnowledgeCard: React.FC<Props> = ({
  currentFaqs,
  onImportSuccess,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setIsProcessing(true);
    setErrorToast(null);
    setSuccessToast(null);

    try {
      const res = await parseKnowledgeFile(file);
      if (!res.success || res.items.length === 0) {
        setErrorToast(
          res.errors[0] || 'Không tìm thấy câu hỏi & câu trả lời hợp lệ trong file. Vui lòng kiểm tra định dạng.'
        );
        setParseResult(null);
      } else {
        setParseResult(res);
      }
    } catch (err: any) {
      setErrorToast(err.message || 'Lỗi khi xử lý file.');
      setParseResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleConfirmImport = async () => {
    if (!parseResult || parseResult.items.length === 0) return;

    setIsProcessing(true);
    try {
      let finalFaqs: ChatFaqItem[] = [];

      if (importMode === 'append') {
        // Tránh trùng lặp câu hỏi theo nội dung
        const existingQuestionSet = new Set(
          currentFaqs.map((f) => f.question.trim().toLowerCase())
        );

        const newItemsFiltered = parseResult.items.filter(
          (item) => !existingQuestionSet.has(item.question.trim().toLowerCase())
        );

        finalFaqs = [...currentFaqs, ...newItemsFiltered];
      } else {
        finalFaqs = parseResult.items;
      }

      // Lưu trữ toàn bộ vào Firestore và cập nhật state
      onImportSuccess(finalFaqs, parseResult.items.length);

      setSuccessToast(
        `✓ Đã nạp thành công ${parseResult.items.length} câu hỏi vào AI! Dữ liệu Cloud Firestore đã được đồng bộ tự động.`
      );
      setParseResult(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setErrorToast('Lỗi khi nạp dữ liệu: ' + (err.message || err));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3.5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black shadow-md shrink-0">
            <UploadCloud className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <span>Tải lên file tri thức (Upload Knowledge File)</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                Tự động học
              </span>
            </h4>
            <p className="text-xs text-slate-500">
              Hỗ trợ file <strong>.csv, .xlsx, .json, .txt</strong> — Tự động phân tích cú pháp và lưu trữ thẳng vào Firestore
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={downloadSampleCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
          title="Tải file mẫu CSV"
        >
          <Download className="w-3.5 h-3.5 text-blue-600" />
          <span>Tải File Mẫu (.csv)</span>
        </button>
      </div>

      {/* Notifications */}
      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="p-1 text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorToast && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-900 rounded-2xl text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorToast(null)}
            className="p-1 text-red-700 hover:text-red-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Dropzone */}
      {!parseResult && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center transition-all cursor-pointer relative ${
            isDragging
              ? 'border-blue-600 bg-blue-50/70 scale-[0.99]'
              : 'border-slate-300 hover:border-blue-500 bg-slate-50/60 hover:bg-blue-50/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv,.xlsx,.xls,.txt"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-2.5">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              {isProcessing ? (
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              ) : (
                <UploadCloud className="w-6 h-6 text-blue-600" />
              )}
            </div>

            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-800">
                {isProcessing
                  ? 'Đang đọc và phân tích cấu trúc file...'
                  : 'Kéo thả file tài liệu vào đây hoặc Bấm để chọn file'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Định dạng được hỗ trợ: <strong>.CSV</strong> (khuyên dùng), <strong>.XLSX</strong>, <strong>.JSON</strong>, <strong>.TXT</strong> (tối đa 20MB)
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-600 font-medium">
              <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel / CSV
              </span>
              <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                <Code className="w-3.5 h-3.5 text-amber-600" /> JSON
              </span>
              <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                <FileText className="w-3.5 h-3.5 text-blue-600" /> Văn bản TXT
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Parse Preview & Confirmation */}
      {parseResult && (
        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-3 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h5 className="font-extrabold text-xs sm:text-sm text-slate-900">
                  Đã phân tích: {parseResult.fileName} ({parseResult.fileSize})
                </h5>
                <p className="text-[11px] text-blue-700 font-bold">
                  ✓ Tìm thấy {parseResult.items.length} câu hỏi & câu trả lời chuẩn xác
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setParseResult(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline cursor-pointer self-start sm:self-auto"
            >
              Chọn file khác
            </button>
          </div>

          {/* Mode Selection */}
          <div className="p-3 bg-white rounded-xl border border-blue-200/80 space-y-2">
            <span className="text-[11px] font-bold text-slate-700 block">Phương thức nạp vào cơ sở dữ liệu:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label
                className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                  importMode === 'append'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-bold shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  value="append"
                  checked={importMode === 'append'}
                  onChange={() => setImportMode('append')}
                  className="text-blue-600"
                />
                <div>
                  <span className="block">Thêm tiếp vào danh sách hiện có</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Giữ {currentFaqs.length} câu cũ + thêm mới {parseResult.items.length} câu
                  </span>
                </div>
              </label>

              <label
                className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                  importMode === 'replace'
                    ? 'border-amber-600 bg-amber-50/50 text-amber-900 font-bold shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="text-amber-600"
                />
                <div>
                  <span className="block">Ghi đè thay thế toàn bộ</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Xóa các câu cũ và chỉ lưu {parseResult.items.length} câu từ file này
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Preview list */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-700 block">
              Xem trước 3 câu hỏi đầu tiên:
            </span>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {parseResult.items.slice(0, 3).map((item, idx) => (
                <div key={idx} className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="font-bold text-slate-900 flex items-start gap-1.5">
                    <span className="text-blue-600 font-black">Q{idx + 1}:</span>
                    <span>{item.question}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 leading-relaxed pl-5 border-l-2 border-blue-200 line-clamp-2">
                    {item.answer}
                  </div>
                  {item.keywords && item.keywords.length > 0 && (
                    <div className="text-[10px] text-slate-400 pl-5">
                      Từ khóa: {item.keywords.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {parseResult.items.length > 3 && (
              <p className="text-[11px] text-slate-500 italic text-center">
                ... và {parseResult.items.length - 3} câu hỏi khác
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleConfirmImport}
              className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu vào Firestore...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Xác Nhận Nạp {parseResult.items.length} Câu Vào AI & Lưu Firestore</span>
                </>
              )}
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => setParseResult(null)}
              className="px-3 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold text-xs cursor-pointer"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
