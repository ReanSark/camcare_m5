'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import { Button } from '@/components/ui/Button';

export default function ReceptionistDashboard() {
  const [totalPatients, setTotalPatients] = useState(0);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [totalInvoices, setTotalInvoices] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [patientsRes, appointmentsRes, invoicesRes] = await Promise.all([
          databases.listDocuments(DATABASE_ID, COLLECTIONS.PATIENTS),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.APPOINTMENTS),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICES),
        ]);

        setTotalPatients(patientsRes.total);
        setTotalAppointments(appointmentsRes.total);
        setTotalInvoices(invoicesRes.total);
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      }
    };

    fetchCounts();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold">Receptionist Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border rounded p-4 shadow-sm">
          <h2 className="text-sm text-muted-foreground">Total Patients</h2>
          <p className="text-xl font-bold">{totalPatients}</p>
        </div>

        <div className="border rounded p-4 shadow-sm">
          <h2 className="text-sm text-muted-foreground">Total Appointments</h2>
          <p className="text-xl font-bold">{totalAppointments}</p>
        </div>

        <div className="border rounded p-4 shadow-sm">
          <h2 className="text-sm text-muted-foreground">Total Invoices</h2>
          <p className="text-xl font-bold">{totalInvoices}</p>
        </div>
      </div>

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
