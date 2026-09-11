import { z } from "zod";

/**
 * Strips dangerous HTML tags and trims whitespace to prevent Stored XSS.
 */
export function sanitizeText(val: string): string {
  return val
    .trim()
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "");
}

/**
 * Validates face photo thumbnail:
 * - Must be a valid image data URI (JPEG, PNG, WEBP) or clean HTTPS URL
 * - Maximum size 2MB (approx 2.7M base64 characters)
 */
export const thumbnailSchema = z
  .string()
  .max(2_500_000, "Photo payload exceeds 2MB limit")
  .refine(
    (val) => {
      if (!val) return true;
      // Allow valid data:image URI
      if (/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(val)) {
        return true;
      }
      // Or valid HTTPS image URL
      if (/^https:\/\/[^\s$.?#].[^\s]*$/i.test(val)) {
        return true;
      }
      return false;
    },
    { message: "Invalid image format. Must be JPEG, PNG, or WebP base64 image." }
  )
  .optional()
  .nullable();

/**
 * Validates face descriptor:
 * Must be 128 finite floating-point numbers per face angle
 */
export const descriptorSchema = z
  .array(z.number().finite())
  .length(128, "Face descriptor must contain exactly 128 embedding values");

export const descriptorsArraySchema = z
  .array(descriptorSchema)
  .min(3, "At least 3 face angles required")
  .max(8, "Maximum 8 face angles allowed");
