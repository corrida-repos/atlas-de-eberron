import seed from "./events.json";

const characterRoles = ["arix", "isadora", "bear"] as const;
const groups = new Set<string>(["campaign", "history", ...characterRoles, "dm"]);
const mapKeys = new Set(["mundo", "khorvaire", "sharn"]);
const inviteDuration = 7 * 24 * 60 * 60 * 1000;
type CharacterRole = (typeof characterRoles)[number];
type Viewer = "dm" | CharacterRole | "group";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

function isCharacter(role: unknown): role is CharacterRole {
  return characterRoles.some(character => character === role);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateEvents(value: unknown) {
  if (!Array.isArray(value) || value.length > 2000) return null;
  const ids = new Set<string>();
  for (const event of value) {
    if (!isRecord(event) || typeof event.id !== "string" || !event.id || event.id.length > 200 || ids.has(event.id)) return null;
    if (typeof event.group !== "string" || !groups.has(event.group)) return null;
    if (typeof event.visible !== "boolean" || typeof event.approx !== "boolean" || !isRecord(event.points)) return null;
    if (typeof event.title !== "string" || !event.title.trim() || typeof event.place !== "string" || !event.place.trim()) return null;
    if (["title", "place", "date", "description"].some(key => typeof event[key] !== "string" || (event[key] as string).length > 2400)) return null;
    for (const [key, point] of Object.entries(event.points)) {
      if (!mapKeys.has(key) || !Array.isArray(point) || point.length !== 2 || point.some(n => typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 1)) return null;
    }
    ids.add(event.id);
  }
  return value as typeof seed;
}

async function digest(token: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)));
  return Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
}

function newToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)), value => value.toString(16).padStart(2, "0")).join("");
}

async function atlasRecord(db: D1Database) {
  let record = await db.prepare("SELECT revision, events FROM atlas WHERE id = 1").first<{ revision: number; events: string }>();
  if (!record) {
    await db.prepare("INSERT OR IGNORE INTO atlas (id, revision, events) VALUES (1, 1, ?)").bind(JSON.stringify(seed)).run();
    record = await db.prepare("SELECT revision, events FROM atlas WHERE id = 1").first<{ revision: number; events: string }>();
  }
  if (!record) throw new Error("Atlas unavailable");
  return record;
}

export async function atlasAPI(request: Request, env: Cloudflare.Env) {
  try {
    return await route(request, env);
  } catch {
    return json({ error: "O serviço do atlas está temporariamente indisponível." }, 503);
  }
}

async function route(request: Request, env: Cloudflare.Env) {
  const url = new URL(request.url);
  const db = env.DB;
  if (!db) return json({ error: "O serviço do atlas está temporariamente indisponível." }, 503);
  const userId = request.headers.get("oai-authenticated-user-id");
  const email = request.headers.get("oai-authenticated-user-email")?.toLowerCase();
  const authenticated = Boolean(userId && email);
  const isDM = authenticated && Boolean(env.ATLAS_DM_EMAIL) && email === env.ATLAS_DM_EMAIL?.trim().toLowerCase();
  const membership = !isDM && authenticated
    ? await db.prepare("SELECT role FROM atlas_slots WHERE user_id = ?").bind(userId).first<string>("role")
    : null;
  const viewer: Viewer = isDM ? "dm" : isCharacter(membership) ? membership : "group";

  if (request.method === "GET" && url.pathname === "/api/atlas") {
    const record = await atlasRecord(db);
    const events = JSON.parse(record.events) as typeof seed;
    return json({
      authenticated,
      role: viewer,
      revision: isDM ? record.revision : undefined,
      events: isDM ? events : events.filter(event => event.visible && (event.group === "campaign" || event.group === "history" || event.group === viewer))
    });
  }
  if (request.method === "GET" && url.pathname === "/api/atlas/invites") {
    if (!isDM) return json({ error: "Acesso reservado ao DM." }, 403);
    const { results } = await db.prepare("SELECT role, user_id IS NOT NULL AS claimed, expires_at FROM atlas_slots").all<{role:string; claimed:number; expires_at:number|null}>();
    return json({ slots: characterRoles.map(role => {
      const slot = results.find(row => row.role === role);
      return { role, claimed: Boolean(slot?.claimed), pending: Boolean(slot?.expires_at && slot.expires_at > Date.now()) };
    }) });
  }
  if (request.method !== "POST") return json({ error: "Pedido inválido." }, 405);
  if (request.headers.get("Origin") !== url.origin || request.headers.get("Content-Type")?.split(";")[0] !== "application/json") {
    return json({ error: "Pedido inválido." }, 403);
  }
  if (!authenticated) return json({ error: "Inicia sessão primeiro." }, 401);
  const raw = await request.text();
  if (raw.length > 1_500_000) return json({ error: "O ficheiro é demasiado grande." }, 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return json({ error: "Pedido inválido." }, 400); }
  if (!isRecord(body)) return json({ error: "Pedido inválido." }, 400);

  if (url.pathname === "/api/atlas/claim") {
    if (isDM || typeof body.token !== "string" || !/^[a-f0-9]{48}$/.test(body.token)) return json({ error: "Convite inválido." }, 400);
    if (membership) return json({ error: "Esta conta já está ligada a uma personagem." }, 409);
    const hash = await digest(body.token);
    const role = await db.prepare(
      "UPDATE atlas_slots SET user_id = ?, invite_hash = NULL, expires_at = NULL WHERE invite_hash = ? AND expires_at > ? AND user_id IS NULL AND NOT EXISTS (SELECT 1 FROM atlas_slots WHERE user_id = ?) RETURNING role"
    ).bind(userId, hash, Date.now(), userId).first<string>("role");
    if (!role) return json({ error: "Este convite expirou, já foi utilizado ou foi revogado." }, 410);
    return json({ role });
  }

  if (!isDM) return json({ error: "Acesso reservado ao DM." }, 403);

  if (url.pathname === "/api/atlas") {
    const events = validateEvents(body.events);
    if (!events || typeof body.revision !== "number" || !Number.isSafeInteger(body.revision)) {
      return json({ error: "A cronologia contém dados inválidos." }, 400);
    }
    const revision = await db.prepare("UPDATE atlas SET events = ?, revision = revision + 1 WHERE id = 1 AND revision = ? RETURNING revision")
      .bind(JSON.stringify(events), body.revision).first<number>("revision");
    if (!revision) return json({ error: "A cronologia mudou noutro dispositivo. Atualiza a página e volta a tentar." }, 409);
    return json({ revision });
  }
  if (url.pathname === "/api/atlas/invites") {
    if (!isCharacter(body.role)) return json({ error: "Personagem inválida." }, 400);
    if (body.action === "revoke") {
      await db.prepare("DELETE FROM atlas_slots WHERE role = ?").bind(body.role).run();
      return json({ revoked: true });
    }
    if (body.action !== "invite") return json({ error: "Ação inválida." }, 400);
    const token = newToken();
    const result = await db.prepare(
      "INSERT INTO atlas_slots (role, invite_hash, expires_at) VALUES (?, ?, ?) ON CONFLICT (role) DO UPDATE SET invite_hash = excluded.invite_hash, expires_at = excluded.expires_at WHERE atlas_slots.user_id IS NULL RETURNING role"
    ).bind(body.role, await digest(token), Date.now() + inviteDuration).first<string>("role");
    if (!result) return json({ error: "Revoga primeiro o acesso da conta atual." }, 409);
    return json({ token });
  }
  return json({ error: "Pedido inválido." }, 404);
}
