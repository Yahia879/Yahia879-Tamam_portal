import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, UserRole } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

interface OAuthUserData {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  lastSignedIn?: Date;
  role?: UserRole;
}

export async function upsertUser(user: OAuthUserData): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    // للمستخدمين القادمين من OAuth، نستخدم openId كمعرف فريد
    const existingUser = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);
    
    if (existingUser.length > 0) {
      // تحديث المستخدم الموجود
      const updateSet: Record<string, unknown> = {
        lastSignedIn: user.lastSignedIn || new Date(),
      };
      
      if (user.name) updateSet.name = user.name;
      if (user.email) updateSet.email = user.email;
      if (user.loginMethod) updateSet.loginMethod = user.loginMethod;
      
      // تحديث الدور للمالك
      if (user.openId === ENV.ownerOpenId) {
        updateSet.role = 'super_admin' as UserRole;
      }
      
      await db.update(users).set(updateSet).where(eq(users.openId, user.openId));
    } else {
      // إنشاء مستخدم جديد
      const role: UserRole = user.openId === ENV.ownerOpenId ? 'super_admin' : 'service_requester';
      
      await db.insert(users).values({
        openId: user.openId,
        email: user.email || `${user.openId}@oauth.local`,
        name: user.name || 'مستخدم جديد',
        loginMethod: user.loginMethod || 'oauth',
        role: role,
        status: 'active',
        lastSignedIn: user.lastSignedIn || new Date(),
      });
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== دوال إدارة المستخدمين ====================

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUser(userData: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(users).values(userData);
  return result;
}

export async function updateUser(id: number, userData: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users).set(userData).where(eq(users.id, id));
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(users);
}
