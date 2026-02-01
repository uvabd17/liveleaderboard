import { LoadingSpinner } from '@/components/loading-spinner'

export default function Loading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-cream">
      <LoadingSpinner size="lg" />
    </div>
  )
}
