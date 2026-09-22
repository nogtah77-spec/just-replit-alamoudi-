import { supabase, isSupabaseConfigured } from "./supabaseClient";
import type { Property, Region, PropertyType, User, Inquiry, CustomerPropertyRequest, FinishingRequest, Contract, AiLead, SiteSettings } from "@/context/DataContext";
import { SEED_PROPERTIES } from "@/data/seedProperties";

// Helper to convert Property to DB Row
export function propertyToRow(p: Property) {
  const safeNumber = (val: any, fallback = 0) => {
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
  };

  const rawFloorStr = p.floor !== undefined && p.floor !== null ? String(p.floor).trim() : "";
  let numericFloor = 0;
  let derivedFloorText = "";

  if (/^\d+$/.test(rawFloorStr)) {
    numericFloor = parseInt(rawFloorStr, 10);
    derivedFloorText = rawFloorStr;
  } else if (rawFloorStr === "") {
    numericFloor = -1;
    derivedFloorText = "__NONE__";
  } else {
    numericFloor = 0;
    derivedFloorText = rawFloorStr;
  }

  const dressingValue = p.layout || p.floorText || "";

  return {
    id: p.id,
    code: p.code,
    title: p.title,
    description: p.description || "",
    price: safeNumber(p.price, 0),
    area: safeNumber(p.area, 0),
    beds: safeNumber(p.beds, 0),
    baths: safeNumber(p.baths, 0),
    floors: safeNumber(p.floors, 0),
    floor: numericFloor,
    finishing: p.finishing || "",
    view: p.view || "",
    type_id: p.typeId || null,
    region_id: p.regionId || null,
    category: p.category || "residential",
    listing_type: p.listingType || "sale",
    status: p.status || "active",
    featured: Boolean(p.featured),
    agent_type: p.agentType || "direct",
    images: Array.isArray(p.images) ? p.images : [],
    video_url: p.videoUrl || "",
    external_url: p.externalUrl || "",
    maps_url: p.mapsUrl || "",
    unit_type: p.unitType || "",
    sub_area: p.subArea || "",
    layout: dressingValue,
    floor_text: derivedFloorText,
    master: p.master || "",
    location: p.location || "",
    additional_features: p.additionalFeatures || "",
    elevator: p.elevator || "",
    parking: p.parking || "",
    source: p.source || "",
    source_phones: Array.isArray(p.sourcePhones) ? p.sourcePhones : [],
    assigned_staff_id: p.assignedStaffId || "",
    created_at: p.createdAt || new Date().toISOString(),
    updated_at: p.updatedAt || new Date().toISOString(),
  };
}

// Universal Multi-Format Image Parser
// Handles JSON arrays, nested stringified arrays, Postgres array literals, and single strings
export function parsePropertyImages(rawImages: any): string[] {
  if (!rawImages) return [];

  // 1. If already an array
  if (Array.isArray(rawImages)) {
    const flat: string[] = [];
    for (const item of rawImages) {
      if (!item) continue;
      if (typeof item === "string") {
        const trimmed = item.trim();
        if (!trimmed) continue;
        if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
          flat.push(...parsePropertyImages(trimmed));
        } else {
          flat.push(trimmed);
        }
      } else if (typeof item === "object") {
        const u = item.url || item.src || item.image || item.path;
        if (u && typeof u === "string" && u.trim()) flat.push(u.trim());
      }
    }
    return Array.from(new Set(flat.filter(Boolean))).filter(url => !url.startsWith("data:image/"));
  }

  // 2. If string
  if (typeof rawImages === "string") {
    const trimmed = rawImages.trim();
    if (!trimmed || trimmed.startsWith("data:image/")) return [];

    // JSON Array string
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsePropertyImages(parsed);
        }
      } catch {}
    }

    // Postgres Array string literal: {"item1","item2"} or {item1,item2}
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const inner = trimmed.slice(1, -1).trim();
      if (!inner) return [];
      const matches: string[] = [];
      const regex = /"((?:[^"\\]|\\.)*)"|([^,]+)/g;
      let m;
      while ((m = regex.exec(inner)) !== null) {
        const val = m[1] !== undefined ? m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\') : (m[2] ? m[2].trim() : "");
        if (val) matches.push(val);
      }
      if (matches.length > 0) {
        return parsePropertyImages(matches);
      }
    }

    return trimmed.startsWith("data:image/") ? [] : [trimmed];
  }

  return [];
}

