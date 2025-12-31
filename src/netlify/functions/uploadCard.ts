// src/netlify/functions/uploadWeeklyCard.ts
import { supabase } from "../../database/supabase";
import { getBaseUrl } from "../../utils/http";
import {
  WeeklyCardRecord,
  WeeklyCardRequest,
  WeeklyCardResponse,
  NetlifyEvent,
  NetlifyContext,
  SearchImageResponse,
} from "../types/index";

export async function handler(
  event: NetlifyEvent,
  context: NetlifyContext
): Promise<{ statusCode: number; body: string }> {
  try {
    // Only allow POST requests
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({
          error: "Method Not Allowed",
        } as WeeklyCardResponse),
      };
    }

    // Parse the request body
    const requestData: WeeklyCardRequest = JSON.parse(event.body!);
    const record: WeeklyCardRecord = requestData.record;

    // Validate required fields
    if (
      !record.episode ||
      !record.name ||
      !record.title ||
      !record.quote ||
      !record.detail
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Missing required fields",
          missingFields: getMissingFields(record),
        } as WeeklyCardResponse),
      };
    }

    // Call searchImage function to get images based on the detail content
    const searchResponse: Response = await fetch(
      `${getBaseUrl()}/.netlify/functions/searchImage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: record.detail }),
      }
    );

    let imagePath: string | null = null;

    if (searchResponse.ok) {
      const searchData: SearchImageResponse = await searchResponse.json();

      if (searchData.images && searchData.images.length > 0) {
        // Randomly select one of the returned images
        const randomIndex: number = Math.floor(
          Math.random() * searchData.images.length
        );
        imagePath = searchData.images[randomIndex].url;
      }
    } else {
      console.warn("Failed to fetch image, continuing without image");
    }

    // Prepare the record for Supabase
    const weeklyCardRecord = {
      episode: record.episode,
      name: record.name,
      title: record.title,
      quote: record.quote,
      detail: record.detail,
      image_path: imagePath,
      created: new Date().toISOString(),
    };

    // Insert into Supabase
    const { data, error } = await supabase
      .from("weekly_cards")
      .insert([weeklyCardRecord])
      .select();

    if (error) {
      console.error("Supabase error:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: "Failed to submit weekly card",
          details: error.message,
        } as WeeklyCardResponse),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Weekly card submitted successfully",
        id: data[0].id,
      } as WeeklyCardResponse),
    };
  } catch (error: any) {
    console.error("Function error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: "Internal Server Error",
        message: error.message,
      } as WeeklyCardResponse),
    };
  }
}

// Helper function to identify missing fields
function getMissingFields(record: WeeklyCardRecord): string[] {
  const requiredFields: string[] = [
    "episode",
    "name",
    "title",
    "quote",
    "detail",
  ];
  return requiredFields.filter(
    (field: string) => !record[field as keyof WeeklyCardRecord]
  );
}
