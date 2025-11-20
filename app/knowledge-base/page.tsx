import Navbar from '@/components/Navbar';
import KnowledgeBaseList from '@/components/knowledge-base/KnowledgeBaseList';
import CreateKnowledgeBaseButton from '@/components/knowledge-base/CreateKnowledgeBaseButton';

export default function KnowledgeBasePage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-400 font-semibold mb-2">
              knowledge base
            </p>
            <h1 className="text-3xl font-bold text-gray-100">Knowledge Base</h1>
          </div>
          <CreateKnowledgeBaseButton />
        </div>
        <KnowledgeBaseList />
      </div>
    </div>
  );
}

