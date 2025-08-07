'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID, } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { ID } from 'appwrite';
import type { Appointment, Patient, Doctor, Nurse } from '@/types';
import { toDateTimeLocalInputValue, toDateTimeLocalDisplay } from '@/utils/date';

export default function NewAppointmentPage() {
  const router = useRouter();

  // Reference data for dropdowns
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [form, setForm] = useState<Omit<Appointment, '$id'>>({
    patientId: '',
    doctorIds: [],
    nurseIds: [],
    date: '',
    reason: '',
    status: 'scheduled',
    other: '',
  });

  // Load reference data for dropdowns
  useEffect(() => {
    const fetchRefs = async () => {
      setLoading(true);
      try {
        const [patRes, docRes, nurseRes] = await Promise.all([
          databases.listDocuments(DATABASE_ID, COLLECTIONS.PATIENTS),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.DOCTORS),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.NURSES),
        ]);

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

      } catch {
        toast.error('Failed to load reference data');
      } finally {
        setLoading(false);
      }
    };
    fetchRefs();
  }, []);

  // Form event handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
  const { name, type, value, multiple, options } = e.target as HTMLSelectElement;
  if (type === "select-multiple") {
    const selectedValues = Array.from(options)
      .filter((o) => o.selected)
      .map((o) => o.value);
    setForm((prev) => ({
      ...prev,
      [name]: selectedValues,
    }));
  } else {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }
};


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // form.date is "2025-08-08T13:00"
    const isoDate = new Date(form.date).toISOString();

    if (!form.patientId || !Array.isArray(form.doctorIds) || form.doctorIds.length === 0 || !form.date) {
      toast.error('Patient, doctor, and date are required');
      return;
    }


    try {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.APPOINTMENTS,
        ID.unique(),
        {
          ...form,
          date: isoDate,
        }
      );
      toast.success('Appointment created');
      router.push('/dashboard/receptionist/appointments');
    } catch (err) {
      toast.error('Failed to create appointment');
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">New Appointment</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="patientId">Patient</Label>
            <select
              name="patientId"
              value={form.patientId}
              onChange={handleChange}
              className="w-full p-2 rounded border"
              required
            >
              <option value="">-- Select Patient --</option>
              {patients.map((p) => (
                <option value={p.$id} key={p.$id}>{p.fullName}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="doctorIds">Doctor(s)</Label>
            <select
              name="doctorIds"
              multiple
              value={form.doctorIds}
              onChange={handleChange}
              className="w-full p-2 rounded border"
              required
            >
              {doctors.map((d) => (
                <option value={d.$id} key={d.$id}>{d.fullName}</option>
              ))}
            </select>
            <div className="text-xs text-muted-foreground">
              Hold Ctrl or Cmd to select multiple.
            </div>
          </div>
          <div>
            <Label htmlFor="nurseIds">Nurse(s)</Label>
            <select
              name="nurseIds"
              multiple
              value={form.nurseIds}
              onChange={handleChange}
              className="w-full p-2 rounded border"
            >
              {nurses.map((n) => (
                <option value={n.$id} key={n.$id}>{n.fullName}</option>
              ))}
            </select>
            <div className="text-xs text-muted-foreground">
              Hold Ctrl or Cmd to select multiple.
            </div>
          </div>
          <div>
            <Label htmlFor="date">Date & Time</Label>
            <Input
              name="date"
              type="datetime-local"
              value={toDateTimeLocalInputValue(form.date)}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="reason">Reason</Label>
            <Input
              name="reason"
              value={form.reason}
              onChange={handleChange}
              placeholder="Optional (max 1000 chars)"
              maxLength={1000}
            />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full p-2 rounded border"
              required
            >
              <option value="scheduled">Scheduled</option>
              <option value="arrived">Arrived</option>
              <option value="completed">Completed</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>
          <div>
            <Label htmlFor="other">Other</Label>
            <Input
              name="other"
              value={form.other}
              onChange={handleChange}
              placeholder="Optional notes"
              maxLength={1000}
            />
          </div>
          <Button type="submit" className="w-full">Create Appointment</Button>
        </form>
      )}
    </div>
  );
}
