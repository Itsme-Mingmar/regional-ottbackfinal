import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

// Storage for video files
const videoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'ott/videos',
      resource_type: 'video',
      allowed_formats: ['mp4', 'avi', 'mov', 'mkv', 'webm'],
      public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
    };
  },
});

// Storage for thumbnail images
const thumbnailStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'ott/thumbnails',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
    };
  },
});

// Multer upload for videos
export const uploadVideo = multer({
  storage: videoStorage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 100MB limit for videos
  },
});

// Multer upload for thumbnails
export const uploadThumbnail = multer({
  storage: thumbnailStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for thumbnails
  },
});

// Combined upload for both video and thumbnail
class CombinedStorage {
  _handleFile(req, file, cb) {
    if (file.fieldname === 'video') {
      videoStorage._handleFile(req, file, cb);
    } else if (file.fieldname === 'thumbnail') {
      thumbnailStorage._handleFile(req, file, cb);
    } else {
      cb(new Error('Invalid field name'));
    }
  }

  _removeFile(req, file, cb) {
    // Implement if needed, but Cloudinary handles this
    cb(null);
  }
}

export const uploadVideoAndThumbnail = multer({
  storage: new CombinedStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 100MB default
  },
});