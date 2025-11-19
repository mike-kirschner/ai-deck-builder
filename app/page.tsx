import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            AI Deck Builder
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Generate professional presentations using AI and customizable templates
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Link
            href="/presentations"
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-3 text-gray-800">
              Presentations
            </h2>
            <p className="text-gray-600">
              Create, manage, and export your presentations
            </p>
          </Link>

          <Link
            href="/templates"
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-3 text-gray-800">
              Templates
            </h2>
            <p className="text-gray-600">
              Upload and manage presentation templates
            </p>
          </Link>

          <Link
            href="/knowledge-base"
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-3 text-gray-800">
              Knowledge Base
            </h2>
            <p className="text-gray-600">
              Manage content and context for AI generation
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

