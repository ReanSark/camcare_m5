'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import { Button } from '@/components/ui/Button';
import type { Invoice, InvoiceItem, Patient } from '@/types';

export default function ViewInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        // Fetch invoice, items, and patient in parallel
        const [invDoc, itemsRes] = await Promise.all([
          databases.getDocument(DATABASE_ID, COLLECTIONS.INVOICES, id),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICE_ITEMS, [`invoiceId=${id}`]),
        ]);
        setInvoice({
          $id: invDoc.$id,
          patientId: invDoc.patientId,
          groupInvoiceId: invDoc.groupInvoiceId,
          totalAmount: invDoc.totalAmount,
          discount: invDoc.discount,
          discountType: invDoc.discountType,
          discountNote: invDoc.discountNote,
          status: invDoc.status,
          paymentMethod: invDoc.paymentMethod,
          paidAt: invDoc.paidAt,
          paidBy: invDoc.paidBy,
          source: invDoc.source,
          note: invDoc.note,
          isArchived: invDoc.isArchived,
          updatedBy: invDoc.updatedBy,
          createdAt: invDoc.createdAt,
          updatedAt: invDoc.updatedAt,
        });
        setItems(itemsRes.documents.map((doc) => ({
          $id: doc.$id,
          invoiceId: doc.invoiceId,
          type: doc.type,
          refId: doc.refId,
          name: doc.name,
          price: doc.price,
          unit: doc.unit,
          discount: doc.discount,
          discountType: doc.discountType,
          discountNote: doc.discountNote,
          subtotal: doc.subtotal,
        })));
        // Fetch patient for display name
        const pat = await databases.getDocument(DATABASE_ID, COLLECTIONS.PATIENTS, invDoc.patientId);
        setPatient({
          $id: pat.$id,
          fullName: pat.fullName,
        } as Patient);
      } catch {
        toast.error('Failed to load invoice data');
        router.back();
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchAll();
  }, [id, router]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!invoice) return <div className="p-8">Invoice not found.</div>;

  return (
    <div className="max-w-2xl mx-auto py-8 print:bg-white print:text-black">
      <div className="flex justify-between items-center mb-4 print:hidden">
        <h1 className="text-2xl font-bold">Invoice</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>Print</Button>
          <Button variant="outline" onClick={() => router.push(`/dashboard/receptionist/invoices/edit/${invoice.$id}`)}>
            Edit
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
        </div>
      </div>
      <div className="mb-2">
        <strong>Patient:</strong> {patient ? patient.fullName : invoice.patientId}
      </div>
      <div><strong>Status:</strong> {invoice.status}</div>
      <div><strong>Payment:</strong> {invoice.paymentMethod}</div>
      {invoice.paidAt && (
        <div>
          <strong>Paid At:</strong> {new Date(invoice.paidAt).toLocaleDateString()}
        </div>
      )}
      <div><strong>Created:</strong> {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : '-'}</div>
      {invoice.note && <div><strong>Note:</strong> {invoice.note}</div>}
      <div className="my-4">
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-1 border">Type</th>
              <th className="p-1 border">Name</th>
              <th className="p-1 border">RefID</th>
              <th className="p-1 border">Unit</th>
              <th className="p-1 border">Price</th>
              <th className="p-1 border">Discount</th>
              <th className="p-1 border">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td className="p-1 border">{item.type}</td>
                <td className="p-1 border">{item.name}</td>
                <td className="p-1 border">{item.refId ?? '-'}</td>
                <td className="p-1 border">{item.unit}</td>
                <td className="p-1 border">${item.price?.toFixed(2)}</td>
                <td className="p-1 border">
                  {item.discount && item.discount > 0
                    ? <>${item.discount?.toFixed(2)}<br />({item.discountType})</>
                    : "-"}
                </td>
                <td className="p-1 border font-semibold">${item.subtotal?.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Totals */}
      <div className="flex justify-end gap-4 flex-wrap mt-4">
        <div className="text-right min-w-[160px]">
          <div><strong>Subtotal:</strong> ${items.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2)}</div>
          {invoice.discount && invoice.discount > 0 && (
            <div>
              <strong>Invoice Discount:</strong> ${invoice.discount.toFixed(2)}
              {invoice.discountType ? ` (${invoice.discountType})` : ''}
              {invoice.discountNote ? ` - ${invoice.discountNote}` : ''}
            </div>
          )}
          <div className="text-lg font-bold mt-1">
            Total: ${invoice.totalAmount.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
