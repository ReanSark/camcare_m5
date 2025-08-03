"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { databases, account } from "@/lib/appwrite.config";
import { DATABASE_ID } from "@/lib/appwrite.config";
import { COLLECTIONS } from "@/lib/collections";
import type { Appointment, Patient, Doctor } from "@/types";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

export default function DiagnosePage() {
  const router = useRouter();
  const { appointmentId } = useParams() as { appointmentId: string };

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [doctorId, setDoctorId] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      try {
        const session = await account.get();

        const doctorRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.DOCTORS);
        const matched = doctorRes.documents.find((doc) => doc.userId === session.$id);

        if (!matched) {
          toast.error("Doctor profile not found");
          return;
        }
        setDoctorId(matched.userId);

        const apptDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.APPOINTMENTS, appointmentId);
        const appt: Appointment = {
          $id: apptDoc.$id,
          patientId: apptDoc.patientId,
          doctorIds: apptDoc.doctorIds ?? [],
          date: apptDoc.date,
          reason: apptDoc.reason ?? "",
          status: apptDoc.status ?? "scheduled",
        };
        setAppointment(appt);

        const patientDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.PATIENTS, appt.patientId);
        const pat: Patient = {
          $id: patientDoc.$id,
          fullName: patientDoc.fullName,
          gender: patientDoc.gender,
          dob: patientDoc.dob,
          phone: patientDoc.phone,
          email: patientDoc.email,
          address: patientDoc.address,
          other: patientDoc.other,
        };
        setPatient(pat);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load data");
      }
    };

    init();
  }, [appointmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!appointment || !patient || !doctorId) return;

    try {
      await databases.createDocument(DATABASE_ID, COLLECTIONS.DIAGNOSES, "unique()", {
        patientId: patient.$id,
        doctorId,
        appointmentId: appointment.$id,
        diagnosis,
        date: new Date().toISOString(),
      });

      toast.success("Diagnosis saved");
      router.push("/dashboard/doctor/appointments");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save diagnosis");
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Diagnosis</h1>

      {patient && (
        <div className="mb-4 p-4 bg-gray-100 rounded">
          <p><strong>Patient:</strong> {patient.fullName}</p>
          <p><strong>Gender:</strong> {patient.gender}</p>
          <p><strong>DOB:</strong> {patient.dob}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="diagnosis">Diagnosis</Label>
          <textarea
            id="diagnosis"
            name="diagnosis"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            required
            className="w-full p-2 border rounded"
            rows={6}
          />
        </div>

        <Button type="submit" className="w-full">Submit Diagnosis</Button>
      </form>
    </div>
  );
}
