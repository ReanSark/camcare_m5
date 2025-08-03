// types/index.ts

export interface Appointment {
  $id: string;
  patientId: string;
  doctorIds: string[];
  date: string;
  reason?: string;
  status: "scheduled" | "completed" | "canceled";
}

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

export interface Doctor {
  $id: string;
  fullName: string;
  role: "Doctor";
  userId: string;
  other?: string;
}
