// components/invoices-v2/AttachmentsPanel.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { account, databases, storage } from "@/lib/appwrite.config";
import { Query, Models } from "appwrite";
import { DATABASE_ID, FILES_BUCKET_ID } from "@/config/env";
import { COLLECTIONS } from "@/lib/collections";
import type { AppwriteID, InvoiceAttachment } from "@/types";

type Props = {
  invoiceId: AppwriteID;
  canEdit?: boolean; // usually invoice.docStatus === "final"
};

export default function AttachmentsPanel({ invoiceId, canEdit = true }: Props) {
  const [loading, setLoading] = useState<boolean>(true);
  const [me, setMe] = useState<{ $id: string; name?: string | null } | null>(null);
  const [rows, setRows] = useState<InvoiceAttachment[]>([]);

  // form
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<InvoiceAttachment["fileType"]>("payment-proof");
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        try {
          const user: Models.User<Models.Preferences> = await account.get();
          setMe({ $id: user.$id, name: user.name });
        } catch {
          setMe(null);
        }
        await reload();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  async function reload(): Promise<InvoiceAttachment[]> {
    const list = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.INVOICE_ATTACHMENTS,
      [Query.equal("invoiceId", [invoiceId]), Query.orderDesc("uploadedAt")]
    );
    const docs = (list.documents as unknown as InvoiceAttachment[]) || [];
    setRows(docs);
    return docs;
  }

  async function upload() {
    if (!canEdit) return;
    if (!file) {
      alert("Choose a file first.");
      return;
    }
    if (!me?.$id) {
      alert("Please sign in to upload.");
      return;
    }

    // Use server API (does Storage upload + Audit log)
    const fd = new FormData();
    fd.append("file", file);
    fd.append("userId", me.$id);
    fd.append("fileType", fileType);
    if (note) fd.append("note", note);
    const res = await fetch(`/api/invoices/${invoiceId}/attachments`, {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data?.error || "Upload failed");
      return;
    }

    // 3) Reset and refresh
    setFile(null);
    setNote("");
    await reload();
  }

  async function remove(att: InvoiceAttachment) {
    if (!canEdit) return;
    if (!confirm("Delete this attachment?")) return;

    const qs = me?.$id ? `?userId=${encodeURIComponent(me.$id)}` : "";
    const res = await fetch(`/api/invoices/${invoiceId}/attachments/${att.$id}${qs}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data?.error || "Delete failed");
      return;
    }
    await reload();

  }

  function viewUrl(fileId: string): string {
    return storage.getFileView(FILES_BUCKET_ID, fileId).toString();
  }
  function downloadUrl(fileId: string): string {
    return storage.getFileDownload(FILES_BUCKET_ID, fileId).toString();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Attachments</h3>
        {canEdit && (
          <div className="flex gap-2 items-center">
            <select
              className="border rounded px-2 py-1"
              value={fileType}
              onChange={(e) =>
                setFileType(e.target.value as InvoiceAttachment["fileType"])
              }
              title="Attachment type"
            >
              <option value="payment-proof">Payment Proof</option>
              <option value="external-receipt">External Receipt</option>
              <option value="other">Other</option>
            </select>
            <input
              type="file"
              className="block"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <input
              type="text"
              className="border rounded px-2 py-1 w-56"
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button
              type="button"
              className="px-3 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50"
              disabled={loading}
              onClick={upload}
            >
              Upload
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left border-b">
            <tr className="[&>th]:py-2 [&>th]:px-2">
              <th className="w-40">Type</th>
              <th>Note</th>
              <th className="w-48">Uploaded At</th>
              <th className="w-40">Uploaded By</th>
              <th className="w-40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-muted-foreground">
                  No attachments.
                </td>
              </tr>
            ) : (
              rows.map((att) => (
                <tr key={att.$id} className="border-b [&>td]:py-2 [&>td]:px-2">
                  <td className="uppercase">{att.fileType}</td>
                  <td>{att.note || ""}</td>
                  <td>{new Date(att.uploadedAt).toLocaleString()}</td>
                  <td>{att.uploadedBy}</td>
                  <td className="space-x-2">
                    <a
                      href={viewUrl(att.fileId)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      View
                    </a>
                    <a
                      href={downloadUrl(att.fileId)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      Download
                    </a>
                    {canEdit && (
                      <button
                        type="button"
                        className="text-destructive hover:underline"
                        onClick={() => remove(att)}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
