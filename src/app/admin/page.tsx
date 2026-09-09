'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { createClient } from '@/lib/supabase/client'
import QRCode from 'qrcode'
import { format } from 'date-fns'
import { Loader2, Upload, LogOut, Image as ImageIcon, Download, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ImageRecord {
  id: string
  storage_path: string
  title: string
  upload_date: string
  is_active: boolean
}

interface UploadedItem extends ImageRecord {
  qrDataUrl: string
}

export default function AdminDashboard() {
  const [uploading, setUploading] = useState(false)
  const [history, setHistory] = useState<UploadedItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createClient()
  const router = useRouter()

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true)
    const { data, error } = await supabase
      .from('images')
      .select('*')
      .order('upload_date', { ascending: false })

    if (error) {
      console.error('Error fetching history:', error)
    }

    if (data) {
      // Generate QR codes for all history items
      const itemsWithQr = await Promise.all(
        data.map(async (item) => {
          const url = `${window.location.origin}/i/${item.id}`
          const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 200 })
          return { ...item, qrDataUrl }
        })
      )
      setHistory(itemsWithQr)
    }
    setLoadingHistory(false)
  }, [supabase])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    setUploading(true)

    for (const file of acceptedFiles) {
      try {
        const id = crypto.randomUUID()
        const ext = file.name.split('.').pop()
        const storage_path = `${id}.${ext}`
        
        // 1. Upload to storage
        const { error: storageError } = await supabase.storage
          .from('gallery-images')
          .upload(storage_path, file)
          
        if (storageError) throw storageError

        // 2. Insert into database
        const { error: dbError } = await supabase
          .from('images')
          .insert({
            id,
            storage_path,
            title: file.name,
            is_active: true
          })

        if (dbError) throw dbError

      } catch (error) {
        console.error('Error uploading file:', file.name, error)
        alert(`Failed to upload ${file.name}`)
      }
    }

    setUploading(false)
    fetchHistory()
  }, [supabase, fetchHistory])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] }
  })

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const downloadQR = (qrDataUrl: string, title: string) => {
    const link = document.createElement('a')
    link.href = qrDataUrl
    link.download = `QR_${title}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredHistory = history.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    format(new Date(item.upload_date), 'PPP').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold text-lg">
            <ImageIcon className="w-6 h-6" />
            Gallery QR Admin
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white flex items-center gap-2 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Upload Section */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <div className="flex flex-col items-center gap-4 text-gray-500 dark:text-gray-400">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <p className="text-lg font-medium">Uploading images...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-gray-500 dark:text-gray-400">
                <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    Click or drag images here
                  </p>
                  <p className="text-sm mt-1">Support for batch upload</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* History Section */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Upload History</h2>
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by title or date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
              />
            </div>
          </div>

          {loadingHistory ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No images found.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredHistory.map((item) => (
                <div key={item.id} className="group relative bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600 transition-all hover:shadow-md">
                  <div className="aspect-square bg-white dark:bg-gray-800 rounded-lg p-2 mb-4 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.qrDataUrl} alt={`QR for ${item.title}`} className="w-full h-full object-contain" />
                  </div>
                  <div className="space-y-1 mb-4">
                    <p className="font-medium text-gray-900 dark:text-white truncate" title={item.title}>
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(item.upload_date), 'PPP p')}
                    </p>
                  </div>
                  <button
                    onClick={() => downloadQR(item.qrDataUrl, item.title)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Download QR
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
