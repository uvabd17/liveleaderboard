// Client-side color extraction utility using canvas API

export interface ExtractedColors {
  primary: string;
  secondary: string;
  accent: string;
}

/**
 * Extract dominant colors from an image data URL
 * Uses canvas API to sample pixels and find most common colors
 */
export async function extractColorsFromImage(dataUrl: string): Promise<ExtractedColors> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // Don't set crossOrigin for data URLs - it causes CORS issues
    if (!dataUrl.startsWith('data:')) {
      img.crossOrigin = 'anonymous'
    }
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }
        
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        
        // Sample pixels (every 10th pixel for performance)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const pixels = imageData.data
        const colorCounts: Record<string, number> = {}
        
        // Sample pixels
        for (let i = 0; i < pixels.length; i += 40) { // Every 10th pixel (RGBA = 4 bytes)
          const r = pixels[i]
          const g = pixels[i + 1]
          const b = pixels[i + 2]
          const a = pixels[i + 3]
          
          // Skip transparent pixels
          if (a < 128) continue
          
          // Quantize colors to reduce noise (round to nearest 32)
          const qr = Math.round(r / 32) * 32
          const qg = Math.round(g / 32) * 32
          const qb = Math.round(b / 32) * 32
          
          const colorKey = `${qr},${qg},${qb}`
          colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1
        }
        
        // Get top 3 most common colors
        const sortedColors = Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([rgb]) => {
            const [r, g, b] = rgb.split(',').map(Number)
            return rgbToHex(r, g, b)
          })
        
        // Ensure we have at least 3 colors (pad with defaults if needed)
        let primary = sortedColors[0] || '#3b82f6'
        let secondary = sortedColors[1] || '#8b5cf6'
        let accent = sortedColors[2] || '#10b981'
        
        // If we only got 1-2 colors, generate complementary colors
        if (sortedColors.length === 1) {
          const primaryRgb = parseInt(primary.slice(1), 16)
          const r = (primaryRgb >> 16) & 0xFF
          const g = (primaryRgb >> 8) & 0xFF
          const b = primaryRgb & 0xFF
          secondary = rgbToHex(Math.min(255, r + 40), Math.min(255, g + 20), Math.max(0, b - 20))
          accent = rgbToHex(Math.max(0, r - 20), Math.min(255, g + 40), Math.min(255, b + 20))
        } else if (sortedColors.length === 2) {
          const primaryRgb = parseInt(primary.slice(1), 16)
          const secondaryRgb = parseInt(secondary.slice(1), 16)
          const r = Math.floor(((primaryRgb >> 16) & 0xFF + (secondaryRgb >> 16) & 0xFF) / 2)
          const g = Math.floor(((primaryRgb >> 8) & 0xFF + (secondaryRgb >> 8) & 0xFF) / 2)
          const b = Math.floor((primaryRgb & 0xFF + secondaryRgb & 0xFF) / 2)
          accent = rgbToHex(r, g, b)
        }
        
        resolve({ primary, secondary, accent })
      } catch (error) {
        reject(error)
      }
    }
    
    img.onerror = (err) => {
      console.error('[COLOR] Image load error:', err)
      reject(new Error('Failed to load image'))
    }
    
    img.src = dataUrl
  })
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

/**
 * Get a lighter/darker variant of a color for UI
 */
export function adjustColorBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + percent))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent))
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent))
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}
