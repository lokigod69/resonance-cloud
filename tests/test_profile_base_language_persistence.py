from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_profile_modal_verifies_base_language_update_before_saved_state():
    source = (ROOT / "frontend/src/components/ProfileModal.tsx").read_text(encoding="utf-8")

    update_idx = source.index(".update({ base_language: value })")
    select_idx = source.index(".select('base_language')", update_idx)
    single_idx = source.index(".single()", update_idx)
    error_idx = source.index("if (error || data?.base_language !== value)", update_idx)
    saved_idx = source.index("setLangSaved(true)", update_idx)

    assert update_idx < select_idx < single_idx < error_idx < saved_idx
    assert "const previousBaseLanguage = profile?.base_language || ''" in source
    assert "setBaseLanguage(previousBaseLanguage)" in source
    assert "setLangError(t('profile.saveFailed'))" in source


def test_settings_verifies_base_language_update_before_saved_state():
    source = (ROOT / "frontend/src/pages/Settings.tsx").read_text(encoding="utf-8")

    update_idx = source.index(".update({ base_language: value })")
    select_idx = source.index(".select('base_language')", update_idx)
    single_idx = source.index(".single()", update_idx)
    error_idx = source.index("if (error || data?.base_language !== value)", update_idx)
    saved_idx = source.index("setSaved(true)", update_idx)

    assert update_idx < select_idx < single_idx < error_idx < saved_idx
    assert "const previousBaseLanguage = profile?.base_language || ''" in source
    assert "setBaseLanguage(previousBaseLanguage)" in source
    assert "setError(" in source
    assert "const { t } = useTranslation()" in source
    assert "setError(t('profile.saveFailed'))" in source
    assert "Could not save. Check your session and try again." not in source


def test_onboarding_verifies_base_language_update_before_advancing():
    source = (ROOT / "frontend/src/pages/Onboarding.tsx").read_text(encoding="utf-8")
    handler_start = source.index("async function handleLanguageContinue()")
    handler_end = source.index("async function handleRedeemCode()", handler_start)
    handler = source[handler_start:handler_end]

    update_idx = handler.index(".update({ base_language: selectedLanguage })")
    select_idx = handler.index(".select('base_language')", update_idx)
    single_idx = handler.index(".single()", update_idx)
    error_idx = handler.index("if (error || data?.base_language !== selectedLanguage)", update_idx)
    refresh_idx = handler.index("await refreshProfile()", update_idx)
    step_idx = handler.index("setStep(2)", update_idx)

    assert update_idx < select_idx < single_idx < error_idx < refresh_idx < step_idx
    assert "setLanguageError(t('profile.saveFailed'))" in handler
    assert "return" in handler[error_idx:refresh_idx]
    assert "catch (error)" in handler
    assert "finally" in handler
    assert "setSaving(false)" in handler


def test_onboarding_does_not_mark_done_during_base_language_save():
    source = (ROOT / "frontend/src/pages/Onboarding.tsx").read_text(encoding="utf-8")

    language_continue_start = source.index("async function handleLanguageContinue()")
    language_continue_end = source.index("async function handleRedeemCode()", language_continue_start)
    language_continue = source[language_continue_start:language_continue_end]

    assert "localStorage.setItem('resonance_onboarding_done'" not in language_continue
    assert "setStep(2)" in language_continue


def test_profile_hardening_trigger_allows_base_language_but_not_privileged_fields():
    sql = (
        ROOT
        / "frontend/supabase/migrations/20260504010000_profile_avatar_phase1f_trigger_fix.sql"
    ).read_text(encoding="utf-8")

    safe_columns_start = sql.index("v_safe_update_columns text[] := array[")
    safe_columns_end = sql.index("];", safe_columns_start)
    safe_columns = sql[safe_columns_start:safe_columns_end]

    assert "'base_language'" in safe_columns
    assert "'display_name'" in safe_columns
    assert "'avatar_path'" in safe_columns
    assert "'role'" not in safe_columns
    assert "'credits'" not in safe_columns
    assert "create or replace function public.protect_profile_privileged_fields()" in sql


def test_refresh_profile_forces_supabase_refetch_and_cache_update():
    source = (ROOT / "frontend/src/hooks/useAuth.ts").read_text(encoding="utf-8")

    refresh_idx = source.index("const refreshProfile = useCallback(async () => {")
    forced_idx = source.index("await fetchProfile(currentSession.user.id, true)", refresh_idx)
    cache_idx = source.index("writeCachedProfile(userId, data as AuthProfile | null)")

    assert "profileFetchedRef.current = false" in source[refresh_idx:forced_idx]
    assert forced_idx > refresh_idx
    assert cache_idx > source.index("const fetchProfile = useCallback")
