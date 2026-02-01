"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
// Using simple portal approach if possible, or just fixed position for now to avoid dependencies
import { createPortal } from "react-dom"

interface DialogProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children?: React.ReactNode
}

const DialogContext = React.createContext<DialogProps>({})

export function Dialog({ open, onOpenChange, children }: DialogProps) {
    return (
        <DialogContext.Provider value={{ open, onOpenChange }}>
            {children}
        </DialogContext.Provider>
    )
}

export function DialogTrigger({ asChild, children, onClick, ...props }: any) {
    const { onOpenChange } = React.useContext(DialogContext)
    return (
        <span onClick={(e) => {
            onClick?.(e)
            onOpenChange?.(true)
        }} {...props}>
            {children}
        </span>
    )
}

export function DialogContent({ children, className, ...props }: any) {
    const { open, onOpenChange } = React.useContext(DialogContext)

    // Mount portal only on client
    const [mounted, setMounted] = React.useState(false)
    React.useEffect(() => setMounted(true), [])

    if (!open) return null
    if (!mounted) return null

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in-0"
                onClick={() => onOpenChange?.(false)}
            />
            {/* Content */}
            <div
                className={cn(
                    "relative z-50 grid w-full max-w-lg gap-4 bg-background p-6 shadow-lg duration-200 animate-in fade-in-0 zoom-in-95 rounded-xl border border-border sm:rounded-lg",
                    className
                )}
                {...props}
            >
                {children}
                <button
                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                    onClick={() => onOpenChange?.(false)}
                >
                    <span className="sr-only">Close</span>
                    ✕
                </button>
            </div>
        </div>,
        document.body
    )
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
    )
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
    )
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h3 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
    )
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
    return (
        <p className={cn("text-sm text-muted-foreground", className)} {...props} />
    )
}
