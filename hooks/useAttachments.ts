import { useState, useRef, useCallback, useMemo } from "react";
import { looksLikeImageUrl } from "../lib/imageUtils";

const MAX_ATTACHMENTS = 4;
const MAX_FILE_MB = 10;
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

export interface Attachment {
  id: string;
  preview: string;
  url?: string;
  status: "uploading" | "done" | "error";
  name: string;
}

const localId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadToCloudinary(file: File): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Cloudinary config missing");
  }
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: form },
  );
  if (!res.ok) throw new Error("Cloudinary upload failed");
  const data = await res.json();
  return (data.secure_url as string).replace(
    "/upload/",
    "/upload/f_auto,q_auto/",
  );
}

export function useAttachments() {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = useCallback((id: string, patch: Partial<Attachment>) => {
    setAttachments((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => setAttachments([]), []);

  const addFileArray = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      const slots = Math.max(0, MAX_ATTACHMENTS - attachments.length);
      const picked = files.slice(0, slots);

      for (const file of picked) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > MAX_FILE_MB * 1024 * 1024) continue;

        const id = localId();
        let preview = "";
        try {
          preview = await readFileAsDataURL(file);
        } catch {
          /* ignore preview error */
        }

        setAttachments((prev) => [
          ...prev,
          {
            id,
            preview,
            status: "uploading",
            name: file.name || "pasted-image",
          },
        ]);

        uploadToCloudinary(file)
          .then((url) => update(id, { url, status: "done" }))
          .catch(() => update(id, { status: "error" }));
      }
    },
    [attachments.length, update],
  );

  const addFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      await addFileArray(Array.from(files));
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [addFileArray],
  );

  const addImageUrl = useCallback((url: string): boolean => {
    const clean = url.trim();
    if (!clean || !looksLikeImageUrl(clean)) return false;

    let accepted = false;
    setAttachments((prev) => {
      if (prev.length >= MAX_ATTACHMENTS) return prev;
      if (prev.some((a) => a.url === clean)) return prev;
      accepted = true;
      return [
        ...prev,
        {
          id: localId(),
          preview: clean,
          url: clean,
          status: "done",
          name: "pasted-url",
        },
      ];
    });
    return accepted;
  }, []);

  const uploading = attachments.some((item) => item.status === "uploading");

  const readyUrls = useMemo(
    () =>
      attachments
        .filter((item) => item.status === "done" && item.url)
        .map((item) => item.url as string),
    [attachments],
  );

  return {
    attachments,
    fileInputRef,
    addFiles,
    addFileArray,
    addImageUrl,
    remove,
    clear,
    uploading,
    readyUrls,
    MAX_ATTACHMENTS,
  };
}
