import { test, expect } from "@playwright/test";
import { abreConArmario, pestana } from "./ayuda.ts";

test("la web sale con CSP y cabeceras de seguridad", async ({ request }) => {
  const r = await request.get("/");
  const csp = r.headers()["content-security-policy"];
  expect(csp).toContain("script-src 'self'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("base-uri 'self'");
  expect(r.headers()["referrer-policy"]).toBe("no-referrer");
  expect(r.headers()["x-content-type-options"]).toBe("nosniff");
});

test("la CSP no bloquea nada al recorrer la app", async ({ page }) => {
  const avisos: string[] = [];
  page.on("console", (m) => {
    if (/content security policy/i.test(m.text())) avisos.push(m.text());
  });
  await page.addInitScript(() =>
    document.addEventListener("securitypolicyviolation", (e) =>
      console.error("Content Security Policy: " + e.violatedDirective + " " + e.blockedURI)
    )
  );
  await abreConArmario(page);
  for (const nombre of ["Armario", "Deseos", "Historial", "Análisis", "Hoy"]) await pestana(page, nombre);
  expect(avisos).toEqual([]);
});
