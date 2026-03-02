'use server';

import { z } from 'zod';
import { ai } from '@/ai/genkit';

// Input Schema
const SearchPlacesInputSchema = z.object({
  query: z.string().min(3, "يجب أن يكون الاستعلام 3 أحرف على الأقل."),
});
export type SearchPlacesInput = z.infer<typeof SearchPlacesInputSchema>;

// Output Schema
const PlaceSearchResultSchema = z.object({
    id: z.string(),
    displayName: z.string(),
    formattedAddress: z.string(),
});

const SearchPlacesOutputSchema = z.object({
    places: z.array(PlaceSearchResultSchema),
});
export type SearchPlacesOutput = z.infer<typeof SearchPlacesOutputSchema>;

// Main exported function
export async function searchPlaces(input: SearchPlacesInput): Promise<SearchPlacesOutput> {
  return searchPlacesFlow(input);
}

// Genkit Flow
const searchPlacesFlow = ai.defineFlow(
  {
    name: 'searchPlacesFlow',
    inputSchema: SearchPlacesInputSchema,
    outputSchema: SearchPlacesOutputSchema,
  },
  async ({ query }) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error("لم يتم تعيين مفتاح Google Maps API.");
    }

    try {
      const searchUrl = `https://places.googleapis.com/v1/places:searchText`;
      const response = await fetch(searchUrl, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
          },
          body: JSON.stringify({
              textQuery: query,
              languageCode: 'ar',
          })
      });
      
      const data = await response.json();
      
      if (!data.places) {
        return { places: [] };
      }
      
      return { places: data.places.map((p: any) => ({ id: p.id, displayName: p.displayName.text, formattedAddress: p.formattedAddress })) };

    } catch (error: any) {
        console.error("Error in searchPlacesFlow:", error);
        throw new Error(error.message || 'حدث خطأ غير متوقع أثناء البحث عن الأماكن.');
    }
  }
);
