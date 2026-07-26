"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center p-12 sm:p-16 rounded-3xl bg-primary text-primary-foreground"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Build Better Experiences with OptiUX-AI
          </h2>
          <p className="text-primary-foreground/70 text-lg mb-8 max-w-lg mx-auto">
            Start analyzing your designs today and discover what AI-powered UX
            evaluation can do for your product.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium bg-white text-primary rounded-lg hover:bg-white/90 transition-colors"
          >
            Start Your UX Audit
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
