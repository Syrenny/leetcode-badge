import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetUserData, mockRedisSet, mockRedisGet } = vi.hoisted(() => ({
    mockGetUserData: vi.fn(),
    mockRedisSet: vi.fn(),
    mockRedisGet: vi.fn(),
}));

vi.mock("./user-data/get-user-data", () => ({
    getUserData: (...args: unknown[]) => mockGetUserData(...args),
}));

vi.mock("./redis", () => ({
    redis: {
        set: (...args: unknown[]) => mockRedisSet(...args),
        get: (...args: unknown[]) => mockRedisGet(...args),
    },
}));

import { retrieveUserData } from "./data-retriever";

const validData = {
    totalQuestions: 3000,
    totalSolved: 150,
    totalEasy: 800,
    easySolved: 50,
    totalMedium: 1200,
    mediumSolved: 70,
    totalHard: 1000,
    hardSolved: 30,
};

beforeEach(() => {
    mockGetUserData.mockReset();
    mockRedisSet.mockReset();
    mockRedisGet.mockReset();
});

describe("retrieveUserData", () => {
    it("returns fresh data and caches it with TTL on success", async () => {
        mockGetUserData.mockResolvedValue({ success: true, data: validData });
        mockRedisSet.mockResolvedValue("OK");

        const result = await retrieveUserData("user1");

        expect(result).toEqual(validData);
        expect(mockRedisSet).toHaveBeenCalledWith("badge:user1", validData, {
            ex: 43200,
        });
    });

    it("returns fresh data even when cache write fails", async () => {
        mockGetUserData.mockResolvedValue({ success: true, data: validData });
        mockRedisSet.mockRejectedValue(new Error("Redis connection lost"));

        const result = await retrieveUserData("user1");

        expect(result).toEqual(validData);
    });

    it("falls back to cache when fetch fails", async () => {
        mockGetUserData.mockRejectedValue(new Error("LeetCode API down"));
        mockRedisGet.mockResolvedValue(validData);

        const result = await retrieveUserData("user1");

        expect(result).toEqual(validData);
    });

    it("returns null when fetch fails and no cache exists", async () => {
        mockGetUserData.mockRejectedValue(new Error("LeetCode API down"));
        mockRedisGet.mockResolvedValue(null);

        const result = await retrieveUserData("user1");

        expect(result).toBeNull();
    });

    it("returns null when fetch fails and cache read fails", async () => {
        mockGetUserData.mockRejectedValue(new Error("LeetCode API down"));
        mockRedisGet.mockRejectedValue(new Error("Redis connection lost"));

        const result = await retrieveUserData("user1");

        expect(result).toBeNull();
    });

    it("returns null when cache contains invalid data", async () => {
        mockGetUserData.mockRejectedValue(new Error("LeetCode API down"));
        mockRedisGet.mockResolvedValue({ garbage: "not valid" });

        const result = await retrieveUserData("user1");

        expect(result).toBeNull();
    });
});
