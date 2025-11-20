import Link from 'next/link';

import Navbar from '@/components/Navbar';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-400 font-semibold mb-4">
            ai • presentations
          </p>
          <h1 className="text-5xl font-bold text-gray-100 mb-4">
            AI Deck Builder
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            Generate professional presentations using AI and customizable templates
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Link
            href="/presentations"
            className="bg-gray-900/40 border border-gray-800 rounded-2xl shadow-2xl p-6 hover:bg-gray-900/60 transition-all hover:border-indigo-500/30"
          >
            <h2 className="text-2xl font-semibold mb-3 text-gray-100">
              Presentations
            </h2>
            <p className="text-gray-400">
              Create, manage, and export your presentations
            </p>
          </Link>

          <Link
            href="/templates"
            className="bg-gray-900/40 border border-gray-800 rounded-2xl shadow-2xl p-6 hover:bg-gray-900/60 transition-all hover:border-indigo-500/30"
          >
            <h2 className="text-2xl font-semibold mb-3 text-gray-100">
              Templates
            </h2>
            <p className="text-gray-400">
              Upload and manage presentation templates
            </p>
          </Link>

          <Link
            href="/knowledge-base"
            className="bg-gray-900/40 border border-gray-800 rounded-2xl shadow-2xl p-6 hover:bg-gray-900/60 transition-all hover:border-indigo-500/30"
          >
            <h2 className="text-2xl font-semibold mb-3 text-gray-100">
              Knowledge Base
            </h2>
            <p className="text-gray-400">
              Manage content and context for AI generation
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

