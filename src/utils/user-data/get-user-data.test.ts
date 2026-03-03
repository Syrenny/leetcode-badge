import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUser = vi.fn();

vi.mock("leetcode-query", () => ({
    LeetCode: class {
        user = mockUser;
    },
}));

import { getUserData } from "./get-user-data";

beforeEach(() => {
    mockUser.mockReset();
});

function mockLeetCodeUser(data: unknown) {
    mockUser.mockResolvedValue(data);
}

const validProfile = {
    matchedUser: {
        submitStats: {
            acSubmissionNum: [
                { difficulty: "All", count: 150 },
                { difficulty: "Easy", count: 50 },
                { difficulty: "Medium", count: 70 },
                { difficulty: "Hard", count: 30 },
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
        mockLeetCodeUser(validProfile);

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
        mockLeetCodeUser({
            matchedUser: null,
            allQuestionsCount: validProfile.allQuestionsCount,
        });

        const result = await getUserData("non-existent-user");

        expect(result.success).toBe(false);
        expect(result.data).toBeNull();
    });

    it("handles allQuestionsCount being null/undefined without throwing", async () => {
        mockLeetCodeUser({
            matchedUser: validProfile.matchedUser,
            allQuestionsCount: null,
        });

        const result = await getUserData("broken-profile");

        expect(result.success).toBe(false);
        expect(result.data).toBeNull();
    });

    it("handles both matchedUser and allQuestionsCount being null", async () => {
        mockLeetCodeUser({
            matchedUser: null,
            allQuestionsCount: null,
        });

        const result = await getUserData("totally-broken");

        expect(result.success).toBe(false);
        expect(result.data).toBeNull();
    });

    it("handles submitStats being null inside matchedUser", async () => {
        mockLeetCodeUser({
            matchedUser: { submitStats: null },
            allQuestionsCount: validProfile.allQuestionsCount,
        });

        const result = await getUserData("no-submissions");

        // Should still succeed — user exists, just has no submissions
        expect(result.success).toBe(true);
        expect(result.data).not.toBeNull();
        expect(result.data!.totalSolved).toBe(-1);
    });
});
