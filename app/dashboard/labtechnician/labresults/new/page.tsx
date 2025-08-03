'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ID } from 'appwrite';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthProvider';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function NewLabResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [patientId, setPatientId] = useState('');
  const [diagnosisId, setDiagnosisId] = useState('');
  const [testIds, setTestIds] = useState<string[]>(['']);
  const [status, setStatus] = useState<'pending' | 'completed'>('pending');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const pid = searchParams.get('patientId');
    const did = searchParams.get('diagnosisId');
    if (pid) setPatientId(pid);
    if (did) setDiagnosisId(did);
  }, [searchParams]);

  const handleTestChange = (index: number, value: string) => {
    const updated = [...testIds];
    updated[index] = value;
    setTestIds(updated);
  };

  const addTest = () => {
    setTestIds([...testIds, '']);
  };

  const removeTest = (index: number) => {
    setTestIds(testIds.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user?.$id || !patientId) {
      toast.warning('Missing technician or patient information');
      return;
    }

    if (testIds.length === 0 || testIds.every((id) => id.trim() === '')) {
      toast.warning('At least one test must be recorded');
      return;
    }

    setLoading(true);
    try {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.LABRESULTS,
        ID.unique(),
        {
          patientId,
          appointmentId: diagnosisId || '',
          testIds,
          status,
          enteredBy: user.$id,
        }
      );

      toast.success('Lab result recorded');
      router.push('/dashboard/labtechnician/labresults');
    } catch (err) {
      console.error('Failed to submit lab result:', err);
      toast.error('Failed to record lab result');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-6 space-y-6">
      <h1 className="text-xl font-bold">Log Lab Result</h1>

      <div>
        <label className="block mb-1">Patient ID</label>
        <Input
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          placeholder="Patient ID"
          required
        />
      </div>

      <div>
        <label className="block mb-1">Diagnosis ID (optional)</label>
        <Input
          value={diagnosisId}
          onChange={(e) => setDiagnosisId(e.target.value)}
          placeholder="Diagnosis or Appointment ID"
        />
      </div>

      <div className="space-y-2">
        <label className="block">Tests Performed</label>
        {testIds.map((test, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input
              value={test}
              onChange={(e) => handleTestChange(i, e.target.value)}
              placeholder="Test ID or name"
            />
            {i > 0 && (
              <Button type="button" onClick={() => removeTest(i)} variant="destructive">
                ✕
              </Button>
            )}
          </div>
        ))}
        <Button type="button" onClick={addTest} variant="outline">
          + Add Test
        </Button>
      </div>

      <div>
        <label className="block mb-1">Status</label>
        <select
          className="w-full border rounded p-2"
          value={status}
          onChange={(e) => setStatus(e.target.value as 'pending' | 'completed')}
        >
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <Button onClick={handleSubmit} disabled={loading}>
        {loading ? 'Saving...' : 'Submit Lab Result'}
      </Button>
    </div>
  );
}
