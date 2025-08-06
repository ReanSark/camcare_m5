'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import { Button } from '@/components/ui/Button';
import type { LabResult, Patient } from '@/types';

type SortKey = 'patient' | 'diagnosis' | 'testName' | 'status' | 'labSource' | 'processedBy' | 'createdAt';
type SortOrder = 'asc' | 'desc';

export default function LabResultsPage() {
  // Holds all lab results (fetched from Appwrite)
  const [results, setResults] = useState<LabResult[]>([]);
  // Maps patientId -> patient name for fast lookup in table
  const [patientsMap, setPatientsMap] = useState<Record<string, string>>({});
  // Loading state
  const [loading, setLoading] = useState(true);

  // Filter and sort states for table controls
  const [statusFilter, setStatusFilter] = useState<string>(''); // e.g., "pending"
  const [labSourceFilter, setLabSourceFilter] = useState<string>(''); // e.g., "in-house"
  const [search, setSearch] = useState<string>(''); // Free text search
  const [sortKey, setSortKey] = useState<SortKey>('createdAt'); // Which column to sort by
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc'); // Asc/desc

  // On first render: fetch lab results and patients
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch lab results and patients in parallel
        const [resRes, patRes] = await Promise.all([
          databases.listDocuments(DATABASE_ID, COLLECTIONS.LABRESULTS),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.PATIENTS),
        ]);

        // Map lab results to strong types, with defaults
        const results = resRes.documents.map((doc): LabResult => ({
          $id: doc.$id,
          patientId: doc.patientId,
          diagnosisId: doc.diagnosisId,
          testName: doc.testName ?? '-',
          status: doc.status ?? 'pending',
          processedBy: doc.processedBy ?? '',
          labSource: doc.labSource ?? '',
          createdAt: doc.createdAt,
        }));

        // Map patients to type (min fields needed here)
        const patients = patRes.documents.map((doc): Patient => ({
          $id: doc.$id,
          fullName: doc.fullName,
          gender: doc.gender,
        }));

        // Build a quick lookup map: patientId -> full name
        const pMap: Record<string, string> = {};
        patients.forEach((p) => (pMap[p.$id] = p.fullName));

        setResults(results);
        setPatientsMap(pMap);
      } catch (err) {
        console.error('Failed to load lab results:', err);
        toast.error('Failed to load lab results');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle sorting when clicking on a table header
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  // Apply filters and search to results
  let filteredResults = results;
  // Filter by status if selected
  if (statusFilter) {
    filteredResults = filteredResults.filter((r) => r.status === statusFilter);
  }
  // Filter by lab source if selected
  if (labSourceFilter) {
    filteredResults = filteredResults.filter((r) => (r.labSource || '') === labSourceFilter);
  }
  // Free-text search by patient name or test name
  if (search.trim()) {
    const s = search.toLowerCase();
    filteredResults = filteredResults.filter(
      (r) =>
        (patientsMap[r.patientId]?.toLowerCase().includes(s) ?? false) ||
        r.testName.toLowerCase().includes(s)
    );
  }

  // Sort results according to UI controls
  const sortedResults = [...filteredResults].sort((a, b) => {
    let aVal: string | number | undefined;
    let bVal: string | number | undefined;

    // Compare different keys according to chosen column
    switch (sortKey) {
      case 'patient':
        aVal = patientsMap[a.patientId] || '';
        bVal = patientsMap[b.patientId] || '';
        break;
      case 'diagnosis':
        aVal = a.diagnosisId || '';
        bVal = b.diagnosisId || '';
        break;
      case 'testName':
        aVal = a.testName;
        bVal = b.testName;
        break;
      case 'status':
        aVal = a.status;
        bVal = b.status;
        break;
      case 'labSource':
        aVal = a.labSource || '';
        bVal = b.labSource || '';
        break;
      case 'processedBy':
        aVal = a.processedBy;
        bVal = b.processedBy;
        break;
      case 'createdAt':
        aVal = a.createdAt || '';
        bVal = b.createdAt || '';
        break;
      default:
        aVal = '';
        bVal = '';
    }
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Handle delete action for a lab result
  const handleDelete = async ($id: string) => {
    if (!window.confirm('Delete this lab result?')) return;
    try {
      // Delete from Appwrite
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.LABRESULTS, $id);
      // Remove from local state for instant feedback
      setResults((prev) => prev.filter((r) => r.$id !== $id));
      toast.success('Lab result deleted');
    } catch (err) {
      console.error('Failed to delete:', err);
      toast.error('Failed to delete lab result');
    }
  };


  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
        <h1 className="text-2xl font-bold">Lab Results</h1>
        <Link href="/dashboard/labtechnician/labresults/new">
          <Button>➕ Add Lab Result</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <input
          type="text"
          className="border rounded p-2"
          placeholder="Search by patient or test name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="border rounded p-2"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="canceled">Canceled</option>
        </select>
        <select
          className="border rounded p-2"
          value={labSourceFilter}
          onChange={(e) => setLabSourceFilter(e.target.value)}
        >
          <option value="">All Sources</option>
          <option value="in-house">In-House</option>
          <option value="external">External</option>
        </select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : sortedResults.length === 0 ? (
        <p>No lab results found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2 border cursor-pointer" onClick={() => handleSort('patient')}>
                  Patient {sortKey === 'patient' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="text-left p-2 border cursor-pointer" onClick={() => handleSort('diagnosis')}>
                  Diagnosis {sortKey === 'diagnosis' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="text-left p-2 border cursor-pointer" onClick={() => handleSort('testName')}>
                  Test Name {sortKey === 'testName' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="text-left p-2 border cursor-pointer" onClick={() => handleSort('status')}>
                  Status {sortKey === 'status' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="text-left p-2 border cursor-pointer" onClick={() => handleSort('labSource')}>
                  Lab Source {sortKey === 'labSource' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="text-left p-2 border cursor-pointer" onClick={() => handleSort('processedBy')}>
                  Processed By {sortKey === 'processedBy' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="text-left p-2 border cursor-pointer" onClick={() => handleSort('createdAt')}>
                  Created At {sortKey === 'createdAt' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="text-left p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedResults.map((r) => (
                <tr key={r.$id} className="border-t">
                  <td className="p-2 border">
                    {patientsMap[r.patientId]
                      ? `${patientsMap[r.patientId]} (${r.patientId})`
                      : r.patientId}
                  </td>
                  <td className="p-2 border">{r.diagnosisId ?? '-'}</td>
                  <td className="p-2 border">{r.testName}</td>
                  <td className="p-2 border capitalize">{r.status}</td>
                  <td className="p-2 border">{r.labSource ?? '-'}</td>
                  <td className="p-2 border">{r.processedBy}</td>
                  <td className="p-2 border">
                    {r.createdAt
                      ? new Date(r.createdAt).toLocaleString()
                      : '-'}
                  </td>
                  <td className="p-2 border flex gap-2">
                    <Link href={`/dashboard/labtechnician/labresults/view/${r.$id}`}>
                      <Button variant="outline">View</Button>
                    </Link>
                    <Link href={`/dashboard/labtechnician/labresults/edit/${r.$id}`}>
                      <Button variant="outline">Edit</Button>
                    </Link>
                    <Button variant="destructive" onClick={() => handleDelete(r.$id)}>
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
