'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import type { Patient } from '@/types';

export default function PatientEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [form, setForm] = useState<Partial<Patient>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchPatient = async () => {
      try {
        const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.PATIENTS, id);
        setForm({
          $id: doc.$id,
          fullName: doc.fullName,
          gender: doc.gender,
          dob: doc.dob,
          phone: doc.phone,
          email: doc.email,
          address: doc.address,
          bloodType: doc.bloodType,
          emergencyContact: doc.emergencyContact,
          medicalHistory: doc.medicalHistory,
          isArchived: doc.isArchived,
          createdBy: doc.createdBy,
          createdAt: doc.createdAt,
          updatedBy: doc.updatedBy,
          updatedAt: doc.updatedAt,
          other: doc.other,
        });
      } catch (err) {
        toast.error('Patient not found');
        router.back();
      } finally {
        setLoading(false);
      }
    };
    fetchPatient();
  }, [id, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "bloodType") {
      setForm((prev) => ({
        ...prev,
        bloodType: value === '' ? undefined : (value as Patient['bloodType']),
      }));
    } else if (name === "gender") {
      setForm((prev) => ({
        ...prev,
        gender: value as Patient['gender'],
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
    setSaving(true);
    try {
      // Omit $id from update payload
      const { $id, ...updateData } = form;
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.PATIENTS,
        id,
        updateData
      );
      toast.success('Patient updated');
      router.push('/dashboard/receptionist/patients/view/' + id);
    } catch (err) {
      toast.error('Failed to update patient');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Edit Patient</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="fullName">Full Name</Label>
          <Input name="fullName" value={form.fullName ?? ''} onChange={handleChange} required />
        </div>
        <div>
          <Label htmlFor="gender">Gender</Label>
          <select
            name="gender"
            value={form.gender ?? ''}
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
          <Input name="dob" type="date" value={form.dob ?? ''} onChange={handleChange} />
        </div>
        <div>
          <Label htmlFor="bloodType">Blood Type</Label>
          <select
            name="bloodType"
            value={form.bloodType ?? ''}
            onChange={handleChange}
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
          <Input name="emergencyContact" value={form.emergencyContact ?? ''} onChange={handleChange} />
        </div>
        <div>
          <Label htmlFor="medicalHistory">Medical History</Label>
          <Input name="medicalHistory" value={form.medicalHistory ?? ''} onChange={handleChange} />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input name="phone" value={form.phone ?? ''} onChange={handleChange} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input name="email" type="email" value={form.email ?? ''} onChange={handleChange} />
        </div>
        <div>
          <Label htmlFor="address">Address</Label>
          <Input name="address" value={form.address ?? ''} onChange={handleChange} />
        </div>
        <div>
          <Label htmlFor="other">Other Notes</Label>
          <Input name="other" value={form.other ?? ''} onChange={handleChange} />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
