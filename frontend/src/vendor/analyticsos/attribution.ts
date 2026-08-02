/** VENDORED from analytics-os @ b53d154 (2026-08-02). Do NOT hand-edit. */
import { REF_PARAM } from "./events.js";

const UTM_KEYS = ["source", "medium", "campaign", "content", "term"] as const;

type UtmKey = (typeof UTM_KEYS)[number];

/** First-touch attribution captured at init time and held in memory only. */
export interface Attribution {
  ref?: string;
  utm?: Partial<Record<UtmKey, string>>;
}

/**
 * Parses `ref` (REF_PARAM) and `utm_source/medium/campaign/content/term` from
 * a page URL's query string. Malformed or absent URLs yield an empty
 * attribution — this never throws (first-touch capture must not break init).
 */
export function parseAttribution(url?: string): Attribution {
  if (!url) {
    return {};
  }

  let params: URLSearchParams;
  try {
    params = new URL(url).searchParams;
  } catch {
    return {};
  }

  const attribution: Attribution = {};

  const ref = params.get(REF_PARAM);
  if (ref) {
    attribution.ref = ref;
  }

  const utm: Partial<Record<UtmKey, string>> = {};
  for (const key of UTM_KEYS) {
    const value = params.get(`utm_${key}`);
    if (value) {
      utm[key] = value;
    }
  }
  if (Object.keys(utm).length > 0) {
    attribution.utm = utm;
  }

  return attribution;
}
