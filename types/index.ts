// types/index.ts

// Patient
export interface Patient {
  $id: string;
  fullName: string;
  gender: "Male" | "Female" | "Other";
  dob?: string;
  phone?: string;
  email?: string;
  address?: string;
  other?: string;
}

// Appointment
export interface Appointment {
  $id: string;
  patientId: string;
  doctorIds: string[];
  date: string;
  reason?: string;
  status: "scheduled" | "completed" | "canceled";
  other?: string;
}

// Doctor
export interface Doctor {
  $id: string;
  fullName: string;
  role: "Doctor";
  userId: string;
  other?: string;
}

// Receptionist
export interface Receptionist {
  $id: string;
  fullName: string;
  role: "Receptionist";
  userId: string;
  other?: string;
}

// Pharmacist
export interface Pharmacist {
  $id: string;
  fullName: string;
  role: "Pharmacist";
  userId: string;
  other?: string;
}

// Lab Technician
export interface LabTechnician {
  $id: string;
  fullName: string;
  role: "LabTechnician";
  userId: string;
  other?: string;
}

// Diagnosis
export interface Diagnosis {
  $id: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  diagnosis: string;
  date: string;
  other?: string;
}

// Invoice Item (free-text based, MVP)
export interface InvoiceItem {
  description: string;
  amount: number;
}

// Invoice
export interface Invoice {
  $id: string;
  patientId: string;
  items: string[]; // Each string can be enhanced to InvoiceItem[] in future
  totalAmount: number;
  status: "paid" | "unpaid" | "partial";
  paymentMethod: "cash" | "card" | "mobile";
  dateIssued: string;
  other?: string;
}

// Lab Test Metadata
export interface LabTestCatalog {
  $id: string;
  name: string;
  price: number;
  category?: string;
  notes?: string;
}

// Lab Result
export interface LabResult {
  $id: string;
  patientId: string;
  appointmentId?: string;
  testIds?: string[];
  status: "pending" | "completed";
  enteredBy: string;
}
