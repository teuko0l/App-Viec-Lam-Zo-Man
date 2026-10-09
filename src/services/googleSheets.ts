import { ConsultationApplication } from '../types';

export const DEFAULT_SPREADSHEET_ID = '1XB64DdHt3abwDY3Z42jgxo9qPgpr9lM0GDv32siIZKc';
export const DEFAULT_SPREADSHEET_URL =
  'https://docs.google.com/spreadsheets/d/1XB64DdHt3abwDY3Z42jgxo9qPgpr9lM0GDv32siIZKc/edit?gid=0#gid=0';

/**
 * Trích xuất spreadsheet ID từ URL hoặc trả về nguyên chuỗi nếu là ID hợp lệ
 */
export function extractSpreadsheetId(inputOrUrl?: string): string {
  if (!inputOrUrl || !inputOrUrl.trim()) return DEFAULT_SPREADSHEET_ID;
  const trimmed = inputOrUrl.trim();
  const match = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

/**
 * Định dạng range an toàn cho Google Sheets API v4 (bọc tên sheet trong nháy đơn nếu có khoảng trắng hoặc ký tự đặc biệt)
 */
export function formatSheetRange(sheetTitle: string, cellRange: string): string {
  if (!sheetTitle) return cellRange;
  const needsQuotes = sheetTitle.includes(' ') || sheetTitle.includes("'") || /[^a-zA-Z0-9_]/.test(sheetTitle);
  const safeTitle = needsQuotes ? `'${sheetTitle.replace(/'/g, "''")}'` : sheetTitle;
  return `${safeTitle}!${cellRange}`;
}

/**
 * Lấy tên tab sheet đầu tiên của bảng tính
 */
export async function getFirstSheetTitle(
  spreadsheetId: string,
  accessToken: string
): Promise<string> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(
      errorJson?.error?.message ||
        `Lỗi khi truy cập bảng Google Sheets (${res.status} ${res.statusText})`
    );
  }

  const data = await res.json();
  const sheets = data.sheets || [];
  if (sheets.length > 0 && sheets[0].properties?.title) {
    return sheets[0].properties.title;
  }
  return 'Sheet1';
}

/**
 * Đảm bảo dòng tiêu đề (Header row) tồn tại ở hàng 1
 */
export async function ensureSheetHeaders(
  spreadsheetId: string,
  sheetTitle: string,
  accessToken: string
): Promise<void> {
  try {
    const headerRange = formatSheetRange(sheetTitle, 'A1:J1');
    const checkRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(headerRange)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (checkRes.ok) {
      const checkData = await checkRes.json();
      if (checkData.values && checkData.values.length > 0 && checkData.values[0].length > 0) {
        return; // Đã có header
      }
    }

    // Ghi hàng tiêu đề chuẩn
    const headerRow = [
      'Mã hồ sơ',
      'Thời gian đăng ký',
      'Họ và tên ứng viên',
      'Số điện thoại (Zalo)',
      'Năm sinh',
      'Nhà máy / Công ty',
      'Vị trí ứng tuyển',
      'Giấy tờ CCCD',
      'Ghi chú ứng viên',
      'Trạng thái tuyển dụng',
    ];

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        headerRange
      )}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: headerRange,
          majorDimension: 'ROWS',
          values: [headerRow],
        }),
      }
    );
  } catch (err) {
    console.warn('Không thể khởi tạo hàng tiêu đề bảng Google Sheet:', err);
  }
}

/**
 * Thêm một dòng hồ sơ ứng viên vào Google Sheet qua Google Sheets API v4
 */
