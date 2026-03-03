import { PrismaClient } from "@prisma/client";

import { getUserData } from "./user-data/get-user-data";
import { RenderSvgOptions } from "./types";

const prisma = new PrismaClient();

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

    // create or update cache
    await prisma.badgeCache.upsert({
      where: {
        username: user,
      },
      create: {
        username: user,
        data: data,
      },
      update: {
        data: data,
      },
    });

    return data;
  }

  console.log("Fetching failed!. Reading from cache...");

  // try to retrieve cache value
  const cache = await prisma.badgeCache.findUnique({
    where: {
      username: user,
    },
  });

  if (cache == null) {
    return null;
  }

  return cache.data as RenderSvgOptions["data"];
}
