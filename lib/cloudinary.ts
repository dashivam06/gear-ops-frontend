const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "duiymmlq4";
const CLOUDINARY_UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "corerouter_uploads";

type CloudinaryUploadResponse = {
  secure_url?: string;
  url?: string;
  error?: {
    message?: string;
  };
};

export async function uploadImageToCloudinary(
  file: File,
  folder: string
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are supported.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", folder);

  let response: Response;
  try {
    response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );
  } catch {
    throw new Error("Unable to upload image right now. Please try again.");
  }

  const payload = (await response.json()) as CloudinaryUploadResponse;
  if (!response.ok) {
    throw new Error(payload?.error?.message || "Image upload failed.");
  }

  const uploadedUrl = payload.secure_url || payload.url;
  if (!uploadedUrl) {
    throw new Error("Image upload failed. Missing uploaded URL.");
  }

  return uploadedUrl;
}
