'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { databases, DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import { Button } from '@/components/ui/Button';
import type { LabTest } from '@/types';

type SortKey = 'name' | 'price' | 'category';
type SortOrder = 'asc' | 'desc';

export default function LabTestCatalogPage() {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterInHouse, setFilterInHouse] = useState<'all' | 'yes' | 'no'>('all');

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.LABTESTCATALOG);
        const docs = res.documents.map((doc): LabTest => ({
          $id: doc.$id,
          name: doc.name,
          price: doc.price,
          category: doc.category,
          availableInHouse: doc.availableInHouse,
          createdBy: doc.createdBy,
          createdAt: doc.createdAt,
        }));
        setTests(docs);
      } catch (err) {
        console.error('Failed to load lab tests:', err);
        toast.error('Failed to load lab tests');
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, []);

  // Unique categories for filter dropdown
  const categories = Array.from(new Set(tests.map((t) => t.category).filter(Boolean)));

  // Filter and sort data
  let filteredTests = tests;
  if (filterCategory) {
    filteredTests = filteredTests.filter((t) => t.category === filterCategory);
  }
  if (filterInHouse !== 'all') {
    filteredTests = filteredTests.filter((t) =>
      filterInHouse === 'yes' ? t.availableInHouse : !t.availableInHouse
    );
  }
  const sortedTests = [...filteredTests].sort((a, b) => {
    let compare = 0;
    if (sortKey === 'price') {
      compare = (a.price || 0) - (b.price || 0);
    } else {
      compare = String(a[sortKey] || '').localeCompare(String(b[sortKey] || ''));
    }
    return sortOrder === 'asc' ? compare : -compare;
  });

  // Handle sorting toggle
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  // Delete action
  const handleDelete = async ($id: string) => {
    if (!window.confirm('Are you sure you want to delete this lab test?')) return;
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.LABTESTCATALOG, $id);
      setTests((prev) => prev.filter((t) => t.$id !== $id));
      toast.success('Lab test deleted');
    } catch (err) {
      console.error('Failed to delete:', err);
      toast.error('Failed to delete lab test');
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
        <h1 className="text-2xl font-bold">Lab Test Catalog</h1>
        <Link href="/dashboard/labtechnician/labtests/new">
          <Button>➕ Add Test</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <div>
          <label className="mr-2 font-semibold">Category:</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border rounded p-1"
          >
            <option value="">All</option>
            {categories.map((cat) => (
              <option value={cat} key={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mr-2 font-semibold">Available In-House:</label>
          <select
            value={filterInHouse}
            onChange={(e) => setFilterInHouse(e.target.value as 'all' | 'yes' | 'no')}
            className="border rounded p-1"
          >
            <option value="all">All</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : sortedTests.length === 0 ? (
        <p>No lab tests found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2 border cursor-pointer" onClick={() => handleSort('name')}>
                  Name {sortKey === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="text-left p-2 border cursor-pointer" onClick={() => handleSort('price')}>
                  Price {sortKey === 'price' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="text-left p-2 border cursor-pointer" onClick={() => handleSort('category')}>
                  Category {sortKey === 'category' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="text-left p-2 border">Available In-House</th>
                <th className="text-left p-2 border">Created By</th>
                <th className="text-left p-2 border">Created At</th>
                <th className="text-left p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedTests.map((t) => (
                <tr key={t.$id} className="border-t">
                  <td className="p-2 border">{t.name}</td>
                  <td className="p-2 border">${t.price?.toFixed(2)}</td>
                  <td className="p-2 border">{t.category ?? '-'}</td>
                  <td className="p-2 border">{t.availableInHouse ? 'Yes' : 'No'}</td>
                  <td className="p-2 border">{t.createdBy ?? '-'}</td>
                  <td className="p-2 border">
                    {t.createdAt ? new Date(t.createdAt).toLocaleString() : '-'}
                  </td>
                  <td className="p-2 border flex gap-2">
                    <Link href={`/dashboard/labtechnician/labtests/edit/${t.$id}`}>
                      <Button variant="outline">Edit</Button>
                    </Link>
                    <Button variant="destructive" onClick={() => handleDelete(t.$id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
