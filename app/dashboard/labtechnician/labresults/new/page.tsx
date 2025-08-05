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
import type { LabResult } from '@/types';

const STATUS_OPTIONS = ['pending', 'processing', 'completed', 'canceled'] as const;

export default function NewLabResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [diagnosisId, setDiagnosisId] = useState('');
  const [testName, setTestName] = useState('');
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>('pending');
  const [labSource, setLabSource] = useState<'in-house' | 'external'>('in-house');
  const [loading, setLoading] = useState(false);

  // Extract patientId and diagnosisId from query params
  useEffect(() => {
    const pid = searchParams.get('patientId');
    const did = searchParams.get('diagnosisId');
    if (pid) setPatientId(pid);
    if (did) setDiagnosisId(did);
  }, [searchParams]);

  // Fetch patient full name by ID
  useEffect(() => {
    async function fetchPatientName() {
      if (patientId) {
        try {
          const doc = await databases.getDocument(
            DATABASE_ID,
            COLLECTIONS.PATIENTS,
            patientId
          );
          setPatientName(doc.fullName || '');
        } catch {
          setPatientName('');
        }
      } else {
        setPatientName('');
      }
    }
    fetchPatientName();
  }, [patientId]);

  const handleSubmit = async () => {
    if (!user?.id || !patientId) {
      toast.warning('Missing technician or patient information');
      return;
    }
    if (!testName.trim()) {
      toast.warning('Test name is required');
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
          diagnosisId,
          testName,
          status,
          labSource,
          processedBy: user.id,   // Use user.id for user reference
          createdBy: user.id,
          createdAt: new Date().toISOString(),
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
        <label className="block mb-1">Patient</label>
        {patientId ? (
          patientName ? (
            <div className="p-2 border rounded bg-gray-50">
              {patientName} <span className="text-gray-400">({patientId})</span>
            </div>
          ) : (
            <div className="p-2 border rounded bg-gray-50 text-red-500">
              Patient not found ({patientId})
            </div>
          )
        ) : (
          <div className="p-2 border rounded bg-gray-50 text-gray-400 italic">
            No patient selected
          </div>
        )}
      </div>

      <div>
        <label className="block mb-1">Diagnosis ID (optional)</label>
        <Input
          value={diagnosisId}
          onChange={(e) => setDiagnosisId(e.target.value)}
          placeholder="Diagnosis ID"
        />
      </div>

      <div>
        <label className="block mb-1">Test Name</label>
        <Input
          value={testName}
          onChange={(e) => setTestName(e.target.value)}
          placeholder="e.g. CBC, Blood Glucose"
          required
        />
      </div>

      <div>
        <label className="block mb-1">Lab Source</label>
        <select
          className="w-full border rounded p-2"
          value={labSource}
          onChange={(e) => setLabSource(e.target.value as 'in-house' | 'external')}
        >
          <option value="in-house">In-House</option>
          <option value="external">External</option>
        </select>
      </div>

      <div>
        <label className="block mb-1">Status</label>
        <select
          className="w-full border rounded p-2"
          value={status}
          onChange={(e) => setStatus(e.target.value as (typeof STATUS_OPTIONS)[number])}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt[0].toUpperCase() + opt.slice(1)}</option>
          ))}
        </select>
      </div>

      <Button onClick={handleSubmit} disabled={loading}>
        {loading ? 'Saving...' : 'Submit Lab Result'}
      </Button>
    </div>
  );
}
