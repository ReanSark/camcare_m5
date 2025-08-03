// app/403/page.tsx
export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center text-center p-8">
      <div>
        <h1 className="text-4xl font-bold mb-4 text-red-600">403 — Access Denied</h1>
        <p className="text-lg text-gray-700">You do not have permission to access this page.</p>
      </div>
    </div>
  );
}

