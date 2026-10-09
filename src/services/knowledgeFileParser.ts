import { ChatFaqItem } from '../types';
import * as XLSX from 'xlsx';

export interface ParseResult {
  success: boolean;
  items: ChatFaqItem[];
  fileName: string;
  fileSize: string;
  errors: string[];
}

function normalizeCategory(cat: string): 'salary' | 'dormitory' | 'cccd' | 'overtime' | 'general' {
  const c = (cat || '').toLowerCase().trim();
  if (c.includes('luong') || c.includes('salary') || c.includes('tien')) return 'salary';
  if (c.includes('an') || c.includes('o') || c.includes('ktx') || c.includes('dorm')) return 'dormitory';
  if (c.includes('cccd') || c.includes('ho so') || c.includes('thu tuc')) return 'cccd';
  if (c.includes('tang ca') || c.includes('ot') || c.includes('overtime') || c.includes('ca')) return 'overtime';
  return 'general';
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Phân tích file tri thức (.json, .csv, .txt, .xlsx)
 */
export async function parseKnowledgeFile(file: File): Promise<ParseResult> {
  const fileName = file.name;
  const fileSize = formatBytes(file.size);
  const extension = fileName.split('.').pop()?.toLowerCase();

  try {
    if (extension === 'json') {
      const text = await file.text();
      return parseJsonContent(text, fileName, fileSize);
    } else if (extension === 'csv') {
      const text = await file.text();
      return parseCsvContent(text, fileName, fileSize);
    } else if (extension === 'xlsx' || extension === 'xls') {
      const arrayBuffer = await file.arrayBuffer();
      return parseExcelContent(arrayBuffer, fileName, fileSize);
    } else if (extension === 'txt') {
      const text = await file.text();
      return parseTxtContent(text, fileName, fileSize);
    } else {
      // Thử đọc như file văn bản
      const text = await file.text();
      return parseCsvContent(text, fileName, fileSize);
    }
  } catch (err: any) {
    return {
      success: false,
      items: [],
      fileName,
      fileSize,
      errors: [err.message || 'Lỗi khi đọc file'],
    };
  }
}

/**
 * 1. Phân tích nội dung JSON
 */
function parseJsonContent(text: string, fileName: string, fileSize: string): ParseResult {
  const errors: string[] = [];
  const items: ChatFaqItem[] = [];

  try {
    const data = JSON.parse(text);
    let list: any[] = [];

    if (Array.isArray(data)) {
      list = data;
    } else if (data && typeof data === 'object') {
      list = data.faqs || data.items || data.questions || data.data || [];
    }

    if (!Array.isArray(list) || list.length === 0) {
      errors.push('File JSON không chứa danh sách câu hỏi hợp lệ.');
    }

    list.forEach((item, index) => {
      const question = item.question || item.cau_hoi || item.q || item.title || '';
      const answer = item.answer || item.tra_loi || item.dap || item.content || '';

      if (question && answer) {
        let keywords: string[] = [];
        if (Array.isArray(item.keywords)) {
          keywords = item.keywords.map((k: any) => String(k).trim()).filter(Boolean);
        } else if (typeof item.keywords === 'string') {
          keywords = item.keywords.split(',').map((k: string) => k.trim()).filter(Boolean);
        }

        items.push({
          id: item.id || `faq-import-${Date.now()}-${index}`,
          question: String(question).trim(),
          answer: String(answer).trim(),
          keywords,
          category: normalizeCategory(item.category || 'general'),
        });
      } else {
        errors.push(`Dòng ${index + 1}: Thiếu câu hỏi hoặc câu trả lời.`);
      }
    });

    return {
      success: items.length > 0,
      items,
      fileName,
      fileSize,
      errors,
    };
  } catch (e: any) {
    return {
      success: false,
      items: [],
      fileName,
      fileSize,
      errors: ['Cú pháp JSON không hợp lệ: ' + e.message],
    };
  }
}

/**
 * 2. Phân tích nội dung CSV
 */
function parseCsvContent(text: string, fileName: string, fileSize: string): ParseResult {
  const items: ChatFaqItem[] = [];
  const errors: string[] = [];

  // Tách dòng an toàn
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return {
      success: false,
      items: [],
      fileName,
      fileSize,
      errors: ['File CSV phải có ít nhất 1 dòng tiêu đề và 1 dòng dữ liệu.'],
    };
  }

  // Tách header
  const separator = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  const headers = splitCsvRow(lines[0], separator).map((h) => h.toLowerCase().trim());

  let qIndex = headers.findIndex((h) => h.includes('câu hỏi') || h.includes('question') || h === 'q');
  let aIndex = headers.findIndex((h) => h.includes('trả lời') || h.includes('answer') || h.includes('đáp') || h === 'a');
  let kwIndex = headers.findIndex((h) => h.includes('từ khóa') || h.includes('keyword'));
  let catIndex = headers.findIndex((h) => h.includes('danh mục') || h.includes('category') || h.includes('chuyên mục'));

  // Mặc định cột 0 là câu hỏi, cột 1 là câu trả lời nếu không khớp header
  if (qIndex === -1 && aIndex === -1) {
    qIndex = 0;
    aIndex = 1;
    kwIndex = 2;
    catIndex = 3;
  } else if (qIndex === -1) {
    qIndex = 0;
  } else if (aIndex === -1) {
    aIndex = 1;
  }

  for (let i = 1; i < lines.length; i++) {
    const row = splitCsvRow(lines[i], separator);
    const question = row[qIndex]?.trim();
    const answer = row[aIndex]?.trim();

    if (question && answer) {
      const kwRaw = kwIndex !== -1 ? row[kwIndex] || '' : '';
      const keywords = kwRaw
        ? kwRaw.split(/[,;|]/).map((k) => k.trim()).filter(Boolean)
        : [];
      const category = (catIndex !== -1 ? row[catIndex]?.trim() : 'general') || 'general';

      items.push({
        id: `faq-csv-${Date.now()}-${i}`,
        question,
        answer,
        keywords,
        category: normalizeCategory(category),
      });
    }
  }

  return {
    success: items.length > 0,
    items,
    fileName,
    fileSize,
    errors,
  };
}

