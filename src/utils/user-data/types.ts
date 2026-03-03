import { RenderSvgOptions } from "@/utils/types";

export type GetUserDataResponse =
    | { data: RenderSvgOptions["data"]; success: true }
    | { data: null; success: false };
