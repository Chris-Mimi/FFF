import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <h2 className="text-6xl font-bold text-gray-300 mb-2">404</h2>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h3>
        <p className="text-gray-600 mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors inline-block"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
