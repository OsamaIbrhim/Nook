import { Readable } from 'node:stream';
import cloudinary from '../config/cloudinary.js';

export function uploadBuffer(buffer, folder = 'ecommerce/products') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image', transformation: [{ width: 1200, height: 1200, crop: 'limit' }, { quality: 'auto', fetch_format: 'auto' }] },
      (error, result) => error ? reject(error) : resolve(result)
    );
    Readable.from(buffer).pipe(stream);
  });
}

export async function deleteCloudinaryImages(images = []) {
  await Promise.allSettled(images.filter((i) => i.publicId).map((i) => cloudinary.uploader.destroy(i.publicId)));
}
