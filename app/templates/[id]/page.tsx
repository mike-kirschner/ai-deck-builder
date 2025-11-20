import Navbar from '@/components/Navbar';
import TemplateViewer from '@/components/templates/TemplateViewer';

export default function TemplateDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <TemplateViewer templateId={params.id} />
      </div>
    </div>
  );
}

