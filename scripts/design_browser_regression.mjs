import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

export async function designRegression(browser, base) {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await mkdir("artifacts/design", { recursive: true });
  for (const locale of ["en", "zh-CN", "zh-TW"])
    for (const theme of ["light", "dark"]) {
      await page.goto(base);
      await page.waitForLoadState("networkidle");
      await page.evaluate(
        async ({ locale, theme }) => {
          const { useSettingsStore } =
            await import("/src/stores/settingsStore.ts");
          await useSettingsStore
            .getState()
            .update({ ui_locale: locale, theme });
        },
        { locale, theme },
      );
      for (const [width, height] of [
        [1440, 900],
        [1280, 800],
        [390, 844],
      ]) {
        await page.setViewportSize({ width, height });
        await page.locator("#search-input").fill("gradient");
        await page.locator("#search-input").press("Enter");
        await page.locator('[role="option"]').first().waitFor();
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${locale}/${theme}/${width}: overflow`,
        );
        assert.equal(await page.locator(".app-nav button:visible").count(), 5);
        assert.equal(await page.locator('.app-nav button[aria-current="page"]').count(), 1);
        if (width === 390) {
          const toggle = page.locator(".source-toggle");
          await toggle.click();
          assert.equal(await toggle.getAttribute("aria-expanded"), "true");
          await page.locator(".source-pane input").first().focus();
          await page.keyboard.press("Escape");
          assert.equal(await toggle.getAttribute("aria-expanded"), "false");
          assert.ok(await toggle.evaluate((e) => e === document.activeElement));
        }
        await page.screenshot({
          path: `artifacts/design/search-${locale}-${theme}-${width}.png`,
        });
      }
      const contrast = await page.evaluate(() => {
        const element = document.createElement("span");
        element.style.transitionProperty = "none";
        document.body.append(element);
        const color = (token) => {
          element.style.color = `var(${token})`;
          return getComputedStyle(element)
            .color.match(/[\d.]+/g)
            .slice(0, 3)
            .map(Number);
        };
        const luminance = (rgb) =>
          rgb
            .map((x) => x / 255)
            .map((x) =>
              x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4,
            )
            .reduce((sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i], 0);
        const backgrounds = [
          color("--ps-bg"),
          color("--ps-panel"),
          color("--ps-subtle"),
        ].map(luminance);
        const ratios = [
          "--ps-ink",
          "--ps-muted",
          "--ps-accent",
          "--ps-danger",
          "--ps-warning",
          "--ps-success",
        ].flatMap((token) => {
          const light = luminance(color(token));
          return backgrounds.map(
            (bg) => (Math.max(light, bg) + 0.05) / (Math.min(light, bg) + 0.05),
          );
        });
        element.remove();
        return ratios;
      });
      assert.ok(
        contrast.every((ratio) => ratio >= 4.5),
        `${theme}: normal text token contrast ${Math.min(...contrast)}`,
      );
      await page.setViewportSize({ width: 1440, height: 900 });
      const row = page.locator('[role="option"]').first();
      await row.click();
      await page.keyboard.press("Space");
      const dialog = page.getByRole("dialog");
      await dialog.waitFor();
      const focusable = dialog
        .locator(
          'button:enabled,a[href],input:enabled,select:enabled,[tabindex="0"]',
        )
        .filter({ visible: true });
      await focusable.last().focus();
      await page.keyboard.press("Tab");
      assert.ok(
        await focusable.first().evaluate((e) => e === document.activeElement),
      );
      await page.keyboard.press("Shift+Tab");
      assert.ok(
        await focusable.last().evaluate((e) => e === document.activeElement),
      );
      await page.keyboard.press("Escape");
      assert.equal(await dialog.count(), 0);
      await page.keyboard.press("Tab");
      assert.equal(
        await page.evaluate(
          () => getComputedStyle(document.activeElement).outlineStyle,
        ),
        "solid",
      );
    }
  await context.close();
  process.stdout.write(
    "DESIGN: 18 locale/theme/viewport combinations, text contrast, mobile source keyboard dismissal, dialog focus cycle, focus ring and Reduced Motion PASS\n",
  );
}
