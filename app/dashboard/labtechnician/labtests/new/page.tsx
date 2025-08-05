'use client';

import { useState } from 'react';
import { ID } from 'appwrite';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthProvider'; // 👈 get current user

export default function AddLabTestPage() {
  const router = useRouter();
  const { user } = useAuth(); // 👈 get current user
  const [form, setForm] = useState({
    name: '',
    price: '',
    category: '',
    availableInHouse: false, // 👈 new field
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.price) {
      toast.warning('Test name and price are required');
      return;
    }

    try {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.LABTESTCATALOG,
        ID.unique(),
        {
          name: form.name,
          price: parseFloat(form.price),
          category: form.category,
          availableInHouse: form.availableInHouse,
          createdBy: user?.id || '', // 👈 from context
          createdAt: new Date().toISOString(), // optional if Appwrite default set
        }
      );

      toast.success('Lab test added');
      router.push('/dashboard/labtechnician/labtests');
    } catch (err) {
      console.error('Failed to add lab test:', err);
      toast.error('Failed to add test');
    }
  };

  return (
    <div className="max-w-xl mx-auto py-6 space-y-6">
      <h1 className="text-xl font-bold">Add Lab Test</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Test Name</label>
          <Input name="name" value={form.name} onChange={handleChange} required />
        </div>

        <div>
          <label className="block mb-1">Price</label>
          <Input name="price" type="number" step="0.01" value={form.price} onChange={handleChange} required />
        </div>

        <div>
          <label className="block mb-1">Category (optional)</label>
          <Input name="category" value={form.category} onChange={handleChange} />
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="availableInHouse"
              checked={form.availableInHouse}
              onChange={handleChange}
            />
            Available In-House
          </label>
        </div>

        <Button type="submit">Save Test</Button>
      </form>
    </div>
  );
}
