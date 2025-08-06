'use client';
// This is a Next.js Client Component (can use hooks, browser APIs)

import { useState } from 'react';
import { ID } from 'appwrite';                // For generating unique IDs
import { toast } from 'sonner';               // For notifications
import { useRouter } from 'next/navigation';  // Next.js router (for redirects)
import { databases } from '@/lib/appwrite.config';  // Appwrite DB SDK instance
import { DATABASE_ID } from '@/lib/appwrite.config'; // DB id (env/constant)
import { COLLECTIONS } from '@/lib/collections';     // Centralized collection IDs
import { Input } from '@/components/ui/Input';       // Custom Input component
import { Button } from '@/components/ui/Button';     // Custom Button component
import { useAuth } from '@/context/AuthProvider';    // Auth context (current user)

// Main component for the "Add Lab Test" page
export default function AddLabTestPage() {
  const router = useRouter();           // Used to navigate after save
  const { user } = useAuth();           // Get current logged-in user

  // Form state for inputs
  const [form, setForm] = useState({
    name: '',              // Test name
    price: '',             // Test price (string, convert to number on submit)
    category: '',          // Category (optional)
    availableInHouse: false, // Checkbox: is this test available in-house?
  });

  // Handle changes in form inputs (text, number, checkbox)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value, // Checkbox uses 'checked'
    });
  };

  // Handle form submission (save to Appwrite)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Simple validation
    if (!form.name || !form.price) {
      toast.warning('Test name and price are required');
      return;
    }

    try {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.LABTESTCATALOG, // Collection name/id for Lab Tests
        ID.unique(),                // Auto-generate unique document id
        {
          name: form.name,
          price: parseFloat(form.price), // Convert to number
          category: form.category,
          availableInHouse: form.availableInHouse,
          createdBy: user?.id || '',     // Track who created (from context)
          createdAt: new Date().toISOString(), // Save current datetime
        }
      );

      toast.success('Lab test added');  // Show success message
      router.push('/dashboard/labtechnician/labtests'); // Redirect back to list
    } catch (err) {
      console.error('Failed to add lab test:', err);
      toast.error('Failed to add test'); // Show error message
    }
  };

  // UI: Form for adding new lab test
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
