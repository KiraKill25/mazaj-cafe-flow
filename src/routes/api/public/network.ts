import { createFileRoute } from "@tanstack/react-router";

// Returns this PC's local Wi-Fi/LAN IPv4 address so the register can build the waiter QR code automatically.
// Only private network addresses are returned; nothing leaves the shop network.
const SKIP = /(vethernet|virtual|vmware|vbox|wsl|docker|hyper-v|loopback|bluetooth|tailscale|zerotier|hamachi)/i;
const PREFER = /(wi-?fi|wlan|wireless|wl)/i;
const isPrivate = (ip: string) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);

export const Route = createFileRoute("/api/public/network")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        let ips: string[] = [];
        try {
          const os = await import("node:os");
          const found: { name: string; ip: string }[] = [];
          for (const [name, list] of Object.entries(os.networkInterfaces())) {
            if (SKIP.test(name)) continue;
            for (const a of list ?? []) if (a.family === "IPv4" && !a.internal && isPrivate(a.address)) found.push({ name, ip: a.address });
          }
          found.sort((a, b) => Number(PREFER.test(b.name)) - Number(PREFER.test(a.name)) || Number(b.ip.startsWith("192.168.")) - Number(a.ip.startsWith("192.168.")));
          ips = found.map((f) => f.ip);
        } catch { /* not running on a PC (no network access) */ }
        const port = new URL(request.url).port;
        return Response.json({ ips, port }, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
