import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "img.clerk.com",
			},
			{
				protocol: "https",
				hostname: "images.clerk.dev",
			},
		],
	},
	experimental: {
		serverActions: {
			allowedOrigins: ["localhost:3000", "*.railway.app", "*.up.railway.app"],
		},
	},
};

export default nextConfig;
