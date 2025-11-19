import Navbar from '@/components/Navbar';
import KnowledgeBaseList from '@/components/knowledge-base/KnowledgeBaseList';
import CreateKnowledgeBaseButton from '@/components/knowledge-base/CreateKnowledgeBaseButton';

export default function KnowledgeBasePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Knowledge Base</h1>
          <CreateKnowledgeBaseButton />
        </div>
        <KnowledgeBaseList />
      </div>
    </div>
  );
}

