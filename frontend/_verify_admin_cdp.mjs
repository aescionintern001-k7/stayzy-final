import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const ARTIFACT_DIR =
  "C:/Users/rahul/.gemini/antigravity/brain/e4505eda-1a70-4963-80ad-598b30fcb9c8";
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const BASE_URL = "http://localhost:3000";

function launchEdge(port) {
  const userDataDir = path.join(os.tmpdir(), `stayzy_cdp_admin_${Date.now()}`);
  const proc = spawn(
    EDGE_PATH,
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "about:blank",
    ],
    { stdio: "ignore" }
  );
  return { proc, userDataDir };
}

async function waitForCdp(port) {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (res.ok) {
        const list = await res.json();
        const page = list.find((t) => t.type === "page") || list[0];
        if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("Timed out waiting for Edge CDP");
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    };
  }
  async send(method, params = {}) {
    await this.ready;
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() {
    this.ws.close();
  }
}

async function main() {
  const port = 9260;
  const { proc, userDataDir } = launchEdge(port);

  try {
    const wsUrl = await waitForCdp(port);
    const cdp = new CdpClient(wsUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    // 1. Admin Login page checks (1440 & 390)
    const loginMetrics = {};
    for (const [w, h, mobile] of [
      [1440, 920, false],
      [390, 844, true],
    ]) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: w,
        height: h,
        deviceScaleFactor: 1,
        mobile,
      });
      await cdp.send("Page.navigate", { url: `${BASE_URL}/admin/login` });
      await new Promise((r) => setTimeout(r, 2000));

      const m = await cdp.send("Runtime.evaluate", {
        returnByValue: true,
        expression: `(() => {
          const img = document.querySelector('img[src*="stayzy-admin-lobby"]');
          const h1 = document.querySelector('h1');
          return {
            horizOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
            lobbyImgLoaded: Boolean(img && img.complete && img.naturalWidth > 0),
            lobbyWidth: img?.naturalWidth || 0,
            h1Text: h1?.textContent?.trim() || null,
          };
        })()`,
      });
      loginMetrics[w] = m.result.value;

      const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(
        path.join(ARTIFACT_DIR, `admin_login_${w}.png`),
        Buffer.from(shot.data, "base64")
      );
    }

    // 2. Authenticate as Demo Admin & inspect /admin across 1440, 768, 390
    await cdp.send("Runtime.evaluate", {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ demoType: 'admin' })
        });
        const data = await res.json();
        if (data.user) localStorage.setItem('stayzy_user', JSON.stringify(data.user));
        return { status: res.status, role: data.user?.role };
      })()`,
    });

    const panelMetrics = {};
    for (const [w, h, mobile] of [
      [1440, 920, false],
      [768, 1024, true],
      [390, 844, true],
    ]) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: w,
        height: h,
        deviceScaleFactor: 1,
        mobile,
      });
      await cdp.send("Page.navigate", { url: `${BASE_URL}/admin` });
      await new Promise((r) => setTimeout(r, 2500));

      const m = await cdp.send("Runtime.evaluate", {
        returnByValue: true,
        expression: `(() => {
          const h1 = document.querySelector('h1');
          const sidebarLinks = document.querySelectorAll('aside nav a').length;
          const bookingRows = document.querySelectorAll('table tbody tr').length;
          return {
            horizOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
            h1Text: h1?.textContent?.trim() || null,
            sidebarLinks,
            bookingRows,
          };
        })()`,
      });
      panelMetrics[w] = m.result.value;

      const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(
        path.join(ARTIFACT_DIR, `admin_panel_${w}.png`),
        Buffer.from(shot.data, "base64")
      );
    }

    const consoleErrors = cdp.events
      .filter((e) => e.method === "Runtime.exceptionThrown")
      .map((e) => e.params?.exceptionDetails?.text || "Runtime exception");

    console.log(JSON.stringify({ loginMetrics, panelMetrics, consoleErrors }, null, 2));
    cdp.close();
  } finally {
    proc.kill("SIGKILL");
    setTimeout(() => {
      try {
        fs.rmSync(userDataDir, { recursive: true, force: true });
      } catch {}
    }, 300);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
