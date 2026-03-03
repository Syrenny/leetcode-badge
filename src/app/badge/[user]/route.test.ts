import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRetrieveUserData, mockRenderSvg, mockRateLimitLimit } = vi.hoisted(
    () => ({
        mockRetrieveUserData: vi.fn(),
        mockRenderSvg: vi.fn(),
        mockRateLimitLimit: vi.fn(),
    }),
);

vi.mock("@/utils/data-retriever", () => ({
    retrieveUserData: (...args: unknown[]) => mockRetrieveUserData(...args),
}));

vi.mock("@/utils/svg-renderer", () => ({
    renderSvg: (...args: unknown[]) => mockRenderSvg(...args),
}));

vi.mock("@/utils/rate-limiter", () => ({
    rateLimiter: {
        limit: (...args: unknown[]) => mockRateLimitLimit(...args),
    },
}));

import { GET } from "./route";

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

function makeRequest(user: string, query = "") {
    const url = `http://localhost/badge/${user}${query}`;
    const request = new Request(url);
    return { request, params: { user } };
}

beforeEach(() => {
    mockRetrieveUserData.mockReset();
    mockRenderSvg.mockReset();
    mockRateLimitLimit.mockReset();
    mockRateLimitLimit.mockResolvedValue({ success: true });
});

describe("GET /badge/[user]", () => {
    it("returns SVG for a valid user", async () => {
        mockRetrieveUserData.mockResolvedValue(validData);
        mockRenderSvg.mockReturnValue("<svg>badge</svg>");

        const { request, params } = makeRequest("validuser");
        const response = await GET(request, { params });

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("image/svg+xml");
        expect(await response.text()).toBe("<svg>badge</svg>");
    });

    it("returns error when user data is null", async () => {
        mockRetrieveUserData.mockResolvedValue(null);

        const { request, params } = makeRequest("unknown-user");
        const response = await GET(request, { params });

        expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("returns 500 when renderSvg throws instead of crashing", async () => {
        mockRetrieveUserData.mockResolvedValue(validData);
        mockRenderSvg.mockImplementation(() => {
            throw new Error("SVG rendering failed");
        });

        const { request, params } = makeRequest("validuser");
        const response = await GET(request, { params });

        expect(response.status).toBe(500);
    });

    it("returns 500 when retrieveUserData throws instead of crashing", async () => {
        mockRetrieveUserData.mockRejectedValue(
            new Error("Unexpected DB crash"),
        );

        const { request, params } = makeRequest("validuser");
        const response = await GET(request, { params });

        expect(response.status).toBe(500);
    });

    it("returns 429 when rate limited", async () => {
        mockRateLimitLimit.mockResolvedValue({ success: false });

        const { request, params } = makeRequest("spammeduser");
        const response = await GET(request, { params });

        expect(response.status).toBe(429);
        expect(response.headers.get("Retry-After")).toBe("60");
        expect(mockRetrieveUserData).not.toHaveBeenCalled();
    });

    it("rate limits by username parameter", async () => {
        mockRetrieveUserData.mockResolvedValue(validData);
        mockRenderSvg.mockReturnValue("<svg>badge</svg>");

        const { request, params } = makeRequest("someuser");
        await GET(request, { params });

        expect(mockRateLimitLimit).toHaveBeenCalledWith("someuser");
    });
});
