import { useCallback, useRef, type InputHTMLAttributes, type KeyboardEvent } from 'react'
import { getLanguageCode } from '@/lib/languages'

type GuidedInputMetadata = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  'lang' | 'dir' | 'autoComplete' | 'autoCapitalize' | 'autoCorrect' | 'spellCheck' | 'enterKeyHint'
>

export function getGuidedInputMetadata(targetLanguage: string | null | undefined): GuidedInputMetadata {
  return {
    lang: getLanguageCode(targetLanguage),
    dir: 'auto',
    autoComplete: 'off',
    autoCapitalize: 'none',
    autoCorrect: 'off',
    spellCheck: false,
    enterKeyHint: 'done',
  }
}

/**
 * Tracks composition synchronously. Some WebKit versions briefly report
 * `nativeEvent.isComposing = false` around the Enter that confirms an IME
 * candidate, so the ref, native flag, and WebKit's legacy 229 marker reinforce
 * each other. See https://bugs.webkit.org/show_bug.cgi?id=165004.
 */
export function useGuidedInputComposition() {
  const composingRef = useRef(false)

  const onCompositionStart = useCallback(() => {
    composingRef.current = true
  }, [])

  const onCompositionEnd = useCallback(() => {
    composingRef.current = false
  }, [])

  const isComposing = useCallback(() => composingRef.current, [])
  const isComposingKeyboardEvent = useCallback((event: KeyboardEvent<HTMLElement>) => (
    composingRef.current
      || event.nativeEvent.isComposing
      || event.nativeEvent.keyCode === 229
  ), [])

  return {
    compositionProps: { onCompositionStart, onCompositionEnd },
    isComposing,
    isComposingKeyboardEvent,
  }
}
