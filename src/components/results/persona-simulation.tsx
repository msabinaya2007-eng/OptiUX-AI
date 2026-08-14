"use client";

import { useState } from "react";
import { useAnalysis } from "@/lib/analysis-context";
import type { PersonaSimulation, PersonaType } from "@/types";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MinusCircle,
  Loader2,
  UserRound,
  BriefcaseBusiness,
  HeartHandshake,
  Accessibility,
  Laptop,
  MousePointer2,
} from "lucide-react";

/* =========================================================
   PERSONAS
========================================================= */

const personas: {
  id: PersonaType;
  name: string;
  description: string;
  icon: typeof UserRound;
  accent: string;
  character: "first" | "professional" | "lowtech" | "accessibility";
}[] = [
  {
    id: "first-time",
    name: "First-Time User",
    description:
      "New to the product and needs clear guidance and obvious next steps.",
    icon: UserRound,
    accent: "violet",
    character: "first",
  },
  {
    id: "busy-professional",
    name: "Busy Professional",
    description:
      "Wants to complete tasks quickly with minimum clicks and distractions.",
    icon: BriefcaseBusiness,
    accent: "blue",
    character: "professional",
  },
  {
    id: "low-tech",
    name: "Low-Tech User",
    description:
      "Needs simple navigation, familiar language, and forgiving interactions.",
    icon: HeartHandshake,
    accent: "emerald",
    character: "lowtech",
  },
  {
    id: "accessibility",
    name: "Accessibility-Focused User",
    description:
      "Needs inclusive design, readability, contrast, and accessible interactions.",
    icon: Accessibility,
    accent: "amber",
    character: "accessibility",
  },
];

/* =========================================================
   STATUS CONFIG
========================================================= */

const statusConfig = {
  success: {
    icon: CheckCircle2,
    label: "Success",
    className: "text-green-600 bg-green-500/10",
  },
  friction: {
    icon: AlertTriangle,
    label: "Friction",
    className: "text-yellow-600 bg-yellow-500/10",
  },
  error: {
    icon: XCircle,
    label: "Error",
    className: "text-red-600 bg-red-500/10",
  },
  neutral: {
    icon: MinusCircle,
    label: "Neutral",
    className: "text-muted-foreground bg-muted",
  },
};

/* =========================================================
   SUBTLE PERSONA CHARACTER
========================================================= */

