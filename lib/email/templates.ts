import { translatorFor } from "@/lib/i18n/translator";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import type { MaterialSummary } from "@/lib/pricing/aggregate";
import type { Offer } from "@/lib/quote/offer";

const esc = (v: string) => v.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

function layout(body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1d1d1f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td style="font-size:15px;line-height:1.55">${body}</td></tr></table></td></tr></table></body></html>`;
}

function itemsTable(offer: Offer): string {
  const rows = offer.items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;border-top:1px solid #d2d2d7"><strong>${esc(i.name)}</strong>${i.quantity > 1 ? ` × ${i.quantity}` : ""}<br><span style="color:#6e6e73;font-size:13px">${esc(i.specs.join(" · "))}</span></td><td align="right" style="padding:8px 0;border-top:1px solid #d2d2d7;white-space:nowrap">${formatMoney(i.total, offer.locale)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">${rows}
<tr><td style="padding-top:8px;border-top:1px solid #1d1d1f"><strong>Total excl. VAT / bez PVN</strong></td><td align="right" style="padding-top:8px;border-top:1px solid #1d1d1f"><strong>${formatMoney(offer.net, offer.locale)}</strong></td></tr></table>`;
}

export function customerOfferEmail(offer: Offer) {
  const t = translatorFor(offer.locale, "offer");
  const name = offer.customer.name;
  const validUntil = formatDate(offer.validUntil, offer.locale);
  const subject = t("emailSubject", { number: offer.number, company: offer.company.name });
  const lines = [t("emailGreeting", { name }), t("emailBody", { number: offer.number, validUntil }), t("emailNext")];
  const html = layout(
    `<p style="font-size:20px;font-weight:600;margin:0 0 16px">${esc(offer.company.name)}</p>` +
      lines.map((l) => `<p>${esc(l)}</p>`).join("") +
      itemsTable(offer) +
      `<p>${esc(t("emailSignoff"))}<br>${esc(offer.company.name)}<br><span style="color:#6e6e73">${esc(offer.company.email)} · ${esc(offer.company.phone)}</span></p>`,
  );
  const text = [...lines, "", ...offer.items.map((i) => `${i.name} × ${i.quantity}: ${formatMoney(i.total, offer.locale)}`), "", t("emailSignoff"), offer.company.name].join("\n");
  return { subject, html, text };
}

/** Internal notification with contact details and the material summary. Always English. */
export function ownerNotificationEmail(offer: Offer, materials: MaterialSummary, adminUrl: string) {
  const c = offer.customer;
  const subject = `New quote request ${offer.number} — ${c.company || c.name} — ${formatMoney(offer.net, "en")}`;
  const contact = [c.name, c.company, c.vatNumber && `VAT ${c.vatNumber}`, c.email, c.phone, `${c.address}, ${c.country}`].filter(Boolean) as string[];
  const mat = `Steel ${formatNumber(materials.steelKg, "en", 0)} kg · Plywood ${materials.plywoodSheets} sheets · Labour ${formatNumber(materials.labourHours, "en", 0)} h`;
  const html = layout(
    `<p style="font-size:20px;font-weight:600;margin:0 0 8px">New quote request ${esc(offer.number)}</p>` +
      `<p>${contact.map(esc).join("<br>")}</p>` +
      (offer.desiredDate ? `<p>Desired delivery: ${esc(offer.desiredDate)}</p>` : "") +
      (offer.comment ? `<p style="background:#f5f5f7;border-radius:8px;padding:12px">${esc(offer.comment)}</p>` : "") +
      itemsTable(offer) +
      `<p style="color:#6e6e73;font-size:13px">${esc(mat)}</p>` +
      `<p><a href="${esc(adminUrl)}" style="color:#0a7a3c">Open in admin</a></p>`,
  );
  const text = [`New quote request ${offer.number}`, ...contact, offer.comment ?? "", mat, adminUrl].filter(Boolean).join("\n");
  return { subject, html, text };
}
