import Navbar from '@/components/Navbar';
import PresentationEditor from '@/components/admin/PresentationEditor';

export default function PresentationEditorPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <PresentationEditor presentationId={params.id} />
      </div>
    </div>
  );
}

