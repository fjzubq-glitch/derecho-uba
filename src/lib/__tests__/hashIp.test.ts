import { afterEach, describe, expect, it } from "vitest";
import { hashIp } from "../hashIp";

const SALT_ORIGINAL = process.env.IP_SALT;

afterEach(() => {
  if (SALT_ORIGINAL === undefined) {
    delete process.env.IP_SALT;
  } else {
    process.env.IP_SALT = SALT_ORIGINAL;
  }
});

describe("hashIp", () => {
  it("devuelve un hash hexadecimal de 64 caracteres (SHA-256)", async () => {
    const h = await hashIp("190.1.2.3");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("es determinista: misma IP produce el mismo hash", async () => {
    const a = await hashIp("190.1.2.3");
    const b = await hashIp("190.1.2.3");
    expect(a).toBe(b);
  });

  it("IPs distintas producen hashes distintos", async () => {
    const a = await hashIp("190.1.2.3");
    const b = await hashIp("190.1.2.4");
    expect(a).not.toBe(b);
  });

  it("no revela la IP (el hash no contiene la IP original)", async () => {
    const h = await hashIp("190.1.2.3");
    expect(h).not.toContain("190.1.2.3");
  });

  it("cambia con un IP_SALT distinto (protege contra ataques de diccionario)", async () => {
    const base = await hashIp("190.1.2.3");
    process.env.IP_SALT = "otra-sal-distinta";
    const conOtraSal = await hashIp("190.1.2.3");
    expect(base).not.toBe(conOtraSal);
  });
});
