import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Music, Sparkles, Globe, Play } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 md:px-12">
        <div className="flex items-center gap-2">
          <Music className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl">Resonance</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link to="/login">Sign In</Link>
          </Button>
          <Button asChild className="bg-primary hover:bg-primary/80">
            <Link to="/login">Get Started</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-3xl space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            AI-powered language learning
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
            Learn languages through{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[oklch(0.7_0.15_280)] to-[oklch(0.65_0.18_320)]">
              music videos
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
            AI generates unique music videos for every word you want to learn.
            Each video pairs memorable visuals with catchy melodies to make vocabulary stick.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button size="lg" asChild className="bg-primary hover:bg-primary/80 text-lg px-8 py-6">
              <Link to="/login">
                <Play className="h-5 w-5 mr-2" />
                Start Learning
              </Link>
            </Button>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-8">
            {[
              { icon: Globe, text: '12+ Languages' },
              { icon: Music, text: 'AI Music Videos' },
              { icon: Sparkles, text: 'Unique Mnemonics' },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="glass rounded-full px-4 py-2 flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Icon className="h-4 w-4 text-primary" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 text-center text-sm text-muted-foreground">
        Resonance Cloud — Pilot
      </footer>
    </div>
  )
}
