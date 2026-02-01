import { cn } from "@/lib/utils"

interface LogoProps {
    className?: string
    size?: number
    variant?: 'full' | 'icon'
    animated?: boolean
}

export function Logo({ className, size = 32, variant = 'full', animated = false }: LogoProps) {
    return (
        <div className={cn("flex items-center gap-2", className)}>
            <div className={cn("relative flex items-center justify-center", animated && "group")}>
                {/* Glow Effect */}
                <div
                    className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ width: size * 1.5, height: size * 1.5, left: -size * 0.25, top: -size * 0.25 }}
                />

                {/* Icon SVG */}
                <svg
                    width={size}
                    height={size}
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="relative z-10"
                >
                    {/* Stylized L shape / Graph rising */}
                    <path
                        d="M6 26V6L12 12V26H6Z"
                        className="fill-blue-500"
                    />
                    <path
                        d="M14 26V14L20 8V26H14Z"
                        className="fill-indigo-500"
                    />
                    <path
                        d="M22 26V4L28 10V26H22Z"
                        className="fill-sky-400"
                    />
                    {/* Base line */}
                    <path
                        d="M4 28H28"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="text-slate-700 dark:text-slate-300"
                    />
                </svg>
            </div>

            {variant === 'full' && (
                <span className={cn(
                    "font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-slate-500 font-outfit uppercase italic",
                    size >= 32 ? "text-xl" : "text-lg"
                )}>
                    Live Leaderboard
                </span>
            )}
        </div>
    )
}
