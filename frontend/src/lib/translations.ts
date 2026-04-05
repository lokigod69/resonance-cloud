// src/lib/translations.ts
//
// Central translation map. English is the source of truth.
// German is the first translated locale. Add more locales as needed.
//
// KEY NAMING CONVENTION:
//   section.element — e.g., 'nav.decks', 'profile.signOut'
//   section.element.plural — for plural variants
//
// INTERPOLATION:
//   Use {variableName} for dynamic values — e.g., 'You have {count} credits'
//   The t() function replaces these at runtime.

export type Locale = 'en' | 'de';

// Map from base_language profile values to locale codes
export const LANGUAGE_TO_LOCALE: Record<string, Locale> = {
  English: 'en',
  German: 'de',
  // Future: French: 'fr', Italian: 'it', etc.
};

export const translations: Record<Locale, Record<string, string>> = {
  en: {
    // ── Navigation ──
    'nav.decks': 'Decks',
    'nav.generate': 'Generate',
    'nav.study': 'Study',
    'nav.music': 'Music',
    'nav.speak': 'Speak',
    'nav.admin': 'Admin',

    // ── Profile Modal ──
    'profile.heading': 'Profile',
    'profile.skin': 'Skin',
    'profile.theme': 'Theme',
    'profile.displayName': 'Display Name',
    'profile.displayNamePlaceholder': 'Enter your name',
    'profile.baseLanguage': 'Base Language',
    'profile.selectLanguage': 'Select language',
    'profile.email': 'Email',
    'profile.signOut': 'Sign Out',
    'profile.saving': 'Saving...',
    'profile.saved': 'Saved',

    // ── Credits ──
    'credits.heading': 'Credits',
    'credits.description': 'Your credit balance and code redemption',
    'credits.available': 'credits available',
    'credits.redeemHeading': 'Redeem an invite code',
    'credits.placeholder': 'Enter invite code',
    'credits.redeemButton': 'Redeem Code',
    'credits.redeeming': 'Redeeming...',
    'credits.added': '+{count} credits added!',
    'credits.errorLookup': 'Error looking up code. Please try again.',
    'credits.errorInvalid': 'Invalid invite code.',
    'credits.errorRedeemed': 'This code has already been redeemed.',
    'credits.errorFailed': 'Failed to redeem code. Please try again.',

    // ── Common ──
    'common.backToDecks': 'Back to Decks',
    'common.loading': 'Loading...',
    'common.retry': 'Retry',
    'common.refresh': 'Refresh',

    // ── Errors ──
    'error.sessionExpired': 'Session expired',
    'error.profileFailed': 'Profile failed to load',
    'error.somethingWrong': 'Something went wrong',
  },

  de: {
    // ── Navigation ──
    'nav.decks': 'Decks',
    'nav.generate': 'Erstellen',
    'nav.study': 'Lernen',
    'nav.music': 'Musik',
    'nav.speak': 'Sprechen',
    'nav.admin': 'Admin',

    // ── Profile Modal ──
    'profile.heading': 'Profil',
    'profile.skin': 'Skin',
    'profile.theme': 'Farbschema',
    'profile.displayName': 'Anzeigename',
    'profile.displayNamePlaceholder': 'Name eingeben',
    'profile.baseLanguage': 'Muttersprache',
    'profile.selectLanguage': 'Sprache wählen',
    'profile.email': 'E-Mail',
    'profile.signOut': 'Abmelden',
    'profile.saving': 'Speichern...',
    'profile.saved': 'Gespeichert',

    // ── Credits ──
    'credits.heading': 'Credits',
    'credits.description': 'Dein Guthaben und Code-Einlösung',
    'credits.available': 'Credits verfügbar',
    'credits.redeemHeading': 'Einladungscode einlösen',
    'credits.placeholder': 'Einladungscode eingeben',
    'credits.redeemButton': 'Code einlösen',
    'credits.redeeming': 'Wird eingelöst...',
    'credits.added': '+{count} Credits hinzugefügt!',
    'credits.errorLookup': 'Fehler beim Nachschlagen. Bitte erneut versuchen.',
    'credits.errorInvalid': 'Ungültiger Einladungscode.',
    'credits.errorRedeemed': 'Dieser Code wurde bereits eingelöst.',
    'credits.errorFailed': 'Einlösung fehlgeschlagen. Bitte erneut versuchen.',

    // ── Common ──
    'common.backToDecks': 'Zurück zu Decks',
    'common.loading': 'Laden...',
    'common.retry': 'Erneut versuchen',
    'common.refresh': 'Aktualisieren',

    // ── Errors ──
    'error.sessionExpired': 'Sitzung abgelaufen',
    'error.profileFailed': 'Profil konnte nicht geladen werden',
    'error.somethingWrong': 'Etwas ist schiefgelaufen',
  },
};
