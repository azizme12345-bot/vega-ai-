import { ChatImage } from '../../types';

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB limit for photos, PDFs, and 5-10 min videos
const MAX_DIMENSION = 2048; // Crisp resolution for detailed documents, charts & face analysis

export class ImageProcessor {
  async processImageFile(file: File): Promise<ChatImage> {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(file.name);
    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|svg|tiff?)$/i.test(file.name);

    if (!isPdf && !isImage && !isVideo) {
      throw new Error(`Unsupported file type "${file.type || file.name}". Please upload a Photo, Screenshot, JPEG, PNG, WEBP, PDF, or Video (MP4/WebM).`);
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error('فائل کا سائز بہت بڑا ہے۔ زیادہ سے زیادہ 50MB سائز سپورٹ کیا جاتا ہے۔ (File is too large, max 50MB)');
    }

    // Process Video
    if (isVideo) {
      return this.processVideoFile(file);
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const rawDataUrl = reader.result as string;
          const cleanBase64 = rawDataUrl.includes(',') ? rawDataUrl.split(',')[1] : rawDataUrl;

          // If PDF, generate document card preview
          if (isPdf) {
            const previewUrl = this.generatePdfPreviewSvg(file.name, file.size);
            resolve({
              id: `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
              name: file.name || 'document.pdf',
              mimeType: 'application/pdf',
              data: cleanBase64,
              previewUrl,
              sizeBytes: file.size,
              mediaType: 'pdf',
            });
            return;
          }

          // If image, resize & compress for high speed while keeping crisp detail
          const compressed = await this.resizeAndCompress(rawDataUrl, file.type || 'image/jpeg');
          resolve({
            id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            name: file.name || 'photo.jpg',
            mimeType: file.type || 'image/jpeg',
            data: compressed.base64,
            previewUrl: compressed.dataUrl,
            sizeBytes: compressed.sizeBytes,
            mediaType: 'image',
          });
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file.'));
      };

      reader.readAsDataURL(file);
    });
  }

  private async processVideoFile(file: File): Promise<ChatImage> {
    return new Promise((resolve, reject) => {
      const videoUrl = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.src = videoUrl;

      let duration = 0;

      video.onloadedmetadata = () => {
        duration = Math.round(video.duration || 0);
        // Seek to 1 second or 25% of the video to capture a good thumbnail frame
        video.currentTime = Math.min(1.5, Math.max(0.5, duration * 0.1));
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          const width = Math.min(video.videoWidth || 640, 1280);
          const height = Math.round((width * (video.videoHeight || 360)) / (video.videoWidth || 640));
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
          }

          const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.85);

          // Now read file as base64
          const reader = new FileReader();
          reader.onload = () => {
            const rawDataUrl = reader.result as string;
            const cleanBase64 = rawDataUrl.includes(',') ? rawDataUrl.split(',')[1] : rawDataUrl;

            URL.revokeObjectURL(videoUrl);

            resolve({
              id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
              name: file.name || 'video.mp4',
              mimeType: file.type || 'video/mp4',
              data: cleanBase64,
              previewUrl: thumbnailDataUrl || videoUrl,
              sizeBytes: file.size,
              mediaType: 'video',
              durationSeconds: duration,
            });
          };

          reader.onerror = () => {
            URL.revokeObjectURL(videoUrl);
            reject(new Error('Failed to read video file.'));
          };

          reader.readAsDataURL(file);
        } catch (err) {
          URL.revokeObjectURL(videoUrl);
          reject(err);
        }
      };

      video.onerror = () => {
        // Fallback: Read file directly even if video element fails to decode thumbnail
        const reader = new FileReader();
        reader.onload = () => {
          const rawDataUrl = reader.result as string;
          const cleanBase64 = rawDataUrl.includes(',') ? rawDataUrl.split(',')[1] : rawDataUrl;
          URL.revokeObjectURL(videoUrl);
          resolve({
            id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            name: file.name || 'video.mp4',
            mimeType: file.type || 'video/mp4',
            data: cleanBase64,
            previewUrl: '',
            sizeBytes: file.size,
            mediaType: 'video',
            durationSeconds: 0,
          });
        };
        reader.onerror = () => {
          URL.revokeObjectURL(videoUrl);
          reject(new Error('Failed to read video file.'));
        };
        reader.readAsDataURL(file);
      };
    });
  }

  private generatePdfPreviewSvg(fileName: string, sizeBytes: number): string {
    const sizeKb = Math.round(sizeBytes / 1024);
    const sizeStr = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;
    const cleanName = (fileName || 'Document.pdf').replace(/[<>&"']/g, '');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180" viewBox="0 0 300 180" fill="none">
      <rect width="300" height="180" rx="16" fill="#1e1f20"/>
      <rect x="1" y="1" width="298" height="178" rx="15" stroke="#333538" stroke-width="2"/>
      <rect x="30" y="35" width="46" height="58" rx="8" fill="#e53935"/>
      <path d="M43 50h20v4H43zm0 10h20v4H43zm0 10h12v4H43z" fill="#fff"/>
      <text x="38" y="85" fill="#fff" font-family="sans-serif" font-size="9" font-weight="bold">PDF</text>
      <text x="90" y="58" fill="#f1f3f4" font-family="sans-serif" font-size="14" font-weight="600">${cleanName.slice(0, 20)}</text>
      <text x="90" y="78" fill="#8ab4f8" font-family="sans-serif" font-size="12">PDF Document • ${sizeStr}</text>
      <text x="30" y="130" fill="#9aa0a6" font-family="sans-serif" font-size="11">Click to view or ask AI to analyze</text>
    </svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  private resizeAndCompress(
    dataUrl: string,
    mimeType: string
  ): Promise<{ dataUrl: string; base64: string; sizeBytes: number }> {
    return new Promise((resolve) => {
      // If SVG, keep as is
      if (mimeType === 'image/svg+xml') {
        const cleanBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        resolve({ dataUrl, base64: cleanBase64, sizeBytes: cleanBase64.length });
        return;
      }

      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Downscale if exceeds max dimension
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
          const cleanBase64 = dataUrl.split(',')[1] || dataUrl;
          resolve({ dataUrl, base64: cleanBase64, sizeBytes: dataUrl.length });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Keep PNG if original is PNG, otherwise high-quality JPEG
        const targetMime = mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
        const quality = targetMime === 'image/jpeg' ? 0.88 : undefined;
        const finalDataUrl = canvas.toDataURL(targetMime, quality);
        const base64 = finalDataUrl.split(',')[1] || finalDataUrl;

        resolve({
          dataUrl: finalDataUrl,
          base64,
          sizeBytes: Math.round((base64.length * 3) / 4),
        });
      };

      img.onerror = () => {
        const cleanBase64 = dataUrl.split(',')[1] || dataUrl;
        resolve({ dataUrl, base64: cleanBase64, sizeBytes: dataUrl.length });
      };

      img.src = dataUrl;
    });
  }
}

export const imageProcessor = new ImageProcessor();
