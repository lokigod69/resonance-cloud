import { ChevronDown, Plus } from 'lucide-react'
import { FlagIcon } from '@/components/ui/FlagIcon'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTranslation } from '@/hooks/useTranslation'
import { BETA_WIZARD_LANGUAGES } from '@/lib/languages'

type LanguageClusterProps = {
  languages: string[]
  activeLanguage: string | null
  onSelect: (lang: string) => void
  onAddLanguage?: (lang: string) => void
}

export function LanguageCluster({ languages, activeLanguage, onSelect, onAddLanguage }: LanguageClusterProps) {
  const { t } = useTranslation()
  const addable = onAddLanguage ? BETA_WIZARD_LANGUAGES.filter((lang) => !languages.includes(lang.value)) : []
  if (!languages.length && !addable.length) return null

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" className="lang-pill lang-pill-active inline-flex min-h-11 min-w-0 items-center gap-2 rounded-full px-3 font-semibold">
          {activeLanguage ? <FlagIcon code={activeLanguage} className="w-5 shrink-0" /> : <Plus className="size-4" />}
          <span className="truncate">{activeLanguage ? t(`langName.${activeLanguage}`) : t('dashboard.addLanguage')}</span>
          <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent collisionPadding={12} aria-label={t('categories.targetLanguageLabel')} className="w-56 rounded-xl p-2">
        <DropdownMenuRadioGroup value={activeLanguage ?? ''} onValueChange={onSelect}>
          {languages.map((language) => (
            <DropdownMenuRadioItem key={language} value={language} className="min-h-11 gap-2">
              <FlagIcon code={language} className="w-5" />
              {t(`langName.${language}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {addable.length > 0 && (
          <>
            {languages.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs text-muted-foreground">{t('dashboard.addLanguage')}</DropdownMenuLabel>
            {addable.map((lang) => (
              <DropdownMenuItem key={lang.value} onSelect={() => onAddLanguage?.(lang.value)} className="min-h-11 gap-2 pl-8">
                <FlagIcon code={lang.code} className="w-5" />
                {t(`langName.${lang.value}`)}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
