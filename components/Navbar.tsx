import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="bg-gray-900/40 border-b border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold text-gray-100 hover:text-indigo-400 transition-colors">
            AI Deck Builder
          </Link>
          <div className="flex space-x-6">
            <Link
              href="/presentations"
              className="text-gray-400 hover:text-gray-100 transition-colors"
            >
              Presentations
            </Link>
            <Link
              href="/templates"
              className="text-gray-400 hover:text-gray-100 transition-colors"
            >
              Templates
            </Link>
            <Link
              href="/knowledge-base"
              className="text-gray-400 hover:text-gray-100 transition-colors"
            >
              Knowledge Base
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

