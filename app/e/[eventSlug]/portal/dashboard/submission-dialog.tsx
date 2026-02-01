"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog"
import { UploadCloud, Loader2 } from "lucide-react"
import toast from 'react-hot-toast'

interface SubmissionDialogProps {
    eventSlug: string
    roundNumber: number
    roundName: string
    initialUrl?: string
    initialNotes?: string | null
}

export default function SubmissionDialog({
    eventSlug, roundNumber, roundName, initialUrl, initialNotes
}: SubmissionDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [url, setUrl] = useState(initialUrl || "")
    const [notes, setNotes] = useState(initialNotes || "")
    const router = useRouter()

    const handleSubmit = async () => {
        if (!url) return toast.error("Please enter a valid URL")

        setLoading(true)
        try {
            const res = await fetch("/api/participant/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    eventSlug,
                    roundNumber,
                    url,
                    notes: notes || undefined
                }),
            })

            if (!res.ok) throw new Error("Failed to submit")

            toast.success("Submission received!")
            setOpen(false)
            router.refresh() // Refresh server component to update status

        } catch (error) {
            toast.error("Something went wrong. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={initialUrl ? "secondary" : "default"} className={`
            font-bold uppercase tracking-widest text-xs h-10 px-6
            ${initialUrl ? "bg-neutral-800 hover:bg-neutral-700 text-neutral-300" : "bg-blue-600 hover:bg-blue-500 text-white"}
        `}>
                    {initialUrl ? "Edit Link" : <><UploadCloud className="mr-2 w-4 h-4" /> Submit</>}
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-neutral-900 border-white/10 sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-white font-black italic uppercase tracking-tight">
                        Submit for {roundName || `Round ${roundNumber}`}
                    </DialogTitle>
                    <DialogDescription className="text-neutral-400">
                        Paste a link to your work (Google Drive, GitHub, Figma, etc).
                        <br />
                        <span className="text-xs text-amber-500 font-medium">Ensure your link is publicly accessible to judges.</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                            Shared URL
                        </label>
                        <Input
                            value={url}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                            placeholder="https://..."
                            className="bg-black/50 border-white/10 text-white font-mono text-sm"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                            Notes (Optional)
                        </label>
                        <Textarea
                            value={notes}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                            placeholder="Any comments for the judges..."
                            className="bg-black/50 border-white/10 text-white min-h-[80px]"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)} className="text-neutral-400 hover:text-white">
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading || !url} className="bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Submission"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
