import { PYRAMID_CONFIG } from "@/lib/config/pyramid";

export function advisorWhatsAppUrl(message: string) {
  const phone = PYRAMID_CONFIG.advisorWhatsApp.replace(/[^\d]/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
