import { ImageResponse } from "next/og";
import {
    generateBlogBanner,
    generatePixelAvatar,
    generateProfileBanner,
} from "../../../src/utils/pixelAvatar";
import { LIX_LOGO } from "./lixLogo";

export const runtime = "edge";

// GitHub-style social cards on a clean white background.
//   type=profile    → real logo + avatar + name + @handle + bio (users & orgs)
//   type=collection → collection name + owning publication + description
//   type=blog       → real logo + blog banner + title + tagline + read time · authors
//
// Params: type, title, subtitle, sub, kind, avatar, cover, banner, seed, avatarSeed, readTime
//   subtitle — bio (profile) or tagline (blog)
//   sub      — @handle (profile) or author list (blog)
//   kind     — small badge ("Author Profile", "Organisation", "Collection", …)
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "blog";
    const title = (searchParams.get("title") || "Untitled").slice(0, 120);
    const subtitle = (searchParams.get("subtitle") || "").slice(0, 220);
    const sub = (searchParams.get("sub") || "").slice(0, 140);
    const kind = (searchParams.get("kind") || "").slice(0, 40);
    const readTime = (searchParams.get("readTime") || "").slice(0, 20);
    // Member+ perk: share cards drop the LixBlogs brand. Callers pass brand=0 when
    // the author/owner is on a paid tier (resolved from their `tier` in /api/resolve).
    const showBrand = searchParams.get("brand") !== "0";

    // satori can't decode WebP — force Cloudinary to deliver JPEG.
    const ogSafeImage = (url) => {
        if (!url || !/^https?:\/\//.test(url)) return "";
        if (url.includes("res.cloudinary.com")) {
            let u = url.replace(/f_webp/g, "f_jpg").replace(/f_auto/g, "f_jpg");
            if (!/f_(jpg|png)/.test(u))
                u = u.replace("/upload/", "/upload/f_jpg/");
            return u;
        }
        return url;
    };
    const avatar = ogSafeImage(searchParams.get("avatar") || "");
    const cover = ogSafeImage(searchParams.get("cover") || "");
    const banner = ogSafeImage(searchParams.get("banner") || "");
    const seed = (searchParams.get("seed") || title).slice(0, 160);
    const avatarSeed = (searchParams.get("avatarSeed") || seed).slice(0, 160);
    const defaultCover = generateBlogBanner(seed);
    const hasAvatar = !!avatar;
    const hasCover = !!cover;
    const hasBanner = !!banner;

    // Deterministic fallbacks — zero network, instant.
    // Profile banner: when a real avatar exists but no banner, tint the
    // generated banner palette to the avatar URL hash so they visually match.
    const defaultBanner = generateProfileBanner(seed, avatar || undefined);
    const defaultAvatar = generatePixelAvatar(avatarSeed);

    // Real LixBlogs logo, inlined as a data URI (see ./lixLogo). Inlining avoids a
    // request-time self-fetch, which is unreliable in the Cloudflare edge runtime
    // and was falling back to the drawn "L" in production.
    const logoSrc = LIX_LOGO;

    const INK = "#0d1117";
    const MUTED = "#57606a";
    const BORDER = "#d0d7de";
    const ACCENT = "#9b7bf7";

    const Brand = () => (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {logoSrc ? (
                <img
                    src={logoSrc}
                    width={36}
                    height={36}
                    style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                    }}
                />
            ) : (
                <div
                    style={{
                        display: "flex",
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: `linear-gradient(135deg, ${ACCENT}, #6d4fd1)`,
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: "22px",
                        fontWeight: 800,
                    }}
                >
                    L
                </div>
            )}
            <span style={{ color: INK, fontSize: "28px", fontWeight: 700 }}>
                LixBlogs
            </span>
        </div>
    );

    // Brand slot — renders the LixBlogs mark, or an empty spacer that preserves the
    // surrounding space-between layout when branding is suppressed for paid tiers.
    const BrandSlot = () =>
        showBrand ? <Brand /> : <div style={{ display: "flex" }} />;

    const initial = (title || "L").replace("@", "").charAt(0).toUpperCase();

    // ── Collection — a distinct series card using the owning publication's media ──
    if (type === "collection") {
        const bannerSrc = hasBanner ? banner : defaultBanner;
        const avatarSrc = hasAvatar ? avatar : defaultAvatar;
        const avatarRadius = hasAvatar ? "50%" : "16px";

        return new ImageResponse(
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    background: "#ffffff",
                    fontFamily: "sans-serif",
                    padding: "64px",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        width: "100%",
                        height: "100%",
                        border: `1px solid ${BORDER}`,
                        borderRadius: "28px",
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            position: "relative",
                            display: "flex",
                            width: "40%",
                            height: "100%",
                            overflow: "hidden",
                            borderRight: `1px solid ${BORDER}`,
                        }}
                    >
                        <img
                            src={bannerSrc}
                            width={430}
                            height={500}
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                            }}
                        />
                        <div
                            style={{
                                position: "absolute",
                                left: "40px",
                                bottom: "40px",
                                display: "flex",
                                width: "120px",
                                height: "120px",
                                padding: "8px",
                                borderRadius: avatarRadius,
                                background: "#ffffff",
                                border: `1px solid ${BORDER}`,
                            }}
                        >
                            <img
                                src={avatarSrc}
                                width={102}
                                height={102}
                                style={{
                                    width: "102px",
                                    height: "102px",
                                    borderRadius: avatarRadius,
                                    objectFit: "cover",
                                }}
                            />
                        </div>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            flex: 1,
                            flexDirection: "column",
                            justifyContent: "space-between",
                            padding: "42px 52px",
                        }}
                    >
                        <BrandSlot />
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                minWidth: 0,
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    color: ACCENT,
                                    fontSize: "21px",
                                    fontWeight: 700,
                                    letterSpacing: "1.5px",
                                    textTransform: "uppercase",
                                    marginBottom: "14px",
                                }}
                            >
                                {kind || "Collection"}
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    color: INK,
                                    fontSize: title.length > 28 ? "46px" : "56px",
                                    fontWeight: 800,
                                    lineHeight: 1.05,
                                }}
                            >
                                {title}
                            </div>
                            {sub ? (
                                <div
                                    style={{
                                        display: "flex",
                                        color: MUTED,
                                        fontSize: "25px",
                                        fontWeight: 600,
                                        marginTop: "14px",
                                    }}
                                >
                                    by {sub}
                                </div>
                            ) : null}
                            {subtitle ? (
                                <div
                                    style={{
                                        display: "flex",
                                        color: MUTED,
                                        fontSize: "22px",
                                        lineHeight: 1.4,
                                        marginTop: "18px",
                                    }}
                                >
                                    {subtitle}
                                </div>
                            ) : null}
                        </div>
                        <div style={{ display: "flex" }} />
                    </div>
                </div>
            </div>,
            { width: 1200, height: 630 },
        );
    }

    // ── Profile / org — always banner + always avatar + name + handle + bio ──
    if (type === "profile") {
        // Banner: real URL when available, otherwise deterministic geometric art.
        const bannerSrc = hasBanner ? banner : defaultBanner;
        // Avatar: real URL when available, otherwise the geometric avatar.
        const avatarSrc = hasAvatar ? avatar : defaultAvatar;
        // The generated avatar is square — render it with a rounded-square clip.
        const avatarRadius = hasAvatar ? "50%" : "16px";

        return new ImageResponse(
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    background: "#ffffff",
                    fontFamily: "sans-serif",
                    padding: "72px",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        width: "100%",
                        height: "100%",
                        border: `1px solid ${BORDER}`,
                        borderRadius: "28px",
                        overflow: "hidden",
                    }}
                >
                    {/* Banner strip — always present */}
                    <div
                        style={{
                            display: "flex",
                            width: "100%",
                            height: "160px",
                            flexShrink: 0,
                        }}
                    >
                        <img
                            src={bannerSrc}
                            width={1056}
                            height={160}
                            style={{
                                width: "100%",
                                height: "160px",
                                objectFit: "cover",
                            }}
                        />
                    </div>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            flex: 1,
                            padding: "32px 68px 40px",
                            justifyContent: "space-between",
                        }}
                    >
                        <BrandSlot />
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "44px",
                            }}
                        >
                            {/* Avatar — always present */}
                            <img
                                src={avatarSrc}
                                width={160}
                                height={160}
                                style={{
                                    width: "160px",
                                    height: "160px",
                                    borderRadius: avatarRadius,
                                    objectFit: "cover",
                                    border: `1px solid ${BORDER}`,
                                }}
                            />
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    flex: 1,
                                    minWidth: 0,
                                }}
                            >
                                {kind ? (
                                    <div
                                        style={{
                                            display: "flex",
                                            color: ACCENT,
                                            fontSize: "22px",
                                            fontWeight: 700,
                                            letterSpacing: "1.5px",
                                            textTransform: "uppercase",
                                            marginBottom: "12px",
                                        }}
                                    >
                                        {kind}
                                    </div>
                                ) : null}
                                <div
                                    style={{
                                        display: "flex",
                                        color: INK,
                                        fontSize:
                                            title.length > 22 ? "54px" : "66px",
                                        fontWeight: 800,
                                        lineHeight: 1.05,
                                    }}
                                >
                                    {title}
                                </div>
                                {sub ? (
                                    <div
                                        style={{
                                            display: "flex",
                                            color: MUTED,
                                            fontSize: "28px",
                                            fontWeight: 600,
                                            marginTop: "12px",
                                        }}
                                    >
                                        {sub}
                                    </div>
                                ) : null}
                                {subtitle ? (
                                    <div
                                        style={{
                                            display: "flex",
                                            color: MUTED,
                                            fontSize: "24px",
                                            marginTop: "16px",
                                            lineHeight: 1.4,
                                            maxWidth: "700px",
                                        }}
                                    >
                                        {subtitle}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                        <div style={{ display: "flex" }} />
                    </div>
                </div>
            </div>,
            { width: 1200, height: 630 },
        );
    }

    // ── Blog — logo + banner + title + tagline + read time · authors ──
    return new ImageResponse(
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                background: "#ffffff",
                fontFamily: "sans-serif",
                padding: "64px",
            }}
        >
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    width: "100%",
                    height: "100%",
                    border: `1px solid ${BORDER}`,
                    borderRadius: "28px",
                    overflow: "hidden",
                }}
            >
                {/* Banner — cover if present, else a branded default */}
                <div
                    style={{ display: "flex", width: "100%", height: "230px" }}
                >
                    {hasCover ? (
                        <img
                            src={cover}
                            width={1072}
                            height={230}
                            style={{
                                width: "100%",
                                height: "230px",
                                objectFit: "cover",
                            }}
                        />
                    ) : (
                        <img
                            src={defaultCover}
                            width={1072}
                            height={230}
                            style={{
                                width: "100%",
                                height: "230px",
                                objectFit: "cover",
                            }}
                        />
                    )}
                </div>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        flex: 1,
                        padding: "40px 56px",
                        justifyContent: "space-between",
                    }}
                >
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <div
                            style={{
                                display: "flex",
                                color: INK,
                                fontSize: title.length > 52 ? "52px" : "64px",
                                fontWeight: 800,
                                lineHeight: 1.08,
                            }}
                        >
                            {title}
                        </div>
                        {subtitle ? (
                            <div
                                style={{
                                    display: "flex",
                                    color: MUTED,
                                    fontSize: "28px",
                                    marginTop: "16px",
                                    lineHeight: 1.3,
                                    maxWidth: "960px",
                                }}
                            >
                                {subtitle}
                            </div>
                        ) : null}
                    </div>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "14px",
                                color: MUTED,
                                fontSize: "24px",
                                fontWeight: 600,
                            }}
                        >
                            {hasAvatar ? (
                                <img
                                    src={avatar}
                                    width={44}
                                    height={44}
                                    style={{
                                        width: "44px",
                                        height: "44px",
                                        borderRadius: "50%",
                                        objectFit: "cover",
                                        border: `1px solid ${BORDER}`,
                                    }}
                                />
                            ) : null}
                            <span style={{ display: "flex" }}>
                                {[readTime, sub].filter(Boolean).join("  ·  ")}
                            </span>
                        </div>
                        <BrandSlot />
                    </div>
                </div>
            </div>
        </div>,
        { width: 1200, height: 630 },
    );
}
