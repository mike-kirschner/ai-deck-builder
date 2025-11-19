import Navbar from '@/components/Navbar';
import PresentationList from '@/components/presentations/PresentationList';
import CreatePresentationButton from '@/components/presentations/CreatePresentationButton';

export default function PresentationsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Presentations</h1>
          <CreatePresentationButton />
        </div>
        <PresentationList />
      </div>
    </div>
  );
}

