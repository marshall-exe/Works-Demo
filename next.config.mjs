/** @type {import('next').NextConfig} */
// Static export removed so the Shams session route (app/api/shams-session) can run as a server function.
const config = {
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
};
export default config;
