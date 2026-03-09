export default function Pricing() {
  return (
    <div className="flex flex-col w-full min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="flex items-center justify-between w-full px-[80px] py-4 bg-[var(--bg-primary)] border-b border-[var(--border-primary)] gap-10">
        <a href="/" className="font-jetbrains text-[var(--text-primary)] text-[22px] font-bold tracking-[1px]">
          MUSASHI
        </a>
        <nav className="flex items-center gap-8">
          <a href="/ai" className="font-jetbrains text-[var(--text-secondary)] text-xs font-medium hover:text-[var(--text-primary)] transition-colors">API</a>
          <a href="/pricing" className="font-jetbrains text-[var(--text-primary)] text-xs font-medium">PRICING</a>
          <a href="/privacy" className="font-jetbrains text-[var(--text-secondary)] text-xs font-medium hover:text-[var(--text-primary)] transition-colors">PRIVACY</a>
        </nav>
        <a href="/install" className="px-5 py-[10px] border border-[#FFFFFF40] bg-transparent hover:bg-[var(--overlay-light)] transition-colors">
          <span className="font-jetbrains text-[var(--text-primary)] text-xs font-bold">Install</span>
        </a>
      </header>

      {/* Pricing Content */}
      <main className="flex flex-col items-center justify-center flex-1 w-full px-[80px] py-[120px]">
        <div className="flex flex-col items-center gap-12 w-full max-w-[800px]">

          {/* Free Badge */}
          <div className="flex items-center gap-3 px-8 py-4 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-full">
            <svg className="w-5 h-5 fill-[#00FF88]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            <span className="font-jetbrains text-[var(--text-primary)] text-base font-medium">
              Musashi is currently free
            </span>
          </div>

          {/* Future Plans Message */}
          <p className="font-jetbrains text-[var(--text-secondary)] text-[17px] font-normal leading-[1.8] text-center">
            In the future, we may introduce paid features or plans. If we do, we&apos;ll clearly<br />
            describe the terms and pricing before you&apos;re charged.
          </p>

          {/* Install Button */}
          <a href="/install" className="px-12 py-5 bg-[var(--text-primary)] hover:opacity-90 transition-opacity rounded-full">
            <span className="font-jetbrains text-[var(--bg-primary)] text-sm font-bold">Install Musashi</span>
          </a>

          {/* Additional Info */}
          <div className="flex flex-col items-center gap-4 pt-8 border-t border-[var(--border-lightest)] w-full">
            <span className="font-jetbrains text-[var(--text-tertiary)] text-xs font-medium">
              Chrome Extension • No account needed • Works instantly
            </span>
            <span className="font-jetbrains text-[var(--text-tertiary)] text-[11px] font-normal text-center">
              900+ markets from Polymarket and Kalshi • Price updates every 60s
            </span>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="flex flex-col gap-6 w-full px-[120px] py-12 bg-[var(--bg-secondary)] border-t border-[var(--border-primary)]">
        <div className="flex items-start justify-between w-full">
          <div className="flex flex-col gap-3">
            <span className="font-jetbrains text-[var(--text-primary)] text-base font-semibold tracking-[1px]">
              MUSASHI
            </span>
            <span className="font-jetbrains text-[var(--text-tertiary)] text-xs font-normal max-w-[400px] leading-relaxed">
              Chrome extension that shows prediction markets on Twitter. API for agents.
            </span>
          </div>

          <div className="flex gap-16">
            <div className="flex flex-col gap-3">
              <span className="font-jetbrains text-[var(--text-muted)] text-[10px] font-bold tracking-[1.5px] uppercase">
                Product
              </span>
              <nav className="flex flex-col gap-2">
                <a href="/ai" className="font-jetbrains text-[var(--text-secondary)] text-xs font-medium hover:text-[var(--text-primary)] transition-colors">API Docs</a>
                <a href="/pricing" className="font-jetbrains text-[var(--text-secondary)] text-xs font-medium hover:text-[var(--text-primary)] transition-colors">Pricing</a>
                <a href="/privacy" className="font-jetbrains text-[var(--text-secondary)] text-xs font-medium hover:text-[var(--text-primary)] transition-colors">Privacy</a>
              </nav>
            </div>

            <div className="flex flex-col gap-3">
              <span className="font-jetbrains text-[var(--text-muted)] text-[10px] font-bold tracking-[1.5px] uppercase">
                Community
              </span>
              <nav className="flex flex-col gap-2">
                <a href="https://twitter.com/musashimarket" target="_blank" rel="noopener noreferrer" className="font-jetbrains text-[var(--text-secondary)] text-xs font-medium hover:text-[var(--text-primary)] transition-colors">Twitter</a>
                <a href="https://github.com/VittorioC13/musashi-bot" target="_blank" rel="noopener noreferrer" className="font-jetbrains text-[var(--text-secondary)] text-xs font-medium hover:text-[var(--text-primary)] transition-colors">GitHub</a>
              </nav>
            </div>
          </div>
        </div>

        <div className="w-full h-[1px] bg-[var(--border-primary)]" />

        <div className="flex items-center justify-between w-full">
          <span className="font-jetbrains text-[var(--text-tertiary)] text-[11px] font-normal">
            © {new Date().getFullYear()} Musashi
          </span>
          <span className="font-jetbrains text-[var(--text-tertiary)] text-[11px] font-normal">
            Built for agents. Powered by prediction markets.
          </span>
        </div>
      </footer>
    </div>
  );
}
