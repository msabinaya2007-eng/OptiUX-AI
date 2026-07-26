import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold">OptiUX-AI</span>
        </Link>
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} OptiUX-AI. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
