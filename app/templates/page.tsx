import Navbar from '@/components/Navbar';
import TemplateList from '@/components/templates/TemplateList';
import CreateTemplateButton from '@/components/templates/CreateTemplateButton';

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Templates</h1>
          <CreateTemplateButton />
        </div>
        <TemplateList />
      </div>
    </div>
  );
}

