import Link from 'next/link'

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-slate-900 text-slate-300 p-6 md:p-12 font-sans">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <Link href="/" className="text-blue-400 hover:text-blue-300 transition-colors">← Back to Home</Link>
                </div>

                <h1 className="text-4xl font-bold text-white mb-8">Terms of Service</h1>

                <div className="space-y-6 bg-slate-800/50 p-8 rounded-2xl border border-white/5 backdrop-blur-sm">
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-2">1. Acceptance of Terms</h2>
                        <p>By accessing and using Live Leaderboard, you verify that you have read, understood, and agree to be bound by these Terms. If you do not accept these terms, you should not use the service.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-2">2. Description of Service</h2>
                        <p>Live Leaderboard provides real-time scoring and ranking services for events. We do not guarantee continuous, uninterrupted access to the service.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-2">3. User Conduct</h2>
                        <p>You agree not to modify, hack, or manipulate scores via unauthorized means. Any attempt to artificially inflate scores, spam the API, or disrupt the service will result in an immediate ban and IP blacklist.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-2">4. Event Liability</h2>
                        <p>Live Leaderboard is a tool for event organizers. We are not responsible for the outcomes of competitions, prize distributions, or judging disputes that occur within events hosted on our platform.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-2">5. Data & Privacy</h2>
                        <p>Your use of the service is also governed by our Privacy Policy. We collect minimal data necessary to facilitate the scoring process.</p>
                    </section>

                    <div className="pt-8 text-sm text-slate-500 border-t border-white/5">
                        Last Updated: {new Date().toLocaleDateString()}
                    </div>
                </div>
            </div>
        </div>
    )
}
