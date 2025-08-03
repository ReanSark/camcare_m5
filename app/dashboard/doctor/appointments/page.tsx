// dashboard/doctor/appointments/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { databases, account } from "@/lib/appwrite.config";
import { DATABASE_ID } from "@/lib/appwrite.config";
import { COLLECTIONS } from "@/lib/collections";
import type { Appointment, Patient, Doctor } from "@/types";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

export default function DoctorAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patientsMap, setPatientsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const session = await account.get();
        const doctorRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.DOCTORS);

        const matched = doctorRes.documents.find((doc) => doc.userId === session.$id);
        if (!matched) {
          toast.error("Doctor profile not found");
          return;
        }

        const doctor: Doctor = {
          $id: matched.$id,
          userId: matched.userId,
          fullName: matched.fullName,
          role: matched.role,
          other: matched.other
        };

        const [apptRes, patRes] = await Promise.all([
          databases.listDocuments(DATABASE_ID, COLLECTIONS.APPOINTMENTS),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.PATIENTS),
        ]);

        const patients = patRes.documents.map((doc): Patient => ({
          $id: doc.$id,
          fullName: doc.fullName,
          gender: doc.gender,
          dob: doc.dob,
          phone: doc.phone,
          email: doc.email,
          address: doc.address,
          other: doc.other,
        }));

        const patientMap: Record<string, string> = {};
        patients.forEach((p) => (patientMap[p.$id] = p.fullName));
        setPatientsMap(patientMap);

        const filtered = apptRes.documents.filter((doc) => doc.doctorIds?.includes(doctor.userId));
        const mapped = filtered.map((doc): Appointment => ({
          $id: doc.$id,
          patientId: doc.patientId,
          doctorIds: doc.doctorIds ?? [],
          date: doc.date,
          reason: doc.reason ?? "",
          status: doc.status ?? "scheduled",
        }));

        setAppointments(mapped);
      } catch (err) {
        toast.error("Failed to load doctor data");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Appointments</h1>

      {loading ? (
        <p>Loading...</p>
      ) : appointments.length === 0 ? (
        <p>No appointments assigned to you.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2 border">Patient</th>
                <th className="text-left p-2 border">Date</th>
                <th className="text-left p-2 border">Reason</th>
                <th className="text-left p-2 border">Status</th>
                <th className="text-left p-2 border">Action</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => (
                <tr key={appt.$id} className="border-t">
                  <td className="p-2 border">{patientsMap[appt.patientId] ?? "-"}</td>
                  <td className="p-2 border">{appt.date ? new Date(appt.date).toLocaleString() : "-"}</td>
                  <td className="p-2 border">{appt.reason || "-"}</td>
                  <td className="p-2 border capitalize">{appt.status}</td>
                  <td className="p-2 border">
                    <Link href={`/dashboard/doctor/appointments/${appt.$id}/diagnose`}>
                      <Button variant="outline">Diagnose</Button>
                    </Link>
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
