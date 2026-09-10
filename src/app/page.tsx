'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, LogOut, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ImageRecord {
  id: string
  storage_path: string
  title: string
  upload_date: string
}

interface GalleryItem extends ImageRecord {
  signedUrl: string
}

export default function UserDashboard() {
  const [images, setImages] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  const fetchGallery = useCallback(async () => {
    setLoading(true)
    // Fetch all active images
    const { data: dbImages, error: dbError } = await supabase
      .from('images')
      .select('*')
      .eq('is_active', true)
      .order('upload_date', { ascending: false })

    if (dbError) {
      console.error('Error fetching images:', dbError)
      setLoading(false)
      return
    }

    if (dbImages && dbImages.length > 0) {
      // Batch generate signed URLs for thumbnail viewing
      const paths = dbImages.map((img) => img.storage_path)
      const { data: signedUrlsData, error: signedUrlsError } = await supabase.storage
        .from('gallery-images')
        .createSignedUrls(paths, 60 * 60) // 1 hour expiry

      if (signedUrlsError) {
        console.error('Error generating signed URLs:', signedUrlsError)
      }

      if (signedUrlsData) {
        const fullGallery = dbImages.map((img, index) => {
          return {
            ...img,
            signedUrl: signedUrlsData[index]?.signedUrl || '',
          }
        })
        setImages(fullGallery)
      }
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchGallery()
  }, [fetchGallery])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleDownload = async (item: GalleryItem) => {
    try {
      // Fetch the image as a blob
      const response = await fetch(item.signedUrl)
      const blob = await response.blob()
      
      // Create a temporary link and trigger download
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = item.storage_path.split('/').pop() || 'download.jpg'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('Download failed:', err)
      alert('Failed to download image.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navbar */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Public Gallery
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No images</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              The gallery is currently empty.
            </p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
            {images.map((item) => (
              <div
                key={item.id}
                className="break-inside-avoid bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group relative"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.signedUrl}
                  alt={item.title}
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex flex-col justify-end p-4">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="text-white font-medium truncate mb-2">{item.title}</p>
                    <button
                      onClick={() => handleDownload(item)}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
