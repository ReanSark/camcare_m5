'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Appointment, Patient, Doctor, Nurse } from '@/types';
import { toDateTimeLocalDisplay } from '@/utils/date';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Load all reference data in parallel
        const [appRes, patRes, docRes, nurseRes] = await Promise.all([
          databases.listDocuments(DATABASE_ID, COLLECTIONS.APPOINTMENTS),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.PATIENTS),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.DOCTORS),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.NURSES),
        ]);

        // Safe field mapping for Appointments
        const appts = appRes.documents.map((doc): Appointment => ({
          $id: doc.$id,
          patientId: doc.patientId,
          doctorIds: doc.doctorIds,
          nurseIds: doc.nurseIds,
          date: doc.date,
          reason: doc.reason,
          status: doc.status,
          other: doc.other,
        }));

        setAppointments(appts);
        const patientsList = patRes.documents.map((doc) => ({
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
        setPatients(patientsList);

        const doctorsList = docRes.documents.map((doc) => ({
          $id: doc.$id,
          userId: doc.userId,
          fullName: doc.fullName,
          role: doc.role,
          email: doc.email,
          phone: doc.phone,
          photoUrl: doc.photoUrl,
          department: doc.department,
          joinedDate: doc.joinedDate,
          isActive: doc.isActive,
          other: doc.other,
        }));
        setDoctors(doctorsList);

        const nursesList = nurseRes.documents.map((doc) => ({
          $id: doc.$id,
          userId: doc.userId,
          fullName: doc.fullName,
          role: doc.role,
          email: doc.email,
          phone: doc.phone,
          photoUrl: doc.photoUrl,
          department: doc.department,
          joinedDate: doc.joinedDate,
          isActive: doc.isActive,
          other: doc.other,
        }));
        setNurses(nursesList);

      } catch (err) {
        toast.error('Failed to load appointments or reference data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Lookup maps for fast name access
  const patientMap = Object.fromEntries(patients.map((p) => [p.$id, p.fullName]));
  const doctorMap = Object.fromEntries(doctors.map((d) => [d.$id, d.fullName]));
  const nurseMap = Object.fromEntries(nurses.map((n) => [n.$id, n.fullName]));

  // Filter/search logic
    const filteredAppointments = appointments.filter((a) => {
    const q = search.toLowerCase();
    const patientName = patientMap[a.patientId]?.toLowerCase() || '';
    const reason = (a.reason ?? '').toLowerCase();
    const doctorNames = (a.doctorIds ?? [])
      .map((id) => doctorMap[id]?.toLowerCase() ?? '')
      .join(' ');
    const nurseNames = (a.nurseIds ?? [])
      .map((id) => nurseMap[id]?.toLowerCase() ?? '')
      .join(' ');
    const status = (a.status ?? '').toLowerCase();
    const date = a.date ? toDateTimeLocalDisplay(a.date).toLowerCase() : '';

    return (
      patientName.includes(q) ||
      reason.includes(q) ||
      doctorNames.includes(q) ||
      nurseNames.includes(q) ||
      status.includes(q) ||
      date.includes(q)

      // add more as needed (e.g. search date, other)
    );
  });


  // Delete handler
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this appointment?')) return;
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.APPOINTMENTS, id);
      setAppointments((prev) => prev.filter((a) => a.$id !== id));
      toast.success('Appointment deleted');
    } catch (err) {
      toast.error('Failed to delete appointment');
    }
  };

  // Quick status update handler (optional)
  const updateStatus = async (id: string, status: Appointment['status']) => {
    try {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.APPOINTMENTS, id, { status });
      setAppointments((prev) =>
        prev.map((a) => (a.$id === id ? { ...a, status } : a))
      );
      toast.success(`Marked as ${status}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Appointments</h1>
        <Link href="/dashboard/receptionist/appointments/new">
          <Button>New Appointment</Button>
        </Link>
      </div>
      <div className="mb-4 flex gap-2">
        <Input
          placeholder="Search by patient or reason"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : filteredAppointments.length === 0 ? (
        <p>No appointments found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Date/Time</th>
                <th className="p-2 border">Patient</th>
                <th className="p-2 border">Doctor(s)</th>
                <th className="p-2 border">Nurse(s)</th>
                <th className="p-2 border">Reason</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map((a) => (
                <tr key={a.$id} className="border-t">
                  <td className="p-2 border">
                      {a.date ? toDateTimeLocalDisplay(a.date) : '-'}
                  </td>
                  <td className="p-2 border">{patientMap[a.patientId] ?? '-'}</td>
                  <td className="p-2 border">
                    {(a.doctorIds ?? [])
                      .map((id) => doctorMap[id] ?? id)
                      .join(', ') || '-'}
                  </td>
                  <td className="p-2 border">
                    {(a.nurseIds ?? [])
                      .map((id) => nurseMap[id] ?? id)
                      .join(', ') || '-'}
                  </td>
                  <td className="p-2 border">{a.reason ?? '-'}</td>
                  <td className="p-2 border capitalize">{a.status}</td>
                  <td className="p-2 border flex gap-2">
                    <Link href={`/dashboard/receptionist/appointments/view/${a.$id}`}>
                      <Button variant="outline">View</Button>
                    </Link>
                    <Link href={`/dashboard/receptionist/appointments/edit/${a.$id}`}>
                      <Button variant="outline">Edit</Button>
                    </Link>
                    {/* <Button
                      variant="destructive"
                      onClick={() => handleDelete(a.$id)}
                    >
                      Delete
                    </Button> */}
                    {/* Quick status action */}
                    {!["arrived", "completed", "canceled"].includes(a.status) && (
                      <Button
                        onClick={() => updateStatus(a.$id, "arrived")}
                        variant="secondary"
                      >
                        Mark Arrived
                      </Button>
                    )}
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
