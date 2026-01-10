"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useWidgetProps,
  useMaxHeight,
  useDisplayMode,
  useRequestDisplayMode,
  useIsChatGptApp,
  useSendMessage,
} from "./hooks";

type WeatherStructuredContent =
  | {
      kind: "weather";
      query: string;
      source: string;
      location: {
        name: string;
        latitude: number;
        longitude: number;
        timezone?: string;
      };
      current: {
        time?: string;
        temperature?: number;
        temperatureUnit?: string;
        windSpeed?: number;
        windSpeedUnit?: string;
        weatherCode?: number;
        conditions?: string;
      };
      today: {
        date?: string;
        high?: number;
        low?: number;
        precipitationChance?: number;
        precipitationChanceUnit?: string;
      };
    }
  | {
      kind: "weather_error";
      query: string;
      error: string;
    };

function formatLocalTime(iso: string | undefined) {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function wmoWeatherCodeToText(code: number | undefined) {
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

async function fetchWeatherOpenMeteo(city: string): Promise<WeatherStructuredContent> {
  const trimmed = city.trim();
  if (!trimmed) {
    return { kind: "weather_error", query: city, error: "City is required." };
  }

  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      trimmed
    )}&count=1&language=en&format=json`;
    const geoRes = await fetch(geoUrl, { cache: "no-store" });
    if (!geoRes.ok) {
      return {
        kind: "weather_error",
        query: trimmed,
        error: `Geocoding failed (${geoRes.status}).`,
      };
    }
    const geo = (await geoRes.json()) as {
      results?: Array<{
        name: string;
        latitude: number;
        longitude: number;
        country?: string;
        admin1?: string;
        timezone?: string;
      }>;
    };
    const best = geo.results?.[0];
    if (!best) {
      return {
        kind: "weather_error",
        query: trimmed,
        error: `Couldn't find a location for "${trimmed}". Try including a country/state (e.g. "Paris, France").`,
      };
    }

    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${best.latitude}&longitude=${best.longitude}&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
    const fcRes = await fetch(forecastUrl, { cache: "no-store" });
    if (!fcRes.ok) {
      return {
        kind: "weather_error",
        query: trimmed,
        error: `Forecast failed (${fcRes.status}).`,
      };
    }
    const fc = (await fcRes.json()) as {
      timezone?: string;
      current?: {
        time?: string;
        temperature_2m?: number;
        weather_code?: number;
        wind_speed_10m?: number;
      };
      daily?: {
        time?: string[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        precipitation_probability_max?: number[];
      };
      current_units?: { temperature_2m?: string; wind_speed_10m?: string };
    };

    const locationLabel = [best.name, best.admin1, best.country]
      .filter(Boolean)
      .join(", ");

    const code = fc.current?.weather_code;
    return {
      kind: "weather",
      query: trimmed,
      source: "Open-Meteo (no API key)",
      location: {
        name: locationLabel,
        latitude: best.latitude,
        longitude: best.longitude,
        timezone: fc.timezone ?? best.timezone,
      },
      current: {
        time: fc.current?.time,
        temperature: fc.current?.temperature_2m,
        temperatureUnit: fc.current_units?.temperature_2m ?? "°C",
        windSpeed: fc.current?.wind_speed_10m,
        windSpeedUnit: fc.current_units?.wind_speed_10m ?? "km/h",
        weatherCode: code,
        conditions: wmoWeatherCodeToText(code),
      },
      today: {
        date: fc.daily?.time?.[0],
        high: fc.daily?.temperature_2m_max?.[0],
        low: fc.daily?.temperature_2m_min?.[0],
        precipitationChance: fc.daily?.precipitation_probability_max?.[0],
        precipitationChanceUnit: "%",
      },
    };
  } catch (e) {
    return {
      kind: "weather_error",
      query: trimmed,
      error: e instanceof Error ? e.message : "Failed to fetch weather.",
    };
  }
}

function extractWeatherStructuredContent(
  toolOutput: unknown
): WeatherStructuredContent | undefined {
  const asObj = toolOutput as Record<string, unknown> | null | undefined;
  if (!asObj) return undefined;

  // Common shapes observed in Apps SDK widgets:
  // 1) { result: { structuredContent: {...} } }
  // 2) { structuredContent: {...} }
  // 3) toolOutput itself is the structured content
  const candidates: unknown[] = [
    (asObj as any)?.result?.structuredContent,
    (asObj as any)?.structuredContent,
    asObj,
  ];

  for (const c of candidates) {
    const kind = (c as any)?.kind;
    if (kind === "weather" || kind === "weather_error") {
      return c as WeatherStructuredContent;
    }
  }

  return undefined;
}

