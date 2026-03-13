export default function Terms() {
  return (
    <div className="app-shell py-10">
      <div className="page-wrap space-y-6">
        <section className="hero-shell">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Legal</p>
          <h1 className="mt-2 text-3xl font-semibold">Terms and Conditions</h1>
          <p className="mt-2 max-w-3xl text-sm text-white/80">
            Usage terms for students, companies, and administrators using the platform.
          </p>
        </section>

        <section className="section-shell">
          <h2 className="section-title text-xl">Platform Responsibilities</h2>
          <p className="mt-3 text-sm text-slate-700">
            By using this portal, you agree to provide accurate information, use the platform
            responsibly, and comply with applicable laws and campus recruitment guidelines.
          </p>
          <p className="mt-3 text-sm text-slate-700">
            Companies are responsible for posting accurate openings, and students are responsible
            for truthful profiles and applications.
          </p>
        </section>
      </div>
    </div>
  );
}
