'use server';

import { z } from 'zod';
import { ai } from '@/ai/genkit';

// Define the input schema for the flow
const FetchPlaceDetailsInputSchema = z.object({
  placeId: z.string().min(1, "معرّف المكان مطلوب."),
});
export type FetchPlaceDetailsInput = z.infer<typeof FetchPlaceDetailsInputSchema>;

// Define the output schema, similar to a Branch but with all fields optional
const FetchedBranchDetailsSchema = z.object({
    name: z.string().optional(),
    city: z.string().optional(),
    district: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    google_maps_url: z.string().url().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
});
export type FetchedBranchDetails = z.infer<typeof FetchedBranchDetailsSchema>;

// The main exported function
export async function fetchPlaceDetails(input: FetchPlaceDetailsInput): Promise<FetchedBranchDetails> {
  return fetchPlaceDetailsFlow(input);
}

// Define the Genkit flow
const fetchPlaceDetailsFlow = ai.defineFlow(
  {
    name: 'fetchPlaceDetailsFlow',
    inputSchema: FetchPlaceDetailsInputSchema,
    outputSchema: FetchedBranchDetailsSchema,
  },
  async ({ placeId }) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error("لم يتم تعيين مفتاح Google Maps API في متغيرات البيئة.");
    }

    try {
      const fields = 'id,displayName,formattedAddress,nationalPhoneNumber,location,googleMapsUri,addressComponents';
      const detailsUrl = `https://places.googleapis.com/v1/places/${placeId}?fields=${fields}&key=${apiKey}&languageCode=ar`;
      
      const detailsResponse = await fetch(detailsUrl);

      if (!detailsResponse.ok) {
        const errorText = await detailsResponse.text();
        console.error("Google Places API error response:", errorText);
        throw new Error(`فشلت استجابة Google Places API: ${detailsResponse.statusText}`);
      }

      const place = await detailsResponse.json();

      if (place.error) {
        console.error("Google Places API error:", place.error);
        throw new Error(place.error.message || 'حدث خطأ من Google Places API.');
      }
      
      if (!place || Object.keys(place).length === 0) {
        return {};
      }
      
      let city = '';
      let district = '';

      if (Array.isArray(place.addressComponents)) {
          place.addressComponents.forEach((component: any) => {
              if (component.types?.includes('locality')) {
                  city = component.longText || '';
              }
              if (component.types?.includes('sublocality_level_1') || component.types?.includes('neighborhood')) {
                  if (!district) district = component.longText || '';
              }
          });
      }
      
      const result: FetchedBranchDetails = {
        name: place.displayName?.text || undefined,
        address: place.formattedAddress || undefined,
        phone: place.nationalPhoneNumber || undefined,
        latitude: place.location?.latitude || undefined,
        longitude: place.location?.longitude || undefined,
        google_maps_url: place.googleMapsUri || undefined,
        city: city || undefined,
        district: district || undefined,
      };

      Object.keys(result).forEach(key => (result as any)[key] === undefined && delete (result as any)[key]);

      return result;
    } catch (error: any) {
        console.error("Error in fetchPlaceDetailsFlow:", error);
        throw new Error(error.message || 'حدث خطأ غير متوقع أثناء جلب البيانات.');
    }
  }
);
