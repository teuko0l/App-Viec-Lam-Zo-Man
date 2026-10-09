import React, { useState, useEffect, useRef } from 'react';
import {
  Headphones,
  X,
  Send,
  PhoneCall,
  Sparkles,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { ChatFaqItem, Company, ConsultationApplication } from '../types';

interface Props {
  faqList: ChatFaqItem[];
  hotline: string;
  companies?: Company[];
  onOpenApplyModal?: (company?: Company) => void;
  onCallHotline?: () => void;
  onSaveCandidatePhone?: (application: ConsultationApplication) => Promise<{ success: boolean; synced?: boolean }> | void;
}

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  time: string;
  suggestedAction?: 'call_hotline' | 'apply';
  capturedPhone?: string;
  isLeadSaved?: boolean;
}

// Hàm chuẩn hóa chuỗi tiếng Việt không dấu để so khớp thông minh
function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Trích xuất số điện thoại di động Việt Nam chuẩn xác từ tin nhắn người dùng
 * Bắt các định dạng: 0988123456, 0988 123 456, 0988.123.456, 0988-123-456, +84 988 123 456, 84988123456...
 */
export function extractVietnamesePhone(text: string): { raw: string; clean: string } | null {
  if (!text) return null;

  // 1. Tìm các chuỗi khớp định dạng di động Việt Nam (đầu 03, 05, 07, 08, 09 hoặc +84)
  const regex = /(?:(?:\+?84)|0)[35789](?:[\s.\-_]*\d){8}\b/g;
  const matches = text.match(regex);
  if (matches && matches.length > 0) {
    const raw = matches[0];
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('84')) {
      digits = '0' + digits.slice(2);
    }
    if (digits.length === 10 && /^0[35789]\d{8}$/.test(digits)) {
      return { raw, clean: digits };
    }
  }

  // 2. Dự phòng: chuỗi liền kề 10 chữ số bắt đầu bằng 03, 05, 07, 08, 09
  const cleanDigits = text.replace(/[\s.\-_]/g, '');
  const fallback = cleanDigits.match(/\b0[35789]\d{8}\b/);
  if (fallback) {
    return { raw: fallback[0], clean: fallback[0] };
  }

  return null;
}

/**
 * Trích xuất họ tên nếu ứng viên có xưng tên trong tin nhắn
 */
export function extractCandidateName(text: string): string | null {
  const patterns = [
    /(?:em|tôi|mình|anh|chị)\s+tên\s+(?:là\s+)?([A-ZÀ-Ỹa-zà-ỹ\s]{2,25})/i,
    /(?:họ\s*và?\s*tên|họ\s*tên)\s*(?::|là)?\s*([A-ZÀ-Ỹa-zà-ỹ\s]{2,25})/i,
    /(?:tên\s+(?:em|tôi|mình)\s+là)\s+([A-ZÀ-Ỹa-zà-ỹ\s]{2,25})/i,
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m && m[1]) {
      const clean = m[1].trim().replace(/\s+/g, ' ');
      if (
        clean.length >= 2 &&
        !['tư vấn', 'ứng tuyển', 'công nhân', 'ở', 'tại', 'nhà máy', 'sđt', 'số điện thoại'].includes(
          clean.toLowerCase()
        )
      ) {
        return clean;
      }
    }
  }
  return null;
}

/**
 * Nhận diện năm sinh nếu ứng viên có đề cập
 */
export function extractBirthYear(text: string): number | undefined {
  const match = text.match(/(?:sinh\s+năm|sn|năm\s+sinh)?\s*\b(19[7-9]\d|200[0-8])\b/i);
  if (match && match[1]) {
    const yr = parseInt(match[1], 10);
    if (yr >= 1970 && yr <= 2008) return yr;
  }
  return undefined;
}

/**
 * Nhận diện nhà máy/công ty mà ứng viên hỏi thăm
 */
export function matchCompanyFromText(text: string, companies: Company[]): Company | null {
  const norm = normalizeText(text);
  for (const comp of companies) {
    const normShort = normalizeText(comp.shortName);
    const normName = normalizeText(comp.name);
    if (normShort.length >= 3 && norm.includes(normShort)) return comp;
    if (normName.length >= 3 && norm.includes(normName)) return comp;
  }
  return null;
}

