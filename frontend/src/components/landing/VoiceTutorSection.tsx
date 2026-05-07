import { Mic, Globe, Volume2, ChevronLeft, RotateCcw } from 'lucide-react'
import ScrollReveal from './ScrollReveal'
import { TUTOR_MOCK_CONVERSATION, TUTOR_MOCK_LANGUAGE } from './landingData'
import { FlagIcon } from '@/components/ui/FlagIcon'
import { useLandingLocale } from '@/hooks/useLandingLocale'

export default function VoiceTutorSection() {
  const { t } = useLandingLocale()

  return (
    <section className="relative overflow-hidden bg-[var(--app-bg)] py-24 px-6">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.85]"
        style={{ backgroundImage: "url('/brand/cosmos/cosmos-tutor.webp')" }}
        aria-hidden="true"
      />
      <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">

        {/* Header text */}
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {t('landing.tutorHeading')}
          </h2>
          <p className="text-base sm:text-lg text-white/50 max-w-xl mx-auto leading-relaxed">
            {t('landing.tutorDescription')}
          </p>
        </ScrollReveal>

        {/* Phone mockup */}
        <ScrollReveal delay={0.15} direction="blur" className="w-full">
          <div className="max-w-sm mx-auto rounded-[2.5rem] border border-[#F24F13]/25 bg-[#09060d] p-2 shadow-2xl shadow-black/60">
            <div className="rounded-[2rem] overflow-hidden bg-[#0b0710] flex flex-col h-[560px] md:h-[600px]">

              {/* Mock header — matches Speak.tsx conversation header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-[#08060c] shrink-0">
                <div className="p-2 rounded-lg text-white/45">
                  <ChevronLeft className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <FlagIcon code={TUTOR_MOCK_LANGUAGE.code} className="w-7 h-auto" />
                  <span className="text-sm font-medium text-white">{TUTOR_MOCK_LANGUAGE.label}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-white/55">
                  <RotateCcw className="h-3.5 w-3.5" />
                  New Chat
                </div>
              </div>

              {/* Mock chat feed — overflow-hidden keeps it static like a screenshot */}
              <div className="flex-1 overflow-hidden px-4 py-4 space-y-3">
                {TUTOR_MOCK_CONVERSATION.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[#F24F13]/25 border border-[#F24F13]/35 text-white rounded-br-sm shadow-[0_0_18px_rgba(242,79,19,0.18)]'
                          : 'bg-[#46334F]/45 border border-white/10 text-white/85 rounded-bl-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Mock footer — matches Speak.tsx idle mic state */}
              <div className="shrink-0 border-t border-white/10 bg-[#08060c] px-4 py-5">
                <p className="text-xs text-white/45 text-center mb-3">Tap and hold to speak</p>
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full border border-[#F24F13]/50 bg-[#F24F13]/20 flex items-center justify-center shadow-[0_0_32px_rgba(242,79,19,0.48)]">
                    <Mic className="h-7 w-7 text-white" />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </ScrollReveal>

        {/* Feature pills */}
        <ScrollReveal delay={0.3} className="w-full">
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {[
              { icon: Globe, label: '12 languages' },
              { icon: Mic, label: 'Real-time voice' },
              { icon: Volume2, label: 'Speaks back to you' },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#46334F]/35 border border-[#F24F13]/20 text-xs text-white/65"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </div>
            ))}
          </div>
        </ScrollReveal>

      </div>
    </section>
  )
}
