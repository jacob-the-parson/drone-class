// Which addresses the app may reach a Pi at. Shared by the page and by the desktop
// app's main process, which lets the page reach exactly the one address it was given
// (desktop/main.ts).
//
// Only a computer on this network: a private IPv4 address (RFC 1918), this computer,
// a link-local address, or a name ending in .local, which is how a Raspberry Pi names
// itself on a home or classroom network. Only http: the bridge on the Pi does not
// serve https. Never an address on the internet.

export const PI_PORT = 8765;

export interface PiAddress {
  /** e.g. http://192.168.0.130:8765, with no path. */
  origin: string;
  host: string;
  port: number;
}

function privateIpv4(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const [a, b, c, d] = m.slice(1).map(Number);
  if ([a, b, c, d].some((n) => n > 255)) return false;
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 127 || (a === 169 && b === 254);
}

function localName(host: string): boolean {
  return host === 'localhost' || /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.local$/i.test(host);
}

/** The address typed, made whole, or the reason it is not one the app will reach. */
export function piAddress(typed: string): PiAddress | { error: string } {
  let text = typed.trim();
  if (!text) return { error: 'Type the Pi’s address, such as 192.168.0.130 or drone-pi.local.' };
  if (/^https:\/\//i.test(text)) return { error: 'The bridge on the Pi speaks http, not https. Leave out the https://.' };
  text = text.replace(/^http:\/\//i, '').replace(/\/+$/, '');
  if (text.includes('/')) return { error: 'Type only the address and, if it is not 8765, the port: no path.' };
  const m = /^([^:]+)(?::(\d{1,5}))?$/.exec(text);
  if (!m) return { error: 'That is not an address.' };
  const host = m[1].toLowerCase();
  const port = m[2] ? Number(m[2]) : PI_PORT;
  if (!Number.isInteger(port) || port < 1 || port > 65535) return { error: 'That port is not one.' };
  if (!privateIpv4(host) && !localName(host)) {
    return { error: 'Only a computer on this network: an address such as 192.168.x.x, 10.x.x.x or 172.16–31.x.x, or a name ending in .local.' };
  }
  return { origin: `http://${host}:${port}`, host, port };
}

/** True if a request's address is on the Pi at this origin. */
export function onPi(url: string, origin: string): boolean {
  return url === origin || url.startsWith(`${origin}/`);
}
