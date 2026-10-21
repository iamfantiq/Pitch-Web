"use client";

import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";

type UploadError = "too_large" | "type" | "unavailable" | "generic";

interface Props {
  uploadId: string | null;
  onChange: (uploadId: string | null) => void;
}

export function LogoUpload({ uploadId, onChange }: Props) {
  const t = useTranslations("configurator.logo");
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<UploadError | null>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { id?: string; filename?: string; error?: string };
      if (!res.ok || !data.id) {
        setError((["too_large", "type", "unavailable"] as const).find((e) => e === data.error) ?? "generic");
        return;
      }
      setName(data.filename ?? file.name);
      onChange(data.id);
    } catch {
      setError("generic");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const linkClass = "text-sm text-accent hover:underline underline-offset-4 min-h-11 px-1";

  return (
    <div className="rounded-2xl border border-dashed border-line bg-white px-4 py-4">
      <p className="text-sm font-medium">{t("label")}</p>
      <p className="mt-0.5 text-xs text-muted">{t("hint")}</p>
      <input
        ref={input}
        id={inputId}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.svg,.pdf,.ai,.eps"
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        {uploadId ? (
          <>
            <span className="text-sm text-accent">✓ {name ? t("uploaded", { name }) : t("attached")}</span>
            <label htmlFor={inputId} className={`${linkClass} flex cursor-pointer items-center`}>
              {t("replace")}
            </label>
            <button type="button" className={linkClass} onClick={() => onChange(null)}>
              {t("remove")}
            </button>
          </>
        ) : (
          <label
            htmlFor={inputId}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-ink px-5 text-sm font-medium hover:bg-surface has-[:focus-visible]:ring-2"
          >
            {busy ? t("uploading") : t("upload")}
          </label>
        )}
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {t(`errors.${error}`)}
        </p>
      ) : null}
    </div>
  );
}
