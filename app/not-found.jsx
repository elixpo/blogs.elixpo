import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="h-16 w-16 mx-auto rounded-full bg-[url('/logo.png')] bg-cover mb-6 opacity-40" />
        <h1 className="text-7xl font-extrabold text-[#1D202A] mb-2">404</h1>
        <h2 className="text-xl font-bold text-white mb-2">Page not found</h2>
        <p className="text-[#888] text-sm mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="px-6 py-2.5 bg-[#7ba8f0] text-[#030712] font-semibold rounded-full text-sm hover:bg-[#9dc0ff] transition-colors"
          >
            Go to Feed
          </Link>
          <Link
            href="/auth/login"
            className="px-6 py-2.5 bg-[#1D202A] text-[#888] font-medium rounded-full text-sm hover:text-white transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
