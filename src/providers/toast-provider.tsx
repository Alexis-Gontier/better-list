"use client";

import { Toaster } from "@/components/ui/sonner";

export function ToastProvider() {
  return <Toaster position="bottom-right" closeButton duration={4000} />;
}
