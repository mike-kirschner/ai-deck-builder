import Navbar from '@/components/Navbar';
import KnowledgeBaseDetail from '@/components/knowledge-base/KnowledgeBaseDetail';

export default function KnowledgeBaseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <KnowledgeBaseDetail articleId={params.id} />
      </div>
    </div>
  );
}

