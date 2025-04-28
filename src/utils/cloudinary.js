import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
  process.env;

// Configuration
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET, // Click 'View API Keys' above to copy your API secret
});

const uploadCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) {
      console.log("No file path provided");
      return null;
    }
    // Upload the file to Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // file has been uploaded to cloudinary
    console.log("File uploaded to Cloudinary:", response?.url);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // Delete the locally saved temporary file if the upload fails
    console.error("Error uploading to Cloudinary:", error);
    throw error;
  }
};

export { uploadCloudinary };
