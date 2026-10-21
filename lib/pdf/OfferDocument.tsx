import path from "node:path";
import { Document, Font, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import { translatorFor } from "@/lib/i18n/translator";
import { formatDate, formatMoney, formatPrice } from "@/lib/format";
import { countryName } from "@/lib/quote/countries";
import type { Offer } from "@/lib/quote/offer";

// Inter covers Latvian diacritics (ā, č, ē, ģ, ī, ķ, ļ, ņ, š, ū, ž); the built-in PDF fonts don't.
const fontDir = path.join(process.cwd(), "lib/pdf/fonts");
Font.register({
  family: "Inter",
  fonts: [
    { src: path.join(fontDir, "Inter-Regular.ttf"), fontWeight: 400 },
    { src: path.join(fontDir, "Inter-SemiBold.ttf"), fontWeight: 600 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const ACCENT = "#0a7a3c";
const MUTED = "#6e6e73";
const LINE = "#d2d2d7";

const s = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 9, color: "#1d1d1f", padding: 40, paddingBottom: 60 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  brand: { fontSize: 16, fontWeight: 600 },
  accent: { color: ACCENT },
  muted: { color: MUTED },
  title: { fontSize: 22, fontWeight: 600, marginBottom: 4 },
  meta: { flexDirection: "row", gap: 24, marginBottom: 20 },
  label: { color: MUTED, fontSize: 8, marginBottom: 2 },
  box: { flexDirection: "row", gap: 24, marginBottom: 24 },
  col: { flex: 1 },
  item: { borderTopWidth: 1, borderTopColor: LINE, paddingVertical: 10 },
  itemHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  itemName: { fontSize: 11, fontWeight: 600 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 1.5 },
  specs: { color: MUTED, marginBottom: 6 },
  totals: { marginTop: 8, borderTopWidth: 1, borderTopColor: "#1d1d1f", paddingTop: 8, marginLeft: "45%" },
  grand: { fontSize: 12, fontWeight: 600, borderTopWidth: 1, borderTopColor: LINE, marginTop: 4, paddingTop: 6 },
  notes: { marginTop: 24, color: MUTED, fontSize: 8, lineHeight: 1.4 },
  footer: { position: "absolute", bottom: 28, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", color: MUTED, fontSize: 7.5 },
});

export function OfferDocument({ offer }: { offer: Offer }) {
  const t = translatorFor(offer.locale, "offer");
  const loc = offer.locale;
  const c = offer.customer;
  const price = (v: number) => formatPrice(v, loc);

  return (
    <Document title={`${t("title")} ${offer.number}`} author={offer.company.name} language={loc}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.brand}>
            {offer.company.name}
            <Text style={s.accent}> ●</Text>
          </Text>
          <View>
            <Text>{offer.company.address}</Text>
            <Text>{offer.company.email}</Text>
            <Text>{offer.company.phone}</Text>
          </View>
        </View>

        <Text style={s.title}>
          {t("title")} {offer.number}
        </Text>
        <View style={s.meta}>
          <View>
            <Text style={s.label}>{t("date")}</Text>
            <Text>{formatDate(offer.date, loc)}</Text>
          </View>
          <View>
            <Text style={s.label}>{t("validUntil")}</Text>
            <Text>{formatDate(offer.validUntil, loc)}</Text>
          </View>
          {offer.desiredDate ? (
            <View>
              <Text style={s.label}>{t("desiredDate")}</Text>
              <Text>{formatDate(offer.desiredDate, loc)}</Text>
            </View>
          ) : null}
        </View>

        <View style={s.box}>
          <View style={s.col}>
            <Text style={s.label}>{t("customer")}</Text>
            {c.company ? <Text style={{ fontWeight: 600 }}>{c.company}</Text> : null}
            <Text>{c.name}</Text>
            <Text>{c.address}</Text>
            <Text>{countryName(c.country, loc)}</Text>
            {c.vatNumber ? (
              <Text>
                {t("vatNumber")} {c.vatNumber}
              </Text>
            ) : null}
            <Text>
              {c.email} · {c.phone}
            </Text>
          </View>
          {offer.comment ? (
            <View style={s.col}>
              <Text style={s.label}>{t("comment")}</Text>
              <Text>{offer.comment}</Text>
            </View>
          ) : null}
        </View>

        {offer.items.map((item, i) => (
          <View key={i} style={s.item} wrap={false}>
            <View style={s.itemHead}>
              <Text style={s.itemName}>
                {i + 1}. {item.name}
                {item.quantity > 1 ? ` × ${item.quantity}` : ""}
              </Text>
              <Text style={s.itemName}>{price(item.total)}</Text>
            </View>
            <Text style={s.specs}>{item.specs.join(" · ")}</Text>
            {item.lines.map((l, j) => (
              <View key={j} style={s.row}>
                <Text style={s.muted}>{l.label}</Text>
                <Text>{j === 0 ? price(l.amount) : `${l.amount >= 0 ? "+" : "−"} ${price(Math.abs(l.amount))}`}</Text>
              </View>
            ))}
            {item.quantity > 1 ? (
              <View style={s.row}>
                <Text style={s.muted}>
                  {t("unitPrice")} {price(item.unitPrice)} × {item.quantity}
                </Text>
                <Text />
              </View>
            ) : null}
          </View>
        ))}

        <View style={s.totals} wrap={false}>
          <View style={s.row}>
            <Text style={s.muted}>{offer.delivery ? t("delivery", { zone: countryName(c.country, loc) }) : t("deliveryOnRequest")}</Text>
            <Text>{offer.delivery ? price(offer.delivery.amount) : "—"}</Text>
          </View>
          {offer.discount > 0 ? (
            <View style={s.row}>
              <Text style={s.muted}>{t("discount")}</Text>
              <Text>− {formatMoney(offer.discount, loc)}</Text>
            </View>
          ) : null}
          <View style={s.row}>
            <Text style={{ fontWeight: 600 }}>{t("net")}</Text>
            <Text style={{ fontWeight: 600 }}>{formatMoney(offer.net, loc)}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.muted}>{offer.reverseCharge ? t("reverseCharge") : t("vat", { rate: Math.round(offer.vatRate * 100) })}</Text>
            <Text>{formatMoney(offer.vat, loc)}</Text>
          </View>
          <View style={[s.row, s.grand]}>
            <Text>{t("total")}</Text>
            <Text>{formatMoney(offer.total, loc)}</Text>
          </View>
        </View>

        <Text style={s.notes}>{t("notes")}</Text>

        <View style={s.footer} fixed>
          <Text>
            {offer.company.name} · {offer.company.address}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `${offer.number} · ${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export function renderOfferPdf(offer: Offer): Promise<Buffer> {
  return renderToBuffer(<OfferDocument offer={offer} />);
}
