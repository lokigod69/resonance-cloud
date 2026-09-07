import type { TranslationFn } from './translations'

/** Keep provider diagnostics out of the UI while preserving actionable local checks. */
export function localizeAuthProviderError(t: TranslationFn, providerMessage: string): string {
  const normalized = providerMessage.trim().toLowerCase()
  if (normalized.includes('email') && normalized.includes('not confirmed')) {
    return t('auth.confirmEmail')
  }
  if (
    normalized.includes('password')
    && (normalized.includes('6 character') || normalized.includes('too short') || normalized.includes('weak'))
  ) {
    return t('auth.passwordTooShort')
  }
  return t('common.somethingWentWrong')
}
