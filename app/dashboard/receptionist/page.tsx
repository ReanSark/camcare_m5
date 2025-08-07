'use client'; // ✅ Marks this as a client component (required for useEffect, useState)

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function ReceptionistDashboard() {
  // ✅ State for each summary count
  const [totalPatients, setTotalPatients] = useState(0);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [totalInvoices, setTotalInvoices] = useState(0);

  // 🧪 Optional: Search field state (for later enhancement)
  const [search, setSearch] = useState('');

  useEffect(() => {
    // ✅ Load document counts for overview stats
    const fetchCounts = async () => {
      try {
        const [patientsRes, appointmentsRes, invoicesRes] = await Promise.all([
          databases.listDocuments(DATABASE_ID, COLLECTIONS.PATIENTS),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.APPOINTMENTS),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICES),
        ]);

        // ✅ Total count from Appwrite response
        setTotalPatients(patientsRes.total);
        setTotalAppointments(appointmentsRes.total);
        setTotalInvoices(invoicesRes.total);
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      }
    };

    fetchCounts(); // ⏬ Trigger fetch on mount
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold">Receptionist Dashboard</h1>

      {/* 🔍 Optional search bar (not yet functional) */}
      <div>
        <Input
          placeholder="Search patients, appointments, or invoices... [Coming Soon]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ✅ Overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 👥 Patients */}
        <div className="border rounded p-4 shadow-sm">
          <h2 className="text-sm text-muted-foreground">Total Patients</h2>
          <p className="text-xl font-bold">{totalPatients}</p>
          <Link href="/dashboard/receptionist/patients">
            <Button className="mt-2 w-full" variant="outline">View All</Button>
          </Link>
        </div>

        {/* 📅 Appointments */}
        <div className="border rounded p-4 shadow-sm">
          <h2 className="text-sm text-muted-foreground">Total Appointments</h2>
          <p className="text-xl font-bold">{totalAppointments}</p>
          <Link href="/dashboard/receptionist/appointments">
            <Button className="mt-2 w-full" variant="outline">View All</Button>
          </Link>
        </div>

        {/* 🧾 Invoices */}
        <div className="border rounded p-4 shadow-sm">
          <h2 className="text-sm text-muted-foreground">Total Invoices</h2>
          <p className="text-xl font-bold">{totalInvoices}</p>
          <Link href="/dashboard/receptionist/invoices">
            <Button className="mt-2 w-full" variant="outline">View All</Button>
          </Link>
        </div>
      </div>

      {/* ➕ Action buttons */}
      <div className="flex flex-wrap gap-4 pt-4">
        <Link href="/dashboard/receptionist/patients/new">
          <Button>➕ Register Patient</Button>
        </Link>

        <Link href="/dashboard/receptionist/appointments/new">
          <Button>📌 Book Appointment</Button>
        </Link>

        <Link href="/dashboard/receptionist/invoices/new">
          <Button>💳 Create Invoice</Button>
        </Link>
      </div>
    </div>
  );
}
