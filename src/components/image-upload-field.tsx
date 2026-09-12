import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "script-images";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

async function uploadOne(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, TEN_YEARS);
  if (signError || !data?.signedUrl) throw new Error(signError?.message ?? "Could not link image");
  return data.signedUrl;
}

export function ImageUploadField({
  label,
  hint,
  multiple = false,
  values,
  onChange,
}: {
  label: string;
  hint?: string;
  multiple?: boolean;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const picked = multiple ? Array.from(files) : [files[0]!];
      const urls: string[] = [];
      for (const file of picked) {
        urls.push(await uploadOne(file));
      }
      onChange(multiple ? [...values, ...urls] : urls);
      toast.success(urls.length > 1 ? `${urls.length} images uploaded` : "Image uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="text-sm text-muted-foreground">
      <p>{label}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground/70">{hint}</p>}

      <div className="mt-2 flex flex-wrap gap-3">
        {values.filter(Boolean).map((url) => (
          <div
            key={url}
            className="relative size-24 overflow-hidden rounded-lg border border-border bg-surface"
          >
            <img src={url} alt="" className="size-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(values.filter((value) => value !== url))}
              aria-label="Remove image"
              className="absolute right-1 top-1 rounded-md bg-background/80 p-1 text-muted-foreground hover:text-destructive"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex size-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary/50 hover:text-primary disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
          {busy ? "Uploading" : "Add image"}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={(event) => void handleFiles(event.target.files)}
        className="sr-only"
      />
    </div>
  );
}
