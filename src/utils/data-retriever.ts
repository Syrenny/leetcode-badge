import { redis } from "./redis";
import { getUserData } from "./user-data/get-user-data";
import { RenderSvgOptions } from "./types";

const CACHE_TTL_SECONDS = 43200; // 12 hours

const REQUIRED_FIELDS: (keyof RenderSvgOptions["data"])[] = [
    "totalSolved",
    "totalQuestions",
    "easySolved",
    "totalEasy",
    "mediumSolved",
    "totalMedium",
    "hardSolved",
    "totalHard",
];

function isValidData(data: unknown): data is RenderSvgOptions["data"] {
    if (data == null || typeof data !== "object") return false;
    const record = data as Record<string, unknown>;
    return REQUIRED_FIELDS.every(
        (key) => key in record && typeof record[key] === "number",
    );
}

export async function retrieveUserData(user: string) {
    let success = false;
    let data: RenderSvgOptions["data"] | null = null;

    try {
        const response = await getUserData(user);
        success = response.success;
        data = response.data;
    } catch (error) {
        console.error("Failed to fetch user data", error);
    }

    if (success && data != null) {
        console.log("Creating or updating cache value");

        try {
            await redis.set(`badge:${user}`, data, {
                ex: CACHE_TTL_SECONDS,
            });
        } catch (error) {
            console.error("Failed to update cache", error);
        }

        return data;
    }

    console.log("Fetching failed! Reading from cache...");

    try {
        const cached = await redis.get(`badge:${user}`);

        if (isValidData(cached)) {
            return cached;
        }
    } catch (error) {
        console.error("Failed to read cache", error);
    }

    return null;
}
