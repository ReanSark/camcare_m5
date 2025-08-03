// appointments/new/page.tsx
"use client";

import { useEffect, useState } from "react";
import { databases } from "@/lib/appwrite.config";
import { DATABASE_ID } from "@/lib/appwrite.config";
import { COLLECTIONS } from "@/lib/collections";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Patient, Doctor, Appointment } from "@/types";

export default function NewAppointmentPage() {
  const router = useRouter();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [form, setForm] = useState<Omit<Appointment, "$id">>({
    patientId: "",
    doctorIds: [],
    date: "",
    reason: "",
    status: "scheduled",
  });

  useEffect(() => {
    const fetchPatientsAndDoctors = async () => {
      try {
        const [p, d] = await Promise.all([
          databases.listDocuments(DATABASE_ID, COLLECTIONS.PATIENTS),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.DOCTORS),
        ]);
        setPatients(p.documents.map((doc): Patient => ({
          $id: doc.$id,
          fullName: doc.fullName,
          gender: doc.gender,
          dob: doc.dob,
          phone: doc.phone,
          email: doc.email,
          address: doc.address,
          other: doc.other,
        })));
        setDoctors(d.documents.map((doc): Doctor => ({
          $id: doc.$id,
          fullName: doc.fullName,
          role: doc.role,
          userId: doc.userId,
          other: doc.other,
        })));
      } catch (err) {
        toast.error("Failed to load data");
      }
    };
    fetchPatientsAndDoctors();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDoctorToggle = (id: string) => {
    setForm((prev) => ({
      ...prev,
      doctorIds: prev.doctorIds.includes(id)
        ? prev.doctorIds.filter((d) => d !== id)
        : [...prev.doctorIds, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await databases.createDocument(DATABASE_ID, COLLECTIONS.APPOINTMENTS, "unique()", form);
      toast.success("Appointment created");
      router.push("/dashboard/receptionist/appointments");
    } catch (err) {
      toast.error("Failed to create appointment");
      console.error(err);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">New Appointment</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="patientId">Select Patient</Label>
          <select name="patientId" value={form.patientId} onChange={handleChange} required className="w-full p-2 rounded border">
            <option value="">-- Select --</option>
            {patients.map((p) => (
              <option key={p.$id} value={p.$id}>{p.fullName}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Select Doctor(s)</Label>
          <div className="grid gap-2">
            {doctors.map((doc) => (
              <label key={doc.$id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  value={doc.$id}
                  checked={form.doctorIds.includes(doc.$id)}
                  onChange={() => handleDoctorToggle(doc.$id)}
                />
                {doc.fullName}
              </label>
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor="date">Date & Time</Label>
          <Input type="datetime-local" name="date" value={form.date} onChange={handleChange} required />
        </div>
        <div>
          <Label htmlFor="reason">Reason</Label>
          <textarea name="reason" value={form.reason} onChange={handleChange} className="w-full p-2 rounded border" />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <select name="status" value={form.status} onChange={handleChange} className="w-full p-2 rounded border">
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>
        <Button type="submit" className="w-full">Create Appointment</Button>
      </form>
    </div>
  );
}
