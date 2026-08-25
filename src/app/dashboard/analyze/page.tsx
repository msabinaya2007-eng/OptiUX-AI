"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAnalysis } from "@/lib/analysis-context";
import { validateAnalysisResult } from "@/lib/validation";
import type {
  AnalysisInputType,
  AnalysisContext,
  AnalysisSession,
} from "@/types";
import { toast } from "sonner";
import {
  ImagePlus,
  Video,
  X,
  Upload,
  ArrowRight,
  Loader2,
  FileVideo,
  Globe,
} from "lucide-react";

const INPUT_TABS = [
  {
    id: "video" as const,
    label: "Video",
    icon: Video,
  },
  {
    id: "screenshots" as const,
    label: "Screenshots",
    icon: ImagePlus,
  },
  {
    id: "url" as const,
    label: "Website URL",
    icon: Globe,
  },
];

const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

/* -----------------------------
   File → base64 data URL

   Converts the actual uploaded File into
   "data:image/png;base64,..." so it can be
   analyzed server-side.

   Blob preview URLs (URL.createObjectURL) are ONLY
   used for <img>/<video> display and must never be
   sent to /api/analyze.
----------------------------- */

function fileToDataUrl(
  file: File
): Promise<string> {
  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload =
        () => {
          if (
            typeof reader.result ===
            "string"
          ) {
            resolve(
              reader.result
            );
          } else {
            reject(
              new Error(
                `Could not read ${file.name} as a data URL`
              )
            );
          }
        };

      reader.onerror =
        () => {
          reject(
            new Error(
              `Failed to read ${file.name}`
            )
          );
        };

      reader.readAsDataURL(
        file
      );
    }
  );
}

/* -----------------------------
   Safe image metadata logging

   NEVER log full base64 content.
----------------------------- */

function logImageMetadata(
  label: string,
  value: unknown
): void {
  const metadata =
    typeof value === "string"
      ? {
          prefix:
            value
              .trim()
              .substring(0, 50),
          length: value.length,
          isDataUrl:
            value.startsWith("data:"),
          isBlobUrl:
            value.startsWith("blob:"),
        }
      : {
          prefix: `<${typeof value}>`,
          length: -1,
          isDataUrl: false,
          isBlobUrl: false,
        };

  console.log(
    `[OptiUX] ${label}:`,
    metadata
  );
}

