import Navbar from '@/components/Navbar';
import PresentationList from '@/components/presentations/PresentationList';
import CreatePresentationButton from '@/components/presentations/CreatePresentationButton';

export default function PresentationsPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-400 font-semibold mb-2">
              presentations
            </p>
            <h1 className="text-3xl font-bold text-gray-100">Presentations</h1>
            <p className="text-gray-400 mt-2 text-sm">
              Select a presentation to edit, or create a new one
            </p>
          </div>
          <CreatePresentationButton />
        </div>
        <PresentationList />
      </div>
    </div>
  );
}