function PersonaCharacter({
  type,
  selected,
}: {
  type: "first" | "professional" | "lowtech" | "accessibility";
  selected: boolean;
}) {
  const base =
    "relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 transition-all duration-300";

  if (type === "first") {
    return (
      <div
        className={`${base} ${
          selected
            ? "bg-violet-100 dark:bg-violet-500/10"
            : "bg-violet-50 dark:bg-violet-500/5"
        }`}
      >
        {/* head */}
        <div className="absolute top-4 w-8 h-8 rounded-full bg-white border-2 border-violet-300 shadow-sm" />

        {/* hair */}
        <div className="absolute top-3 w-9 h-4 rounded-t-full bg-slate-800" />

        {/* body */}
        <div className="absolute bottom-0 w-14 h-9 rounded-t-2xl bg-violet-200 border border-violet-300" />

        {/* laptop */}
        <div className="absolute bottom-2 right-2">
          <Laptop className="w-5 h-5 text-violet-600" />
        </div>

        {/* curiosity spark */}
        <Sparkles className="absolute top-3 right-3 w-3 h-3 text-violet-500" />
      </div>
    );
  }

  if (type === "professional") {
    return (
      <div
        className={`${base} ${
          selected
            ? "bg-blue-100 dark:bg-blue-500/10"
            : "bg-blue-50 dark:bg-blue-500/5"
        }`}
      >
        {/* head */}
        <div className="absolute top-4 w-8 h-8 rounded-full bg-white border-2 border-blue-300 shadow-sm" />

        {/* hair */}
        <div className="absolute top-3 w-9 h-3 rounded-t-full bg-slate-800" />

        {/* suit */}
        <div className="absolute bottom-0 w-14 h-10 rounded-t-2xl bg-blue-200 border border-blue-300" />

        {/* tie */}
        <div className="absolute bottom-5 w-1.5 h-6 bg-blue-600 rounded-full" />

        {/* laptop */}
        <div className="absolute bottom-2 right-1">
          <Laptop className="w-5 h-5 text-blue-600" />
        </div>

        {/* small clock */}
        <div className="absolute top-2 right-2 w-3 h-3 rounded-full border border-blue-500" />
      </div>
    );
  }

  if (type === "lowtech") {
    return (
      <div
        className={`${base} ${
          selected
            ? "bg-emerald-100 dark:bg-emerald-500/10"
            : "bg-emerald-50 dark:bg-emerald-500/5"
        }`}
      >
        {/* head */}
        <div className="absolute top-4 w-9 h-9 rounded-full bg-white border-2 border-emerald-300 shadow-sm" />

        {/* hair */}
        <div className="absolute top-3 w-10 h-4 rounded-t-full bg-slate-700" />

        {/* body */}
        <div className="absolute bottom-0 w-14 h-10 rounded-t-2xl bg-emerald-200 border border-emerald-300" />

        {/* device */}
        <div className="absolute bottom-2 right-1 w-5 h-7 rounded-md bg-white border-2 border-emerald-500">
          <div className="w-2 h-1 bg-emerald-300 rounded-full mx-auto mt-1.5" />
        </div>

        {/* pointer */}
        <MousePointer2 className="absolute top-2 right-2 w-3 h-3 text-emerald-500" />
      </div>
    );
  }

  return (
    <div
      className={`${base} ${
        selected
          ? "bg-amber-100 dark:bg-amber-500/10"
          : "bg-amber-50 dark:bg-amber-500/5"
      }`}
    >
      {/* head */}
      <div className="absolute top-4 w-8 h-8 rounded-full bg-white border-2 border-amber-300 shadow-sm" />

      {/* hair */}
      <div className="absolute top-3 w-9 h-3 rounded-t-full bg-slate-800" />

      {/* body */}
      <div className="absolute bottom-0 w-14 h-10 rounded-t-2xl bg-amber-200 border border-amber-300" />

      {/* accessibility symbol */}
      <div className="absolute bottom-2 right-1 w-6 h-6 rounded-full bg-white border border-amber-400 flex items-center justify-center">
        <Accessibility className="w-4 h-4 text-amber-600" />
      </div>

      <Sparkles className="absolute top-2 right-2 w-3 h-3 text-amber-500" />
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export function PersonaSimulation() {
  const { currentSession } = useAnalysis();

  const result = currentSession?.result;

  const [selectedPersona, setSelectedPersona] =
    useState<PersonaType>("first-time");

  const [simulation, setSimulation] =
    useState<PersonaSimulation | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  if (!result) return null;

  /* =======================================================
     RUN SIMULATION
  ======================================================= */

  const handleSimulation = async () => {
    try {
      setLoading(true);
      setError(null);
      setSimulation(null);

      const response = await fetch(
        "/api/persona-simulation",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            persona: selectedPersona,
            result,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to generate persona simulation."
        );
      }

      setSimulation(data.simulation);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     UI
  ======================================================= */

  return (
    <section className="mt-8 rounded-2xl border border-border bg-white dark:bg-muted/20 overflow-hidden">

      {/* HEADER */}

      <div className="p-6 border-b border-border">
        <div className="flex items-start gap-3">

          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>

          <div>
            <h2 className="text-lg font-semibold">
              AI Persona Simulation
            </h2>

            <p className="text-sm text-muted-foreground mt-1">
              See your interface through the eyes of different users.
            </p>
          </div>

        </div>
      </div>


      {/* PERSONA SELECTION */}

      <div className="p-6">

        <h3 className="text-sm font-semibold mb-3">
          Choose a user persona
        </h3>


        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          {personas.map((persona) => {

            const Icon = persona.icon;

            const selected =
              selectedPersona === persona.id;

            return (
              <button
                key={persona.id}
                onClick={() => {
                  setSelectedPersona(persona.id);
                  setSimulation(null);
                  setError(null);
                }}
                className={`group text-left p-4 rounded-xl border transition-all duration-300 ${
                  selected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm"
                    : "border-border hover:bg-muted/40 hover:shadow-sm"
                }`}
              >

                <div className="flex items-center gap-4">

                  {/* CHARACTER */}

                  <PersonaCharacter
                    type={persona.character}
                    selected={selected}
                  />


                  {/* TEXT */}

                  <div className="min-w-0 flex-1">

                    <div className="flex items-center gap-2">

                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          selected
                            ? "bg-primary/10"
                            : "bg-muted"
                        }`}
                      >
                        <Icon
                          className={`w-3.5 h-3.5 ${
                            selected
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                      </div>

                      <p className="text-sm font-semibold">
                        {persona.name}
                      </p>

                    </div>

                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      {persona.description}
                    </p>

                  </div>

                </div>

              </button>
            );
          })}

        </div>


        {/* SIMULATE BUTTON */}

        <button
          onClick={handleSimulation}
          disabled={loading}
          className="mt-5 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >

          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Simulating User Experience...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Simulate Persona
            </>
          )}

        </button>


        {/* ERROR */}

        {error && (
          <div className="mt-4 p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          </div>
        )}


        {/* =================================================
            RESULTS
        ================================================= */}

        {simulation && (
          <div className="mt-6 space-y-5">

            {/* PERSONA SCORE */}

            <div className="rounded-xl border border-border p-5">

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                <div>

                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                    Simulated Persona
                  </p>

                  <h3 className="text-xl font-semibold mt-1">
                    {simulation.personaName}
                  </h3>

                  <p className="text-sm text-muted-foreground mt-1">
                    {simulation.goal}
                  </p>

                </div>

                <div className="text-left sm:text-right">

                  <p className="text-xs text-muted-foreground">
                    Persona UX Score
                  </p>

                  <p className="text-4xl font-bold text-primary">
                    {simulation.score}

                    <span className="text-base font-normal text-muted-foreground">
                      /100
                    </span>
                  </p>

                </div>

              </div>


              {/* SCORE BAR */}

              <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">

                <div
                  className="h-full bg-primary rounded-full transition-all duration-700"
                  style={{
                    width: `${simulation.score}%`,
                  }}
                />

              </div>


              <p className="text-sm mt-4 leading-relaxed">
                {simulation.summary}
              </p>

            </div>


            {/* USER JOURNEY */}

            <div>

              <h3 className="text-sm font-semibold mb-3">
                Simulated User Journey
              </h3>

              <div className="space-y-3">

                {simulation.journey.map(
                  (step, index) => {

                    const config =
                      statusConfig[
                        step.status
                      ];

                    const Icon =
                      config.icon;

                    return (
                      <div
                        key={`${step.step}-${index}`}
                        className="flex gap-3 p-4 rounded-xl border border-border"
                      >

                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.className}`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <p className="text-sm font-semibold">
                              {index + 1}.{" "}
                              {step.step}
                            </p>

                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${config.className}`}
                            >
                              {config.label}
                            </span>

                          </div>

                          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                            {step.observation}
                          </p>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

            </div>


            {/* FRICTION POINTS */}

            <div>

              <h3 className="text-sm font-semibold mb-3">
                ⚠️ Persona Friction Points
              </h3>

              <div className="space-y-2">

                {simulation.frictionPoints.map(
                  (point, index) => (

                    <div
                      key={index}
                      className="flex gap-2 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10"
                    >

                      <span className="text-yellow-600">
                        •
                      </span>

                      <p className="text-sm">
                        {point}
                      </p>

                    </div>

                  )
                )}

              </div>

            </div>


            {/* IMPROVEMENTS */}

            <div>

              <h3 className="text-sm font-semibold mb-3">
                💡 Recommended Improvements
              </h3>

              <div className="space-y-2">

                {simulation.improvements.map(
                  (improvement, index) => (

                    <div
                      key={index}
                      className="flex gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10"
                    >

                      <span className="text-primary font-semibold">
                        {index + 1}.
                      </span>

                      <p className="text-sm">
                        {improvement}
                      </p>

                    </div>

                  )
                )}

              </div>

            </div>

          </div>
        )}

      </div>

    </section>
  );
}