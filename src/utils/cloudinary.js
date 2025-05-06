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
    // console.log("File uploaded to Cloudinary:", response);
    fs.unlinkSync(localFilePath); // Delete the locally saved temporary file after upload
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // Delete the locally saved temporary file if the upload fails
    console.error("Error uploading to Cloudinary:", error);
    return null; // Return null in case of an error
  }
};
/**
 * Extracts public_id from a Cloudinary URL
 */

const getPublicIdFromUrl = (url) => {
  try {
    const urlObj = new URL(url);

    console.log("urlObj", urlObj);

    const pathParts = urlObj.pathname.split("/");

    console.log("pathParts", pathParts);

    // Find index of 'upload' and slice after it
    const uploadIndex = pathParts.findIndex((p) => p === "upload");
    console.log("uploadIndex", uploadIndex);
    const publicIdWithExt = pathParts.slice(uploadIndex + 2).join("/"); // Skip version

    console.log("publicIdWithExt", publicIdWithExt);
    // Remove file extension
    const lastDotIndex = publicIdWithExt.lastIndexOf(".");

    console.log("lastDotIndex", lastDotIndex);

    const publicId =
      lastDotIndex !== -1
        ? publicIdWithExt.slice(0, lastDotIndex)
        : publicIdWithExt;

    console.log("publicId", publicId);

    return publicId; //
  } catch (err) {
    console.error("Error parsing Cloudinary URL:", err);
    return null;
  }
};

/**
 * Deletes a media file from Cloudinary using its URL
 */
const deleteFromCloudinary = async (cloudinaryUrl, resourceType = "auto") => {
  const publicId = getPublicIdFromUrl(cloudinaryUrl);

  if (!publicId) {
    console.error("Invalid Cloudinary URL. Cannot extract public_id.");
    return false;
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    if (result.result === "ok" || result.result === "not found") {
      console.log(`Cloudinary file deleted: ${publicId}`);
      return true;
    } else {
      console.error("Cloudinary delete failed:", result);
      return false;
    }
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    return false;
  }
};

export { uploadCloudinary, deleteFromCloudinary, getPublicIdFromUrl };
