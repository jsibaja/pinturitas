import { supabase } from "@/integrations/supabase/client";

/**
 * Capa de acceso a datos de contenido (mundos, láminas, paleta).
 * El contenido es de lectura pública para usuarios autenticados; estas
 * funciones se consumen con @tanstack/react-query en las pantallas.
 */

export type Child = {
  id: string;
  name: string;
  avatar_key: string | null;
  birth_year: number | null;
};

export async function fetchChildren(): Promise<Child[]> {
  // getSession lee la sesión local (sin red); evita un 400 en páginas públicas.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return [];
  const { data, error } = await supabase
    .from("children")
    .select("id, name, avatar_key, birth_year")
    .eq("parent_id", session.user.id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Child[];
}

export async function createChild(p: {
  name: string;
  avatarKey: string;
  birthYear: number | null;
}): Promise<Child> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("Sin sesión");
  const { data, error } = await supabase
    .from("children")
    .insert({ parent_id: session.user.id, name: p.name, avatar_key: p.avatarKey, birth_year: p.birthYear })
    .select("id, name, avatar_key, birth_year")
    .single();
  if (error) throw error;
  return data as Child;
}

export async function updateChild(
  id: string,
  p: { name: string; avatarKey: string; birthYear: number | null },
): Promise<Child> {
  const { data, error } = await supabase
    .from("children")
    .update({ name: p.name, avatar_key: p.avatarKey, birth_year: p.birthYear })
    .eq("id", id)
    .select("id, name, avatar_key, birth_year")
    .single();
  if (error) throw error;
  return data as Child;
}

/**
 * Borra un perfil. En la base, sus obras, progreso, favoritos y notas se
 * borran con él (en cascada), así que no tiene vuelta atrás.
 */
export async function deleteChild(id: string): Promise<void> {
  const { error } = await supabase.from("children").delete().eq("id", id);
  if (error) throw error;
}

export type World = {
  id: string;
  slug: string;
  name_es: string;
  name_en: string;
  sort_order: number;
  color_hex: string | null;
  icon_key: string | null;
  is_free: boolean;
  cover_image_path: string | null;
};

export type Drawing = {
  id: string;
  world_id: string;
  slug: string;
  name_es: string;
  name_en: string;
  phonetic_es: string | null;
  article_en: string | null;
  plural_en: string | null;
  sample_sentence_en: string | null;
  sample_sentence_es: string | null;
  fun_fact_es: string | null;
  line_art_path: string | null;
  preview_image_path: string | null;
  sort_order: number;
};

export type PaletteColor = {
  hex: string;
  name_es: string;
  name_en: string;
  phonetic_es: string | null;
  sort_order: number;
};

/** Convierte una ruta de contenido (line_art_path) en URL servible. */
export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return "/" + path.replace(/^\/+/, "");
}

export async function fetchWorlds(): Promise<World[]> {
  const { data, error } = await supabase
    .from("worlds")
    .select("id, slug, name_es, name_en, sort_order, color_hex, icon_key, is_free, cover_image_path")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as World[];
}

export async function fetchWorld(slug: string): Promise<World | null> {
  const { data, error } = await supabase
    .from("worlds")
    .select("id, slug, name_es, name_en, sort_order, color_hex, icon_key, is_free, cover_image_path")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data as World) ?? null;
}

export async function fetchDrawingsByWorld(worldSlug: string): Promise<Drawing[]> {
  const world = await fetchWorld(worldSlug);
  if (!world) return [];
  const { data, error } = await supabase
    .from("drawings")
    .select(
      "id, world_id, slug, name_es, name_en, phonetic_es, article_en, plural_en, sample_sentence_en, sample_sentence_es, fun_fact_es, line_art_path, preview_image_path, sort_order",
    )
    .eq("world_id", world.id)
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as Drawing[];
}

export async function fetchDrawing(slug: string): Promise<Drawing | null> {
  const { data, error } = await supabase
    .from("drawings")
    .select(
      "id, world_id, slug, name_es, name_en, phonetic_es, article_en, plural_en, sample_sentence_en, sample_sentence_es, fun_fact_es, line_art_path, preview_image_path, sort_order",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data as Drawing) ?? null;
}

export type Artwork = {
  id: string;
  drawing_id: string;
  thumbnail_path: string | null;
  is_completed: boolean;
  updated_at: string;
  drawings: { name_es: string; name_en: string; slug: string } | null;
};

export async function fetchArtworks(childId: string): Promise<Artwork[]> {
  const { data, error } = await supabase
    .from("artworks")
    .select("id, drawing_id, thumbnail_path, is_completed, updated_at, drawings(name_es, name_en, slug)")
    .eq("child_id", childId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Artwork[];
}

/** Guarda o actualiza la obra del niño para una lámina (upsert por child+drawing). */
export async function saveArtwork(params: {
  childId: string;
  drawingId: string;
  thumbnail: string;
  isCompleted: boolean;
}): Promise<void> {
  const { error } = await supabase.from("artworks").upsert(
    {
      child_id: params.childId,
      drawing_id: params.drawingId,
      thumbnail_path: params.thumbnail,
      is_completed: params.isCompleted,
      completed_at: params.isCompleted ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "child_id,drawing_id" },
  );
  if (error) throw error;
}

export type Plan = {
  id: string;
  code: string;
  name: string;
  price_usd: number;
  billing_interval: string;
  months: number;
  is_best_value: boolean;
  sort_order: number;
};

export async function fetchPlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from("plans")
    .select("id, code, name, price_usd, billing_interval, months, is_best_value, sort_order")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as Plan[];
}

/** Pool de todas las láminas activas, para los juegos de vocabulario. */
export async function fetchDrawingPool(): Promise<Drawing[]> {
  const { data, error } = await supabase
    .from("drawings")
    .select(
      "id, world_id, slug, name_es, name_en, phonetic_es, article_en, plural_en, sample_sentence_en, sample_sentence_es, fun_fact_es, line_art_path, preview_image_path, sort_order",
    )
    .eq("is_active", true);
  if (error) throw error;
  return (data ?? []) as Drawing[];
}

/** Registra un repaso de vocabulario (repetición espaciada simple por cajas). */
export async function saveVocabReview(params: {
  childId: string;
  drawingId: string;
  knew: boolean;
}): Promise<void> {
  const { data: prev } = await supabase
    .from("vocab_progress")
    .select("srs_box, correct_count, wrong_count")
    .eq("child_id", params.childId)
    .eq("drawing_id", params.drawingId)
    .maybeSingle();

  const prevBox = (prev?.srs_box as number | undefined) ?? 0;
  const box = params.knew ? Math.min(prevBox + 1, 5) : 1;
  const daysByBox = [1, 1, 2, 4, 8, 15];
  const next = new Date(Date.now() + daysByBox[box] * 86400000).toISOString();
  const status = box >= 3 ? "dominada" : "aprendiendo";

  const { error } = await supabase.from("vocab_progress").upsert(
    {
      child_id: params.childId,
      drawing_id: params.drawingId,
      srs_box: box,
      status,
      next_review_at: next,
      last_seen_at: new Date().toISOString(),
      correct_count: ((prev?.correct_count as number | undefined) ?? 0) + (params.knew ? 1 : 0),
      wrong_count: ((prev?.wrong_count as number | undefined) ?? 0) + (params.knew ? 0 : 1),
    },
    { onConflict: "child_id,drawing_id" },
  );
  if (error) throw error;
}

export async function fetchPalette(): Promise<PaletteColor[]> {
  const { data, error } = await supabase
    .from("palette_colors")
    .select("hex, name_es, name_en, phonetic_es, sort_order")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as PaletteColor[];
}
