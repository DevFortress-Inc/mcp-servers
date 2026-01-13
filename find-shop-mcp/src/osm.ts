import { z } from "zod";

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";
// Using a public Overpass instance. In production, you might want your own or a paid one.
const OVERPASS_API_URL = "https://overpass.kumi.systems/api/interpreter";

export interface GeoLocation {
	lat: number;
	lon: number;
	display_name: string;
}

export interface OSMNode {
	id: number;
	lat: number;
	lon: number;
	tags: {
		[key: string]: string;
	};
}

// Helper to add a delay to respect API usage policies
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function geocodeLocation(
	query: string,
): Promise<GeoLocation | null> {
	try {
		const url = new URL(NOMINATIM_BASE_URL);
		url.searchParams.append("q", query);
		url.searchParams.append("format", "json");
		url.searchParams.append("limit", "1");

		// User-Agent is required by Nominatim
		const headers = {
			"User-Agent": "FastFoodMapMCPServer/1.0",
		};

		const response = await fetch(url.toString(), { headers });
		if (!response.ok) {
			console.error(
				`Nominatim API error: ${response.status} ${response.statusText}`,
			);
			return null;
		}

		const data = (await response.json()) as any[];
		if (data && data.length > 0) {
			return {
				lat: parseFloat(data[0].lat),
				lon: parseFloat(data[0].lon),
				display_name: data[0].display_name,
			};
		}
		return null;
	} catch (error) {
		console.error("Error geocoding location:", error);
		return null;
	}
}

export async function searchNearbyShops(
	lat: number,
	lon: number,
	radiusMeters: number = 5000,
	type?: string,
): Promise<OSMNode[]> {
	try {
		// Construct Overpass QL query
		// Find nodes with amenity=fast_food around the location
		let typeFilter = "";
		if (type) {
			// Case insensitive search for cuisine or name
			typeFilter = `[~"cuisine|name"~"${type}",i]`;
		}

		// Query for fast food, restaurants, cafes, etc. or specific shops if requested
		// We'll focus on fast food / food places as per the app's current theme
		const query = `
			[out:json][timeout:25];
			(
			  node["amenity"="fast_food"]${typeFilter}(around:${radiusMeters},${lat},${lon});
			  node["amenity"="restaurant"]${typeFilter}(around:${radiusMeters},${lat},${lon});
			  node["amenity"="cafe"]${typeFilter}(around:${radiusMeters},${lat},${lon});
              node["shop"]${typeFilter}(around:${radiusMeters},${lat},${lon});
			);
			out body;
			>;
			out skel qt;
		`;

		const response = await fetch(OVERPASS_API_URL, {
			method: "POST",
			body: `data=${encodeURIComponent(query)}`,
		});

		if (!response.ok) {
			console.error(
				`Overpass API error: ${response.status} ${response.statusText}`,
			);
			return [];
		}

		const data = (await response.json()) as { elements: any[] };

		return data.elements
			.filter((el) => el.type === "node" && el.tags)
			.map((el) => ({
				id: el.id,
				lat: el.lat,
				lon: el.lon,
				tags: el.tags,
			}));
	} catch (error) {
		console.error("Error fetching from Overpass API:", error);
		return [];
	}
}
