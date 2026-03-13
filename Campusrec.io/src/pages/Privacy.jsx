export default function Privacy() {
  return (
    <div className="app-shell py-10">
      <div className="page-wrap space-y-6">
        <section className="hero-shell">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Legal</p>
          <h1 className="mt-2 text-3xl font-semibold">Privacy Policy</h1>
          <p className="mt-2 max-w-3xl text-sm text-white/80">
            How student and company data is collected and used in this recruitment platform.
          </p>
        </section>

        <section className="section-shell">
          <h2 className="section-title text-xl">Data Usage</h2>
          <p className="mt-3 text-sm text-slate-700">
            This portal stores profile and application data required for recruitment workflows. Data
            is used only for matching students and companies on this platform.
          </p>
          <p className="mt-3 text-sm text-slate-700">
            Personal data is not shared with third parties except where needed to process
            applications or when required by law.
          </p>
        </section>
      </div>
    </div>
  );
}
