// Pure, dependency-free language understanding for the college assistant.
// Kept separate from database code so it is easy to unit test.

export type Intent = "exam" | "timetable" | "syllabus" | "attendance" | "notice" | "faculty" | "help" | "unknown";

export type SubjectRef = { id: string; code: string; name: string; aliases: string[] };

const STOP_WORDS = new Set([
  "a", "an", "the", "of", "and", "in", "on", "for", "to", "is", "are", "my", "me", "i", "what", "when", "which",
  "show", "tell", "give", "do", "does", "have", "has", "about", "please", "can", "you", "any", "there", "with",
  "class", "classes", "exam", "exams", "syllabus", "timetable", "schedule", "date", "time", "venue", "room",
]);

export const normalize = (text: string) =>
  text.toLowerCase().replace(/['’]s\b/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

const has = (text: string, re: RegExp) => re.test(text);

export function detectIntent(raw: string): Intent {
  const t = normalize(raw);
  if (!t) return "unknown";
  if (has(t, /\b(who teaches|who is teaching|taught by|faculty|professor|teacher|lecturer|cabin|instructor)\b/)) return "faculty";
  if (has(t, /\b(attendance|attended|present|absent|bunk|shortage)\b/)) return "attendance";
  if (has(t, /\b(syllabus|topics?|units?|curriculum|chapters?|covers?|contents?)\b/)) return "syllabus";
  if (has(t, /\b(exams?|tests?|midterms?|finals?|practicals?|papers?|hall tickets?|venue|seating)\b/)) return "exam";
  if (has(t, /\b(timetable|time table|lectures?|classes|class|today|tomorrow|schedule|periods?|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/)) return "timetable";
  if (has(t, /\b(notices?|announcements?|circulars?|news|updates?|alerts?)\b/)) return "notice";
  if (has(t, /^(hi|hello|hey|help|what can you do)\b/)) return "help";
  return "unknown";
}

export type DayTarget = { dayOfWeek: number; label: string; offsetDays: number | null };

const DAY_NAMES = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

/**
 * Resolves "today", "tomorrow" or a weekday name. `todayDow` is the ISO weekday (1-7) of today
 * in the college timezone, so this stays pure and testable.
 */
export function detectDay(raw: string, todayDow: number): DayTarget | null {
  const t = normalize(raw);
  const wrap = (dow: number) => ((dow - 1 + 7) % 7) + 1;
  if (/\btomorrow\b/.test(t)) return { dayOfWeek: wrap(todayDow + 1), label: "tomorrow", offsetDays: 1 };
  if (/\byesterday\b/.test(t)) return { dayOfWeek: wrap(todayDow - 1), label: "yesterday", offsetDays: -1 };
  if (/\btoday\b/.test(t)) return { dayOfWeek: todayDow, label: "today", offsetDays: 0 };
  const idx = DAY_NAMES.findIndex((d) => t.split(" ").includes(d));
  if (idx >= 0) return { dayOfWeek: idx + 1, label: DAY_NAMES[idx][0].toUpperCase() + DAY_NAMES[idx].slice(1), offsetDays: null };
  return null;
}

const wordSet = (s: string) => new Set(normalize(s).split(" ").filter((w) => w && !STOP_WORDS.has(w)));

/** Best subject match by code, alias, full name, or overlapping name words. Returns null when unsure. */
export function matchSubject(raw: string, subjects: SubjectRef[]): SubjectRef | null {
  const t = normalize(raw);
  if (!t) return null;
  const padded = ` ${t} `;
  const queryWords = wordSet(raw);

  let best: { subject: SubjectRef; score: number } | null = null;
  for (const s of subjects) {
    let score = 0;
    if (padded.includes(` ${normalize(s.code)} `)) score = 100;
    else if (padded.includes(` ${normalize(s.name)} `)) score = 90;
    else if (s.aliases.some((a) => padded.includes(` ${normalize(a)} `))) score = 80;
    else {
      const nameWords = wordSet(s.name);
      const overlap = [...nameWords].filter((w) => queryWords.has(w)).length;
      if (overlap > 0 && nameWords.size > 0) score = 20 + (overlap / nameWords.size) * 40;
    }
    if (score > 0 && (!best || score > best.score)) best = { subject: s, score };
  }
  return best && best.score >= 30 ? best.subject : null;
}

export function wantsAll(raw: string): boolean {
  return /\b(all|every|upcoming|next|list|schedule)\b/.test(normalize(raw));
}
