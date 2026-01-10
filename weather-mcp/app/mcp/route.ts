import { baseURL } from "@/baseUrl";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

const getAppsSdkCompatibleHtml = async (baseUrl: string, path: string) => {
  const result = await fetch(`${baseUrl}${path}`);
  return await result.text();
};

type ContentWidget = {
  id: string;
  title: string;
  templateUri: string;
  invoking: string;
  invoked: string;
  html: string;
  description: string;
  widgetDomain: string;
};

function widgetMeta(widget: ContentWidget) {
  return {
    "openai/outputTemplate": widget.templateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": false,
    "openai/resultCanProduceWidget": true,
  } as const;
}

type OpenMeteoGeocodingResponse = {
  results?: Array<{
    id?: number;
    name: string;
    latitude: number;
    longitude: number;
    elevation?: number;
    country?: string;
    country_code?: string;
    admin1?: string;
    timezone?: string;
  }>;
};

type OpenMeteoForecastResponse = {
  latitude: number;
  longitude: number;
  timezone: string;
  current?: {
    time: string;
    temperature_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  daily?: {
    time: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
  };
  current_units?: {
    temperature_2m?: string;
    wind_speed_10m?: string;
  };
};

function wmoWeatherCodeToText(code: number | undefined) {
  // https://open-meteo.com/en/docs#weathervariables
  switch (code) {
    case 0:
      return "Clear sky";
    case 1:
    case 2:
    case 3:
      return "Partly cloudy";
    case 45:
    case 48:
      return "Fog";
    case 51:
    case 53:
    case 55:
      return "Drizzle";
    case 56:
    case 57:
      return "Freezing drizzle";
    case 61:
    case 63:
    case 65:
      return "Rain";
    case 66:
    case 67:
      return "Freezing rain";
    case 71:
    case 73:
    case 75:
      return "Snow";
    case 77:
      return "Snow grains";
    case 80:
    case 81:
    case 82:
      return "Rain showers";
    case 85:
    case 86:
      return "Snow showers";
    case 95:
      return "Thunderstorm";
    case 96:
    case 99:
      return "Thunderstorm with hail";
    default:
      return "Unknown conditions";
  }
}

async function fetchJsonOrThrow<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      // Open-Meteo recommends setting a UA; some platforms may require it.
      "user-agent": "chatgpt-apps-sdk-nextjs-starter/1.0",
      accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}) for ${url}: ${text}`);
  }
  return (await res.json()) as T;
}

async function getWeatherForCity(city: string) {
  const trimmed = city.trim();
  if (!trimmed) {
    throw new Error("City is required.");
  }

  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    trimmed
  )}&count=1&language=en&format=json`;

  const geo = await fetchJsonOrThrow<OpenMeteoGeocodingResponse>(geoUrl);
  const best = geo.results?.[0];
  if (!best) {
    return {
      ok: false as const,
      error: `Couldn't find a location for "${trimmed}". Try including a country/state (e.g. "Paris, France").`,
    };
  }

  const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${best.latitude}&longitude=${best.longitude}&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
  const forecast = await fetchJsonOrThrow<OpenMeteoForecastResponse>(forecastUrl);

  const dailyIndex = 0;
  const todayHigh = forecast.daily?.temperature_2m_max?.[dailyIndex];
  const todayLow = forecast.daily?.temperature_2m_min?.[dailyIndex];
  const todayPrecipChance =
    forecast.daily?.precipitation_probability_max?.[dailyIndex];

  const locationLabel = [
    best.name,
    best.admin1,
    best.country,
  ].filter(Boolean).join(", ");

  const temp = forecast.current?.temperature_2m;
  const wind = forecast.current?.wind_speed_10m;
  const code = forecast.current?.weather_code;
  const conditions = wmoWeatherCodeToText(code);

  return {
    ok: true as const,
    data: {
      kind: "weather" as const,
      query: trimmed,
      source: "Open-Meteo (no API key)" as const,
      location: {
        name: locationLabel,
        latitude: best.latitude,
        longitude: best.longitude,
        timezone: forecast.timezone ?? best.timezone,
      },
      current: {
        time: forecast.current?.time,
        temperature: temp,
        temperatureUnit: forecast.current_units?.temperature_2m ?? "°C",
        windSpeed: wind,
        windSpeedUnit: forecast.current_units?.wind_speed_10m ?? "km/h",
        weatherCode: code,
        conditions,
      },
      today: {
        date: forecast.daily?.time?.[dailyIndex],
        high: todayHigh,
        low: todayLow,
        precipitationChance: todayPrecipChance,
        precipitationChanceUnit: "%",
      },
    },
  };
}

