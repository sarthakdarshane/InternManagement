const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const missing = [];
if (!process.env.CLOUDINARY_CLOUD_NAME) missing.push('CLOUDINARY_CLOUD_NAME');
if (!process.env.CLOUDINARY_API_KEY) missing.push('CLOUDINARY_API_KEY');
if (!process.env.CLOUDINARY_API_SECRET) missing.push('CLOUDINARY_API_SECRET');

let upload;
let cloudinaryConfigured = false;

if (missing.length > 0) {
  console.warn('Cloudinary is not configured. Offer letter upload will be unavailable until CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set.');
  upload = multer({
    storage: multer.diskStorage({ destination: () => { throw new Error('Cloudinary is not configured'); } }),
    limits: { fileSize: 5 * 1024 * 1024 }
  });
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => ({
      folder: 'interntracker/offer-letters',
      // Offer letters are documents, not images: store PDFs/DOCs as raw
      // assets. Image transformations (width/height/crop) are invalid for
      // raw files and cause Cloudinary to reject PDF uploads.
      resource_type: 'raw',
      allowed_formats: ['pdf', 'doc', 'docx']
    })
  });

  upload = multer({
    storage: storage,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'));
      }
    }
  });

  cloudinaryConfigured = true;
}

module.exports = { cloudinary, upload, cloudinaryConfigured };
