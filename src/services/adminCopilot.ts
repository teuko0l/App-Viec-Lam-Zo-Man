import { Company } from '../types';

export interface CopilotChangeItem {
  field: string;
  label: string;
  oldValue?: string | number | boolean;
  newValue?: string | number | boolean;
}

export interface CopilotResult {
  action: 'update' | 'create' | 'toggle_hidden' | 'delete';
  targetCompanyId?: string | null;
  targetCompanyName: string;
  summary: string;
  changes: CopilotChangeItem[];
  updates: Partial<Company>;
  rawResponse?: string;
  source: 'ai_gemini' | 'local_fallback';
}

// Hàm chuẩn hóa chuỗi tiếng Việt không dấu để so khớp tên công ty
function normalizeVietnamese(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tìm kiếm công ty trong danh sách dựa trên từ khóa tiếng Việt
 */
export function findMatchingCompany(query: string, companies: Company[]): Company | undefined {
  const normQuery = normalizeVietnamese(query);

  // 1. Khớp chính xác hoặc chứa shortName
  for (const c of companies) {
    const normShort = normalizeVietnamese(c.shortName);
    if (normShort && normQuery.includes(normShort)) {
      return c;
    }
  }

  // 2. Khớp theo tên đầy đủ
  for (const c of companies) {
    const normName = normalizeVietnamese(c.name);
    if (normName && normQuery.includes(normName)) {
      return c;
    }
  }

  // 3. Khớp logoText
  for (const c of companies) {
    const normLogo = normalizeVietnamese(c.logoText);
    if (normLogo.length >= 3 && normQuery.includes(normLogo)) {
      return c;
    }
  }

  // 4. Tìm kiếm từ khóa theo từng token
  const words = normQuery.split(' ');
  for (const c of companies) {
    const normShort = normalizeVietnamese(c.shortName);
    if (words.includes(normShort)) {
      return c;
    }
  }

  return undefined;
}

/**
 * Phân tích bằng mô hình AI Gemini qua API server
 */
export async function analyzeWithGeminiCopilot(
  prompt: string,
  companies: Company[]
): Promise<CopilotResult> {
  const response = await fetch('/api/admin/copilot', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      currentCompanies: companies,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Lỗi máy chủ (${response.status})`);
  }

  const json = await response.json();
  if (!json.success || !json.data) {
    throw new Error(json.error || 'Dữ liệu phản hồi từ AI không hợp lệ.');
  }

  const aiData = json.data;
  return {
    action: aiData.action || 'update',
    targetCompanyId: aiData.targetCompanyId,
    targetCompanyName: aiData.targetCompanyName || 'Công ty',
    summary: aiData.summary || 'Đã phân tích yêu cầu bằng AI',
    changes: Array.isArray(aiData.changes) ? aiData.changes : [],
    updates: aiData.updates || {},
    source: 'ai_gemini',
  };
}

/**
 * Trình phân tích cục bộ thông minh (Dự phòng tự động khi không có internet/API key)
 */
export function analyzeWithLocalCopilot(
  prompt: string,
  companies: Company[]
): CopilotResult {
  const normPrompt = normalizeVietnamese(prompt);

  // 1. Kiểm tra thao tác ẨN CÔNG TY
  if (
    normPrompt.includes('an cong ty') ||
    normPrompt.includes('an tin') ||
    normPrompt.includes('tam ngung') ||
    normPrompt.includes('dung tuyen')
  ) {
    const target = findMatchingCompany(prompt, companies);
    if (target) {
      return {
        action: 'toggle_hidden',
        targetCompanyId: target.id,
        targetCompanyName: target.shortName,
        summary: `Tạm ẩn tuyển dụng công ty ${target.shortName} (chuyển sang trạng thái Tạm ngưng)`,
        changes: [
          {
            field: 'hidden',
            label: 'Trạng thái tuyển dụng',
            oldValue: target.hidden ? 'Đang ẩn' : 'Đang tuyển',
            newValue: 'Đã ẩn',
          },
        ],
        updates: { hidden: true },
        source: 'local_fallback',
      };
    }
  }

  // 2. Kiểm tra thao tác MỞ LẠI CÔNG TY
  if (
    normPrompt.includes('mo lai') ||
    normPrompt.includes('hien lai') ||
    normPrompt.includes('bat lai') ||
    normPrompt.includes('tuyen lai')
  ) {
    const target = findMatchingCompany(prompt, companies);
    if (target) {
      return {
        action: 'toggle_hidden',
        targetCompanyId: target.id,
        targetCompanyName: target.shortName,
        summary: `Mở lại hiển thị tuyển dụng công ty ${target.shortName} trên trang chủ`,
        changes: [
          {
            field: 'hidden',
            label: 'Trạng thái tuyển dụng',
            oldValue: target.hidden ? 'Đang ẩn' : 'Đang tuyển',
            newValue: 'Đang hiển thị',
          },
        ],
        updates: { hidden: false },
        source: 'local_fallback',
      };
    }
  }

  // 3. Kiểm tra thao tác THÊM CÔNG TY MỚI
  if (
    normPrompt.startsWith('them cong ty') ||
    normPrompt.startsWith('tao cong ty') ||
    normPrompt.startsWith('them moi') ||
    normPrompt.startsWith('cong ty moi')
  ) {
    // Trích xuất tên công ty
    let companyName = 'Công ty mới';
    let shortName = 'Mới';
    const nameMatch = prompt.match(/(?:công ty|cty)\s+([^,.\n]+)/i);
    if (nameMatch && nameMatch[1]) {
      shortName = nameMatch[1].trim().split(/\s+/).slice(0, 3).join(' ');
      companyName = nameMatch[1].trim();
    }

    // Trích xuất lương
    let salaryRange = '9 - 14 triệu/tháng';
    const salaryMatch = prompt.match(/(\d+(?:[.,]\d+)?\s*(?:-|đến|–)\s*\d+(?:[.,]\d+)?\s*(?:triệu|tr))/i);
    if (salaryMatch) {
      salaryRange = salaryMatch[1].replace(/tr$/i, 'triệu') + '/tháng';
    }

    // Trích xuất KCN
    let industrialPark = 'KCN Quế Võ';
    const kcnMatch = prompt.match(/KCN\s+([^,.\n]+)/i);
    if (kcnMatch && kcnMatch[1]) {
      industrialPark = `KCN ${kcnMatch[1].trim()}`;
    }

    // Trích xuất địa bàn
    let location = 'Bắc Ninh';
    if (normPrompt.includes('bac giang')) {
      location = 'Bắc Giang';
    }

    const newId = 'comp-' + Date.now().toString(36);
    const newCompanyData: Company = {
      id: newId,
      name: companyName.startsWith('Công ty') ? companyName : `Công ty TNHH ${companyName}`,
      shortName: shortName,
      industry: 'Sản xuất linh kiện điện tử',
      employmentType: 'pho_thong',
      logoText: shortName.slice(0, 3).toUpperCase(),
      logoBgColor: '#2563eb',
      logoTextColor: '#ffffff',
      location,
      industrialPark,
      salaryRange,
      minSalary: 9000000,
      maxSalary: 14000000,
      basicSalary: '5.200.000đ',
      basicSalaryNum: 5200000,
      attendanceBonus: '1.000.000đ',
      attendanceBonusNum: 1000000,
      badge: 'Bao ăn ở 100%',
      dormitoryInfo: 'Ký túc xá miễn phí, máy lạnh, máy giặt, wifi tốc độ cao',
      mealInfo: 'Bao ăn 2 bữa ca ngày, tăng ca trên 2h hỗ trợ thêm 1 bữa cơm miễn phí',
      workShiftInfo: 'Làm 2 ca 12 tiếng, đổi ca 2 tuần/lần, nghỉ 4 ngày/tháng',
      transportationInfo: 'Có xe đưa đón công nhân các tuyến nội ngoại tỉnh',
      contractType: 'Hợp đồng lao động 12 tháng',
      educationReq: 'Không yêu cầu bằng cấp',
      jobDescription: `• Lắp ráp và đóng gói linh kiện trong phòng sạch máy lạnh mát mẻ.\n• Kiểm tra ngoại quan sản phẩm theo hướng dẫn.\n• Không yêu cầu kinh nghiệm, đi làm ngay.`,
      allowances: [
        { title: 'Chuyên cần', amount: '1.000.000đ' },
        { title: 'Hỗ trợ nhà ở', amount: '500.000đ' },
        { title: 'Đi lại xăng xe', amount: '300.000đ' },
      ],
      benefits: [
        { icon: 'Bed', title: 'Ăn ở miễn phí', description: 'Có KTX khang trang máy lạnh, máy giặt' },
        { icon: 'ShieldCheck', title: 'Bảo hiểm đầy đủ', description: 'Đóng BHXH, BHYT, BHTN theo luật' },
      ],
      positions: [
        { title: 'Công nhân sản xuất', vacancies: 50, salary: salaryRange, requirements: [], description: [] },
      ],
      hidden: false,
    };

    return {
      action: 'create',
      targetCompanyId: null,
      targetCompanyName: newCompanyData.shortName,
      summary: `Tạo mới hồ sơ công ty ${newCompanyData.shortName} (${newCompanyData.industrialPark} - ${newCompanyData.location})`,
      changes: [
        { field: 'name', label: 'Tên công ty', newValue: newCompanyData.name },
        { field: 'salaryRange', label: 'Mức thu nhập', newValue: salaryRange },
        { field: 'industrialPark', label: 'Khu công nghiệp', newValue: industrialPark },
      ],
      updates: newCompanyData,
      source: 'local_fallback',
    };
  }

  // 4. MẶC ĐỊNH: CẬP NHẬT CÔNG TY HIỆN CÓ
  const target = findMatchingCompany(prompt, companies);
  if (!target) {
    throw new Error(
      `Không tìm thấy tên công ty phù hợp trong câu lệnh "${prompt}". Vui lòng ghi rõ tên công ty (ví dụ: Foxconn, Samsung, Shopee, Luxshare...).`
    );
  }

  const updates: Partial<Company> = {};
  const changes: CopilotChangeItem[] = [];

  // 4.1 Cập nhật Thưởng chuyên cần
  // Ví dụ: "giảm thưởng xuống 1.2tr", "thưởng chuyên cần 1.5 triệu", "chuyên cần 1200k"
  if (
    normPrompt.includes('thuong') ||
    normPrompt.includes('chuyen can') ||
    normPrompt.includes('giam thuong') ||
    normPrompt.includes('tang thuong')
  ) {
    // Nhận diện số
    const numMatch = prompt.match(/(\d+(?:[.,]\d+)?)\s*(?:tr|triệu|k|nghìn|ngan|đ|vnd)/i) || prompt.match(/(\d+)/);
    if (numMatch) {
      let valStr = numMatch[1].replace(',', '.');
      let numVal = parseFloat(valStr);

      if (prompt.includes('k') || prompt.includes('nghìn')) {
        numVal = numVal * 1000;
      } else if (numVal < 50) {
        // ví dụ 1.2tr hoặc 12tr (nếu nói 12tr thưởng chuyên cần thì là 1.2tr hoặc 12tr)
        // nếu nhập "12tr" trong ngữ cảnh chuyên cần thường là 1.2 triệu hoặc 1.200.000đ
        if (numVal === 12 && normPrompt.includes('chuyen can')) {
          numVal = 1200000; // chuẩn hóa 12tr thành 1.2tr cho thưởng chuyên cần
        } else {
          numVal = numVal * 1000000;
        }
      }

      const formatted = numVal.toLocaleString('vi-VN') + 'đ';
      updates.attendanceBonus = formatted;
      updates.attendanceBonusNum = numVal;
      changes.push({
        field: 'attendanceBonus',
        label: 'Thưởng chuyên cần',
        oldValue: target.attendanceBonus,
        newValue: formatted,
      });
    }
  }

  // 4.2 Cập nhật Lương / Thu nhập dự kiến
  // Ví dụ: "tăng lương lên 11-15 triệu", "lương 10 - 14tr"
  const rangeMatch = prompt.match(/(\d+(?:[.,]\d+)?\s*(?:-|đến|–)\s*\d+(?:[.,]\d+)?\s*(?:triệu|tr))/i);
  if (rangeMatch) {
    const formattedRange = rangeMatch[1].replace(/tr$/i, 'triệu') + '/tháng';
    updates.salaryRange = formattedRange;
    changes.push({
      field: 'salaryRange',
      label: 'Mức thu nhập',
      oldValue: target.salaryRange,
      newValue: formattedRange,
    });
  }

  // 4.3 Cập nhật Lương cơ bản
  // Ví dụ: "lương cơ bản 5.5tr", "lương cứng 5.300.000"
  if (normPrompt.includes('luong co ban') || normPrompt.includes('luong cung')) {
    const baseMatch = prompt.match(/(?:lương cơ bản|lương cứng)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:tr|triệu|đ)?/i);
    if (baseMatch) {
      let num = parseFloat(baseMatch[1].replace(',', '.'));
      if (num < 50) num = num * 1000000;
      const formatted = num.toLocaleString('vi-VN') + 'đ';
      updates.basicSalary = formatted;
      updates.basicSalaryNum = num;
      changes.push({
        field: 'basicSalary',
        label: 'Lương cơ bản',
        oldValue: target.basicSalary,
        newValue: formatted,
      });
    }
  }

  // 4.4 Cập nhật Ăn ở KTX
  if (normPrompt.includes('ktx') || normPrompt.includes('an o')) {
    if (normPrompt.includes('mien phi') || normPrompt.includes('100%')) {
      updates.dormitoryInfo = 'Ký túc xá miễn phí 100%, có điều hòa, bình nóng lạnh và máy giặt';
      updates.badge = 'Bao ăn ở 100%';
    } else {
      updates.dormitoryInfo = 'Hỗ trợ ký túc xá khang trang máy lạnh, có xe đưa đón';
    }
    changes.push({
      field: 'dormitoryInfo',
      label: 'Ký túc xá (Ăn ở)',
      oldValue: target.dormitoryInfo,
      newValue: updates.dormitoryInfo,
    });
  }

  // 4.5 Cập nhật Huy hiệu
  if (normPrompt.includes('huy hieu') || normPrompt.includes('badge')) {
    const badgeMatch = prompt.match(/(?:huy hiệu|badge)\s*[:=]?\s*["']?([^"',.\n]+)["']?/i);
    if (badgeMatch) {
      updates.badge = badgeMatch[1].trim();
      changes.push({
        field: 'badge',
        label: 'Huy hiệu vàng',
        oldValue: target.badge,
        newValue: updates.badge,
      });
    }
  }

  // Nếu không nhận diện được trường số liệu cụ thể, kiểm tra cập nhật mô tả
  if (changes.length === 0) {
    updates.jobDescription = prompt;
    changes.push({
      field: 'jobDescription',
      label: 'Mô tả công việc',
      oldValue: '(nội dung cũ)',
      newValue: prompt.slice(0, 80) + '...',
    });
  }

  return {
    action: 'update',
    targetCompanyId: target.id,
    targetCompanyName: target.shortName,
    summary: `Cập nhật thông tin cho công ty ${target.shortName}`,
    changes,
    updates,
    source: 'local_fallback',
  };
}

/**
 * Hàm điều phối chính: Thử gọi AI Gemini trước, nếu lỗi hoặc chưa có key sẽ tự động chuyển sang phân tích cục bộ
 */
export async function executeAdminCopilot(
  prompt: string,
  companies: Company[]
): Promise<CopilotResult> {
  try {
    const aiResult = await analyzeWithGeminiCopilot(prompt, companies);
    return aiResult;
  } catch (err: any) {
    console.info('Chuyển sang bộ phân tích dự phòng cục bộ:', err?.message || err);
    return analyzeWithLocalCopilot(prompt, companies);
  }
}
