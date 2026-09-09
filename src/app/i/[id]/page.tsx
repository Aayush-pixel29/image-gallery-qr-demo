import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimiter } from '@/lib/rate-limit'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { Download } from 'lucide-react'

// Revalidate this page every request (dynamic)
export const dynamic = 'force-dynamic'

export default async function PublicImagePage({ params }: { params: { id: string } }) {
  const ip = headers().get('x-forwarded-for') || '127.0.0.1'
  
  if (!rateLimiter.check(ip)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Too Many Requests</h1>
          <p className="text-gray-500">Please try again later.</p>
        </div>
      </div>
    )
  }

  const supabase = createAdminClient()
  
  const { data: image, error: dbError } = await supabase
    .from('images')
    .select('*')
    .eq('id', params.id)
    .single()

  if (dbError || !image || !image.is_active) {
    notFound()
  }

  // Generate short-lived signed URL (expires in 5 minutes = 300 seconds)
  const { data: signedData, error: storageError } = await supabase.storage
    .from('gallery-images')
    .createSignedUrl(image.storage_path, 300)

  if (storageError || !signedData) {
    console.error('Failed to generate signed URL', storageError)
    notFound()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="p-4 bg-gray-100 dark:bg-gray-900 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
          <h1 className="font-semibold text-gray-900 dark:text-white truncate pr-4">
            {image.title}
          </h1>
          <a
            href={signedData.signedUrl}
            download={image.title}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shrink-0 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            <Download className="w-4 h-4" />
            Download
          </a>
        </div>
        <div className="p-8 flex items-center justify-center bg-white dark:bg-gray-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={signedData.signedUrl}
            alt={image.title}
            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm"
          />
        </div>
      </div>
    </div>
  )
}
