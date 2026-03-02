

import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export default function OwnerDashboard() {
  // This page is a fallback. The layout handles most of the dashboard structure.
  // We'll redirect to the actual dashboard page.
  redirect('/owner/dashboard');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          أهلاً بك في لوحة تحكم مطعمك
        </h1>
        <p className="text-gray-600 mb-6">
          سيتم تحويلك تلقائياً...
        </p>
      </div>
    </div>
  );
}
