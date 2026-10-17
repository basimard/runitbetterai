import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const crmAdmin = sqliteTable("crm_admin", {
 id: integer("id").primaryKey({autoIncrement:true}), email: text("email").notNull().unique(), salt: text("salt").notNull(), passwordHash: text("password_hash").notNull(), failedAttempts: integer("failed_attempts").notNull().default(0), lockedUntil: integer("locked_until").notNull().default(0), enabled: integer("enabled",{mode:"boolean"}).notNull().default(true),
});
export const crmSessions = sqliteTable("crm_sessions", {tokenHash: text("token_hash").primaryKey(), expiresAt: integer("expires_at").notNull(), adminId: integer("admin_id").references(()=>crmAdmin.id)});
export const inquiries = sqliteTable("inquiries", {
 id: text("id").primaryKey(), name: text("name").notNull(), business: text("business").notNull(),
 location: text("location").notNull(), phone: text("phone").notNull(), email: text("email"),
 task: text("task").notNull(), currentProcess: text("current_process"), source: text("source").notNull(), createdAt: integer("created_at").notNull(),
 stage: text("stage").notNull().default("New"), timezone: text("timezone").notNull().default("UTC"),
});
export const calls = sqliteTable("calls", {
 id: text("id").primaryKey(), contactId: text("contact_id").notNull().references(() => inquiries.id),
 startsAt: integer("starts_at").notNull(), timezone: text("timezone").notNull(),
 duration: integer("duration").notNull(), status: text("status").notNull().default("Scheduled"),
 agenda: text("agenda").notNull(), createdAt: integer("created_at").notNull(),
});
export const contactNotes = sqliteTable("contact_notes", {
 id: text("id").primaryKey(), contactId: text("contact_id").notNull().references(() => inquiries.id),
 body: text("body").notNull(), createdAt: integer("created_at").notNull(),
});
