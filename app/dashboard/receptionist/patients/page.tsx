"use client";

import { useEffect, useState } from "react";
import { databases } from "@/lib/appwrite.config";
import { DATABASE_ID } from "@/lib/appwrite.config";
import { COLLECTIONS } from "@/lib/collections";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

import type { Patient } from "@/types";

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

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
          other: doc.other,
        }));
        setPatients(docs);
      } catch (err) {
        console.error("Failed to load patients:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Patients</h1>
        <Link href="/dashboard/receptionist/patients/new">
          <Button>Add New Patient</Button>
        </Link>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : patients.length === 0 ? (
        <p>No patients found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2 border">Name</th>
                <th className="text-left p-2 border">Gender</th>
                <th className="text-left p-2 border">DOB</th>
                <th className="text-left p-2 border">Phone</th>
                <th className="text-left p-2 border">Email</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient.$id} className="border-t">
                  <td className="p-2 border">{patient.fullName}</td>
                  <td className="p-2 border">{patient.gender}</td>
                  <td className="p-2 border">{patient.dob ?? "-"}</td>
                  <td className="p-2 border">{patient.phone ?? "-"}</td>
                  <td className="p-2 border">{patient.email ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
