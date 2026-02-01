import Link from 'next/link'

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#1A1A1A] text-[#1A1A1A]/80 dark:text-slate-300 p-6 md:p-12 font-sans">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <Link href="/" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors">← Back to Home</Link>
                </div>

                <h1 className="text-4xl font-bold text-[#1A1A1A] dark:text-white mb-8">Privacy Policy</h1>

                <div className="space-y-6 bg-white/50 dark:bg-slate-800/50 p-8 rounded-2xl border border-[#1A1A1A]/5 dark:border-white/5 backdrop-blur-sm">
                    <section>
                        <h2 className="text-xl font-semibold text-[#1A1A1A] dark:text-white mb-2">1. Information We Collect</h2>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li><strong>Participants:</strong> Name, optional profile details (if provided by organizer).</li>
                            <li><strong>Judges:</strong> Name, email/ID (for authentication), scoring history.</li>
                            <li><strong>Usage Data:</strong> IP address, browser type, and interaction logs for security and performance monitoring.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-[#1A1A1A] dark:text-white mb-2">2. How We Use Information</h2>
                        <p>To provide real-time leaderboards, maintain the integrity of competitions (anti-cheat logs), and improve service performance.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-[#1A1A1A] dark:text-white mb-2">3. Cookies & Storage</h2>
                        <p>We use local storage and session cookies to maintain your login state and preferences. We do not use third-party tracking cookies.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-[#1A1A1A] dark:text-white mb-2">4. Data Retention</h2>
                        <p>Event data is retained as long as the event organizer keeps their account active. Organizers may request deletion of event data at any time.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-[#1A1A1A] dark:text-white mb-2">5. Third Parties</h2>
                        <p>We use trusted infrastructure providers (Vercel, Supabase) to host our data. We do not sell user data to advertisers.</p>
                    </section>

                    <div className="pt-8 text-sm text-[#1A1A1A]/40 dark:text-slate-500 border-t border-[#1A1A1A]/5 dark:border-white/5">
                        Last Updated: {new Date().toLocaleDateString()}
                    </div>
                </div>
            </div>
        </div>
    )
}
