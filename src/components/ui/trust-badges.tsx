"use client";

import { ShieldCheck, Lock, CheckCircle } from "lucide-react";

export default function TrustBadges() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
      <div className="flex items-center gap-2 p-3 rounded-md border bg-card">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <span>99.9% Uptime Target</span>
      </div>
      <div className="flex items-center gap-2 p-3 rounded-md border bg-card">
        <Lock className="h-5 w-5 text-primary" />
        <span>SSL & OAuth Secured</span>
      </div>
      <div className="flex items-center gap-2 p-3 rounded-md border bg-card">
        <CheckCircle className="h-5 w-5 text-primary" />
        <span>One-click Deploy</span>
      </div>
      <div className="flex items-center gap-2 p-3 rounded-md border bg-card">
        <CheckCircle className="h-5 w-5 text-primary" />
        <span>ISO S3 Storage</span>
      </div>
    </div>
  );
}

