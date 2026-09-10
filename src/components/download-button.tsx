'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

interface DownloadButtonProps {
  url: string
  filename: string
  className?: string
}

export function DownloadButton({ url, filename, className }: DownloadButtonProps) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename || 'download.jpg'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('Download failed:', err)
      alert('Failed to download image.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className={className}
    >
      {downloading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Download className="w-4 h-4 mr-2" />
      )}
      {downloading ? 'Downloading...' : 'Download'}
    </button>
  )
}
