import { retrieveUserData } from "@/utils/data-retriever";
import { rateLimiter } from "@/utils/rate-limiter";
import { renderSvg } from "@/utils/svg-renderer";
import { Themes } from "@/utils/themes";

export async function GET(
    request: Request,
    { params }: { params: { user: string } },
) {
    try {
        const user = params.user;

        const { success } = await rateLimiter.limit(user);
        if (!success) {
            return new Response("Rate limit exceeded. Try again later.", {
                status: 429,
                headers: { "Retry-After": "60" },
            });
        }

        const { searchParams } = new URL(request.url);
        const themeName = searchParams.get("theme") ?? "";
        const theme = Themes[themeName] ?? Themes["light"];
        const bgColor = searchParams.get("bgColor");
        const data = await retrieveUserData(user);

        if (data == null) {
            return new Response("User not found or service unavailable", {
                status: 404,
            });
        }

        const svg = renderSvg({
            data: data,
            theme: theme,
            bgColor: bgColor != null ? `#${bgColor}` : undefined,
        });

        return new Response(svg, {
            status: 200,
            headers: {
                "Content-Type": "image/svg+xml",
                "Cache-Control": "max-age=3600",
                "CDN-Cache-Control": "max-age=3600",
                "Vercel-CDN-Cache-Control": "max-age=3600",
            },
        });
    } catch (error) {
        console.error("Badge generation failed", error);
        return new Response("Internal server error", { status: 500 });
    }
}
