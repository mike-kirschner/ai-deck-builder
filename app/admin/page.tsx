import Navbar from '@/components/Navbar';
import AdminInterface from '@/components/admin/AdminInterface';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <AdminInterface />
      </div>
    </div>
  );
}

