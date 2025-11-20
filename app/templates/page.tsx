import Navbar from '@/components/Navbar';
import TemplateList from '@/components/templates/TemplateList';
import CreateTemplateButton from '@/components/templates/CreateTemplateButton';

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-400 font-semibold mb-2">
              templates
            </p>
            <h1 className="text-3xl font-bold text-gray-100">Templates</h1>
          </div>
          <CreateTemplateButton />
        </div>
        <TemplateList />
      </div>
    </div>
  );
}

