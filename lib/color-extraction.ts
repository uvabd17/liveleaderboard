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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c899a439-8621-4806-a624-02a438efe8c1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'color-extraction.ts:13',message:'extractColorsFromImage called',data:{dataUrlLength:dataUrl?.length,dataUrlPrefix:dataUrl?.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const img = new Image()
    // Don't set crossOrigin for data URLs - it causes CORS issues
    if (!dataUrl.startsWith('data:')) {
      img.crossOrigin = 'anonymous'
    }
    
    img.onload = () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c899a439-8621-4806-a624-02a438efe8c1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'color-extraction.ts:19',message:'Image loaded successfully',data:{width:img.width,height:img.height},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/c899a439-8621-4806-a624-02a438efe8c1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'color-extraction.ts:25',message:'Canvas context failed',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          reject(new Error('Could not get canvas context'))
          return
        }
        
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c899a439-8621-4806-a624-02a438efe8c1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'color-extraction.ts:32',message:'Image drawn to canvas',data:{canvasWidth:canvas.width,canvasHeight:canvas.height},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        
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
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c899a439-8621-4806-a624-02a438efe8c1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'color-extraction.ts:58',message:'Color sampling complete',data:{uniqueColors:Object.keys(colorCounts).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        // Get top 3 most common colors
        const sortedColors = Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([rgb]) => {
            const [r, g, b] = rgb.split(',').map(Number)
            return rgbToHex(r, g, b)
          })
        
        // Ensure we have at least 3 colors (pad with defaults if needed)
        // If we have fewer than 3 colors, generate variations
        let primary = sortedColors[0] || '#3b82f6'
        let secondary = sortedColors[1] || '#8b5cf6'
        let accent = sortedColors[2] || '#10b981'
        
        // If we only got 1-2 colors, generate complementary colors
        if (sortedColors.length === 1) {
          // Generate secondary and accent from primary
          const primaryRgb = parseInt(primary.slice(1), 16)
          const r = (primaryRgb >> 16) & 0xFF
          const g = (primaryRgb >> 8) & 0xFF
          const b = primaryRgb & 0xFF
          // Create a complementary color (shift hue)
          secondary = rgbToHex(Math.min(255, r + 40), Math.min(255, g + 20), Math.max(0, b - 20))
          accent = rgbToHex(Math.max(0, r - 20), Math.min(255, g + 40), Math.min(255, b + 20))
        } else if (sortedColors.length === 2) {
          // Generate accent from primary and secondary
          const primaryRgb = parseInt(primary.slice(1), 16)
          const secondaryRgb = parseInt(secondary.slice(1), 16)
          const r = Math.floor(((primaryRgb >> 16) & 0xFF + (secondaryRgb >> 16) & 0xFF) / 2)
          const g = Math.floor(((primaryRgb >> 8) & 0xFF + (secondaryRgb >> 8) & 0xFF) / 2)
          const b = Math.floor((primaryRgb & 0xFF + secondaryRgb & 0xFF) / 2)
          accent = rgbToHex(r, g, b)
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c899a439-8621-4806-a624-02a438efe8c1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'color-extraction.ts:70',message:'Color extraction complete',data:{primary,secondary,accent,sortedColorsCount:sortedColors.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        resolve({ primary, secondary, accent })
      } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c899a439-8621-4806-a624-02a438efe8c1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'color-extraction.ts:72',message:'Exception in color extraction',data:{error:error instanceof Error?error.message:String(error),errorStack:error instanceof Error?error.stack:undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        reject(error)
      }
    }
    
    img.onerror = (err) => {
      console.error('[COLOR] Image load error:', err)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c899a439-8621-4806-a624-02a438efe8c1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'color-extraction.ts:78',message:'Image load error',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      reject(new Error('Failed to load image'))
    }
    
    console.log('[COLOR] Setting image src, dataUrl length:', dataUrl?.length)
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

