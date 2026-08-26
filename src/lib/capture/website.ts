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

type BrowserInstance = Awaited<
  ReturnType<typeof import("playwright-core").chromium.launch>
>;

async function launchBrowser(): Promise<BrowserInstance> {
  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.AWS_EXECUTION_ENV ||
    (process.env.NODE_ENV === "production" && process.platform === "linux")
  );

  if (isServerless) {
    console.log(
      "[OptiUX] Launching serverless Chromium via @sparticuz/chromium..."
    );
    const chromiumModule = await import("@sparticuz/chromium");
    const chromium = chromiumModule.default || chromiumModule;
    const { chromium: playwrightChromium } = await import("playwright-core");

    chromium.setGraphicsMode = false;
    const executablePath = await chromium.executablePath();

    return await playwrightChromium.launch({
      args: [
        ...chromium.args,
        "--hide-scrollbars",
        "--disable-web-security",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
      executablePath,
      headless: true,
    });
  }

  console.log("[OptiUX] Launching local browser for capture...");
  try {
    const { chromium: playwrightChromium } = await import("playwright");
    return await playwrightChromium.launch({
      headless: true,
    });
  } catch (localError) {
    console.warn(
      "[OptiUX] Local Playwright launch fallback to playwright-core:",
      localError
    );
    const { chromium: playwrightCoreChromium } = await import(
      "playwright-core"
    );
    return await playwrightCoreChromium.launch({
      headless: true,
      channel: "chrome",
    });
  }
}

export async function captureWebsite(
  url: string
): Promise<WebsiteCaptureResult> {
  const normalizedUrl = normalizeUrl(url);

  let browser: BrowserInstance | null = null;

  try {
    console.log(
      `[OptiUX] Opening website: ${normalizedUrl}`
    );

    browser = await launchBrowser();

    const context = await browser.newContext({
      viewport: {
        width: 1440,
        height: 900,
      },

      deviceScaleFactor: 1,

      ignoreHTTPSErrors: true,

      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
    });

    const page = await context.newPage();

    page.setDefaultNavigationTimeout(30000);
    page.setDefaultTimeout(15000);

    await page.goto(normalizedUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await page
      .waitForLoadState("networkidle", {
        timeout: 10000,
      })
      .catch(() => {
        console.log(
          "[OptiUX] Network idle timeout - continuing with capture."
        );
      });

    await page.waitForTimeout(1000);

    await page
      .evaluate(() =>
        Promise.race([
          document.fonts.ready,
          new Promise((resolve) => setTimeout(resolve, 4000)),
        ])
      )
      .catch(() => {});

    const title = await page
      .title()
      .catch(() => "");

    const description = await page
      .locator('meta[name="description"]')
      .getAttribute("content")
      .catch(() => null);

    const screenshotBuffer = await page.screenshot({
      type: "png",
      fullPage: true,
      timeout: 30000,
    });

    const screenshot =
      `data:image/png;base64,${screenshotBuffer.toString("base64")}`;

    await context.close();

    console.log(
      "[OptiUX] Website captured successfully."
    );

    return {
      screenshot,
      title,
      description: description || "",
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
      await browser.close().catch(() => {});
    }
  }
}