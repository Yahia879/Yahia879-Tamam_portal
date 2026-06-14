import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, X, FileText, Image, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFilesSelected: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  maxTotalSizeMB?: number;
  acceptedTypes?: string[];
  category?: "site_photo" | "land_deed" | "plan" | "invoice" | "other";
  label?: string;
  description?: string;
  existingFiles?: UploadedFile[];
  onRemoveFile?: (index: number) => void;
  disabled?: boolean;
  limitLabel?: string;
  maxFilesReachedLabel?: string;
}

export interface UploadedFile {
  fileName: string;
  fileData: string; // Base64
  mimeType: string;
  preview?: string;
  size: number;
  status?: "pending" | "uploading" | "success" | "error";
  errorMessage?: string;
}

const DEFAULT_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export function FileUpload({
  onFilesSelected,
  maxFiles = 5,
  maxSizeMB = 10,
  maxTotalSizeMB = 10,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  category = "other",
  label = "رفع الملفات",
  description = "اسحب الملفات هنا أو انقر للاختيار",
  existingFiles = [],
  onRemoveFile,
  disabled = false,
  limitLabel,
  maxFilesReachedLabel,
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const compressImage = (base64: string, mimeType: string): Promise<{ base64: string; size: number }> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDimension = 1200;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        // ضغط متدرج: نبدأ بجودة 0.7، ثم نقلل إذا كان الحجم لا يزال كبيراً
        const qualitySteps = [0.7, 0.5, 0.3];
        let bestBase64 = "";
        let bestSize = Infinity;

        for (const quality of qualitySteps) {
          const compressedBase64 = canvas.toDataURL("image/webp", quality);
          const justBase64 = compressedBase64.split(",")[1];
          const approxSize = Math.round((justBase64.length * 3) / 4);
          
          bestBase64 = justBase64;
          bestSize = approxSize;

          // إذا كان الحجم أقل من 2 ميجابايت، نتوقف (حجم آمن للتخزين)
          if (approxSize < 2 * 1024 * 1024) {
            break;
          }
        }
        
        resolve({ base64: bestBase64, size: bestSize });
      };
      img.src = base64;
    });
  };


  const processFile = useCallback(async (file: File): Promise<UploadedFile | null> => {
    // التحقق من نوع الملف وامتداده
    const allowedExtensions = ["jpg", "jpeg", "png", "webp", "pdf"];
    const extension = file.name.split(".").pop()?.toLowerCase() || "";

    if (!acceptedTypes.includes(file.type) || !allowedExtensions.includes(extension)) {
      return {
        fileName: file.name,
        fileData: "",
        mimeType: file.type,
        size: file.size,
        status: "error",
        errorMessage: "نوع الملف غير مسموح",
      };
    }

    // التحقق من حجم الملف (قبل الضغط)
    if (file.size > maxSizeBytes) {
      return {
        fileName: file.name,
        fileData: "",
        mimeType: file.type,
        size: file.size,
        status: "error",
        errorMessage: `حجم الملف يتجاوز ${maxSizeMB} ميجابايت`,
      };
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const originalBase64 = reader.result as string;
        let fileData = originalBase64.split(",")[1];
        let size = file.size;
        let mimeType = file.type;

        // ضغط الصور فقط
        if (file.type.startsWith("image/") && file.type !== "image/gif") {
          const compressed = await compressImage(originalBase64, file.type);
          fileData = compressed.base64;
          size = compressed.size;
          mimeType = "image/webp"; // نغير النوع إلى webp بعد الضغط
        }

        const preview = mimeType.startsWith("image/") 
          ? `data:${mimeType};base64,${fileData}` 
          : undefined;

        resolve({
          fileName: file.name.replace(/\.[^/.]+$/, "") + (file.type.startsWith("image/") ? ".webp" : ""),
          fileData: fileData,
          mimeType: mimeType,
          preview,
          size: size,
          status: "pending",
        });
      };
      reader.onerror = () => {
        resolve({
          fileName: file.name,
          fileData: "",
          mimeType: file.type,
          size: file.size,
          status: "error",
          errorMessage: "فشل في قراءة الملف",
        });
      };
      reader.readAsDataURL(file);
    });
  }, [acceptedTypes, maxSizeBytes, maxSizeMB]);

  const handleFiles = useCallback(async (fileList: FileList) => {
    if (disabled) return;
    
    setIsProcessing(true);
    const newFiles: UploadedFile[] = [];
    const remainingSlots = maxFiles - files.length;

    // حساب الحجم الإجمالي الحالي للملفات المرفوعة مسبقاً (غير الخاطئة)
    const currentTotalSize = files
      .filter(f => f.status !== "error")
      .reduce((sum, f) => sum + f.size, 0);

    let runningTotalSize = currentTotalSize;
    const maxTotalSizeBytes = maxTotalSizeMB * 1024 * 1024;

    for (let i = 0; i < Math.min(fileList.length, remainingSlots); i++) {
      const file = fileList[i];

      // فحص أولي قبل معالجة الملف
      if (runningTotalSize + file.size > maxTotalSizeBytes) {
        newFiles.push({
          fileName: file.name,
          fileData: "",
          mimeType: file.type,
          size: file.size,
          status: "error",
          errorMessage: `إجمالي حجم الملفات يتجاوز الحد الأقصى المسموح به وهو ${maxTotalSizeMB} ميجابايت`,
        });
        continue;
      }

      const processed = await processFile(file);
      if (processed) {
        if (processed.status !== "error") {
          // فحص الحجم الإجمالي بعد الضغط أو المعالجة
          if (runningTotalSize + processed.size > maxTotalSizeBytes) {
            processed.status = "error";
            processed.errorMessage = `إجمالي حجم الملفات يتجاوز الحد الأقصى المسموح به وهو ${maxTotalSizeMB} ميجابايت`;
            processed.fileData = "";
          } else {
            runningTotalSize += processed.size;
          }
        }
        newFiles.push(processed);
      }
    }

    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);
    onFilesSelected(updatedFiles.filter(f => f.status !== "error" && f.fileData));
    setIsProcessing(false);
  }, [disabled, files, maxFiles, onFilesSelected, processFile, maxTotalSizeMB]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = "";
  }, [handleFiles]);

  const removeFile = useCallback((index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesSelected(updatedFiles.filter(f => f.status !== "error" && f.fileData));
    onRemoveFile?.(index);
  }, [files, onFilesSelected, onRemoveFile]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <Image className="w-5 h-5 text-blue-500" />;
    }
    return <FileText className="w-5 h-5 text-orange-500" />;
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "uploading":
        return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const canAddMore = files.length < maxFiles && !disabled;

  return (
    <div className="space-y-4">
      {/* منطقة السحب والإفلات */}
      {canAddMore && (
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.join(",")}
            onChange={handleInputChange}
            className="hidden"
            disabled={disabled}
          />
          
          <div className="flex flex-col items-center gap-2">
            {isProcessing ? (
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            ) : (
              <Upload className="w-10 h-10 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium text-foreground">{label}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {limitLabel || `الحد الأقصى: ${maxFiles} ملفات، ${maxSizeMB} ميجابايت لكل ملف`}
            </p>
          </div>
        </div>
      )}

      {/* قائمة الملفات */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <Card
              key={`${file.fileName}-${index}`}
              className={cn(
                "p-3 flex items-center gap-3",
                file.status === "error" && "border-red-200 bg-red-50"
              )}
            >
              {/* معاينة الصورة أو أيقونة الملف */}
              <div className="flex-shrink-0">
                {file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.fileName}
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                    {getFileIcon(file.mimeType)}
                  </div>
                )}
              </div>

              {/* معلومات الملف */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                  {file.errorMessage && (
                    <span className="text-red-500 mr-2">{file.errorMessage}</span>
                  )}
                </p>
                {file.status === "uploading" && (
                  <Progress value={50} className="h-1 mt-1" />
                )}
              </div>

              {/* حالة الملف */}
              <div className="flex-shrink-0">
                {getStatusIcon(file.status)}
              </div>

              {/* زر الحذف */}
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 h-8 w-8"
                onClick={() => removeFile(index)}
                disabled={disabled || file.status === "uploading"}
              >
                <X className="w-4 h-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* رسالة عند الوصول للحد الأقصى */}
      {files.length >= maxFiles && (
        <p className="text-sm text-amber-600 text-center">
          {maxFilesReachedLabel || `تم الوصول للحد الأقصى من الملفات (${maxFiles})`}
        </p>
      )}
    </div>
  );
}

export default FileUpload;
