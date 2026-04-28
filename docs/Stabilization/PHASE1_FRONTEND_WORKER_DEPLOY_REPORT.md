# Phase 1 Frontend and Worker Deploy Report

Date: 2026-04-29

## Frontend Deployment

Command:

```powershell
vercel ls frontend
vercel inspect https://frontend-1psisrjbh-lokigod69s-projects.vercel.app
vercel inspect https://frontend-1psisrjbh-lokigod69s-projects.vercel.app --logs
```

Production deployment:

- URL: `https://frontend-1psisrjbh-lokigod69s-projects.vercel.app`
- Aliases:
  - `https://resonanz.pro`
  - `https://www.resonanz.pro`
  - `https://frontend-git-main-lokigod69s-projects.vercel.app`
- Status: `Ready`
- Build log commit: `5b18d11`
- Build log source: `github.com/lokigod69/resonance-cloud`
- Build log branch: `main`

Exact build-log line:

```text
Cloning github.com/lokigod69/resonance-cloud (Branch: main, Commit: 5b18d11)
```

## Frontend Source Verification

Commands:

```powershell
Select-String -Path frontend\src\components\generate\submitGeneration.ts,frontend\src\pages\DeckView.tsx,frontend\src\pages\DeckViewPG.tsx,frontend\src\pages\Music.tsx -Pattern 'submit_generation','request_word_retry'
Select-String -Path frontend\src\components\generate\submitGeneration.ts,frontend\src\pages\DeckView.tsx,frontend\src\pages\DeckViewPG.tsx,frontend\src\pages\Music.tsx -Pattern 'profiles\.credits','from\(''profiles''\)','\.update\(\{[^}]*credits','credits\s*:'
```

Exact result:

```text
frontend/src/components/generate/submitGeneration.ts:59: const { data, error } = await supabase.rpc('submit_generation', {
frontend/src/pages/DeckView.tsx:92: const { data, error } = await supabase.rpc('request_word_retry', {
frontend/src/pages/DeckViewPG.tsx:112: const { data, error } = await supabase.rpc('request_word_retry', {
frontend/src/pages/Music.tsx:178: const { data, error } = await supabase.rpc('request_word_retry', {
```

The direct `profiles.credits` update search returned no matches in those four files.

Invite-code frontend verification:

```text
frontend/src/components/RedeemCodeDialog.tsx:39: const { data, error: rpcError } = await supabase.rpc('redeem_invite_code', { code_text: code })
frontend/src/pages/Onboarding.tsx:53: const { data, error: rpcError } = await supabase.rpc('redeem_invite_code', { code_text: code })
```

No fallback read from `invite_codes` was found in those two files. `Onboarding.tsx` still updates `profiles.base_language`, which is a safe profile preference field.

## Production Bundle Check

Command:

```powershell
Invoke-WebRequest https://resonanz.pro
# fetched /assets/index-DIDHZNmn.js and searched locally
```

Exact result:

```text
asset_paths=/assets/index-DIDHZNmn.js
contains_submit_generation=True
contains_request_word_retry=True
contains_profiles_dot_credits=False
contains_pre_bootstrap=False
```

The broader regex `profiles.{0,80}credits|credits.{0,80}profiles` returned `True`, but source verification shows that comes from profile/credit display paths, not direct generation or retry credit mutation in the changed files.

## Worker Compatibility

Command:

```powershell
Select-String -Path src\orchestration\feeder.py,src\orchestration\state.py,tests\test_orchestration_feeder.py -Pattern 'pre_bootstrap','current_stage','bootstrap'
```

Finding:

- Phase 1B creates words with `current_stage = 'pre_bootstrap'`.
- The existing worker source at `5b18d11` only allowed bootstrap transition from `pending` to `enrichment`.
- That would likely cause new Phase 1B generation jobs to fail bootstrap after credit debit.

Concrete fix applied in this verification pass:

- `src/orchestration/feeder.py` now allows `pre_bootstrap` or `pending` as prior states for the bootstrap transition into `enrichment`.
- `src/orchestration/state.py` now maps `pre_bootstrap` to status `pending`.
- Tests cover the `pre_bootstrap -> enrichment -> pending` bootstrap path.

Focused test result:

```text
.venv\Scripts\python.exe -m pytest tests/test_orchestration_feeder.py tests/test_orchestration_state.py tests/test_phase1b_atomic_generation_retry.py
43 passed in 0.16s
```

## Worker Deployment Status

The repository contains Railway cloud-worker configuration:

- `railway.toml`
- `Dockerfile.cloud`
- `start_cloud.py`
- `job_runner.py`

`railway` CLI is not installed in this shell, so the currently deployed worker commit could not be verified.

Conclusion:

- Frontend production is deployed from `main` commit `5b18d11` and contains the Phase 1B RPC frontend code.
- Worker source is now compatible after the narrow `pre_bootstrap` fix.
- Production worker must be redeployed from the fixed main commit before generation smoke tests should be treated as valid.
