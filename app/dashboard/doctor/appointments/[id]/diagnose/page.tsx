'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ID } from 'appwrite';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthProvider';
import type { Appointment, Patient } from '@/types';

export default function DiagnosePage() {
  const { id: appointmentId } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appointmentId) return;

    const fetchData = async () => {
      try {
        const apptRes = await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.APPOINTMENTS,
          appointmentId as string
        );

        const appt: Appointment = {
          $id: apptRes.$id,
          patientId: apptRes.patientId,
          doctorIds: apptRes.doctorIds ?? [],
          date: apptRes.date,
          reason: apptRes.reason ?? '',
          status: apptRes.status,
          other: apptRes.other,
        };
        setAppointment(appt);

        const patientRes = await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.PATIENTS,
          apptRes.patientId
        );
        const patient: Patient = {
          $id: patientRes.$id,
          fullName: patientRes.fullName,
          gender: patientRes.gender,
          dob: patientRes.dob,
          phone: patientRes.phone,
          email: patientRes.email,
          address: patientRes.address,
          other: patientRes.other,
        };
        setPatient(patient);
      } catch (err) {
        console.error('Failed to load appointment or patient', err);
        toast.error('Error loading appointment');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [appointmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.$id || !appointment || !patient) {
      toast.warning('Missing doctor, appointment, or patient info');
      return;
    }

    try {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.DIAGNOSES,
        ID.unique(),
        {
          patientId: patient.$id,
          doctorId: user.$id,
          appointmentId: appointment.$id,
          diagnosis,
          date: new Date().toISOString(),
        }
      );

      toast.success('Diagnosis saved');
      router.push('/dashboard/doctor/appointments');
    } catch (err) {
      console.error('Failed to save diagnosis:', err);
      toast.error('Failed to save diagnosis');
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Enter Diagnosis</h1>

      {loading ? (
        <p>Loading...</p>
      ) : !appointment || !patient ? (
        <p>Appointment or patient not found.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Patient</Label>
            <p className="font-medium">{patient.fullName}</p>
          </div>

          <div>
            <Label>Appointment Date</Label>
            <p>{new Date(appointment.date).toLocaleString()}</p>
          </div>

          <div>
            <Label htmlFor="reason">Reason</Label>
            <p>{appointment.reason || '-'}</p>
          </div>

          <div>
            <Label htmlFor="diagnosis">Diagnosis</Label>
            <Textarea
              name="diagnosis"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              required
              placeholder="Enter diagnosis details..."
            />
          </div>

          <Button type="submit" className="text-sm px-4 py-2 h-auto">
            Save Diagnosis
          </Button>
        </form>
      )}
    </div>
  );
}