// Helper to convert DB Row to Property
export function rowToProperty(r: any): Property {
  const rawFt = typeof r.floor_text === "string" ? r.floor_text.trim() : "";
  let finalFloor: string | number = "";

  if (rawFt === "__NONE__" || r.floor === -1) {
    finalFloor = "";
  } else if (rawFt && rawFt !== "غرفة دريسنج" && rawFt !== "يوجد") {
    finalFloor = rawFt;
  } else if (r.floor !== null && r.floor !== undefined) {
    if (r.floor > 0) {
      finalFloor = r.floor;
    } else if (r.floor === 0) {
      finalFloor = "أرضي";
    } else {
      finalFloor = "";
    }
  }

  const finalDressing = r.layout || (rawFt === "غرفة دريسنج" || rawFt === "يوجد" ? rawFt : "");

  return {
    id: r.id,
    code: r.code,
    title: r.title || "",
    description: r.description || "",
    price: Number(r.price) || 0,
    area: Number(r.area) || 0,
    beds: Number(r.beds) || 0,
    baths: Number(r.baths) || 0,
    floors: Number(r.floors) || 0,
    floor: finalFloor,
    finishing: r.finishing || "",
    view: r.view || "",
    typeId: r.type_id || "",
    regionId: r.region_id || "",
    category: r.category || "residential",
    listingType: r.listing_type || "sale",
    status: r.status || "active",
    featured: Boolean(r.featured),
    agentType: r.agent_type || "direct",
    images: parsePropertyImages(r.images),
    videoUrl: r.video_url || "",
    externalUrl: r.external_url || "",
    mapsUrl: r.maps_url || "",
    unitType: r.unit_type || "",
    subArea: r.sub_area || "",
    layout: r.layout || "",
    floorText: finalDressing,
    master: r.master || "",
    location: r.location || "",
    additionalFeatures: r.additional_features || "",
    elevator: r.elevator || "",
    parking: r.parking || "",
    source: r.source || "",
    sourcePhones: Array.isArray(r.source_phones) ? r.source_phones : [],
    assignedStaffId: r.assigned_staff_id || "",
    views: Number(r.views) || 0,
    createdAt: r.created_at || new Date().toISOString(),
    updatedAt: r.updated_at || r.created_at || new Date().toISOString(),
  };
}