/**
 * Tách dòng CSV có hỗ trợ dấu ngoặc kép ""
 */
function splitCsvRow(row: string, separator: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * 3. Phân tích nội dung Excel (.xlsx / .xls)
 */
function parseExcelContent(buffer: ArrayBuffer, fileName: string, fileSize: string): ParseResult {
  const items: ChatFaqItem[] = [];
  const errors: string[] = [];

  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { success: false, items: [], fileName, fileSize, errors: ['File Excel trống, không có sheet nào.'] };
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (!rows || rows.length < 2) {
      return { success: false, items: [], fileName, fileSize, errors: ['File Excel phải có ít nhất 1 dòng tiêu đề và 1 dòng dữ liệu.'] };
    }

    const headers = (rows[0] || []).map((h: any) => String(h || '').toLowerCase().trim());
    let qIndex = headers.findIndex((h: string) => h.includes('câu hỏi') || h.includes('question') || h === 'q');
    let aIndex = headers.findIndex((h: string) => h.includes('trả lời') || h.includes('answer') || h.includes('đáp') || h === 'a');
    let kwIndex = headers.findIndex((h: string) => h.includes('từ khóa') || h.includes('keyword'));
    let catIndex = headers.findIndex((h: string) => h.includes('danh mục') || h.includes('category'));

    if (qIndex === -1) qIndex = 0;
    if (aIndex === -1) aIndex = 1;
    if (kwIndex === -1) kwIndex = 2;
    if (catIndex === -1) catIndex = 3;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const question = String(row[qIndex] || '').trim();
      const answer = String(row[aIndex] || '').trim();

      if (question && answer) {
        const kwRaw = row[kwIndex] ? String(row[kwIndex]) : '';
        const keywords = kwRaw
          ? kwRaw.split(/[,;|]/).map((k) => k.trim()).filter(Boolean)
          : [];
        const category = row[catIndex] ? String(row[catIndex]).trim() : 'general';

        items.push({
          id: `faq-xlsx-${Date.now()}-${i}`,
          question,
          answer,
          keywords,
          category: normalizeCategory(category),
        });
      }
    }

    return {
      success: items.length > 0,
      items,
      fileName,
      fileSize,
      errors,
    };
  } catch (err: any) {
    return {
      success: false,
      items: [],
      fileName,
      fileSize,
      errors: ['Lỗi khi đọc file Excel: ' + err.message],
    };
  }
}

