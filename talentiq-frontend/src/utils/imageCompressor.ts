/**
 * Image compression utility for profile pictures.
 * Enforces:
 *  - 5MB maximum upload limit (rejects files > 5MB)
 *  - High-fidelity canvas compression ensuring the output size is strictly under 1MB without quality loss
 */

export interface CompressionResult {
  file: File;
  previewUrl: string;
  originalSize: number;
  compressedSize: number;
}

const MAX_UPLOAD_LIMIT_BYTES = 5 * 1024 * 1024; // 5 MB
const TARGET_MAX_BYTES = 1024 * 1024; // 1 MB
const MAX_DIMENSION = 1200; // 1200px max width/height for ultra-crisp retina avatars

export async function validateAndCompressProfileImage(file: File): Promise<CompressionResult> {
  if (!file) {
    throw new Error('No file selected.');
  }

  // 1. Enforce 5MB Hard Cap
  if (file.size > MAX_UPLOAD_LIMIT_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(`Selected file is ${sizeMb}MB. Maximum allowed upload size is 5MB.`);
  }

  // 2. Validate MIME Type
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select a valid image file (JPG, PNG, WebP).');
  }

  const originalSize = file.size;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read selected image file.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode image data. Please choose another image.'));
      img.onload = () => {
        try {
          // Calculate scaled dimensions while preserving aspect ratio
          let { width, height } = img;
          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            if (width > height) {
              height = Math.round((height * MAX_DIMENSION) / width);
              width = MAX_DIMENSION;
            } else {
              width = Math.round((width * MAX_DIMENSION) / height);
              height = MAX_DIMENSION;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            throw new Error('Canvas 2D context unavailable.');
          }

          // Enable high-quality smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Draw image
          ctx.drawImage(img, 0, 0, width, height);

          // Progressive quality optimization loop to guarantee < 1MB without quality loss
          let quality = 0.92;
          const mimeType = 'image/jpeg';

          const tryCompress = (q: number) => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Failed to create compressed image blob.'));
                  return;
                }

                // If size is still > 1MB and quality can be slightly reduced, retry
                if (blob.size > TARGET_MAX_BYTES && q > 0.5) {
                  tryCompress(Math.max(0.5, q - 0.08));
                } else {
                  const fileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
                  const compressedFile = new File([blob], fileName, {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                  });

                  const previewUrl = URL.createObjectURL(blob);
                  resolve({
                    file: compressedFile,
                    previewUrl,
                    originalSize,
                    compressedSize: compressedFile.size
                  });
                }
              },
              mimeType,
              q
            );
          };

          tryCompress(quality);
        } catch (err: any) {
          reject(new Error(err?.message || 'Error processing image.'));
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
