import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getUserData } from "./get-user-data";

const mockFetch = vi.fn();

beforeEach(() => {
    vi.useRealTimers();
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

function mockLeetCodeResponse(data: unknown) {
    mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ data }),
    });
}

const validProfile = {
    matchedUser: {
        submitStats: {
            acSubmissionNum: [
                { difficulty: "All", count: 150, submissions: 200 },
                { difficulty: "Easy", count: 50, submissions: 70 },
                { difficulty: "Medium", count: 70, submissions: 95 },
                { difficulty: "Hard", count: 30, submissions: 35 },
            ],
        },
    },
    allQuestionsCount: [
        { difficulty: "All", count: 3000 },
        { difficulty: "Easy", count: 800 },
        { difficulty: "Medium", count: 1200 },
        { difficulty: "Hard", count: 1000 },
    ],
};

describe("getUserData", () => {
    it("returns data for a valid user", async () => {
        mockLeetCodeResponse(validProfile);

        const result = await getUserData("valid-user");

        expect(result.success).toBe(true);
        expect(result.data).toEqual({
            totalQuestions: 3000,
            totalSolved: 150,
            totalEasy: 800,
            easySolved: 50,
            totalMedium: 1200,
            mediumSolved: 70,
            totalHard: 1000,
            hardSolved: 30,
        });
    });

    it("handles matchedUser being null (non-existent user) without throwing", async () => {
        mockLeetCodeResponse({
            matchedUser: null,
            allQuestionsCount: validProfile.allQuestionsCount,
        });

        const result = await getUserData("non-existent-user");

        expect(result.success).toBe(false);
        expect(result.data).toBeNull();
    });

    it("handles allQuestionsCount being null/undefined without throwing", async () => {
        mockLeetCodeResponse({
            matchedUser: validProfile.matchedUser,
            allQuestionsCount: null,
        });

        const result = await getUserData("broken-profile");

        expect(result.success).toBe(false);
        expect(result.data).toBeNull();
    });

    it("handles both matchedUser and allQuestionsCount being null", async () => {
        mockLeetCodeResponse({
            matchedUser: null,
            allQuestionsCount: null,
        });

        const result = await getUserData("totally-broken");

        expect(result.success).toBe(false);
        expect(result.data).toBeNull();
    });

    it("handles submitStats being null inside matchedUser", async () => {
        mockLeetCodeResponse({
            matchedUser: { submitStats: null },
            allQuestionsCount: validProfile.allQuestionsCount,
        });

        const result = await getUserData("no-submissions");

        expect(result.success).toBe(true);
        expect(result.data).not.toBeNull();
        expect(result.data!.totalSolved).toBe(-1);
    });

    it("times out if LeetCode request never resolves", async () => {
        vi.useFakeTimers();
        mockFetch.mockImplementation(() => new Promise(() => {}));

        const resultPromise = getUserData("slow-user");
        const assertion = expect(resultPromise).rejects.toThrow(
            "LeetCode request timed out after 8000ms",
        );

        await vi.advanceTimersByTimeAsync(8000);

        await assertion;
    });
});
