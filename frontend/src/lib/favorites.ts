"use client";

const FAVORITES_KEY = "stayzy_saved_rooms";
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pendingFavoriteToggles = new Set<string>();

export interface SavedRoom {
  id: string;
  name: string;
  slug: string;
  category: string;
  property: {
    name: string;
    city: string;
    address: string;
  };
  image: string;
  price: number;
  durationType: string;
  hasAc: boolean;
  savedAt: string;
}

export function getSavedRooms(): SavedRoom[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isRoomSaved(roomId: string): boolean {
  const rooms = getSavedRooms();
  return rooms.some((r) => r.id === roomId);
}

export function toggleSaveRoom(room: {
  id: string;
  name: string;
  slug: string;
  category: string;
  property: {
    name: string;
    city: string;
    address: string;
  };
  image: string;
  price: number;
  durationType: string;
  hasAc: boolean;
}): boolean {
  if (typeof window === "undefined") return false;
  try {
    const rooms = getSavedRooms();
    const existsIndex = rooms.findIndex((r) => r.id === room.id);
    let nowSaved = false;

    if (existsIndex >= 0) {
      rooms.splice(existsIndex, 1);
      nowSaved = false;
    } else {
      rooms.unshift({
        ...room,
        savedAt: new Date().toISOString(),
      });
      nowSaved = true;
    }

    localStorage.setItem(FAVORITES_KEY, JSON.stringify(rooms));
    window.dispatchEvent(new Event("stayzy_favorites_updated"));

    if (UUID_REGEX.test(room.id) && typeof fetch !== "undefined" && !pendingFavoriteToggles.has(room.id)) {
      pendingFavoriteToggles.add(room.id);
      const syncPromise = nowSaved
        ? fetch("/api/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room_type_id: room.id }),
          })
        : fetch(`/api/favorites?roomTypeId=${encodeURIComponent(room.id)}`, {
            method: "DELETE",
          });
      void syncPromise.catch(() => {}).finally(() => {
        pendingFavoriteToggles.delete(room.id);
      });
    }

    return nowSaved;
  } catch {
    return false;
  }
}

interface BackendFavoriteItem {
  room_type_id?: string;
  id?: string;
  room_name?: string;
  name?: string;
  slug?: string;
  category?: string;
  property_name?: string;
  city?: string;
  address?: string;
  cover_image?: string;
  images?: string[];
  price?: number | string;
  duration_type?: string;
  has_ac?: boolean;
  created_at?: string;
}

/**
 * Synchronize authenticated user's favorites with Express /users/me/favorites.
 * Safely merges any existing local UUID favorites without deleting local guest items.
 */
export async function syncFavoritesFromBackend(): Promise<SavedRoom[]> {
  const localRooms = getSavedRooms();
  if (typeof window === "undefined" || typeof fetch === "undefined") return localRooms;

  try {
    const res = await fetch("/api/favorites", { cache: "no-store" });
    if (!res.ok) return localRooms;

    const json = await res.json();
    const backendList: BackendFavoriteItem[] = Array.isArray(json?.data?.favorites)
      ? json.data.favorites
      : Array.isArray(json?.favorites)
        ? json.favorites
        : [];

    const backendIds = new Set(
      backendList.map((f) => f.room_type_id || f.id || "").filter(Boolean)
    );

    // Merge local UUID favorites not yet persisted on backend
    const localUuidMissing = localRooms.filter(
      (r) => UUID_REGEX.test(r.id) && !backendIds.has(r.id)
    );
    for (const r of localUuidMissing) {
      await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_type_id: r.id }),
      }).catch(() => {});
    }

    const localById = new Map(localRooms.map((r) => [r.id, r]));
    const merged: SavedRoom[] = backendList
      .map((f) => {
        const id = f.room_type_id || f.id || "";
        if (!id) return null;
        const existing = localById.get(id);
        return {
          id,
          name: f.room_name || f.name || existing?.name || "Stayzy Room",
          slug: f.slug || existing?.slug || id,
          category: f.category || existing?.category || "PRIVATE",
          property: {
            name: f.property_name || existing?.property?.name || "Stayzy Property",
            city: f.city || existing?.property?.city || "Bengaluru",
            address: f.address || existing?.property?.address || "",
          },
          image: f.cover_image || f.images?.[0] || existing?.image || "/fallback-room.jpg",
          price: Number(f.price ?? existing?.price ?? 0),
          durationType: f.duration_type || existing?.durationType || "MONTHLY",
          hasAc: Boolean(f.has_ac ?? existing?.hasAc ?? true),
          savedAt: f.created_at || existing?.savedAt || new Date().toISOString(),
        };
      })
      .filter((x): x is SavedRoom => x !== null);

    // Preserve any non-UUID local items or newly merged items
    const mergedIds = new Set(merged.map((m) => m.id));
    for (const r of localRooms) {
      if (!mergedIds.has(r.id)) {
        merged.push(r);
      }
    }

    localStorage.setItem(FAVORITES_KEY, JSON.stringify(merged));
    window.dispatchEvent(new Event("stayzy_favorites_updated"));
    return merged;
  } catch {
    return localRooms;
  }
}
