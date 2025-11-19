import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold text-gray-900">
            AI Deck Builder
          </Link>
          <div className="flex space-x-6">
            <Link
              href="/presentations"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Presentations
            </Link>
            <Link
              href="/templates"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Templates
            </Link>
            <Link
              href="/knowledge-base"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Knowledge Base
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

