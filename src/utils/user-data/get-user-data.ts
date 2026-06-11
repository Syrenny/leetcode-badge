import { LeetCode } from "leetcode-query";

import { GetUserDataResponse } from "./types";

const LEETCODE_REQUEST_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error(`LeetCode request timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        promise.then(
            (value) => {
                clearTimeout(timeoutId);
                resolve(value);
            },
            (error) => {
                clearTimeout(timeoutId);
                reject(error);
            },
        );
    });
}

export async function getUserData(user: string): Promise<GetUserDataResponse> {
    const profile = await withTimeout(
        new LeetCode().user(user),
        LEETCODE_REQUEST_TIMEOUT_MS,
    );

    if (!profile.matchedUser || !profile.allQuestionsCount) {
        return { data: null, success: false };
    }

    const allTotal: { [difficulty: string]: number } = {};
    const userTotal: { [difficulty: string]: number } = {};

    for (const { difficulty, count } of profile.allQuestionsCount) {
        allTotal[difficulty] = count;
    }

    for (const { difficulty, count } of profile.matchedUser.submitStats
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
}
