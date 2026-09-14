import { useState } from "react"
import { Button } from "@/ui-shared/components/ui/button"
import { Input } from "@/ui-shared/components/ui/input"
import { MagnifyingGlass, MapPin, Sparkle } from "@phosphor-icons/react"

interface HeroProps {
  onSearch: (keyword: string, location: string) => void
}

export default function Hero({ onSearch }: HeroProps) {
  const [keyword, setKeyword] = useState("")
  const [location, setLocation] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(keyword, location)
  }

  const handleQuickSearch = (tag: string) => {
    setKeyword(tag)
    onSearch(tag, location)
  }

  const popularTags = ["Software Engineering", "Product Design", "AI Research", "Finance", "Data Science"]

  return (
    <section className="relative overflow-hidden bg-background py-20 md:py-32 font-sans border-b border-foreground/5">
      {/* Premium visual background accent: Dot pattern and gradient orbs */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(0,82,255,0.08),rgba(255,255,255,0))]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(0,82,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,82,255,0.025)_1px,transparent_1px)] bg-[size:32px_32px]" />
      
      {/* Decorative floating blur orb */}
      <div className="pointer-events-none absolute top-1/2 left-1/4 -z-10 h-72 w-72 -translate-y-1/2 rounded-full bg-brand/5 blur-[100px] animate-pulse" />
      
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge indicator */}
        <div className="inline-flex items-center gap-1.5 bg-brand/10 border border-brand/20 px-3 py-1 text-xs font-semibold text-brand mb-6 uppercase tracking-wider">
          <Sparkle size={14} weight="fill" className="animate-spin-slow" />
          <span>The Academic Nexus for Early Talent</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl max-w-4xl mx-auto leading-none mb-6">
          Bridge the Gap Between <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-brand to-blue-500 bg-clip-text text-transparent">
            Campus and Career
          </span>
        </h1>

        {/* Supporting Text */}
        <p className="mx-auto max-w-2xl text-base text-muted-foreground md:text-lg mb-10 leading-relaxed">
          Connecting university students and recent graduates with top-tier internships, co-ops, and entry-level positions. Designed specifically for the university ecosystem.
        </p>

        {/* Search Bar Panel */}
        <div className="mx-auto max-w-3xl bg-card border border-foreground/10 p-2 shadow-xl relative backdrop-blur-md bg-card/90">
          {/* Accent corners */}
          <div className="absolute -top-1 -left-1 size-2 border-t border-l border-brand" />
          <div className="absolute -top-1 -right-1 size-2 border-t border-r border-brand" />
          <div className="absolute -bottom-1 -left-1 size-2 border-b border-l border-brand" />
          <div className="absolute -bottom-1 -right-1 size-2 border-b border-r border-brand" />

          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-2">
            {/* Keyword Input */}
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <MagnifyingGlass size={16} />
              </div>
              <Input
                type="text"
                placeholder="Job title or company name..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full border-none h-11 pl-10 focus-visible:ring-0 focus-visible:ring-offset-0 text-xs font-medium placeholder:text-muted-foreground/60"
              />
            </div>

            {/* Separator for desktop */}
            <div className="hidden md:block w-px bg-foreground/10 my-2" />

            {/* Location Input */}
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <MapPin size={16} />
              </div>
              <Input
                type="text"
                placeholder="City, district, or location..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full border-none h-11 pl-10 focus-visible:ring-0 focus-visible:ring-offset-0 text-xs font-medium placeholder:text-muted-foreground/60"
              />
            </div>

            {/* Search Submit CTA */}
            <Button
              type="submit"
              className="h-11 px-8 text-xs font-bold uppercase tracking-wider bg-brand hover:bg-brand/90 text-white cursor-pointer transition-colors"
            >
              Search Jobs
            </Button>
          </form>
        </div>

        {/* Quick Search / Popular Tags */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground font-semibold mr-1">Popular searches:</span>
          {popularTags.map((tag) => (
            <button
              key={tag}
              onClick={() => handleQuickSearch(tag)}
              className="bg-secondary/50 border border-foreground/5 hover:border-brand/40 text-foreground/80 hover:text-brand px-2.5 py-1 text-xs font-medium transition-all"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
