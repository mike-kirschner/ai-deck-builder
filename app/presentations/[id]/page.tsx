import Navbar from '@/components/Navbar';
import PresentationViewer from '@/components/presentations/PresentationViewer';

export default function PresentationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <PresentationViewer presentationId={params.id} />
      </div>
    </div>
  );
}

