'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import { Button } from '@/components/ui/Button';
import type { Appointment, Patient, Doctor, Nurse } from '@/types';
import { toDateTimeLocalDisplay } from '@/utils/date';

export default function ViewAppointmentPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [app, patRes, docRes, nurseRes] = await Promise.all([
          databases.getDocument(DATABASE_ID, COLLECTIONS.APPOINTMENTS, id),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.PATIENTS),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.DOCTORS),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.NURSES),
        ]);
        setAppointment({
        $id: app.$id,
        patientId: app.patientId,
        doctorIds: app.doctorIds ?? [],
        nurseIds: app.nurseIds ?? [],
        date: app.date,
        reason: app.reason,
        status: app.status,
        other: app.other,
        });


        // Find patient
        const foundPatient = patRes.documents.find((p) => p.$id === app.patientId);
        setPatient(
            foundPatient
                ? {
                    $id: foundPatient.$id,
                    fullName: foundPatient.fullName,
                    gender: foundPatient.gender,
                    dob: foundPatient.dob,
                    phone: foundPatient.phone,
                    email: foundPatient.email,
                    address: foundPatient.address,
                    bloodType: foundPatient.bloodType,
                    emergencyContact: foundPatient.emergencyContact,
                    medicalHistory: foundPatient.medicalHistory,
                    isArchived: foundPatient.isArchived,
                    createdBy: foundPatient.createdBy,
                    createdAt: foundPatient.createdAt,
                    updatedBy: foundPatient.updatedBy,
                    updatedAt: foundPatient.updatedAt,
                    other: foundPatient.other,
                }
                : null
            );


        // Map doctors/nurses by IDs
        setDoctors(
        docRes.documents
            .filter((d) => (app.doctorIds ?? []).includes(d.$id))
            .map((doc) => ({
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
            }))
        );

        setNurses(
        nurseRes.documents
            .filter((n) => (app.nurseIds ?? []).includes(n.$id))
            .map((doc) => ({
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
            }))
        );

      } catch {
        toast.error('Failed to load appointment or references');
        router.back();
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id, router]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!appointment) return <div className="p-8">Appointment not found.</div>;

  return (
    <div className="max-w-xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Appointment Details</h1>
      {/* <div><strong>Date/Time:</strong> {appointment.date ? new Date(appointment.date).toLocaleString() : '-'}</div> */}
      <div>
        <strong>Date/Time:</strong> {appointment.date ? toDateTimeLocalDisplay(appointment.date) : '-'}
      </div>
      <div><strong>Patient:</strong> {patient ? patient.fullName : appointment.patientId}</div>
      <div>
        <strong>Doctor(s):</strong> {doctors.length ? doctors.map(d => d.fullName).join(', ') : (appointment.doctorIds ?? []).join(', ')}
      </div>
      <div>
        <strong>Nurse(s):</strong> {nurses.length ? nurses.map(n => n.fullName).join(', ') : (appointment.nurseIds ?? []).join(', ')}
      </div>
      <div><strong>Status:</strong> {appointment.status}</div>
      <div><strong>Reason:</strong> {appointment.reason ?? '-'}</div>
      <div><strong>Other:</strong> {appointment.other ?? '-'}</div>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" onClick={() => router.push(`/dashboard/receptionist/appointments/edit/${appointment.$id}`)}>
          Edit
        </Button>
        <Button variant="outline" onClick={() => router.push(`/dashboard/receptionist/appointments`)}>
          Back
        </Button>
      </div>
    </div>
  );
}