/**
 * 4. Phân tích nội dung TXT dạng Hỏi - Đáp
 */
function parseTxtContent(text: string, fileName: string, fileSize: string): ParseResult {
  const items: ChatFaqItem[] = [];
  const errors: string[] = [];

  // Tách theo các khối Q&A
  const blocks = text.split(/\n\s*\n+/);

  blocks.forEach((block, idx) => {
    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length >= 2) {
      let q = '';
      let a = '';

      for (const line of lines) {
        if (/^(?:hỏi|câu hỏi|q|question|\d+[.)])\s*[:=-]?\s*/i.test(line)) {
          q = line.replace(/^(?:hỏi|câu hỏi|q|question|\d+[.)])\s*[:=-]?\s*/i, '').trim();
        } else if (/^(?:đáp|trả lời|a|answer)\s*[:=-]?\s*/i.test(line)) {
          a = line.replace(/^(?:đáp|trả lời|a|answer)\s*[:=-]?\s*/i, '').trim();
        } else if (q && !a) {
          a = line;
        } else if (a) {
          a += '\n' + line;
        }
      }

      if (!q && lines[0]) {
        q = lines[0];
        a = lines.slice(1).join('\n');
      }

      if (q && a) {
        items.push({
          id: `faq-txt-${Date.now()}-${idx}`,
          question: q,
          answer: a,
          keywords: [],
          category: 'general',
        });
      }
    }
  });

  return {
    success: items.length > 0,
    items,
    fileName,
    fileSize,
    errors,
  };
}

/**
 * Tạo file mẫu CSV để tải về
 */
export function downloadSampleCsv(): void {
  const csvContent = `Câu hỏi,Câu trả lời,Từ khóa,Danh mục
"Đi làm có bị giữ bằng gốc hay CCCD không?","Dạ hoàn toàn KHÔNG ạ! Nhà máy và công ty tuyển dụng chỉ đối chiếu CCCD gắn chip bản gốc trong ngày phỏng vấn, sau đó gửi lại anh/chị ngay. Anh/chị chỉ cần nộp 02 bản photo công chứng và sơ yếu lý lịch để hoàn tất hồ sơ thôi ạ.","cccd,bằng gốc,giữ giấy tờ,hồ sơ","thu_tuc"
"Lương cơ bản và tiền tăng ca tính thế nào?","Dạ lương cơ bản dao động từ 5.200.000đ - 6.000.000đ/tháng dùng làm căn cứ đóng BHXH và tính tiền làm thêm giờ. Tiền tăng ca ngày thường nhân 1.5, ngày chủ nhật nhân 2.0. Tổng thu nhập thực tế cầm tay cả tăng ca và phụ cấp là 9 - 14 triệu/tháng anh/chị nhé!","lương,tăng ca,ot,lương cơ bản","tien_luong"
"Ký túc xá có điều hòa và máy giặt không?","Dạ KTX công ty được tài trợ miễn phí 100%, phòng 4 - 6 người cực kỳ khang trang, có đầy đủ điều hòa 2 chiều, bình nóng lạnh, máy giặt, wifi tốc độ cao và bảo vệ an ninh 24/7 ạ.","ktx,ký túc xá,ở lại,máy giặt,điều hòa","an_o"
"Có xe đưa đón công nhân đi làm không?","Dạ có ạ! Nhà máy có hàng trăm tuyến xe đưa đón miễn phí khắp các huyện tại Bắc Ninh, Bắc Giang và các tỉnh lân cận như Thái Nguyên, Lạng Sơn, Hải Dương đón trả tận nơi ạ.","xe đưa đón,xe buýt,tuyến xe","di_lai"`;

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'mau_tri_thuc_ai_zoman.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
