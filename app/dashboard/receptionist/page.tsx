"use client";

import { useEffect, useState } from "react";
import { databases, DATABASE_ID, IDGen } from "@/lib/appwrite.config";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Models } from "appwrite";

// 👇 Extend Appwrite's base Document type
type Patient = Models.Document & {
  fullName: string;
  gender: string;
  dob?: string;
  phone?: string;
  email?: string;
  address?: string;
};

type Appointment = {
  patientId: string;
  doctorIds: string[];
  date: string;
  reason: string;
  status: string;
};

export default function ReceptionistDashboard() {
  const [tab, setTab] = useState<"patients" | "appointments">("patients");

  const [patients, setPatients] = useState<Patient[]>([]);
  const [newPatient, setNewPatient] = useState<Omit<Patient, keyof Models.Document>>({
    fullName: "",
    gender: "Male",
    dob: "",
    phone: "",
    email: "",
    address: "",
  });

  const [appointment, setAppointment] = useState<Appointment>({
    patientId: "",
    doctorIds: [],
    date: "",
    reason: "",
    status: "scheduled",
  });

  const loadPatients = async () => {
    try {
      const res = await databases.listDocuments<Patient>(
        DATABASE_ID,
        "MVP_Patients"
      );
      setPatients(res.documents);
    } catch (err) {
      console.error("Failed to load patients:", err);
    }
  };

  const handleCreatePatient = async () => {
    try {
      const doc = await databases.createDocument<Patient>(
        DATABASE_ID,
        "MVP_Patients",
        IDGen.unique(),
        newPatient
      );
      setPatients((prev) => [...prev, doc]);
      setNewPatient({
        fullName: "",
        gender: "Male",
        dob: "",
        phone: "",
        email: "",
        address: "",
      });
    } catch (err) {
      console.error("Error creating patient:", err);
    }
  };

  const handleCreateAppointment = async () => {
    try {
      await databases.createDocument(
        DATABASE_ID,
        "MVP_Appointments",
        IDGen.unique(),
        appointment
      );
      alert("Appointment created");
      setAppointment({
        patientId: "",
        doctorIds: [],
        date: "",
        reason: "",
        status: "scheduled",
      });
    } catch (err) {
      console.error("Error creating appointment:", err);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Button onClick={() => setTab("patients")} variant={tab === "patients" ? "default" : "outline"}>
          Patients
        </Button>
        <Button onClick={() => setTab("appointments")} variant={tab === "appointments" ? "default" : "outline"}>
          Appointments
        </Button>
      </div>

      {tab === "patients" && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Register New Patient</h2>
          <div className="grid gap-2 max-w-md">
            <Label>Full Name</Label>
            <Input
              value={newPatient.fullName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewPatient({ ...newPatient, fullName: e.target.value })
              }
            />

            <Label>Gender</Label>
            <select
              className="border p-2 rounded"
              value={newPatient.gender}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setNewPatient({ ...newPatient, gender: e.target.value })
              }
            >
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>

            <Label>Date of Birth</Label>
            <Input
              type="date"
              value={newPatient.dob}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewPatient({ ...newPatient, dob: e.target.value })
              }
            />

            <Label>Phone</Label>
            <Input
              value={newPatient.phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewPatient({ ...newPatient, phone: e.target.value })
              }
            />

            <Label>Email</Label>
            <Input
              value={newPatient.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewPatient({ ...newPatient, email: e.target.value })
              }
            />

            <Label>Address</Label>
            <Input
              value={newPatient.address}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewPatient({ ...newPatient, address: e.target.value })
              }
            />

            <Button className="mt-2" onClick={handleCreatePatient}>
              Save Patient
            </Button>
          </div>

          <h2 className="text-xl font-semibold mt-6">All Patients</h2>
          <ul className="border rounded p-4 space-y-2">
            {patients.map((p) => (
              <li key={p.$id} className="border-b pb-1">
                {p.fullName} — {p.phone}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "appointments" && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Schedule Appointment</h2>

          <div className="grid gap-2 max-w-md">
            <Label>Patient</Label>
            <select
              className="border p-2 rounded"
              value={appointment.patientId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setAppointment({ ...appointment, patientId: e.target.value })
              }
            >
              <option value="">Select</option>
              {patients.map((p) => (
                <option key={p.$id} value={p.$id}>
                  {p.fullName}
                </option>
              ))}
            </select>

            <Label>Doctor IDs (comma-separated)</Label>
            <Input
              value={appointment.doctorIds.join(",")}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setAppointment({
                  ...appointment,
                  doctorIds: e.target.value.split(",").map((id) => id.trim()),
                })
              }
            />

            <Label>Date</Label>
            <Input
              type="datetime-local"
              value={appointment.date}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setAppointment({ ...appointment, date: e.target.value })
              }
            />

            <Label>Reason</Label>
            <Textarea
              value={appointment.reason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setAppointment({ ...appointment, reason: e.target.value })
              }
            />

            <Button className="mt-2" onClick={handleCreateAppointment}>
              Book Appointment
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
