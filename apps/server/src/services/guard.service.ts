import type { GuardIssue, GuardIssueKind, LangCode } from '@convocart/contracts';

export interface GuardAnalysisResult {
  issues: GuardIssue[];
  blocking: boolean;
}

interface RuleDefinition {
  kind: GuardIssueKind;
  regex: RegExp;
  isBlocking: boolean;
  explanation: Record<LangCode, string>;
  getSuggestion?: (match: RegExpExecArray, text: string) => string;
}

function makeExplanation(translations: { en: string; hi?: string; ja?: string }): Record<LangCode, string> {
  const en = translations.en;
  return {
    en,
    hi: translations.hi ?? en,
    ja: translations.ja ?? en,
    ta: translations.hi ?? en,
    te: translations.hi ?? en,
    kn: translations.hi ?? en,
    bn: translations.hi ?? en,
    mr: translations.hi ?? en,
  };
}

const RULES: RuleDefinition[] = [
  // 1. Scam Signals: off-platform messaging or unauthorized payment channels (Always Blocking)
  {
    kind: 'scam_signal',
    regex: /\b(whatsapp|wa\.me|telegram|t\.me|signal|viber|wechat)\b/i,
    isBlocking: true,
    explanation: makeExplanation({
      en: 'Off-platform contact detected. Keep all communication within Handshake to maintain deal protection and dispute resolution.',
      hi: 'प्लेटफ़ॉर्म से बाहर संपर्क का पता चला। सौदे की सुरक्षा और विवाद समाधान के लिए सभी बातचीत हैंडशेक पर ही रखें।',
      ja: 'プラットフォーム外での連絡が検出されました。取引の保護と異議申し立てのために、すべてのやり取りをHandshake内で行ってください。',
    }),
    getSuggestion: () => 'Keep chat on Handshake',
  },
  {
    kind: 'scam_signal',
    regex: /\b(wire transfer|western union|moneygram|gift cards?|crypto|usdt|bitcoin|btc|eth|pay outside|off app|off-platform)\b/i,
    isBlocking: true,
    explanation: makeExplanation({
      en: 'Unverified or off-platform payment method requested. Only agree to terms within Handshake.',
      hi: 'अपुष्ट या प्लेटफ़ॉर्म से बाहर भुगतान पद्धति का अनुरोध किया गया। केवल हैंडशेक के भीतर शर्तों पर सहमत हों।',
      ja: '未確認またはプラットフォーム外の支払い方法が要求されました。Handshake内でのみ合意してください。',
    }),
    getSuggestion: () => 'Pay securely through agreed Handshake terms',
  },
  {
    kind: 'scam_signal',
    regex: /(?:call|msg|text|contact|reach)\s*(?:me\s*)?(?:on|at)?\s*(\+?\d[\d\s\-]{8,14}\d)/i,
    isBlocking: true,
    explanation: makeExplanation({
      en: 'Phone number shared to take chat off-platform. Conversations outside Handshake cannot be protected.',
      hi: 'बातचीत को बाहर ले जाने के लिए फ़ोन नंबर साझा किया गया। हैंडशेक के बाहर की बातचीत सुरक्षित नहीं हो सकती।',
      ja: '外部連絡用の電話番号が検出されました。Handshake外でのやり取りは保護されません。',
    }),
    getSuggestion: () => 'Continue chatting here on Handshake',
  },

  // 2. Currency Ambiguity: bare numbers or unclear lakh/crore without currency symbol (Blocking)
  {
    kind: 'currency',
    regex: /\b(\d+(?:\.\d+)?)\s*(?:lakhs?|lacs?|crores?|cr)\b/i,
    isBlocking: true,
    explanation: makeExplanation({
      en: 'Large sum mentioned without currency symbol. Specify whether this is in INR (₹) or another currency.',
      hi: 'मुद्रा प्रतीक के बिना बड़ी राशि का उल्लेख किया गया। बताएं कि यह INR (₹) है या कोई अन्य मुद्रा।',
      ja: '通貨記号なしで大きな金額が記載されています。INR（₹）または他の通貨かを明記してください。',
    }),
    getSuggestion: (match) => `₹${match[0]}`,
  },
  {
    kind: 'currency',
    regex: /\b(?:price|offer|give|pay|take|cost|total|final|rate|for)\s+(?:is\s+)?(\d{2,7})\b/i,
    isBlocking: true,
    explanation: makeExplanation({
      en: 'Price or payment amount detected without standard currency symbol. Specify the currency (e.g. ₹, $, ¥).',
      hi: 'मानक मुद्रा प्रतीक के बिना मूल्य या भुगतान राशि का पता चला। कृपया मुद्रा निर्दिष्ट करें (उदा. ₹, $, ¥)।',
      ja: '標準の通貨記号なしで金額が検出されました。通貨（例：¥、$、₹）を指定してください。',
    }),
    getSuggestion: (match) => `₹${match[1]}`,
  },

  // 3. Date & Delivery Ambiguity: vague promises (Non-blocking advice)
  {
    kind: 'date',
    regex: /\b(tomorrow|day after tomorrow|kal|parso|next week|next friday|next monday|in a few days|in \d+-\d+ days|in \d+ to \d+ days|this weekend|asap|as soon as possible)\b/i,
    isBlocking: false,
    explanation: makeExplanation({
      en: 'Vague delivery or meeting timeframe. We recommend specifying an exact date and time to prevent disputes.',
      hi: 'अस्पष्ट डिलीवरी या बैठक का समय। विवादों से बचने के लिए हम एक निश्चित तारीख और समय तय करने की सलाह देते हैं।',
      ja: '納期や日時の約束が曖昧です。トラブルを防ぐため、具体的な日付と時間を指定することをお勧めします。',
    }),
    getSuggestion: (match) => `Specify an exact date instead of "${match[0]}"`,
  },

  // 4. Quantity & Unit Ambiguity: vague measurements (Non-blocking advice)
  {
    kind: 'unit',
    regex: /\b(a few|some|several|couple of|thoda|kuch|lot of)\s+(?:pieces|items|units|boxes|kgs?|packets?)\b/i,
    isBlocking: false,
    explanation: makeExplanation({
      en: 'Imprecise quantity detected. Specify the exact count or weight for clear deal terms.',
      hi: 'अस्पष्ट मात्रा का पता चला। स्पष्ट सौदे के लिए सटीक संख्या या वजन बताएं।',
      ja: '数量が曖昧です。明確な取引のために正確な個数や重量を指定してください。',
    }),
    getSuggestion: (match) => `Specify exact quantity instead of "${match[0]}"`,
  },

  // 5. Tone Guard (D-024): demanding, rude or aggressive phrasing (Non-blocking advice)
  {
    kind: 'tone',
    regex: /\b(give it to me now|hurry up|you must (?:accept|agree|sell)|don't waste my time|stop wasting time|take it or leave it|are you stupid|bakwaas|fraud)\b/i,
    isBlocking: false,
    explanation: makeExplanation({
      en: 'This phrase sounds demanding or confrontational. A softer tone can help negotiations proceed smoothly.',
      hi: 'यह वाक्य बहुत सख्त या आक्रामक लगता है। विनम्र भाषा बातचीत को बेहतर बनाने में मदद कर सकती है।',
      ja: '表現が威圧的または強引に感じられます。丁寧な表現を使うことで取引が円滑に進みます。',
    }),
    getSuggestion: () => 'Could you please consider this offer?',
  },
];

/**
 * Meaning Guard analysis engine.
 * Inspects a draft message before transmission and flags ambiguities, potential scams,
 * or aggressive tone with multilingual explanations.
 */
export function analyzeMessageGuard(text: string, _senderLang: LangCode): GuardAnalysisResult {
  const issues: GuardIssue[] = [];
  let blocking = false;

  const normalizedText = text.trim();
  if (!normalizedText) {
    return { issues: [], blocking: false };
  }

  for (const rule of RULES) {
    const regex = new RegExp(rule.regex.source, rule.regex.flags.includes('g') ? rule.regex.flags : rule.regex.flags + 'g');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(normalizedText)) !== null) {
      const span = match[0];
      const suggestion = rule.getSuggestion ? rule.getSuggestion(match, normalizedText) : undefined;

      const isDuplicate = issues.some((existing) => existing.kind === rule.kind && existing.span === span);
      if (!isDuplicate) {
        issues.push({
          kind: rule.kind,
          span,
          explanation: rule.explanation,
          suggestion,
        });

        if (rule.isBlocking) {
          blocking = true;
        }
      }
    }
  }

  return {
    issues,
    blocking,
  };
}
