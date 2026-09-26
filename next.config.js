/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { formats: ["image/avif", "image/webp"] },
  async rewrites() {
    return [
      {
        // Preserves the original Express URL. The dot is escaped so it matches a
        // literal "." rather than any character.
        source: "/api/admin/registrations\\.csv",
        destination: "/api/admin/registrations-csv",
      },
    ];
  },
};
module.exports = nextConfig;