export default function AnalyzePage() {
  const [inputType, setInputType] =
    useState<AnalysisInputType>("video");

  const [screenshots, setScreenshots] = useState<
    { file: File; preview: string }[]
  >([]);

  const [videoFile, setVideoFile] =
    useState<File | null>(null);

  const [videoPreview, setVideoPreview] =
    useState<string | null>(null);

  const [url, setUrl] = useState("");

  const [context, setContext] =
    useState<AnalysisContext>({});

  const [isAnalyzing, setIsAnalyzing] =
    useState(false);

  const screenshotInputRef =
    useRef<HTMLInputElement>(null);

  const videoInputRef =
    useRef<HTMLInputElement>(null);

  const { setSession } = useAnalysis();

  const router = useRouter();

  // -----------------------------
  // Screenshot Upload
  // -----------------------------

  const handleScreenshotUpload =
    useCallback(
      (files: FileList | null) => {
        if (!files) return;

        const newScreenshots = [
          ...screenshots,
        ];

        for (const file of Array.from(files)) {
          if (
            !ACCEPTED_IMAGE_TYPES.includes(
              file.type
            )
          ) {
            toast.error(
              `${file.name}: Unsupported file type`
            );
            continue;
          }

          if (file.size > MAX_IMAGE_SIZE) {
            toast.error(
              `${file.name}: File too large (max 10MB)`
            );
            continue;
          }

          if (newScreenshots.length >= 10) {
            toast.error(
              "Maximum 10 screenshots allowed"
            );
            break;
          }

          newScreenshots.push({
            file,
            preview:
              URL.createObjectURL(file),
          });
        }

        setScreenshots(
          newScreenshots
        );
      },
      [screenshots]
    );

  // -----------------------------
  // Remove Screenshot
  // -----------------------------

  const removeScreenshot =
    useCallback((index: number) => {
      setScreenshots((prev) => {
        const removed = prev[index];

        if (removed) {
          URL.revokeObjectURL(
            removed.preview
          );
        }

        return prev.filter(
          (_, i) => i !== index
        );
      });
    }, []);

  // -----------------------------
  // Video Upload
  // -----------------------------

  const handleVideoUpload =
    useCallback(
      (file: File | null) => {
        if (!file) return;

        if (
          !ACCEPTED_VIDEO_TYPES.includes(
            file.type
          )
        ) {
          toast.error(
            "Unsupported video format. Use MP4, WebM, or MOV."
          );
          return;
        }

        if (file.size > MAX_VIDEO_SIZE) {
          toast.error(
            "Video too large (max 50MB)"
          );
          return;
        }

        if (videoPreview) {
          URL.revokeObjectURL(
            videoPreview
          );
        }

        setVideoFile(file);

        setVideoPreview(
          URL.createObjectURL(file)
        );
      },
      [videoPreview]
    );

  // -----------------------------
  // Extract Video Frames
  // -----------------------------

  const extractVideoFrames =
    useCallback(
      async (
        video: File
      ): Promise<string[]> => {
        return new Promise(
          (resolve, reject) => {
            const videoEl =
              document.createElement(
                "video"
              );

            videoEl.preload = "metadata";
            videoEl.muted = true;

            const objectUrl =
              URL.createObjectURL(video);

            videoEl.src = objectUrl;

            videoEl.onloadedmetadata =
              async () => {
                const duration =
                  videoEl.duration;

                const canvas =
                  document.createElement(
                    "canvas"
                  );

                const ctx =
                  canvas.getContext(
                    "2d"
                  );

                if (!ctx) {
                  URL.revokeObjectURL(
                    objectUrl
                  );

                  reject(
                    new Error(
                      "Failed to create canvas context"
                    )
                  );

                  return;
                }

                canvas.width =
                  videoEl.videoWidth;

                canvas.height =
                  videoEl.videoHeight;

                const frameCount =
                  Math.min(
                    5,
                    Math.max(
                      1,
                      Math.floor(
                        duration / 2
                      )
                    )
                  );

                const frames: string[] =
                  [];

                for (
                  let i = 0;
                  i < frameCount;
                  i++
                ) {
                  const time =
                    (duration /
                      (frameCount + 1)) *
                    (i + 1);

                  videoEl.currentTime =
                    time;

                  await new Promise<void>(
                    (res) => {
                      videoEl.onseeked =
                        () => res();
                    }
                  );

                  ctx.drawImage(
                    videoEl,
                    0,
                    0
                  );

                  frames.push(
                    canvas.toDataURL(
                      "image/jpeg",
                      0.8
                    )
                  );
                }

                URL.revokeObjectURL(
                  objectUrl
                );

                resolve(frames);
              };

            videoEl.onerror = () => {
              URL.revokeObjectURL(
                objectUrl
              );

              reject(
                new Error(
                  "Failed to load video"
                )
              );
            };
          }
        );
      },
      []
    );

  // -----------------------------
  // URL Validation
  // -----------------------------

  const validateUrl = (
    value: string
  ) => {
    try {
      const parsed =
        new URL(value);

      return (
        parsed.protocol ===
          "http:" ||
        parsed.protocol ===
          "https:"
      );
    } catch {
      return false;
    }
  };

  // -----------------------------
  // Analyze
  // -----------------------------

  const handleAnalyze = async () => {
    // Screenshot validation

    if (
      inputType === "screenshots" &&
      screenshots.length === 0
    ) {
      toast.error(
        "Please upload at least one screenshot"
      );

      return;
    }

    // Video validation

    if (
      inputType === "video" &&
      !videoFile
    ) {
      toast.error(
        "Please upload a video"
      );

      return;
    }

    // URL validation

    if (inputType === "url") {
      const trimmedUrl =
        url.trim();

      if (!trimmedUrl) {
        toast.error(
          "Please enter a website URL"
        );

        return;
      }

      if (
        !validateUrl(trimmedUrl)
      ) {
        toast.error(
          "Please enter a valid URL starting with http:// or https://"
        );

        return;
      }
    }

    setIsAnalyzing(true);

    try {
      let videoFrames:
        | string[]
        | undefined;

      // -----------------------------
      // Extract Video Frames
      // -----------------------------

      if (
        inputType === "video" &&
        videoFile
      ) {
        toast.info(
          "Extracting video frames..."
        );

        try {
          videoFrames =
            await extractVideoFrames(
              videoFile
            );
        } catch {
          toast.error(
            "Failed to extract video frames"
          );

          setIsAnalyzing(false);

          return;
        }
      }

      // -----------------------------
      // Convert Screenshots
      //
      // Convert the actual File objects into
      // base64 data URLs. Do NOT send the blob:
      // preview URLs — they are only valid
      // inside this browser session and cannot
      // be read by the server.
      // -----------------------------

      let screenshotBase64: string[] = [];

      if (
        inputType === "screenshots"
      ) {
        try {
          screenshotBase64 =
            await Promise.all(
              screenshots.map(
                (s) =>
                  fileToDataUrl(s.file)
              )
            );
        } catch {
          toast.error(
            "Failed to read the uploaded screenshots. Please re-upload them."
          );

          setIsAnalyzing(false);

          return;
        }

        const invalidIndex =
          screenshotBase64.findIndex(
            (value) =>
              !value.startsWith(
                "data:image/"
              )
          );

        if (invalidIndex !== -1) {
          toast.error(
            `Screenshot ${invalidIndex + 1} could not be converted to a supported image format.`
          );

          setIsAnalyzing(false);

          return;
        }

        screenshotBase64.forEach(
          (value, index) => {
            logImageMetadata(
              `Screenshot ${index + 1}/${screenshotBase64.length} payload`,
              value
            );
          }
        );
      }

      // -----------------------------
      // Send Request
      // -----------------------------

      console.log(
        "[OptiUX] Sending analysis request..."
      );

      videoFrames?.forEach(
        (frame, index) => {
          logImageMetadata(
            `Video frame ${index + 1}/${videoFrames.length} payload`,
            frame
          );
        }
      );

      const response =
        await fetch(
          "/api/analyze",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              inputType,

              url:
                inputType === "url"
                  ? url.trim()
                  : undefined,

              screenshots:
                inputType ===
                "screenshots"
                  ? screenshotBase64
                  : undefined,

              videoFrames,

              context,
            }),
          }
        );

      const data =
        await response.json();

      // -----------------------------
      // Handle API Error
      // -----------------------------

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Analysis failed"
        );
      }

      // -----------------------------
      // Validate API Response
      //
      // /api/analyze returns the UX
      // analysis object directly, so the
      // response body itself must match the
      // UXAnalysisResult schema.
      // -----------------------------

      if (
        !data ||
        typeof data !==
          "object"
      ) {
        throw new Error(
          "The analysis API returned an invalid response."
        );
      }

      if (
        !validateAnalysisResult(
          data
        )
      ) {
        throw new Error(
          "The analysis API returned a response that is not a valid UX analysis result."
        );
      }

      console.log(
        "[OptiUX] Analysis result received."
      );

      // -----------------------------
      // Create Analysis Session
      // -----------------------------

      const session:
        AnalysisSession = {
        id: crypto.randomUUID(),

        inputType,

        url:
          inputType === "url"
            ? url.trim()
            : undefined,

        screenshotCount:
          screenshots.length,

        hasVideo:
          !!videoFile,

        context,

        /*
         * IMPORTANT:
         *
         * /api/analyze returns the UX
         * analysis object directly.
         *
         * Therefore we use:
         *
         * result: data
         *
         * NOT:
         *
         * result: data.result
         */
        result: data,

        timestamp:
          new Date().toISOString(),
      };

      // -----------------------------
      // Store Session
      // -----------------------------

      console.log(
        "[OptiUX] Saving analysis session..."
      );

      setSession(session);

      // -----------------------------
      // Success
      // -----------------------------

      toast.success(
        "Analysis complete!"
      );

      // -----------------------------
      // Navigate to Results
      // -----------------------------

      router.push(
        "/dashboard/results"
      );
    } catch (err) {
      console.error(
        "[OptiUX] Frontend analysis error:",
        err
      );

      const message =
        err instanceof Error
          ? err.message
          : "Analysis failed";

      toast.error(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Page Header */}

      <div>
        <h1 className="text-2xl font-bold mb-1">
          New UX Analysis
        </h1>

        <p className="text-muted-foreground text-sm">
          Provide your design for AI-powered UX evaluation
        </p>
      </div>

      {/* Input Type Tabs */}

      <div className="flex gap-2 p-1 bg-muted rounded-xl">
        {INPUT_TABS.map(
          (tab) => (
            <button
              key={tab.id}
              onClick={() =>
                setInputType(
                  tab.id
                )
              }
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                inputType ===
                tab.id
                  ? "bg-white dark:bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />

              {tab.label}
            </button>
          )
        )}
      </div>

      {/* ----------------------------- */}
      {/* Video Input */}
      {/* ----------------------------- */}

      {inputType === "video" && (
        <div className="space-y-4">
          <input
            ref={
              videoInputRef
            }
            type="file"
            accept=".mp4,.webm,.mov"
            onChange={(e) =>
              handleVideoUpload(
                e.target.files?.[0] ||
                  null
              )
            }
            className="hidden"
          />

          {!videoPreview ? (
            <button
              onClick={() =>
                videoInputRef.current?.click()
              }
              className="w-full p-8 rounded-2xl border-2 border-dashed border-border hover:border-accent/50 transition-colors text-center group"
            >
              <FileVideo className="w-8 h-8 text-muted-foreground group-hover:text-accent mx-auto mb-3 transition-colors" />

              <p className="text-sm font-medium mb-1">
                Click to upload a video
              </p>

              <p className="text-xs text-muted-foreground">
                MP4, WebM, MOV — Max 50MB
              </p>
            </button>
          ) : (
            <div className="relative rounded-xl border border-border overflow-hidden">
              <video
                src={
                  videoPreview
                }
                controls
                className="w-full max-h-80 object-contain bg-black"
              />

              <button
                onClick={() => {
                  if (
                    videoPreview
                  ) {
                    URL.revokeObjectURL(
                      videoPreview
                    );
                  }

                  setVideoFile(
                    null
                  );

                  setVideoPreview(
                    null
                  );
                }}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {videoFile && (
            <p className="text-xs text-muted-foreground">
              Note: Representative
              frames will be extracted
              from the video for visual
              analysis. The entire video
              is not analyzed
              frame-by-frame.
            </p>
          )}
        </div>
      )}

      {/* ----------------------------- */}
      {/* Screenshots Input */}
      {/* ----------------------------- */}

      {inputType ===
        "screenshots" && (
        <div className="space-y-4">
          <input
            ref={
              screenshotInputRef
            }
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            multiple
            onChange={(e) =>
              handleScreenshotUpload(
                e.target.files
              )
            }
            className="hidden"
          />

          <button
            onClick={() =>
              screenshotInputRef.current?.click()
            }
            className="w-full p-8 rounded-2xl border-2 border-dashed border-border hover:border-accent/50 transition-colors text-center group"
          >
            <Upload className="w-8 h-8 text-muted-foreground group-hover:text-accent mx-auto mb-3 transition-colors" />

            <p className="text-sm font-medium mb-1">
              Click to upload screenshots
            </p>

            <p className="text-xs text-muted-foreground">
              PNG, JPG, WEBP — Max
              10MB each, up to 10
              files
            </p>
          </button>

          {screenshots.length >
            0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {screenshots.map(
                (s, i) => (
                  <div
                    key={i}
                    className="relative group rounded-xl border border-border overflow-hidden"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}

                    <img
                      src={s.preview}
                      alt={`Screenshot ${
                        i + 1
                      }`}
                      className="w-full aspect-video object-cover"
                    />

                    <button
                      onClick={() =>
                        removeScreenshot(
                          i
                        )
                      }
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* ----------------------------- */}
      {/* Website URL Input */}
      {/* ----------------------------- */}

      {inputType === "url" && (
        <div className="space-y-4">
          <div className="rounded-2xl border-2 border-dashed border-border p-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Globe className="w-6 h-6 text-primary" />
              </div>
            </div>

            <h3 className="text-center text-sm font-semibold mb-1">
              Analyze a live website
            </h3>

            <p className="text-center text-xs text-muted-foreground mb-5">
              Enter the URL of the
              website you want
              OptiUX-AI to evaluate.
            </p>

            <input
              type="url"
              value={url}
              onChange={(e) =>
                setUrl(
                  e.target.value
                )
              }
              placeholder="https://example.com"
              className="w-full px-4 py-3 text-sm rounded-xl border border-border bg-white dark:bg-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
            />

            <p className="mt-2 text-xs text-muted-foreground">
              Example:
              https://yourwebsite.com
            </p>
          </div>
        </div>
      )}

      {/* ----------------------------- */}
      {/* Optional Context */}
      {/* ----------------------------- */}

      <div className="space-y-4 pt-4 border-t border-border">
        <h3 className="text-sm font-semibold">
          Optional Context
        </h3>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Project Name */}

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Project Name
            </label>

            <input
              type="text"
              value={
                context.projectName ||
                ""
              }
              onChange={(e) =>
                setContext(
                  (p) => ({
                    ...p,
                    projectName:
                      e.target.value,
                  })
                )
              }
              placeholder="My Website Redesign"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white dark:bg-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
            />
          </div>

          {/* Target Audience */}

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Target Audience
            </label>

            <input
              type="text"
              value={
                context.targetAudience ||
                ""
              }
              onChange={(e) =>
                setContext(
                  (p) => ({
                    ...p,
                    targetAudience:
                      e.target.value,
                  })
                )
              }
              placeholder="First-time college students"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white dark:bg-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
            />
          </div>
        </div>

        {/* Product Description */}

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Product Description
          </label>

          <textarea
            value={
              context.productDescription ||
              ""
            }
            onChange={(e) =>
              setContext(
                (p) => ({
                  ...p,
                  productDescription:
                    e.target.value,
                })
              )
            }
            placeholder="A project management tool for small teams..."
            rows={2}
            className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white dark:bg-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors resize-none"
          />
        </div>

        {/* UX Goals */}

        <div>
          <label className="block text-sm font-medium mb-1.5">
            UX Goals
          </label>

          <textarea
            value={
              context.uxGoals ||
              ""
            }
            onChange={(e) =>
              setContext(
                (p) => ({
                  ...p,
                  uxGoals:
                    e.target.value,
                })
              )
            }
            placeholder="Evaluate ease of onboarding for new users..."
            rows={2}
            className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white dark:bg-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors resize-none"
          />
        </div>
      </div>

      {/* ----------------------------- */}
      {/* Analyze Button */}
      {/* ----------------------------- */}

      <button
        onClick={
          handleAnalyze
        }
        disabled={
          isAnalyzing
        }
        className="w-full py-3 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />

            Analyzing...
          </>
        ) : (
          <>
            Analyze UX

            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
}