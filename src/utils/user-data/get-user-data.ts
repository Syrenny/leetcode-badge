import { GetUserDataResponse } from "./types";

const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";
const LEETCODE_REQUEST_TIMEOUT_MS = 8000;
const LEETCODE_USER_AGENT = "Mozilla/5.0 LeetCode Badge";

const PROFILE_QUERY = `
    query getUserProfile($username: String!) {
        allQuestionsCount {
            difficulty
            count
        }
        matchedUser(username: $username) {
            submitStats {
                acSubmissionNum {
                    difficulty
                    count
                    submissions
                }
            }
        }
    }
`;

type LeetCodeProfileResponse = {
    data?: {
        allQuestionsCount?: Array<{ difficulty: string; count: number }> | null;
        matchedUser?:
            | {
                  submitStats?: {
                      acSubmissionNum?:
                          | Array<{
                                difficulty: string;
                                count: number;
                                submissions: number;
                            }>
                          | null;
                  } | null;
              }
            | null;
    };
};

function createTimeoutController(timeoutMs: number) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort(
            new Error(`LeetCode request timed out after ${timeoutMs}ms`),
        );
    }, timeoutMs);

    return { controller, timeoutId };
}

export async function getUserData(user: string): Promise<GetUserDataResponse> {
    const { controller, timeoutId } =
        createTimeoutController(LEETCODE_REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(LEETCODE_GRAPHQL_URL, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                origin: "https://leetcode.com",
                referer: "https://leetcode.com",
                "user-agent": LEETCODE_USER_AGENT,
            },
            body: JSON.stringify({
                operationName: "getUserProfile",
                variables: { username: user },
                query: PROFILE_QUERY,
            }),
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(
                `LeetCode request failed with ${response.status} ${response.statusText}`,
            );
        }

        const profile: LeetCodeProfileResponse = await response.json();
        const allQuestionsCount = profile.data?.allQuestionsCount;
        const matchedUser = profile.data?.matchedUser;

        if (!matchedUser || !allQuestionsCount) {
            return { data: null, success: false };
        }

        const allTotal: { [difficulty: string]: number } = {};
        const userTotal: { [difficulty: string]: number } = {};

        for (const { difficulty, count } of allQuestionsCount) {
            allTotal[difficulty] = count;
        }

        for (const { difficulty, count } of matchedUser.submitStats
            ?.acSubmissionNum ?? []) {
            userTotal[difficulty] = count;
        }

        return {
            data: {
                totalQuestions: allTotal["All"] ?? -1,
                totalSolved: userTotal["All"] ?? -1,
                totalEasy: allTotal["Easy"] ?? -1,
                easySolved: userTotal["Easy"] ?? -1,
                totalMedium: allTotal["Medium"] ?? -1,
                mediumSolved: userTotal["Medium"] ?? -1,
                totalHard: allTotal["Hard"] ?? -1,
                hardSolved: userTotal["Hard"] ?? -1,
            },
            success: true,
        };
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            const reason = controller.signal.reason;
            throw reason instanceof Error ? reason : error;
        }

        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}