function WeatherCard({ weather }: { weather: WeatherStructuredContent }) {
  if (weather.kind === "weather_error") {
    return (
      <div className="w-full rounded-2xl border-2 border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <svg className="w-6 h-6 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div className="text-lg font-bold text-rose-900 dark:text-rose-100">
            Weather lookup failed
          </div>
        </div>
        <div className="text-sm text-rose-800 dark:text-rose-200">
          {weather.error}
        </div>
      </div>
    );
  }

  const tempUnit = weather.current.temperatureUnit ?? "°C";
  const windUnit = weather.current.windSpeedUnit ?? "km/h";
  const nowTemp =
    weather.current.temperature != null
      ? `${Math.round(weather.current.temperature)}${tempUnit}`
      : undefined;
  const nowWind =
    weather.current.windSpeed != null
      ? `${Math.round(weather.current.windSpeed)} ${windUnit}`
      : undefined;
  const nowTime = formatLocalTime(weather.current.time);
  const todayHigh =
    weather.today.high != null ? `${Math.round(weather.today.high)}${tempUnit}` : undefined;
  const todayLow =
    weather.today.low != null ? `${Math.round(weather.today.low)}${tempUnit}` : undefined;
  const precip =
    weather.today.precipitationChance != null
      ? `${Math.round(weather.today.precipitationChance)}${weather.today.precipitationChanceUnit ?? "%"}`
      : undefined;

  return (
    <div className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 backdrop-blur p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-6 mb-6">
        <div className="min-w-0 flex-1">
          <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1 truncate">
            {weather.location.name}
          </div>
          <div className="text-base text-slate-600 dark:text-slate-300 mb-1">
            {weather.current.conditions ?? "Current conditions"}
          </div>
          {nowTime && (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {nowTime}
            </div>
          )}
        </div>

        <div className="text-right flex-shrink-0">
          <div className="text-5xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">
            {nowTemp ?? "—"}
          </div>
          <div className="flex items-center justify-end gap-1.5 text-slate-600 dark:text-slate-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            <span className="text-sm font-medium">{nowWind ?? "—"}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 border border-orange-200 dark:border-orange-800/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
            <div className="text-xs font-semibold text-orange-700 dark:text-orange-300 uppercase tracking-wide">
              High
            </div>
          </div>
          <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
            {todayHigh ?? "—"}
          </div>
        </div>
        
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
            <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
              Low
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {todayLow ?? "—"}
          </div>
        </div>
        
        <div className="rounded-xl bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-950/30 dark:to-cyan-900/30 border border-cyan-200 dark:border-cyan-800/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
            </svg>
            <div className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 uppercase tracking-wide">
              Rain
            </div>
          </div>
          <div className="text-2xl font-bold text-cyan-900 dark:text-cyan-100">
            {precip ?? "—"}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Data from {weather.source}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const toolOutput = useWidgetProps<Record<string, unknown>>({});
  const maxHeight = useMaxHeight() ?? undefined;
  const displayMode = useDisplayMode();
  const requestDisplayMode = useRequestDisplayMode();
  const isChatGptApp = useIsChatGptApp();
  const sendMessage = useSendMessage();

  const weather = useMemo(
    () => extractWeatherStructuredContent(toolOutput),
    [toolOutput]
  );
  const [localWeather, setLocalWeather] = useState<WeatherStructuredContent | null>(
    null
  );
  const effectiveWeather = weather ?? localWeather ?? undefined;

  const [city, setCity] = useState("");
  const [pendingCity, setPendingCity] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingCity) return;
    if (!effectiveWeather) return;
    if (effectiveWeather.query?.toLowerCase?.() === pendingCity.toLowerCase()) {
      setPendingCity(null);
    }
  }, [pendingCity, effectiveWeather]);

  async function requestWeather() {
    const trimmed = city.trim();
    if (!trimmed) return;
    setRequestError(null);
    setPendingCity(trimmed);
    setLocalWeather(null);

    try {
      if (isChatGptApp) {
        await sendMessage(
          `Check the weather for "${trimmed}". Use the get_weather tool with {"city":"${trimmed.replaceAll(
            '"',
            '\\"'
          )}"} and show the result.`
        );
      } else {
        const w = await fetchWeatherOpenMeteo(trimmed);
        setLocalWeather(w);
        setPendingCity(null);
      }
    } catch (e) {
      setPendingCity(null);
      setRequestError(
        e instanceof Error ? e.message : "Failed to request weather."
      );
    }
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950"
      style={{
        maxHeight,
        height: displayMode === "fullscreen" ? maxHeight : undefined,
      }}
    >
      {displayMode !== "fullscreen" && (
        <button
          aria-label="Enter fullscreen"
          className="fixed top-4 right-4 z-50 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-lg ring-1 ring-slate-900/10 dark:ring-white/10 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          onClick={() => requestDisplayMode("fullscreen")}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
            />
          </svg>
        </button>
      )}

      <main className="container mx-auto px-4 py-12 sm:py-20 max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
            Weather App
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            Get real-time weather information for any city
          </p>
        </div>

        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-3.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all text-base"
                placeholder='Enter city name (e.g. "London" or "Paris, France")'
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") requestWeather();
                }}
              />
            </div>
            <button
              className="rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-8 py-3.5 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 disabled:shadow-none text-base"
              disabled={!city.trim() || pendingCity != null}
              onClick={requestWeather}
            >
              {pendingCity ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Loading...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search
                </span>
              )}
            </button>
          </div>
          {requestError && (
            <div className="mt-3 text-sm text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {requestError}
            </div>
          )}
        </div>

        {effectiveWeather ? (
          <WeatherCard weather={effectiveWeather} />
        ) : (
          <div className="text-center py-14">
            <svg className="w-20 h-20 mx-auto text-slate-300 dark:text-slate-700 mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
            </svg>
            <p className="text-slate-500 dark:text-slate-400 text-lg">
              Enter a city name to check the weather
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