export const AiChatBubble: React.FC<Props> = ({
  faqList,
  hotline,
  companies = [],
  onOpenApplyModal,
  onCallHotline,
  onSaveCandidatePhone,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const savedPhonesRef = useRef<Set<string>>(new Set());

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: 'Dạ em chào anh/chị ạ! Em là Chuyên viên tư vấn nhân sự tại khu vực Bắc Ninh & Bắc Giang. Em có thể giải đáp chi tiết cho anh/chị về thủ tục nhận việc, tiền lương cơ bản, chế độ tăng ca, ăn ở KTX miễn phí hoặc thông tin từng nhà máy. Anh/chị cần em hỗ trợ công việc nào cứ nhắn tin cho em nhé!',
      time: 'Vừa xong',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  // Bộ câu hỏi gợi ý nhanh lấy từ dữ liệu do Quản trị viên huấn luyện
  const quickQuestions = faqList.slice(0, 4);

  // Kéo thả & Trôi nổi chạy theo khi người dùng cuộn hoặc kéo màn hình
  const [dragY, setDragY] = useState<number>(0);
  const [scrollFollowY, setScrollFollowY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startDragYRef = useRef(0);
  const hasMovedRef = useRef(false);

  // Lắng nghe sự kiện kéo/cuộn màn hình để bóng chat chạy theo mượt mà
  useEffect(() => {
    let ticking = false;

    const updateScrollPosition = () => {
      const el = document.getElementById('mobile-scroll-container');
      let scrollTop = 0;
      let maxScroll = 1;

      if (el) {
        scrollTop = el.scrollTop;
        maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
      } else {
        scrollTop = window.scrollY || document.documentElement.scrollTop;
        maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      }

      const progress = Math.min(1, Math.max(0, scrollTop / maxScroll));
      // Khi kéo/cuộn màn hình xuống, bóng chat trôi theo lên trên một khoảng tự nhiên (từ 0 đến 240px)
      // Khi cuộn ngược lên đỉnh trang, bóng chat hạ xuống vị trí ban đầu
      const targetOffset = Math.round(progress * 240);
      setScrollFollowY(targetOffset);
      ticking = false;
    };

    const handleContainerScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollPosition);
        ticking = true;
      }
    };

    const containerEl = document.getElementById('mobile-scroll-container');
    if (containerEl) {
      containerEl.addEventListener('scroll', handleContainerScroll, { passive: true });
    }
    window.addEventListener('scroll', handleContainerScroll, { passive: true });

    // Gọi lần đầu để đồng bộ vị trí
    updateScrollPosition();

    return () => {
      if (containerEl) {
        containerEl.removeEventListener('scroll', handleContainerScroll);
      }
      window.removeEventListener('scroll', handleContainerScroll);
    };
  }, []);

  const onDragStart = (clientY: number) => {
    isDraggingRef.current = true;
    setIsDragging(true);
    startYRef.current = clientY;
    startDragYRef.current = dragY;
    hasMovedRef.current = false;
  };

  const onDragMove = (clientY: number) => {
    if (!isDraggingRef.current) return;
    const deltaY = startYRef.current - clientY; // vuốt lên => deltaY > 0 => bottom tăng
    if (Math.abs(deltaY) > 5) {
      hasMovedRef.current = true;
    }
    // Giới hạn chạy dọc màn hình trong khoảng 0px đến 460px
    const nextY = Math.max(-10, Math.min(480, startDragYRef.current + deltaY));
    setDragY(nextY);
  };

  const onDragEnd = () => {
    isDraggingRef.current = false;
    setIsDragging(false);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      onDragMove(e.clientY);
    };
    const handleMouseUp = () => {
      onDragEnd();
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingRef.current && e.touches[0]) {
        onDragMove(e.touches[0].clientY);
      }
    };
    const handleTouchEnd = () => {
      onDragEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // Trợ lý nhân sự AI tư vấn thông minh (kết nối endpoint Gemini Flash + fallback thấu hiểu tâm lý)
  const getAiConsultantReply = async (
    userQuery: string,
    history: Message[]
  ): Promise<{ text: string; action?: 'apply' | 'call_hotline' }> => {
    try {
      const res = await fetch('/api/chat/consultant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userQuery,
          conversationHistory: history.map((m) => ({ sender: m.sender, text: m.text })),
          faqList,
          companies,
          hotline,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.reply) {
          const lower = data.reply.toLowerCase();
          const action =
            lower.includes('đăng ký') || lower.includes('ứng tuyển') || lower.includes('để lại thông tin')
              ? 'apply'
              : lower.includes('hotline')
              ? 'call_hotline'
              : undefined;
          return { text: data.reply, action };
        }
      }
    } catch (e) {
      console.warn('Dùng bộ tư vấn dự phòng HR Consultant:', e);
    }

    // Bộ trả lời dự phòng chất lượng cao, giàu cảm xúc và thấu hiểu tâm lý người lao động
    return getEmpatheticFallbackAnswer(userQuery);
  };

  // Trình trả lời dự phòng tận tâm, đi sâu vào chế độ thực tế và hướng dẫn đăng ký
  const getEmpatheticFallbackAnswer = (query: string): { text: string; action?: 'apply' | 'call_hotline' } => {
    const normQuery = normalizeText(query);

    // 1. Kiểm tra khớp theo từ khóa của từng câu hỏi quản trị đã huấn luyện
    for (const item of faqList) {
      const normQuestion = normalizeText(item.question);
      const isMatched =
        normQuestion.includes(normQuery) ||
        normQuery.includes(normQuestion) ||
        (Array.isArray(item.keywords) &&
          item.keywords.some((kw) => {
            const normKw = normalizeText(kw);
            return normKw && (normQuery.includes(normKw) || normKw.includes(normQuery));
          }));

      if (isMatched) {
        return {
          text: `Dạ em xin giải đáp chi tiết thắc mắc của anh/chị như sau ạ:\n\n${item.answer}\n\n👉 Anh/chị hoàn toàn yên tâm là các nhà máy tại Bắc Ninh - Bắc Giang tuyển trực tiếp 100% MIỄN PHÍ, KHÔNG THU CỌC và KHÔNG GIỮ CCCD GỐC của anh/chị nhé. Anh/chị có thể bấm nút [Đăng ký để lại thông tin] ngay bên dưới để cán bộ tuyển dụng gọi điện xếp xe đón và làm thủ tục nhận việc trong ngày ạ!`,
          action: 'apply',
        };
      }
    }

    // 2. Kiểm tra nếu hỏi về công ty cụ thể (Samsung, Foxconn, Shopee, Luxshare, Goertek, Pegatron...)
    for (const comp of companies) {
      const normCompName = normalizeText(comp.name);
      const normShort = normalizeText(comp.shortName);
      const normLogo = normalizeText(comp.logoText);

      if (
        normQuery.includes(normShort) ||
        normQuery.includes(normCompName) ||
        (normLogo.length >= 3 && normQuery.includes(normLogo))
      ) {
        if (comp.hidden) {
          return {
            text: `Dạ em xin phép thông báo, hiện tại ${comp.name} (${comp.shortName}) đang TẠM DỪNG đợt nhận hồ sơ do đã đủ chỉ tiêu công nhân trong tuần này rồi ạ.\n\nTuy nhiên, các nhà máy lớn lân cận cùng KCN đang tuyển gấp với mức thu nhập tương đương (từ 9 - 14 triệu/tháng, bao ăn ở KTX miễn phí). Anh/chị bấm nút [Đăng ký để lại thông tin] bên dưới hoặc gọi Hotline ${hotline} để em xếp anh/chị vào nhà máy đang cần người gấp đi làm ngay nhé ạ!`,
            action: 'apply',
          };
        }

        return {
          text: `Dạ em chia sẻ tường tận về chế độ đi làm tại ${comp.name} (${comp.shortName}) để anh/chị yên tâm nhé ạ:\n\n• Địa điểm: ${comp.industrialPark} - ${comp.location}\n• Mức thu nhập thực lĩnh: Từ ${comp.salaryRange} (đã bao gồm lương cơ bản, tiền tăng ca và phụ cấp hàng tháng).\n• Lương cơ bản: ${comp.basicSalary} (dùng đóng BHXH và tính tiền tăng ca nhân 1.5 ngày thường, 2.0 ngày nghỉ).\n• Thưởng chuyên cần: ${comp.attendanceBonus}/tháng cho công nhân đi làm đủ ngày công.\n• Ăn ở & Ký túc xá: ${comp.dormitoryInfo || 'KTX miễn phí 100% có điều hòa, bình nóng lạnh, máy giặt'} và ${comp.mealInfo || 'được bao cơm ca nóng sốt miễn phí'}.\n• Xe đưa đón: ${comp.transportationInfo || 'Có xe đưa đón công nhân nhiều tuyến nội ngoại tỉnh'}.\n• Cam kết vàng: Nền tảng tuyển trực tiếp 100% MIỄN PHÍ, KHÔNG THU PHÍ MÔI GIỚI, KHÔNG ĐẶT CỌC và KHÔNG GIỮ CCCD GỐC của anh/chị ạ.\n\n👉 Đợt tuyển dụng này đang ưu tiên nhận người đi làm ngay trong tuần. Anh/chị bấm nút [Đăng ký để lại thông tin] bên dưới, phòng nhân sự sẽ liên hệ hướng dẫn xe đón và làm thủ tục nhận phòng KTX ngay hôm nay nhé ạ!`,
          action: 'apply',
        };
      }
    }

    // 3. Nếu hỏi chung về thủ tục, cccd, tiền lương, ăn ở
    if (normQuery.includes('cccd') || normQuery.includes('ho so') || normQuery.includes('thu tuc')) {
      return {
        text: `Dạ anh/chị hoàn toàn yên tâm về thủ tục nhé ạ! Khi đi làm, anh/chị chỉ cần mang theo:\n1. Căn cước công dân (CCCD) gắn chip bản gốc (nhà máy chỉ đối chiếu xong trả lại anh/chị ngay trong ngày, tuyệt đối KHÔNG GIỮ CCCD GỐC ạ).\n2. 02 bản photo CCCD (công chứng hoặc không đều được hỗ trợ).\n3. Không yêu cầu bằng cấp đối với công nhân phổ thông, được đào tạo tay nghề miễn phí từ ngày đầu.\n\n👉 Anh/chị bấm nút [Đăng ký để lại thông tin] bên dưới để em chuyển hồ sơ sang phòng nhân sự tiếp nhận ngay nhé ạ!`,
        action: 'apply',
      };
    }

    // 4. Phản hồi chung ấm áp, ân cần
    return {
      text: `Dạ em đã ghi nhận câu hỏi của anh/chị: "${query}".\n\nHiện tại các khu công nghiệp tại Bắc Ninh & Bắc Giang (KCN Quế Võ, Yên Phong, Quang Châu, Vân Trung, VSIP) đang có rất nhiều việc làm phổ thông tốt, mức thu nhập từ 9 - 14 triệu/tháng, bao ăn 2 - 3 bữa và có KTX điều hòa máy giặt miễn phí 100%.\n\nEm khuyên anh/chị nên đăng ký sớm để chọn được ca làm việc và nhà máy gần nhất. Anh/chị chỉ cần bấm nút [Đăng ký để lại thông tin] bên dưới hoặc gọi ngay Hotline (${hotline}), em sẽ trực tiếp tư vấn và hướng dẫn xe đón anh/chị nhận việc miễn phí 100% nhé ạ!`,
      action: 'apply',
    };
  };

  const handleSendMessage = async (
    textToSend?: string,
    customMeta?: { fullName?: string; companyId?: string }
  ) => {
    const text = (textToSend || input).trim();
    if (!text) return;

    // 1. Tự động kiểm tra phát hiện số điện thoại ứng viên để lại trong chat
    const phoneInfo = extractVietnamesePhone(text);
    let capturedPhone: string | undefined;
    let isLeadSaved: boolean | undefined;
    let leadConfirmationPrefix = '';

    if (phoneInfo) {
      capturedPhone = phoneInfo.clean;
      if (!savedPhonesRef.current.has(phoneInfo.clean)) {
        savedPhonesRef.current.add(phoneInfo.clean);
        isLeadSaved = true;

        const matchedComp = customMeta?.companyId
          ? companies.find((c) => c.id === customMeta.companyId)
          : matchCompanyFromText(text, companies);

        const extractedName = customMeta?.fullName?.trim() || extractCandidateName(text);
        const birthYear = extractBirthYear(text) || 2000;

        const newLead: ConsultationApplication = {
          id: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          companyId: matchedComp ? matchedComp.id : (companies[0]?.id || 'all-consulting'),
          companyName: matchedComp ? matchedComp.name : 'Tư vấn việc làm Bắc Ninh - Bắc Giang',
          positionTitle: matchedComp?.positions?.[0]?.title
            ? `${matchedComp.positions[0].title} (Chatbot)`
            : 'Công nhân sản xuất (Tư vấn Chatbot)',
          fullName: extractedName || 'Ứng viên (Để lại SĐT qua Chatbot)',
          phone: phoneInfo.clean,
          birthYear,
          hasCccd: true,
          appliedDate: new Date().toLocaleString('vi-VN'),
          notes: `Ứng viên để lại SĐT qua Chatbot tư vấn: "${text}".`,
          status: 'pending',
        };

        // Kích hoạt lưu hồ sơ & tự động gửi lên Google Sheets
        if (onSaveCandidatePhone) {
          onSaveCandidatePhone(newLead);
        }

        leadConfirmationPrefix = `Dạ em đã tiếp nhận thông tin của anh/chị rồi ạ! Em cảm ơn anh/chị đã để lại thông tin liên hệ. Chuyên viên tư vấn tuyển dụng sẽ liên hệ lại với anh/chị trong thời gian sớm nhất để hỗ trợ giải đáp và hướng dẫn chu đáo nhé ạ!\n\n`;
      } else {
        leadConfirmationPrefix = `Dạ thông tin liên hệ của anh/chị đã được tiếp nhận rồi ạ. Em cảm ơn anh/chị, chuyên viên tư vấn sẽ sớm liên hệ lại với anh/chị nhé ạ!\n\n`;
      }
    }

    const userMsg: Message = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      capturedPhone,
      isLeadSaved,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const { text: replyText, action } = await getAiConsultantReply(text, [...messages, userMsg]);
      const finalReply = leadConfirmationPrefix ? `${leadConfirmationPrefix}${replyText}` : replyText;
      const botMsg: Message = {
        id: 'reply-' + Date.now(),
        sender: 'bot',
        text: finalReply,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        suggestedAction: action,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e) {
      const fallback = getEmpatheticFallbackAnswer(text);
      const finalReply = leadConfirmationPrefix ? `${leadConfirmationPrefix}${fallback.text}` : fallback.text;
      const botMsg: Message = {
        id: 'reply-' + Date.now(),
        sender: 'bot',
        text: finalReply,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        suggestedAction: fallback.action,
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'bot',
        text: 'Dạ, em đã làm mới cuộc trò chuyện. Anh/chị cần em hỗ trợ về công ty, tiền lương, hay hồ sơ đi làm nào nữa không ạ?',
        time: 'Vừa xong',
      },
    ]);
  };

  return (
    <>
      {/* 1. BONG BÓNG CHAT CHẠY THEO KHI KÉO/CUỘN MÀN HÌNH VÀ CÓ THỂ KÉO THẢ DI CHUYỂN DỌC */}
      <div
        style={{
          bottom: isOpen ? '16px' : `${Math.max(56, 68 + dragY + scrollFollowY)}px`,
        }}
        className={`fixed sm:absolute right-3 z-50 flex flex-col items-end pointer-events-auto transition-[bottom] ${
          isDragging ? 'duration-0 cursor-grabbing' : 'duration-300 ease-out cursor-grab'
        }`}
      >
        {!isOpen && (
          <div
            onMouseDown={(e) => onDragStart(e.clientY)}
            onTouchStart={(e) => {
              if (e.touches[0]) onDragStart(e.touches[0].clientY);
            }}
            onClick={(e) => {
              if (hasMovedRef.current) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              setIsOpen(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white pl-2 pr-3 py-1.5 rounded-full shadow-2xl border-2 border-white hover:scale-105 active:scale-95 transition-all select-none touch-none group ring-2 ring-blue-500/30"
            title="Bấm để trò chuyện hoặc kéo lên/xuống để đổi vị trí"
          >
            {/* Avatar & Online Dot */}
            <div className="relative w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 border border-white/40 pointer-events-none">
              <Headphones className="w-4 h-4 text-emerald-300" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full animate-pulse" />
            </div>

            {/* Tên bong bóng hiển thị cố định */}
            <div className="text-left select-none pointer-events-none">
              <div className="text-[11px] font-black tracking-tight leading-tight flex items-center gap-1">
                <span>Nhân viên tư vấn</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>
              <div className="text-[9px] text-blue-100 font-medium">Hỗ trợ 24/7 · Miễn phí</div>
            </div>
          </div>
        )}

        {/* 2. CỬA SỔ CHAT TOÀN DIỆN VỚI NHÂN VIÊN TƯ VẤN */}
        {isOpen && (
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-[calc(100vw-36px)] max-w-[360px] h-[480px] max-h-[75vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header Cửa Sổ Chat */}
            <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="relative w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0 border border-white/30">
                  <Headphones className="w-5 h-5 text-emerald-300" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-900 rounded-full" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm leading-tight flex items-center gap-1.5">
                    <span>Nhân viên tư vấn</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-500/30 text-emerald-300 rounded border border-emerald-400/40">
                      AI Tuyển Dụng
                    </span>
                  </h4>
                  <p className="text-[10px] text-blue-100 mt-0.5 font-medium">
                    Hỗ trợ lao động Bắc Ninh - Bắc Giang
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleResetChat}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Làm mới cuộc trò chuyện"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Đóng chat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Thân Tin Nhắn (Messages Scroll Area) */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50 text-xs">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.sender === 'bot' && (
                    <div className="w-7 h-7 rounded-xl bg-blue-700 text-white flex items-center justify-center shrink-0 text-[10px] font-black shadow-xs">
                      TV
                    </div>
                  )}

                  <div className="max-w-[82%] space-y-1">
                    <div
                      className={`p-3 rounded-2xl leading-relaxed whitespace-pre-line text-xs shadow-xs ${
                        m.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-br-xs font-medium'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs font-normal'
                      }`}
                    >
                      {m.text}

                      {/* Huy hiệu tiếp nhận thông tin liên hệ */}
                      {m.capturedPhone && m.sender === 'user' && (
                        <div className="mt-2 pt-1.5 border-t border-white/20 flex items-center gap-1.5 text-[10px] font-medium text-emerald-200 animate-in fade-in">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                          <span>✓ Đã tiếp nhận thông tin liên hệ</span>
                        </div>
                      )}
                    </div>

                    {/* Nút hành động kêu gọi đăng ký trực tiếp từ tư vấn AI */}
                    {m.sender === 'bot' && (m.suggestedAction === 'apply' || m.suggestedAction === 'call_hotline') && (
                      <div className="pt-1 flex flex-wrap gap-1.5 animate-in fade-in">
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenApplyModal) onOpenApplyModal();
                            setIsOpen(false);
                          }}
                          className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-all"
                        >
                          <Sparkles className="w-3 h-3 text-amber-300" />
                          <span>Đăng ký để lại thông tin</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onCallHotline) onCallHotline();
                            else window.location.href = `tel:${hotline.replace(/\s+/g, '')}`;
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <PhoneCall className="w-3 h-3 text-emerald-600" />
                          <span>Gọi Hotline</span>
                        </button>
                      </div>
                    )}

                    <span
                      className={`text-[9px] text-slate-400 block px-1 ${
                        m.sender === 'user' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {m.time}
                    </span>
                  </div>
                </div>
              ))}

              {/* Trạng thái đang trả lời */}
              {isTyping && (
                <div className="flex gap-2 items-center text-slate-500 text-xs">
                  <div className="w-7 h-7 rounded-xl bg-blue-700 text-white flex items-center justify-center shrink-0 text-[10px] font-black">
                    TV
                  </div>
                  <div className="bg-white border border-slate-200 p-2.5 rounded-2xl rounded-bl-xs flex items-center gap-1 shadow-xs">
                    <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Gợi ý câu hỏi nhanh (Học từ bộ câu hỏi do Quản trị viên nhập) */}
            {quickQuestions.length > 0 && (
              <div className="bg-slate-100/90 border-t border-slate-200 px-3 py-2 shrink-0">
                <div className="text-[10px] font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Câu hỏi thường gặp (Bấm để hỏi ngay):</span>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {quickQuestions.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => handleSendMessage(q.question)}
                      className="shrink-0 text-[11px] font-semibold text-blue-800 bg-white hover:bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-xl shadow-xs transition-colors cursor-pointer text-left line-clamp-1 max-w-[240px]"
                    >
                      {q.question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Ô Nhập Tin Nhắn */}
            <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
              <input
                type="text"
                placeholder="Nhập câu hỏi (CCCD, KTX, tiền lương, công ty...)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="flex-1 px-3.5 py-2.5 bg-slate-100 rounded-2xl text-xs text-slate-900 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!input.trim()}
                className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-2xl cursor-pointer transition-colors shadow-xs shrink-0 active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
