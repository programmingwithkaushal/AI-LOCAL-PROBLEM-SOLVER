const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'solvit-problems', // Dynamic folder as specified
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    public_id: (req, file) => `problem_${Date.now()}_${Math.random().toString(36).substring(7)}`
  }
});

module.exports = { cloudinary, storage };
