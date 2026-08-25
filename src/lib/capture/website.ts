import { chromium } from "playwright";

export type WebsiteCaptureResult = {
  screenshot: string;
  title: string;
  description: string;
  url: string;
};

function normalizeUrl(url: string): string {
  const trimmed = url.trim();

  if (!trimmed) {
    throw new Error("URL cannot be empty.");
  }

  let normalized = trimmed;

  if (
    !normalized.startsWith("http://") &&
    !normalized.startsWith("https://")
  ) {
    normalized = `https://${normalized}`;
  }

  try {
    const parsed = new URL(normalized);

    if (
      parsed.protocol !== "http:" &&
      parsed.protocol !== "https:"
    ) {
      throw new Error(
        "Only HTTP and HTTPS URLs are supported."
      );
    }

    return parsed.toString();
  } catch {
    throw new Error(
      "Please enter a valid website URL."
    );
  }
}

export async function captureWebsite(
  url: string
): Promise<WebsiteCaptureResult> {
  const normalizedUrl = normalizeUrl(url);

  let browser:
    | Awaited<
        ReturnType<typeof chromium.launch>
      >
    | null = null;

  try {
    console.log(
      `[OptiUX] Opening website: ${normalizedUrl}`
    );

    browser = await chromium.launch({
      headless: true,
    });

    const context =
      await browser.newContext({
        viewport: {
          width: 1440,
          height: 900,
        },

        deviceScaleFactor: 1,

        ignoreHTTPSErrors: true,

        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
      });

    const page =
      await context.newPage();

    page.setDefaultNavigationTimeout(
      30000
    );

    page.setDefaultTimeout(15000);

    await page.goto(
      normalizedUrl,
      {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      }
    );

    await page
      .waitForLoadState("networkidle", {
        timeout: 10000,
      })
      .catch(() => {
        console.log(
          "[OptiUX] Network idle timeout - continuing with capture."
        );
      });

    await page.waitForTimeout(2000);

    const title =
      await page
        .title()
        .catch(() => "");

    const description =
      await page
        .locator(
          'meta[name="description"]'
        )
        .getAttribute("content")
        .catch(() => null);

    const screenshotBuffer =
      await page.screenshot({
        type: "png",
        fullPage: true,
      });

    const screenshot =
      `data:image/png;base64,${screenshotBuffer.toString(
        "base64"
      )}`;

    await context.close();

    console.log(
      "[OptiUX] Website captured successfully."
    );

    return {
      screenshot,
      title,
      description:
        description || "",
      url: normalizedUrl,
    };
  } catch (error) {
    console.error(
      "[OptiUX] Website capture error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    throw new Error(
      `Unable to open or capture the website: ${message}`
    );
  } finally {
    if (browser) {
      await browser
        .close()
        .catch(() => {});
    }
  }
}