export const supabaseService = {
  // Fetch all properties
  async fetchProperties(): Promise<Property[] | null> {
    if (!supabase) return null;
    try {
      const [propsRes, viewsMap] = await Promise.all([
        supabase.from("properties").select("*").order("created_at", { ascending: false }),
        supabaseService.fetchPropertyViews().catch(() => ({} as Record<string, number>)),
      ]);
      if (propsRes.error) throw propsRes.error;
      if (!propsRes.data || propsRes.data.length === 0) return null;

      // Unify properties by code and preserve/combine all photos
      const codeMap = new Map<string, Property>();
      propsRes.data
        .filter((r: any) => {
          const id = String(r.id || "");
          const code = String(r.code || "");
          return !id.startsWith("__") && !code.startsWith("__");
        })
        .forEach((r: any) => {
          const prop = rowToProperty(r);
          const cloudViews = viewsMap[prop.id] ?? (prop.code ? viewsMap[prop.code] : undefined);
          if (cloudViews !== undefined) {
            prop.views = Number(cloudViews);
          }
          const codeKey = (prop.code || prop.id).toLowerCase().trim();
          const existing = codeMap.get(codeKey);
          if (!existing) {
            codeMap.set(codeKey, prop);
          } else {
            // Combine all unique images across rows
            const existImgs = Array.isArray(existing.images) ? existing.images : [];
            const newImgs = Array.isArray(prop.images) ? prop.images : [];
            const mergedImgs = [...existImgs];
            for (const img of newImgs) {
              if (img && !mergedImgs.includes(img)) {
                mergedImgs.push(img);
              }
            }
            const newer = new Date(prop.updatedAt || prop.createdAt || 0) >= new Date(existing.updatedAt || existing.createdAt || 0) ? prop : existing;
            codeMap.set(codeKey, { ...existing, ...newer, images: mergedImgs });
          }
        });

      return Array.from(codeMap.values());
    } catch (e) {
      console.warn("Supabase fetch properties error:", e);
      return null;
    }
  },

  // Save / insert property
  async saveProperty(property: Property): Promise<boolean> {
    if (!supabase) return false;
    try {
      const row = propertyToRow(property);
      const { error } = await supabase.from("properties").upsert(row);
      if (error) throw error;
      return true;
    } catch (e) {
      console.warn("Supabase save property error:", e);
      return false;
    }
  },

  // Save / insert multiple properties in bulk
  async savePropertiesBulk(propertiesList: Property[]): Promise<boolean> {
    if (!supabase || !propertiesList || propertiesList.length === 0) return false;
    try {
      const rows = propertiesList.map(propertyToRow);
      // Upsert in batches of 50 to respect payload limits
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50);
        const { error } = await supabase.from("properties").upsert(batch);
        if (error) throw error;
      }
      return true;
    } catch (e) {
      console.warn("Supabase savePropertiesBulk error:", e);
      return false;
    }
  },

  // Seed default properties if database is empty
  async seedInitialPropertiesIfEmpty(): Promise<void> {
    if (!supabase) return;
    try {
      const { count } = await supabase.from("properties").select("*", { count: "exact", head: true });
      if (count === 0 && SEED_PROPERTIES.length > 0) {
        console.log("Seeding Supabase with initial properties...");
        const rows = SEED_PROPERTIES.map(propertyToRow);
        await supabase.from("properties").upsert(rows);
      }
    } catch (e) {
      console.warn("Supabase seed check error:", e);
    }
  },

  // Delete property (by id or code)
  async deleteProperty(idOrCode: string): Promise<boolean> {
    if (!supabase || !idOrCode) return false;
    try {
      await supabase.from("properties").delete().eq("id", idOrCode);
      await supabase.from("properties").delete().eq("code", idOrCode);
      return true;
    } catch (e) {
      console.warn("Supabase delete property error:", e);
      return false;
    }
  },

  // Bulk delete properties
  async bulkDeleteProperties(ids: string[]): Promise<boolean> {
    if (!supabase || !ids || ids.length === 0) return false;
    try {
      await supabase.from("properties").delete().in("id", ids);
      await supabase.from("properties").delete().in("code", ids);
      return true;
    } catch (e) {
      console.warn("Supabase bulk delete error:", e);
      return false;
    }
  },

  // Clear all properties from Supabase
  async clearAllProperties(): Promise<boolean> {
    if (!supabase) return false;
    try {
      await supabase.from("properties").delete().neq("id", "__keep__");
      return true;
    } catch (e) {
      console.warn("Supabase clear all properties error:", e);
      return false;
    }
  },

  // Save Customer Request
  async saveCustomerRequest(req: any): Promise<boolean> {
    if (!supabase) return false;
    try {
      const row = {
        id: req.id,
        customer_name: req.customerName,
        customer_phone: req.customerPhone,
        request_type: req.requestType || "buy",
        property_category: req.propertyCategory || "residential",
        region_id: req.regionId || null,
        budget_min: req.budgetMin || 0,
        budget_max: req.budgetMax || 0,
        notes: req.notes || "",
        status: req.status || "new",
        assigned_staff_id: req.assignedStaffId || null,
        created_at: req.createdAt || new Date().toISOString(),
      };
      const { error } = await supabase.from("customer_property_requests").upsert(row);
      if (error) throw error;
      return true;
    } catch (e) {
      console.warn("Supabase save customer request error:", e);
      return false;
    }
  },

  // Save Inquiry
  async saveInquiry(inq: any): Promise<boolean> {
    if (!supabase) return false;
    try {
      const row = {
        id: inq.id,
        property_id: inq.propertyId || null,
        property_code: inq.propertyCode || null,
        name: inq.name,
        phone: inq.phone,
        message: inq.message || "",
        status: inq.status || "new",
        created_at: inq.createdAt || new Date().toISOString(),
      };
      const { error } = await supabase.from("inquiries").upsert(row);
      if (error) throw error;
      return true;
    } catch (e) {
      console.warn("Supabase save inquiry error:", e);
      return false;
    }
  },

  // Fetch Users
  async fetchUsers(): Promise<User[] | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.from("users").select("*").order("joined_at", { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) return null;
      return data.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        username: u.username || "",
        password: u.password || "",
        role: u.role || "customer",
        active: u.active ?? true,
        canClearActivityLogs: u.can_clear_activity_logs ?? false,
        joinedAt: u.joined_at || new Date().toISOString(),
      }));
    } catch (e) {
      console.warn("Supabase fetch users error:", e);
      return null;
    }
  },

  // Save / upsert User
  async saveUser(user: User): Promise<boolean> {
    if (!supabase) return false;
    try {
      const row = {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username || user.email.split("@")[0] || user.id,
        password: user.password || "",
        role: user.role || "customer",
        active: user.active ?? true,
        can_clear_activity_logs: user.canClearActivityLogs ?? false,
        joined_at: user.joinedAt || new Date().toISOString(),
      };
      const { error } = await supabase.from("users").upsert(row);
      if (error) {
        // Fallback without password column if schema not yet migrated
        const { password: _p, ...fallbackRow } = row;
        const { error: fallbackErr } = await supabase.from("users").upsert(fallbackRow);
        if (fallbackErr) throw fallbackErr;
      }
      return true;
    } catch (e) {
      console.warn("Supabase save user error:", e);
      return false;
    }
  },

  // Delete User
  async deleteUser(id: string): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from("users").delete().eq("id", id);
      if (error) throw error;
      return true;
    } catch (e) {
      console.warn("Supabase delete user error:", e);
      return false;
    }
  },

  // Fetch Inquiries
  async fetchInquiries(): Promise<any[] | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.from("inquiries").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      if (!data) return null;
      return data.map((r: any) => ({
        id: r.id,
        propertyId: r.property_id || "",
        propertyCode: r.property_code || "",
        name: r.name,
        phone: r.phone,
        message: r.message || "",
        status: r.status || "new",
        createdAt: r.created_at || new Date().toISOString(),
      }));
    } catch (e) {
      console.warn("Supabase fetch inquiries error:", e);
      return null;
    }
  },

  // Fetch Customer Requests
  async fetchCustomerRequests(): Promise<any[] | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.from("customer_property_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      if (!data) return null;
      return data.map((r: any) => ({
        id: r.id,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        requestType: r.request_type || "buy",
        propertyCategory: r.property_category || "residential",
        regionId: r.region_id || "",
        budgetMin: Number(r.budget_min) || 0,
        budgetMax: Number(r.budget_max) || 0,
        notes: r.notes || "",
        status: r.status || "new",
        assignedStaffId: r.assigned_staff_id || "",
        createdAt: r.created_at || new Date().toISOString(),
      }));
    } catch (e) {
      console.warn("Supabase fetch customer requests error:", e);
      return null;
    }
  },

  // Fetch Regions
  async fetchRegions(): Promise<Region[] | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.from("regions").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) return null;
      return data.map((r: any) => ({
        id: r.id,
        name: r.name,
        active: r.active ?? true,
        heroImage: r.hero_image || "",
      }));
    } catch (e) {
      console.warn("Supabase fetch regions error:", e);
      return null;
    }
  },

  // Save / upsert Region
  async saveRegion(region: Region): Promise<boolean> {
    if (!supabase) return false;
    try {
      const row = {
        id: region.id,
        name: region.name,
        active: region.active ?? true,
        hero_image: region.heroImage || "",
      };
      const { error } = await supabase.from("regions").upsert(row);
      if (error) throw error;
      return true;
    } catch (e) {
      console.warn("Supabase save region error:", e);
      return false;
    }
  },

  // Delete Region
  async deleteRegion(id: string): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from("regions").delete().eq("id", id);
      if (error) throw error;
      return true;
    } catch (e) {
      console.warn("Supabase delete region error:", e);
      return false;
    }
  },

  // Fetch Property Types
  async fetchPropertyTypes(): Promise<PropertyType[] | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.from("property_types").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) return null;
      return data.map((t: any) => ({
        id: t.id,
        name: t.name,
        active: t.active ?? true,
      }));
    } catch (e) {
      console.warn("Supabase fetch property types error:", e);
      return null;
    }
  },

  // Save / upsert Property Type
  async savePropertyType(type: PropertyType): Promise<boolean> {
    if (!supabase) return false;
    try {
      const row = {
        id: type.id,
        name: type.name,
        active: type.active ?? true,
      };
      const { error } = await supabase.from("property_types").upsert(row);
      if (error) throw error;
      return true;
    } catch (e) {
      console.warn("Supabase save property type error:", e);
      return false;
    }
  },

  // Delete Property Type
  async deletePropertyType(id: string): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from("property_types").delete().eq("id", id);
      if (error) throw error;
      return true;
    } catch (e) {
      console.warn("Supabase delete property type error:", e);
      return false;
    }
  },

  // Fetch Activity Logs
  async fetchActivityLogs(): Promise<any[] | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      if (!data || data.length === 0) return null;
      return data.map((r: any) => ({
        id: r.id,
        action: r.action,
        entityType: r.entity_type || r.entityType || "system",
        title: r.title,
        actor: r.actor || "الإدارة",
        createdAt: r.created_at || r.createdAt || new Date().toISOString(),
      }));
    } catch (e) {
      console.warn("Supabase fetch activity logs warning:", e);
      return null;
    }
  },

  // Save Activity Log
  async saveActivityLog(log: any): Promise<boolean> {
    if (!supabase) return false;
    try {
      const row = {
        id: log.id,
        action: log.action,
        entity_type: log.entityType,
        title: log.title,
        actor: log.actor || "الإدارة",
        created_at: log.createdAt || new Date().toISOString(),
      };
      const { error } = await supabase.from("activity_logs").upsert(row);
      if (error) throw error;
      return true;
    } catch (e) {
      console.warn("Supabase save activity log warning:", e);
      return false;
    }
  },

  // Clear Activity Logs
  async clearActivityLogs(): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from("activity_logs").delete().neq("id", "0");
      if (error) throw error;
      return true;
    } catch (e) {
      console.warn("Supabase clear activity logs warning:", e);
      return false;
    }
  },

  // Fetch Dedicated QR Settings from Supabase Cloud (Isolated & Immune)
  async fetchQrSettings(): Promise<{ qrSectionEnabled?: boolean; qrCodes?: any[] } | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("description")
        .eq("id", "__qr_codes_store__")
        .maybeSingle();
      if (error) {
        console.warn("Supabase fetch qr settings warning:", error);
        return null;
      }
      if (data && data.description) {
        return JSON.parse(data.description);
      }
      return null;
    } catch (e) {
      console.warn("Supabase fetch qr settings exception:", e);
      return null;
    }
  },

  // Save Dedicated QR Settings to Supabase Cloud (Isolated & Immune)
  async saveQrSettings(qr: { qrSectionEnabled?: boolean; qrCodes?: any[] }): Promise<boolean> {
    if (!supabase) return false;
    try {
      const payloadString = JSON.stringify(qr);
      const row = {
        id: "__qr_codes_store__",
        code: "__QR_CONFIG__",
        title: "QR Codes Store",
        description: payloadString,
        price: 0,
        area: 0,
        status: "archived",
        created_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("properties").upsert(row);
      if (error) throw error;
      return true;
    } catch (e) {
      console.warn("Supabase save qr settings warning:", e);
      return false;
    }
  },

  // Fetch Dedicated Home Background from Supabase Cloud (Isolated & Immune)
  async fetchHomeBackground(): Promise<any | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("description")
        .eq("id", "__home_background_store__")
        .maybeSingle();
      if (error) {
        console.warn("Supabase fetch home background warning:", error);
        return null;
      }
      if (data && data.description) {
        return JSON.parse(data.description);
      }
      return null;
    } catch (e) {
      console.warn("Supabase fetch home background exception:", e);
      return null;
    }
  },

  // Save Dedicated Home Background to Supabase Cloud (Isolated & Immune)
  async saveHomeBackground(bg: any): Promise<boolean> {
    if (!supabase) return false;
    try {
      const payloadString = JSON.stringify(bg);
      const row = {
        id: "__home_background_store__",
        code: "__HOME_BG__",
        title: "Home Background Store",
        description: payloadString,
        price: 0,
        area: 0,
        status: "archived",
        created_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("properties").upsert(row);
      if (error) throw error;
      return true;
    } catch (e) {
      console.warn("Supabase save home background warning:", e);
      return false;
    }
  },

  // Fetch Dedicated Login Background from Supabase Cloud (Isolated & Immune)
  async fetchLoginBackground(): Promise<any | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("description")
        .eq("id", "__login_background_store__")
        .maybeSingle();
      if (error) {
        console.warn("Supabase fetch login background warning:", error);
        return null;
      }
      if (data && data.description) {
        return JSON.parse(data.description);
      }
      return null;
    } catch (e) {
      console.warn("Supabase fetch login background exception:", e);
      return null;
    }
  },

  // Save Dedicated Login Background to Supabase Cloud (Isolated & Immune)
  async saveLoginBackground(bg: any): Promise<boolean> {
    if (!supabase) return false;
    try {
      const payloadString = JSON.stringify(bg);
      const row = {
        id: "__login_background_store__",
        code: "__LOGIN_BG__",
        title: "Login Background Store",
        description: payloadString,
        price: 0,
        area: 0,
        status: "archived",
        created_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("properties").upsert(row);
      if (error) throw error;
      return true;
    } catch (e) {
      console.warn("Supabase save login background warning:", e);
      return false;
    }
  },

  // Fetch Finishing Gallery Config from Supabase Cloud (Sync across all devices)
  async fetchFinishingGallery(): Promise<any | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("description")
        .eq("id", "__finishing_gallery_store__")
        .maybeSingle();
      if (error) {
        console.warn("Supabase fetch finishing gallery warning:", error);
        return null;
      }
      if (data && data.description) {
        return JSON.parse(data.description);
      }
      return null;
    } catch (e) {
      console.warn("Supabase fetch finishing gallery exception:", e);
      return null;
    }
  },

  // Save Finishing Gallery Config to Supabase Cloud (Sync across all devices)
  async saveFinishingGallery(config: any): Promise<boolean> {
    if (!supabase) return false;
    try {
      const payloadString = JSON.stringify(config);
      const row = {
        id: "__finishing_gallery_store__",
        code: "__FINISHING_GALLERY__",
        title: "Finishing Gallery Store",
        description: payloadString,
        price: 0,
        area: 0,
        status: "archived",
        created_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("properties").upsert(row);
      if (error) throw error;
      return true;
    } catch (e) {
      console.warn("Supabase save finishing gallery warning:", e);
      return false;
    }
  },

  // Fetch Site Settings from Supabase Cloud (Sync across all devices)
  async fetchSettings(): Promise<Partial<SiteSettings> | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("description")
        .eq("id", "__site_settings_store__")
        .maybeSingle();
      if (error) {
        console.warn("Supabase fetch site settings warning:", error);
        return null;
      }
      if (data && data.description) {
        const parsed = JSON.parse(data.description);
        return parsed as Partial<SiteSettings>;
      }
      return null;
    } catch (e) {
      console.warn("Supabase fetch site settings exception:", e);
      return null;
    }
  },

  // Save / Upsert Site Settings to Supabase Cloud
  async saveSettings(settings: SiteSettings): Promise<boolean> {
    if (!supabase) return false;
    try {
      const payloadString = JSON.stringify(settings);
      const row = {
        id: "__site_settings_store__",
        code: "__SYS_CONFIG__",
        title: "System Settings Store",
        description: payloadString,
        price: 0,
        area: 0,
        status: "archived",
        created_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("properties").upsert(row);
      if (error) throw error;
      return true;
    } catch (e) {
      console.warn("Supabase save site settings warning:", e);
      return false;
    }
  },

  // Fetch Visitor Stats from Supabase Cloud
  async fetchVisitorStats(): Promise<{ today: number; week: number; month: number } | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("description")
        .eq("id", "__visitor_stats_store__")
        .maybeSingle();
      if (error) {
        console.warn("Supabase fetch visitor stats warning:", error);
        return null;
      }
      if (data && data.description) {
        const parsed = JSON.parse(data.description);
        return {
          today: Number(parsed.today) || 0,
          week: Number(parsed.week) || 0,
          month: Number(parsed.month) || 0,
        };
      }
      return null;
    } catch (e) {
      console.warn("Supabase fetch visitor stats exception:", e);
      return null;
    }
  },

  // Record a unique visitor session in Supabase Cloud
  async recordVisitorVisit(): Promise<{ today: number; week: number; month: number } | null> {
    if (!supabase) return null;
    try {
      const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date());
      const { data } = await supabase
        .from("properties")
        .select("description")
        .eq("id", "__visitor_stats_store__")
        .maybeSingle();

      let current = { lastDate: todayStr, today: 34, week: 218, month: 745 };
      if (data && data.description) {
        try {
          current = { ...current, ...JSON.parse(data.description) };
        } catch {}
      }

      let nextToday = Number(current.today) || 0;
      let nextWeek = Number(current.week) || 0;
      let nextMonth = Number(current.month) || 0;

      if (current.lastDate !== todayStr) {
        current.lastDate = todayStr;
        nextToday = 1;
        nextWeek += 1;
        nextMonth += 1;
      } else {
        nextToday += 1;
        nextWeek += 1;
        nextMonth += 1;
      }

      const updated = {
        lastDate: todayStr,
        today: nextToday,
        week: nextWeek,
        month: nextMonth,
      };

      const row = {
        id: "__visitor_stats_store__",
        code: "__VISITOR_STATS__",
        title: "Visitor Stats Store",
        description: JSON.stringify(updated),
        price: 0,
        area: 0,
        status: "archived",
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("properties").upsert(row);
      if (error) throw error;
      return {
        today: updated.today,
        week: updated.week,
        month: updated.month,
      };
    } catch (e) {
      console.warn("Supabase record visitor visit exception:", e);
      return null;
    }
  },

  // Fetch Property Views Map from Supabase Cloud
  async fetchPropertyViews(): Promise<Record<string, number>> {
    if (!supabase) return {};
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("description")
        .eq("id", "__property_views_store__")
        .maybeSingle();
      if (error || !data?.description) return {};
      return JSON.parse(data.description) as Record<string, number>;
    } catch (e) {
      console.warn("fetchPropertyViews exception:", e);
      return {};
    }
  },

  // Increment view count for a property in Supabase Cloud
  async incrementPropertyView(propId: string): Promise<number> {
    if (!supabase || !propId) return 0;
    try {
      const { data } = await supabase
        .from("properties")
        .select("description")
        .eq("id", "__property_views_store__")
        .maybeSingle();

      let viewsMap: Record<string, number> = {};
      if (data && data.description) {
        try { viewsMap = JSON.parse(data.description); } catch {}
      }

      const current = Number(viewsMap[propId]) || 0;
      const nextViews = current + 1;
      viewsMap[propId] = nextViews;

      await supabase.from("properties").upsert({
        id: "__property_views_store__",
        code: "__VIEWS_STORE__",
        title: "Property Views Store",
        description: JSON.stringify(viewsMap),
        price: 0,
        area: 0,
        status: "archived",
        created_at: new Date().toISOString(),
      });

      return nextViews;
    } catch (e) {
      console.warn("incrementPropertyView exception:", e);
      return 0;
    }
  },
};
