# German i18n Phase 1A Onboarding Report

Date: 2026-05-08

## Scope

Phase 1A localizes the authenticated onboarding flow only. It does not change onboarding steps, validation behavior, invite-code redemption logic, Supabase/RPC/backend code, admin surfaces, or generation behavior.

## Changes

- Added `onboarding.*` keys in English, German, and French.
- Wired `frontend/src/pages/Onboarding.tsx` user-visible copy through `t()`.
- Reused existing credit strings for invite-code fields and success state:
  - `credits.placeholder`
  - `credits.redeemButton`
  - `credits.redeeming`
  - `credits.added`
- Localized the base-language picker labels through existing `langName.*` keys.
- Kept the German voice short, direct, and in `du`.
- Used the `Muttersprache` concept for the base-language prompt.
- Mapped known invite-code RPC error text to existing localized `credits.*` error strings so German users do not see backend English in onboarding.

## German Copy Notes

- `Welcome to Resonance` -> `Willkommen bei Resonance`
- `What language do you speak?` -> `Was ist deine Muttersprache?`
- `Continue` -> `Weiter`
- `Enter your invite code` -> `Einladungscode eingeben`
- `Skip for now` -> `Vorerst überspringen`

`Resonance`, `Decks`, and `Credits` remain intentional product/brand terminology.

## Verification Checklist

Run before merge:

```bash
npm run check:i18n
npm run build
npx eslint src/pages/Onboarding.tsx src/lib/translations.ts
git diff --check
```

Manual QA:

- Force or select German UI locale.
- Open `/onboarding`.
- Verify language step copy, picker placeholder, options, continue/saving state, invite-code copy, placeholder, button, errors, success state, and skip/finish action are German.
- Check the onboarding card at 390 px mobile width for overflow or clipped German text.

## Manual QA Notes

- Headless Chrome at 390 px with a cached German profile rendered `/onboarding` with `html lang="de"`.
- Verified visible step-1 copy, picker placeholder, button text, and localized base-language options.
- No clipping or overflow was observed on the 390 px step-1 card.
- The in-app browser plugin could not run because its Node REPL runtime requires Node `>=22.22.0`; the available runtime was `22.21.0`.
- Full step-2 browser progression was not completed in the mocked headless flow because the fake Supabase session cannot successfully save the profile through the real Supabase client. Step-2 copy, placeholders, button labels, localized error mapping, and success copy were verified by source inspection and compile checks.
