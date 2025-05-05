import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // Upload file to Cloudinary
    const result = await cloudinary.uploader.upload(localFilePath, {
      resource_type: 'auto'
    });

    // Delete local file after upload
    fs.unlinkSync(localFilePath);

    //console.log("file has been uploaded successfully on cloudinary ",result.url);
    return result;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    // Clean up local file if something goes wrong
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return null;
  }
};

export { uploadOnCloudinary };
