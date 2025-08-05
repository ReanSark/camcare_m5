'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ID } from 'appwrite';
import { toast } from 'sonner';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { LabResultDetail } from '@/types';

const FLAG_OPTIONS: LabResultDetail['flag'][] = ['normal', 'high', 'low', 'critical'];

export default function AddLabResultDetailPage() {
  const router = useRouter();
  const { id: labResultId } = useParams<{ id: string }>();

  // Form state
  const [testItem, setTestItem] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');
  const [referenceRange, setReferenceRange] = useState('');
  const [flag, setFlag] = useState<LabResultDetail['flag']>('normal');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!labResultId || !testItem.trim()) {
      toast.warning('Test item and LabResult ID are required.');
      return;
    }

    setLoading(true);
    try {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.LABRESULTDETAILS,
        ID.unique(),
        {
          labResultId,
          testItem,
          value,
          unit,
          referenceRange,
          flag,
          note,
        }
      );
      toast.success('Test result added.');
      router.push(`/dashboard/labtechnician/labresults/view/${labResultId}`);
    } catch (err) {
      console.error('Failed to add lab result detail:', err);
      toast.error('Failed to add test result.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-6 space-y-6">
      <h1 className="text-xl font-bold">Add Test Result</h1>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block mb-1">Test Item</label>
          <Input
            value={testItem}
            onChange={(e) => setTestItem(e.target.value)}
            placeholder="e.g. Hemoglobin"
            required
          />
        </div>
        <div>
          <label className="block mb-1">Value</label>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 14.2"
          />
        </div>
        <div>
          <label className="block mb-1">Unit</label>
          <Input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="e.g. g/dL"
          />
        </div>
        <div>
          <label className="block mb-1">Reference Range</label>
          <Input
            value={referenceRange}
            onChange={(e) => setReferenceRange(e.target.value)}
            placeholder="e.g. 12.0–16.0"
          />
        </div>
        <div>
          <label className="block mb-1">Flag</label>
          <select
            className="w-full border rounded p-2"
            value={flag}
            onChange={(e) => setFlag(e.target.value as LabResultDetail['flag'])}
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
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Any remarks"
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Add Test Result'}
        </Button>
      </form>
    </div>
  );
}
