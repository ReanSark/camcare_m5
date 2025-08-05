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

// Lab Technician (v5)
export interface LabTechnician {
  $id: string;
  userId: string;
  fullName: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  department?: string;
  joinedDate?: string;
  isActive?: boolean;
  role: "LabTechnician";
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

// Lab Test (LabTestCatalog, v5)
export interface LabTest {
  $id: string;
  name: string;
  category?: string;
  price: number;
  availableInHouse?: boolean;
  createdBy?: string;
  createdAt?: string;
}

// Lab Result (LabResults, v5)
export interface LabResult {
  $id: string;
  patientId: string;
  diagnosisId?: string;
  testName: string;
  status: "pending" | "processing" | "completed" | "canceled";
  processedBy: string;
  labSource?: "in-house" | "external";
  externalLabName?: string;
  resultFileUrl?: string;
  date?: string;
  dateRequested?: string;
  dateCompleted?: string;
  printedAt?: string;
  isPrinted?: boolean;
  labConsentId?: string;
  isArchived?: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Lab Result Detail (LabResultDetails, v5)
export interface LabResultDetail {
  $id: string;
  labResultId: string;
  testItem: string;
  value?: string;
  unit?: string;
  referenceRange?: string;
  flag?: "normal" | "high" | "low" | "critical";
  note?: string;
}