const handler = createMcpHandler(async (server) => {
  const html = await getAppsSdkCompatibleHtml(baseURL, "/");

  const contentWidget: ContentWidget = {
    id: "show_content",
    title: "Show Content",
    templateUri: "ui://widget/content-template.html",
    invoking: "Loading content...",
    invoked: "Content loaded",
    html: html,
    description: "Displays the homepage content",
    widgetDomain: "https://nextjs.org/docs",
  };
  server.registerResource(
    "content-widget",
    contentWidget.templateUri,
    {
      title: contentWidget.title,
      description: contentWidget.description,
      mimeType: "text/html+skybridge",
      _meta: {
        "openai/widgetDescription": contentWidget.description,
        "openai/widgetPrefersBorder": true,
      },
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/html+skybridge",
          text: `<html>${contentWidget.html}</html>`,
          _meta: {
            "openai/widgetDescription": contentWidget.description,
            "openai/widgetPrefersBorder": true,
            "openai/widgetDomain": contentWidget.widgetDomain,
          },
        },
      ],
    })
  );

  const weatherWidget: ContentWidget = {
    id: "get_weather",
    title: "Get Weather",
    templateUri: "ui://widget/weather-template.html",
    invoking: "Checking the weather...",
    invoked: "Weather updated",
    html: html,
    description: "Shows current conditions and today's forecast for a city",
    widgetDomain: "https://open-meteo.com/",
  };

  server.registerResource(
    "weather-widget",
    weatherWidget.templateUri,
    {
      title: weatherWidget.title,
      description: weatherWidget.description,
      mimeType: "text/html+skybridge",
      _meta: {
        "openai/widgetDescription": weatherWidget.description,
        "openai/widgetPrefersBorder": true,
      },
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/html+skybridge",
          text: `<html>${weatherWidget.html}</html>`,
          _meta: {
            "openai/widgetDescription": weatherWidget.description,
            "openai/widgetPrefersBorder": true,
            "openai/widgetDomain": weatherWidget.widgetDomain,
          },
        },
      ],
    })
  );

  server.registerTool(
    contentWidget.id,
    {
      title: contentWidget.title,
      description:
        "Fetch and display the homepage content with the name of the user",
      inputSchema: {
        name: z.string().describe("The name of the user to display on the homepage"),
      },
      _meta: widgetMeta(contentWidget),
    },
    async ({ name }) => {
      return {
        content: [
          {
            type: "text",
            text: name,
          },
        ],
        structuredContent: {
          name: name,
          timestamp: new Date().toISOString(),
        },
        _meta: widgetMeta(contentWidget),
      };
    }
  );

  server.registerTool(
    weatherWidget.id,
    {
      title: weatherWidget.title,
      description:
        "Get the current weather and today's forecast for a city (no API key required). Use when the user asks about weather.",
      inputSchema: {
        city: z
          .string()
          .min(1)
          .describe('City name, e.g. "San Francisco" or "Paris, France"'),
      },
      _meta: widgetMeta(weatherWidget),
    },
    async ({ city }) => {
      const result = await getWeatherForCity(city).catch((e) => ({
        ok: false as const,
        error:
          e instanceof Error ? e.message : "Failed to fetch weather for this city.",
      }));

      if (!result.ok) {
        return {
          content: [
            {
              type: "text",
              text: result.error,
            },
          ],
          structuredContent: {
            kind: "weather_error",
            query: city,
            error: result.error,
          },
          _meta: widgetMeta(weatherWidget),
        };
      }

      const d = result.data;
      const parts: string[] = [];
      parts.push(`Weather for ${d.location.name}`);
      if (d.current.temperature != null) {
        parts.push(
          `Now: ${Math.round(d.current.temperature)}${d.current.temperatureUnit} (${d.current.conditions})`
        );
      }
      if (d.today.high != null && d.today.low != null) {
        parts.push(
          `Today: H ${Math.round(d.today.high)}${d.current.temperatureUnit} / L ${Math.round(d.today.low)}${d.current.temperatureUnit}`
        );
      }
      if (d.today.precipitationChance != null) {
        parts.push(`Precip chance: ${Math.round(d.today.precipitationChance)}%`);
      }

      return {
        content: [
          {
            type: "text",
            text: parts.join("\n"),
          },
        ],
        structuredContent: d,
        _meta: widgetMeta(weatherWidget),
      };
    }
  );
});

export const GET = handler;
export const POST = handler;