export async function appendApplicationToGoogleSheet(
  app: ConsultationApplication,
  accessToken: string,
  customSpreadsheetId?: string
): Promise<{ success: boolean; updatedRange?: string }> {
  const spreadsheetId = extractSpreadsheetId(customSpreadsheetId);
  const sheetTitle = await getFirstSheetTitle(spreadsheetId, accessToken);

  // Đảm bảo có hàng tiêu đề
  await ensureSheetHeaders(spreadsheetId, sheetTitle, accessToken);

  const statusTextMap: Record<string, string> = {
    pending: 'Chờ liên hệ',
    contacted: 'Đã liên hệ tư vấn',
    interview_scheduled: 'Đã hẹn lịch nhận việc',
    rejected: 'Đã từ chối',
  };

  const rowValues = [
    app.id,
    app.appliedDate || new Date().toLocaleString('vi-VN'),
    app.fullName,
    app.phone,
    app.birthYear,
    app.companyName,
    app.positionTitle || 'Công nhân sản xuất',
    app.hasCccd ? 'Đã có CCCD' : 'Chỉ có Giấy hẹn / VNeID',
    app.notes || '',
    statusTextMap[app.status] || app.status,
  ];

  const appendRange = formatSheetRange(sheetTitle, 'A:J');
  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      appendRange
    )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowValues],
      }),
    }
  );

  if (!appendRes.ok) {
    const errorJson = await appendRes.json().catch(() => ({}));
    throw new Error(
      errorJson?.error?.message ||
        `Lỗi khi ghi dữ liệu vào Google Sheet (${appendRes.status} ${appendRes.statusText})`
    );
  }

  const result = await appendRes.json();
  return {
    success: true,
    updatedRange: result?.updates?.updatedRange,
  };
}

/**
 * Đồng bộ danh sách nhiều hồ sơ lên Google Sheet
 */
export async function syncMultipleApplicationsToGoogleSheet(
  apps: ConsultationApplication[],
  accessToken: string,
  customSpreadsheetId?: string
): Promise<{ successCount: number; errors: string[] }> {
  if (!apps || apps.length === 0) {
    return { successCount: 0, errors: [] };
  }

  const spreadsheetId = extractSpreadsheetId(customSpreadsheetId);
  const sheetTitle = await getFirstSheetTitle(spreadsheetId, accessToken);
  await ensureSheetHeaders(spreadsheetId, sheetTitle, accessToken);

  const statusTextMap: Record<string, string> = {
    pending: 'Chờ liên hệ',
    contacted: 'Đã liên hệ tư vấn',
    interview_scheduled: 'Đã hẹn lịch nhận việc',
    rejected: 'Đã từ chối',
  };

  const rows = apps.map((app) => [
    app.id,
    app.appliedDate || new Date().toLocaleString('vi-VN'),
    app.fullName,
    app.phone,
    app.birthYear,
    app.companyName,
    app.positionTitle || 'Công nhân sản xuất',
    app.hasCccd ? 'Đã có CCCD' : 'Chỉ có Giấy hẹn / VNeID',
    app.notes || '',
    statusTextMap[app.status] || app.status,
  ]);

  const appendRange = formatSheetRange(sheetTitle, 'A:J');
  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      appendRange
    )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (!appendRes.ok) {
    const errorJson = await appendRes.json().catch(() => ({}));
    throw new Error(
      errorJson?.error?.message ||
        `Lỗi khi gửi dữ liệu lên Google Sheet (${appendRes.status} ${appendRes.statusText})`
    );
  }

  return { successCount: apps.length, errors: [] };
}

/**
 * Gửi hồ sơ ứng viên trực tiếp qua Webhook Google Apps Script (Hỗ trợ tự động 24/7 không cần đăng nhập)
 */
export async function sendApplicationViaWebhook(
  app: ConsultationApplication,
  webhookUrl: string
): Promise<boolean> {
  if (!webhookUrl || !webhookUrl.trim()) return false;
  try {
    const statusTextMap: Record<string, string> = {
      pending: 'Chờ liên hệ',
      contacted: 'Đã liên hệ tư vấn',
      interview_scheduled: 'Đã hẹn lịch nhận việc',
      rejected: 'Đã từ chối',
    };
    const payload = {
      id: app.id,
      appliedDate: app.appliedDate || new Date().toLocaleString('vi-VN'),
      fullName: app.fullName,
      phone: app.phone,
      birthYear: app.birthYear,
      companyName: app.companyName,
      positionTitle: app.positionTitle || 'Công nhân sản xuất',
      hasCccd: app.hasCccd ? 'Đã có CCCD' : 'Chỉ có Giấy hẹn / VNeID',
      notes: app.notes || '',
      status: statusTextMap[app.status] || app.status,
    };
    await fetch(webhookUrl.trim(), {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return true;
  } catch (err) {
    console.warn('Lỗi khi gửi qua Webhook Google Apps Script:', err);
    return false;
  }
}
