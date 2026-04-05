import type { FC } from 'react'
import GB from 'country-flag-icons/react/3x2/GB'
import DE from 'country-flag-icons/react/3x2/DE'
import FR from 'country-flag-icons/react/3x2/FR'
import IT from 'country-flag-icons/react/3x2/IT'
import ES from 'country-flag-icons/react/3x2/ES'
import PT from 'country-flag-icons/react/3x2/PT'
import NL from 'country-flag-icons/react/3x2/NL'
import IN from 'country-flag-icons/react/3x2/IN'
import SA from 'country-flag-icons/react/3x2/SA'
import PH from 'country-flag-icons/react/3x2/PH'
import ID from 'country-flag-icons/react/3x2/ID'
import KR from 'country-flag-icons/react/3x2/KR'

type FlagComponent = FC<{ className?: string }>

const LANG_CODE_MAP: Record<string, FlagComponent> = {
  en: GB,
  de: DE,
  fr: FR,
  it: IT,
  es: ES,
  pt: PT,
  nl: NL,
  hi: IN,
  ar: SA,
  fil: PH,
  ceb: PH,
  tl: PH,
  id: ID,
  ko: KR,
}

const COUNTRY_CODE_MAP: Record<string, FlagComponent> = {
  GB, DE, FR, IT, ES, PT, NL, IN, SA, PH, ID, KR,
}

const LANG_NAME_MAP: Record<string, string> = {
  german: 'de',
  french: 'fr',
  italian: 'it',
  english: 'en',
  spanish: 'es',
  portuguese: 'pt',
  dutch: 'nl',
  hindi: 'hi',
  arabic: 'ar',
  filipino: 'fil',
  tagalog: 'fil',
  bisaya: 'ceb',
  cebuano: 'ceb',
  indonesian: 'id',
  'bahasa indonesia': 'id',
  korean: 'ko',
}

interface FlagIconProps {
  code: string
  className?: string
}

export function FlagIcon({ code, className = 'w-8' }: FlagIconProps) {
  const lower = code.toLowerCase()
  const Flag =
    LANG_CODE_MAP[lower] ||
    COUNTRY_CODE_MAP[code.toUpperCase()] ||
    LANG_CODE_MAP[LANG_NAME_MAP[lower]]
  if (!Flag) return null
  return <Flag className={`${className} inline-block rounded-sm`} />
}
