'use client'

import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { extractColorsFromImage } from '@/lib/color-extraction'

interface BrandingUploadProps {
  currentLogo?: string | null
  currentColors?: { primary: string; secondary: string; accent: string } | null
  onUpload: (logoData: string | null, colors: { primary: string; secondary: string; accent: string } | null) => Promise<void>
  onRemove?: () => Promise<void>
  label?: string
}

export function BrandingUpload({ 
  currentLogo, 
  currentColors, 
  onUpload, 
  onRemove,
  label = 'Logo'
}: BrandingUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentLogo || null)
  const [colors, setColors] = useState<{ primary: string; secondary: string; accent: string } | null>(currentColors || null)
  const [uploading, setUploading] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string
      setPreview(dataUrl)
      
      try {
        setUploading(true)
        // Extract colors from logo
        let extractedColors: { primary: string; secondary: string; accent: string } | null = null
        try {
          extractedColors = await extractColorsFromImage(dataUrl)
          setColors(extractedColors)
        } catch (error) {
          console.error('Color extraction failed:', error)
          // Continue without color extraction
        }
        
        await onUpload(dataUrl, extractedColors)
        toast.success(`${label} uploaded successfully!`)
      } catch (error) {
        toast.error(`Failed to upload ${label.toLowerCase()}`)
        setPreview(currentLogo || null)
        setColors(currentColors || null)
      } finally {
        setUploading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemove = async () => {
    if (!onRemove) return
    
    try {
      setUploading(true)
      await onRemove()
      setPreview(null)
      setColors(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      toast.success(`${label} removed`)
    } catch (error) {
      toast.error(`Failed to remove ${label.toLowerCase()}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {preview && (
          <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-slate-600 flex-shrink-0">
            <img src={preview} alt={`${label} preview`} className="w-full h-full object-contain" />
          </div>
        )}
        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            aria-label={`Upload ${label.toLowerCase()}`}
            disabled={uploading}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : preview ? `Change ${label}` : `Upload ${label}`}
          </button>
          {preview && onRemove && (
            <button
              onClick={handleRemove}
              disabled={uploading}
              className="ml-2 px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      
      {colors && (
        <div>
          <div className="text-sm text-slate-400 mb-2">Extracted Brand Colors</div>
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div 
                className="w-12 h-12 rounded border-2 border-slate-600" 
                style={{ backgroundColor: colors.primary }}
                title={colors.primary}
              />
              <span className="text-xs text-slate-400 mt-1">Primary</span>
            </div>
            <div className="flex flex-col items-center">
              <div 
                className="w-12 h-12 rounded border-2 border-slate-600" 
                style={{ backgroundColor: colors.secondary }}
                title={colors.secondary}
              />
              <span className="text-xs text-slate-400 mt-1">Secondary</span>
            </div>
            <div className="flex flex-col items-center">
              <div 
                className="w-12 h-12 rounded border-2 border-slate-600" 
                style={{ backgroundColor: colors.accent }}
                title={colors.accent}
              />
              <span className="text-xs text-slate-400 mt-1">Accent</span>
            </div>
          </div>
        </div>
      )}
      
      <p className="text-xs text-slate-400">Upload a logo to customize branding. Max 5MB. Colors will be automatically extracted.</p>
    </div>
  )
}


