import { Mic, Globe, Volume2, ChevronLeft, RotateCcw } from 'lucide-react'
import ScrollReveal from './ScrollReveal'
import { TUTOR_MOCK_CONVERSATION, TUTOR_MOCK_LANGUAGE } from './landingData'

export default function VoiceTutorSection() {
  return (
    <section className="bg-[#0c0d14] py-24 px-6">
      <div className="max-w-4xl mx-auto flex flex-col items-center">

        {/* Header text */}
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Your personal AI tutor
          </h2>
          <p className="text-base sm:text-lg text-white/50 max-w-xl mx-auto leading-relaxed">
            Practice speaking in 12 languages. Have real conversations with AI that corrects your grammar, models pronunciation, and feels like chatting with a native friend.
          </p>
        </ScrollReveal>

        {/* Phone mockup */}
        <ScrollReveal delay={0.15} direction="blur" className="w-full">
          <div className="max-w-sm mx-auto rounded-[2.5rem] border border-white/10 bg-[#0a0b12] p-2 shadow-2xl shadow-black/50">
            <div className="rounded-[2rem] overflow-hidden bg-[#0c0d14] flex flex-col h-[560px] md:h-[600px]">

              {/* Mock header — matches Speak.tsx conversation header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-gray-950 shrink-0">
                <div className="p-2 rounded-lg text-gray-600">
                  <ChevronLeft className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xl">{TUTOR_MOCK_LANGUAGE.flag}</span>
                  <span className="text-sm font-medium text-white">{TUTOR_MOCK_LANGUAGE.label}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-600">
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
                          ? 'bg-cyan-900/50 text-white rounded-br-sm'
                          : 'bg-gray-800/60 text-gray-100 rounded-bl-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Mock footer — matches Speak.tsx idle mic state */}
              <div className="shrink-0 border-t border-white/5 bg-gray-950 px-4 py-5">
                <p className="text-xs text-gray-500 text-center mb-3">Tap and hold to speak</p>
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
                    <Mic className="h-7 w-7 text-gray-300" />
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/50"
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
