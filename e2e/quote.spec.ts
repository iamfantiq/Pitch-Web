import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const outbox = path.join(process.cwd(), ".data/outbox");

// 1×1 transparent PNG
const logo = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

async function outboxMessages(number: string) {
  const files = await readdir(outbox).catch(() => [] as string[]);
  const messages = await Promise.all(
    files.filter((f) => f.endsWith(".json")).map(async (f) => ({ file: f, ...(JSON.parse(await readFile(path.join(outbox, f), "utf8")) as { to: string; subject: string; text: string }) })),
  );
  return { files, messages: messages.filter((m) => m.subject.includes(number)) };
}

async function addToCart(page: Page) {
  await page.locator("button:visible", { hasText: /^Add to cart$/ }).first().click();
  await expect(page.getByRole("status").filter({ hasText: "Added to cart." }).first()).toBeVisible();
}

test("configure → cart → quote request → PDF offer emailed", async ({ page }) => {
  // Configure a custom The Pitch with a logo.
  await page.goto("/en/configure/the-pitch");
  await page.getByRole("button", { name: "Increase Length" }).click();
  await expect(page.getByText("17 m", { exact: true })).toBeVisible();
  await page.getByText("Logos", { exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: logo });
  await expect(page.getByText("Uploaded: logo.png")).toBeVisible();
  await addToCart(page);

  // A second item: Panna Pitch with turf.
  await page.goto("/en/configure/panna-pitch");
  await page.getByText("Artificial turf", { exact: true }).click();
  await addToCart(page);

  // Cart survives a reload and lists both items.
  await page.goto("/en/cart");
  await page.reload();
  await expect(page.getByRole("heading", { name: "The Pitch" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Panna Pitch" })).toBeVisible();
  await expect(page.getByText("Logo attached")).toBeVisible();
  await page.getByRole("link", { name: "Request a quote" }).click();

  // Quote form: a German company with a VAT number gets reverse charge.
  await expect(page.getByRole("heading", { name: "Request a quote." })).toBeVisible();
  await page.getByLabel("Full name").fill("Anna Bērziņa");
  await page.getByLabel("Company").fill("FC Example GmbH");
  await page.getByLabel("VAT number").fill("DE123456789");
  await page.getByLabel("Email").fill("anna@example.com");
  await page.getByLabel("Phone").fill("+49 30 1234567");
  await page.getByLabel("Country").selectOption("DE");
  await page.getByLabel("Delivery address").fill("Sportplatzweg 1, 10115 Berlin");
  await page.getByLabel("Comment").fill("Please deliver before the summer tournament.");
  await expect(page.getByText("VAT 0% (reverse charge)")).toBeVisible();
  await page.getByRole("button", { name: "Send quote request" }).click();

  // Confirmation page with the quote number; the cart is emptied.
  await expect(page).toHaveURL(/\/en\/quote\/thanks\?number=Q-\d{4}-\d{4}/);
  const number = new URL(page.url()).searchParams.get("number")!;
  await expect(page.getByText(number)).toBeVisible();
  await page.goto("/en/cart");
  await expect(page.getByText("Your cart is empty.")).toBeVisible();

  // The PDF offer goes to the customer; the owner gets a notification with the material summary.
  await expect
    .poll(async () => (await outboxMessages(number)).messages.length, { timeout: 20_000 })
    .toBe(2);
  const { files, messages } = await outboxMessages(number);
  const customer = messages.find((m) => m.to === "anna@example.com")!;
  const owner = messages.find((m) => m.to === "owner@example.com")!;
  expect(customer.subject).toContain(number);
  expect(owner.text).toMatch(/Steel \d+ kg · Plywood \d+ sheets/);
  const pdf = files.find((f) => f.startsWith(customer.file.replace(".json", "")) && f.endsWith(`${number}.pdf`));
  expect(pdf).toBeDefined();
  expect((await readFile(path.join(outbox, pdf!))).subarray(0, 4).toString()).toBe("%PDF");
});

test("rejects tampered or invalid requests", async ({ request }) => {
  const res = await request.post("/api/quotes", {
    data: { locale: "en", customer: { name: "x" }, items: [], website: "" },
  });
  expect(res.status()).toBe(400);

  const honeypot = await request.post("/api/quotes", { data: { locale: "en", customer: {}, items: [{}], website: "spam" } });
  expect(honeypot.status()).toBe(400);
});
