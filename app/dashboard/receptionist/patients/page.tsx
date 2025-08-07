'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Patient } from '@/types';
import { toDateInputValue } from '@/utils/date';


export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PATIENTS);

        const docs = res.documents.map((doc): Patient => ({
          $id: doc.$id,
          fullName: doc.fullName,
          gender: doc.gender,
          dob: doc.dob,
          phone: doc.phone,
          email: doc.email,
          address: doc.address,
          bloodType: doc.bloodType,
          emergencyContact: doc.emergencyContact,
          medicalHistory: doc.medicalHistory,
          isArchived: doc.isArchived,
          createdBy: doc.createdBy,
          createdAt: doc.createdAt,
          updatedBy: doc.updatedBy,
          updatedAt: doc.updatedAt,
          other: doc.other,
        }));

        setPatients(docs);
      } catch (err) {
        console.error('Failed to load patients:', err);
        toast.error('Failed to load patients');
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this patient?")) return;
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PATIENTS, id);
      setPatients((prev) => prev.filter((p) => p.$id !== id));
      toast.success("Patient deleted");
    } catch (err) {
      console.error("Failed to delete patient:", err);
      toast.error("Failed to delete patient");
    }
  };

  const filteredPatients = patients.filter((p) =>
    p.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (p.phone ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Patients</h1>
        <Link href="/dashboard/receptionist/patients/new">
          <Button>Add New Patient</Button>
        </Link>
      </div>

      <div className="mb-4 flex gap-2">
        <Input
          placeholder="Search by name or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : filteredPatients.length === 0 ? (
        <p>No patients found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2 border">Name</th>
                <th className="text-left p-2 border">Gender</th>
                <th className="text-left p-2 border">DOB</th>
                <th className="text-left p-2 border">Blood Type</th>
                <th className="text-left p-2 border">Phone</th>
                <th className="text-left p-2 border">Email</th>
                <th className="text-left p-2 border">Emergency Contact</th>
                <th className="text-left p-2 border">Medical History</th>
                <th className="text-left p-2 border">Created</th>
                <th className="text-left p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((patient) => (
                <tr key={patient.$id} className="border-t">
                  <td className="p-2 border">{patient.fullName}</td>
                  <td className="p-2 border">{patient.gender}</td>
                  <td className="p-2 border">{patient.dob ? toDateInputValue(patient.dob) : '-'}</td>
                  <td className="p-2 border">{patient.bloodType ?? '-'}</td>
                  <td className="p-2 border">{patient.phone ?? '-'}</td>
                  <td className="p-2 border">{patient.email ?? '-'}</td>
                  <td className="p-2 border">{patient.emergencyContact ?? '-'}</td>
                  <td className="p-2 border">{patient.medicalHistory ?? '-'}</td>
                  <td className="p-2 border">
                    {patient.createdAt
                      ? new Date(patient.createdAt).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="p-2 border flex gap-2">
                    <Link href={`/dashboard/receptionist/patients/view/${patient.$id}`}>
                      <Button variant="outline">View</Button>
                    </Link>
                    <Link href={`/dashboard/receptionist/patients/edit/${patient.$id}`}>
                      <Button variant="outline">Edit</Button>
                    </Link>
                    <Link href={`/dashboard/receptionist/appointments/new?patientId=${patient.$id}`}>
                      <Button variant="outline">New Appointment</Button>
                    </Link>
                    {/* <Button
                      variant="destructive"
                      onClick={() => handleDelete(patient.$id)}
                    >
                      Delete
                    </Button> */}
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
