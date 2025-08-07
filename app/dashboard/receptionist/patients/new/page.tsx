'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { toast } from 'sonner';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import { ID } from 'appwrite';
import type { Patient } from '@/types';
import { useAuth } from '@/context/AuthProvider'; // get current user
import { toDateInputValue } from '@/utils/date';

export default function NewPatientPage() {
  const router = useRouter();
  const { user } = useAuth(); // get logged-in user

  // Full upgraded Patient fields
  const [form, setForm] = useState<Omit<Patient, '$id'>>({
    fullName: '',
    gender: 'Male',
    dob: '',
    phone: '',
    email: '',
    address: '',
    bloodType: undefined,
    emergencyContact: '',
    medicalHistory: '',
    other: '',
    isArchived: false,
    createdBy: user?.id || '',
    createdAt: new Date().toISOString(),
    updatedBy: user?.id || '',
    updatedAt: new Date().toISOString(),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
  const { name, value } = e.target;
  if (name === "bloodType") {
    setForm((prev) => ({
      ...prev,
      bloodType: value === '' ? undefined : (value as Patient['bloodType']),
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

    try {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.PATIENTS,
        ID.unique(),
        {
          ...form,
          createdBy: user?.id || '',
          createdAt: new Date().toISOString(),
          updatedBy: user?.id || '',
          updatedAt: new Date().toISOString(),
        }
      );

      toast.success('Patient registered');
      router.push('/dashboard/receptionist/patients');
    } catch (err) {
      console.error(err);
      toast.error('Failed to register patient');
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
          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
            className="w-full p-2 rounded border"
          >
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </div>

        <div>
          <Label htmlFor="dob">Date of Birth</Label>
          <Input name="dob" type="date" value={toDateInputValue(form.dob)} onChange={handleChange} />
        </div>

        <div>
          <Label htmlFor="bloodType">Blood Type</Label>
          <select
            name="bloodType"
            value={form.bloodType || ''}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                bloodType: e.target.value === '' ? undefined : (e.target.value as Patient['bloodType']),
              }))
            }
            className="w-full p-2 rounded border"
          >
            <option value="">-- Select --</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="AB">AB</option>
            <option value="O">O</option>
          </select>
        </div>

        <div>
          <Label htmlFor="emergencyContact">Emergency Contact</Label>
          <Input name="emergencyContact" value={form.emergencyContact} onChange={handleChange} />
        </div>

        <div>
          <Label htmlFor="medicalHistory">Medical History</Label>
          <Input name="medicalHistory" value={form.medicalHistory} onChange={handleChange} />
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
