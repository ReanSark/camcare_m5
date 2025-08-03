// appointments/page.tsx
"use client";

import { useEffect, useState } from "react";
import { databases } from "@/lib/appwrite.config";
import { DATABASE_ID } from "@/lib/appwrite.config";
import { COLLECTIONS } from "@/lib/collections";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import type { Appointment, Patient, Doctor } from "@/types";

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patientsMap, setPatientsMap] = useState<Record<string, string>>({});
  const [doctorsMap, setDoctorsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [appsRes, patsRes, docsRes] = await Promise.all([
          databases.listDocuments(DATABASE_ID, COLLECTIONS.APPOINTMENTS),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.PATIENTS),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.DOCTORS),
        ]);

        const apps = appsRes.documents.map((doc): Appointment => ({
          $id: doc.$id,
          patientId: doc.patientId,
          doctorIds: doc.doctorIds ?? [],
          date: doc.date,
          reason: doc.reason ?? "",
          status: doc.status ?? "scheduled",
        }));
        setAppointments(apps);

        const patients = patsRes.documents.map((doc): Patient => ({
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
        patients.forEach((p) => {
          patientMap[p.$id] = p.fullName;
        });
        setPatientsMap(patientMap);

        const doctors = docsRes.documents.map((doc): Doctor => ({
          $id: doc.$id,
          fullName: doc.fullName,
          role: doc.role,
          userId: doc.userId,
          other: doc.other,
        }));

        const doctorMap: Record<string, string> = {};
        doctors.forEach((d) => {
          doctorMap[d.$id] = d.fullName;
        });
        setDoctorsMap(doctorMap);
      } catch (err) {
        toast.error("Failed to load appointments");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Appointments</h1>
        <Link href="/dashboard/receptionist/appointments/new">
          <Button>Add Appointment</Button>
        </Link>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : appointments.length === 0 ? (
        <p>No appointments found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2 border">Patient</th>
                <th className="text-left p-2 border">Doctors</th>
                <th className="text-left p-2 border">Date</th>
                <th className="text-left p-2 border">Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => (
                <tr key={appt.$id} className="border-t">
                  <td className="p-2 border">{patientsMap[appt.patientId] ?? "-"}</td>
                  <td className="p-2 border">
                    {appt.doctorIds.map((id) => doctorsMap[id]).join(", ") || "-"}
                  </td>
                  <td className="p-2 border">{new Date(appt.date).toLocaleString()}</td>
                  <td className="p-2 border capitalize">{appt.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
