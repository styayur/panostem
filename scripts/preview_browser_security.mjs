import assert from "node:assert/strict";

// Use the URL -> getWorkspaceResources -> Workspace -> ResourcePreview path
// named in CodeQL #4. Only external pages are fixtures; the app is real.
export async function previewSecurityRegression(browser, base) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const blocked = [];
  await page.exposeFunction("recordFrameViolation", (uri) => blocked.push(uri));
  await page.addInitScript(() =>
    document.addEventListener("securitypolicyviolation", (event) => {
      if (event.effectiveDirective === "frame-src")
        window.recordFrameViolation(event.blockedURI);
    }),
  );
  await context.route("https://www.falstad.com/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/server-redirect")
      return route.fulfill({
        status: 302,
        headers: { location: "https://unapproved.invalid/frame" },
      });
    if (path === "/script-redirect")
      return route.fulfill({
        contentType: "text/html",
        body: '<script>location.href="https://unapproved.invalid/frame"</script>',
      });
    return route.fulfill({
      contentType: "text/html",
      body: "<p>Approved provider fixture</p>",
    });
  });
  await context.route("https://unapproved.invalid/**", () =>
    assert.fail("CSP must block an unapproved frame before its request"),
  );
  const visit = async (url, source_id = "falstad") => {
    const resource = {
      id: "security",
      url,
      source_id,
      source_name: "Fixture",
      title: "Security regression",
      description: null,
      result_type: "applet",
      tags: [],
      score: 0,
      thumbnail: null,
    };
    const items = Buffer.from(
      JSON.stringify({ urls: [url], resources: [resource] }),
    ).toString("base64");
    await page.goto(`${base}?workspace=1&items=${encodeURIComponent(items)}`);
    await page.locator("[data-resource-workspace]").waitFor();
    await page.waitForLoadState("networkidle");
  };
  for (const [url, source] of [
    ["https://www.falstad.com.evil.invalid/a", "falstad"],
    ["https://user@www.falstad.com/a", "falstad"],
    ["https://www.falstad.com:8443/a", "falstad"],
    ["https://www.falstad.com/a", "phet"],
  ]) {
    await visit(url, source);
    await page.getByTestId("resource-card").waitFor();
    assert.equal(await page.locator("iframe").count(), 0, url);
  }
  await visit("http://falstad.com/approved");
  assert.equal(
    await page.locator("iframe").getAttribute("src"),
    "https://www.falstad.com/approved",
  );
  assert.equal(
    await page.locator("iframe").getAttribute("sandbox"),
    "allow-scripts allow-same-origin allow-popups allow-forms allow-modals",
  );
  for (const path of ["server-redirect", "script-redirect"]) {
    const count = blocked.length;
    await visit(`https://www.falstad.com/${path}`);
    await page.waitForFunction(() => document.querySelector("iframe"));
    assert.ok(
      blocked.length > count,
      `${path}: parent CSP rejects off-origin navigation`,
    );
    assert.ok(
      page
        .frames()
        .every(
          (frame) =>
            new URL(frame.url() || "about:blank").origin !==
            "https://unapproved.invalid",
        ),
    );
  }
  await context.close();
  process.stdout.write(
    "PREVIEW SECURITY: real Workspace payload, provider identity, canonical origin, HTTP upgrade, server/script redirect CSP PASS\n",
  );
}
