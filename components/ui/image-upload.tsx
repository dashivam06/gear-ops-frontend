"use client"

import React, { useRef, useState } from "react"
import { Plus, Camera, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { uploadImageToCloudinary } from "@/lib/cloudinary"

interface ImageUploadProps {
  value?: string
  onChange: (value: string) => void
  label?: string
  folder?: string
  className?: string
}

export function ImageUpload({ value, onChange, label = "IMAGE", folder = "gearops_uploads", className }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      const url = await uploadImageToCloudinary(file, folder)
      onChange(url)
    } catch (error) {
      console.error("Upload failed:", error)
      alert("Failed to upload image.")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="relative">
        <div 
          className={cn(
            "size-24 rounded-full overflow-hidden border border-zinc-200 bg-zinc-100 flex items-center justify-center transition-colors",
            isUploading ? "opacity-70 cursor-not-allowed" : "cursor-pointer hover:bg-zinc-200"
          )}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          {isUploading ? (
            <Loader2 className="size-6 text-zinc-500 animate-spin" />
          ) : value ? (
            <img src={value} alt="Uploaded" className="w-full h-full object-cover" />
          ) : (
            <Camera className="size-8 text-zinc-400" />
          )}
        </div>
        <button
          type="button"
          disabled={isUploading}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className="absolute bottom-0 right-0 size-6 bg-white border border-zinc-200 rounded-full flex items-center justify-center shadow-sm hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="size-3 text-zinc-950" />
        </button>
      </div>
      {label && <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">{label}</span>}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />
    </div>
  )
}
