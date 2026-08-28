import { test, expect } from "@playwright/test";

test("preview mode does not affect admin session localStorage", async ({
  page,
  context,
}) => {
  // 1. Navigate to the app
  await page.goto("http://localhost:8091");

  // 2. Log in as admin
  await page.fill('input[type="email"]', "admin@demo.test");
  await page.fill('input[type="password"]', "demo123456");
  await page.click("button");

  // Wait for login to complete and page to load
  // Might redirect to admin or album or anywhere depending on auth flow
  await page.waitForTimeout(3000);

  // 3. Record localStorage auth keys before preview
  const authBefore = await page.evaluate(() => {
    // Get all localStorage entries, not just auth ones
    const allKeys = Object.keys(localStorage);
    console.log("All localStorage keys:", allKeys);
    const keys = allKeys.filter((k) =>
      k.includes("pb_") || k.includes("auth")
    );
    return Object.fromEntries(keys.map((k) => [k, localStorage.getItem(k)]));
  });

  console.log("\n=== BEFORE PREVIEW ===");
  console.log("Auth localStorage entries:");
  if (Object.keys(authBefore).length === 0) {
    console.log("  (no auth entries found)");
  } else {
    Object.entries(authBefore).forEach(([k, v]) => {
      if (v) {
        console.log(`  Key: ${k}`);
        console.log(`  Value length: ${v.length} bytes`);
        console.log(`  Value hash: ${JSON.stringify(v).substring(0, 80)}`);
      }
    });
  }

  // 4. Find a shooting ID by examining the page
  const firstAlbumHref = await page.evaluate(() => {
    const link = document.querySelector('a[href*="/publicAlbum/"]');
    return link ? (link as HTMLAnchorElement).href : null;
  });

  let shootingId = "test-shooting";
  if (firstAlbumHref) {
    const match = firstAlbumHref.match(/\/publicAlbum\/([^/?]+)/);
    if (match) {
      shootingId = match[1];
    }
  }

  console.log(`\nOpening preview with shootingId: ${shootingId}`);

  // 5. Open preview in a new page (same context = same localStorage)
  const previewPage = await context.newPage();
  await previewPage.goto(`http://localhost:8091/publicAlbum/${shootingId}?vorschau=1`);

  // Wait for preview to load
  await previewPage.waitForTimeout(2000);

  // Close the preview page
  await previewPage.close();

  // 6. Go back to admin page and check auth state again
  const authAfter = await page.evaluate(() => {
    const allKeys = Object.keys(localStorage);
    const keys = allKeys.filter((k) =>
      k.includes("pb_") || k.includes("auth")
    );
    return Object.fromEntries(keys.map((k) => [k, localStorage.getItem(k)]));
  });

  console.log("\n=== AFTER PREVIEW ===");
  console.log("Auth localStorage entries:");
  if (Object.keys(authAfter).length === 0) {
    console.log("  (no auth entries found)");
  } else {
    Object.entries(authAfter).forEach(([k, v]) => {
      if (v) {
        console.log(`  Key: ${k}`);
        console.log(`  Value length: ${v.length} bytes`);
        console.log(`  Value hash: ${JSON.stringify(v).substring(0, 80)}`);
      }
    });
  }

  // 7. Verify they are identical
  console.log("\n=== VERIFICATION ===");
  expect(authBefore).toEqual(authAfter);
  console.log("✓ SUCCESS: Admin localStorage unchanged after preview session");
});
