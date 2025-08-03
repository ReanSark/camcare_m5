// app/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function Home() {
  const router = useRouter();

  return (
    <main className="h-screen w-full flex items-center justify-center">
      <Button onClick={() => router.push("/auth/login")}>
        Go to Login
      </Button>
    </main>
  );
}
