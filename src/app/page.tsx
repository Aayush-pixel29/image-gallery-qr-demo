'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, LogOut, QrCode } from 'lucide-react'
import { useRouter } from 'next/navigation'
import QRCode from 'qrcode'

interface ImageRecord {
  id: string
  storage_path: string
  title: string
  upload_date: string
}

interface GalleryItem extends ImageRecord {
  signedUrl: string
}

function GalleryCard({ item }: { item: GalleryItem }) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [qrUrl, setQrUrl] = useState<string>('')

  useEffect(() => {
    // Generate the exact same QR code the admin uses
    const url = `${window.location.origin}/i/${item.id}`
    QRCode.toDataURL(url, { margin: 2, width: 300, color: { dark: '#000000', light: '#ffffff' } })
      .then(setQrUrl)
      .catch(console.error)
  }, [item.id])

  return (
    <div 
      className="relative break-inside-avoid mb-6 cursor-pointer group"
      style={{ perspective: '1500px' }}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div 
        className="w-full relative transition-all duration-700 ease-in-out"
        style={{ 
          transformStyle: 'preserve-3d', 
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' 
        }}
      >
        {/* FRONT SIDE (Image) */}
        <div 
          className="w-full bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm group-hover:shadow-lg transition-shadow relative"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.signedUrl}
            alt={item.title}
            className="w-full h-auto object-cover block"
            loading="lazy"
          />
          {/* Subtle overlay gradient at the bottom for title visibility */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4 pt-12 flex justify-between items-end">
            <p className="text-white font-medium truncate drop-shadow-md">{item.title}</p>
            <div className="bg-white/20 backdrop-blur-md rounded-full p-2">
              <QrCode className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        {/* BACK SIDE (QR Code) */}
        <div 
          className="absolute inset-0 w-full h-full bg-indigo-50 dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg flex flex-col items-center justify-center p-2 sm:p-3 border-2 border-indigo-500"
          style={{ 
            backfaceVisibility: 'hidden', 
            transform: 'rotateY(180deg)' 
          }}
        >
          <div className="w-full h-full bg-white rounded-lg flex items-center justify-center p-2">
            {qrUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain" />
              </>
            ) : (
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function UserDashboard() {
  const [images, setImages] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  const fetchGallery = useCallback(async () => {
    setLoading(true)
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
      const paths = dbImages.map((img) => img.storage_path)
      const { data: signedUrlsData, error: signedUrlsError } = await supabase.storage
        .from('gallery-images')
        .createSignedUrls(paths, 60 * 60)

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navbar */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
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
          <div className="flex justify-center items-center h-[60vh]">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">No images available</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              The gallery is currently empty. Check back later!
            </p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6">
            {images.map((item) => (
              <GalleryCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
