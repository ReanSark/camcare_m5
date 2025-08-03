"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { toast } from "sonner";
import { databases } from "@/lib/appwrite.config";
import { DATABASE_ID } from "@/lib/appwrite.config";
import { COLLECTIONS } from "@/lib/collections";

export default function NewPatientPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    gender: "Male",
    dob: "",
    phone: "",
    email: "",
    address: "",
    other: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.PATIENTS,
        "unique()",
        form
      );

      toast.success("Patient registered");
      router.push("/dashboard/receptionist/patients");
    } catch (err) {
      console.error(err);
      toast.error("Failed to register patient");
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Register New Patient</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="fullName">Full Name</Label>
          <Input name="fullName" value={form.fullName} onChange={handleChange} required />
        </div>

        <div>
          <Label htmlFor="gender">Gender</Label>
          <select name="gender" value={form.gender} onChange={handleChange} className="w-full p-2 rounded border">
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </div>

        <div>
          <Label htmlFor="dob">Date of Birth</Label>
          <Input name="dob" type="date" value={form.dob} onChange={handleChange} />
        </div>

        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input name="phone" value={form.phone} onChange={handleChange} />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input name="email" type="email" value={form.email} onChange={handleChange} />
        </div>

        <div>
          <Label htmlFor="address">Address</Label>
          <Input name="address" value={form.address} onChange={handleChange} />
        </div>

        <div>
          <Label htmlFor="other">Other Notes</Label>
          <Input name="other" value={form.other} onChange={handleChange} />
        </div>

        <Button type="submit" className="w-full">
          Register Patient
        </Button>
      </form>
    </div>
  );
}
