'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { LabResultDetail } from '@/types';

const FLAG_OPTIONS: LabResultDetail['flag'][] = ['normal', 'high', 'low', 'critical'];

export default function EditLabResultDetailPage() {
  const router = useRouter();
  const { id: labResultId, detailId } = useParams<{ id: string; detailId: string }>();

  const [detail, setDetail] = useState<LabResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch detail by detailId on mount
  useEffect(() => {
    async function fetchDetail() {
      try {
        const doc = await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.LABRESULTDETAILS,
          detailId
        );
        setDetail({
          $id: doc.$id,
          labResultId: doc.labResultId,
          testItem: doc.testItem,
          value: doc.value ?? '',
          unit: doc.unit ?? '',
          referenceRange: doc.referenceRange ?? '',
          flag: doc.flag ?? 'normal',
          note: doc.note ?? '',
        });
      } catch (err) {
        console.error('Failed to load test result:', err);
        toast.error('Failed to load test result');
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [detailId]);

  // Edit handlers
  const handleChange = (field: keyof LabResultDetail) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            [field]: e.target.value,
          }
        : prev
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    setSubmitting(true);
    try {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.LABRESULTDETAILS,
        detail.$id,
        {
          testItem: detail.testItem,
          value: detail.value,
          unit: detail.unit,
          referenceRange: detail.referenceRange,
          flag: detail.flag,
          note: detail.note,
        }
      );
      toast.success('Test result updated.');
      router.push(`/dashboard/labtechnician/labresults/view/${labResultId}`);
    } catch (err) {
      console.error('Failed to update test result:', err);
      toast.error('Failed to update test result.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!detail) return <div className="p-6 text-red-500">Test result not found.</div>;

  return (
    <div className="max-w-xl mx-auto py-6 space-y-6">
      <h1 className="text-xl font-bold">Edit Test Result</h1>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block mb-1">Test Item</label>
          <Input
            value={detail.testItem}
            onChange={handleChange('testItem')}
            required
          />
        </div>
        <div>
          <label className="block mb-1">Value</label>
          <Input
            value={detail.value}
            onChange={handleChange('value')}
          />
        </div>
        <div>
          <label className="block mb-1">Unit</label>
          <Input
            value={detail.unit}
            onChange={handleChange('unit')}
          />
        </div>
        <div>
          <label className="block mb-1">Reference Range</label>
          <Input
            value={detail.referenceRange}
            onChange={handleChange('referenceRange')}
          />
        </div>
        <div>
          <label className="block mb-1">Flag</label>
          <select
            className="w-full border rounded p-2"
            value={detail.flag}
            onChange={handleChange('flag')}
          >
            {FLAG_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {typeof opt === "string" ? opt[0].toUpperCase() + opt.slice(1) : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1">Note</label>
          <Input
            value={detail.note}
            onChange={handleChange('note')}
          />
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : 'Update Test Result'}
        </Button>
      </form>
    </div>
  );
}
