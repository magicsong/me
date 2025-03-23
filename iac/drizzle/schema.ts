import { pgTable, pgEnum, serial, text, numeric, integer, timestamp, index, uniqueIndex, foreignKey, date, varchar, jsonb } from "drizzle-orm/pg-core"
  import { sql } from "drizzle-orm"

export const frequency = pgEnum("frequency", ['daily', 'weekly', 'monthly'])
export const status = pgEnum("status", ['active', 'inactive', 'archived'])


export const products = pgTable("products", {
	id: serial("id").primaryKey().notNull(),
	image_url: text("image_url").notNull(),
	name: text("name").notNull(),
	status: status("status").notNull(),
	price: numeric("price", { precision: 10, scale:  2 }).notNull(),
	stock: integer("stock").notNull(),
	available_at: timestamp("available_at", { mode: 'string' }).notNull(),
});

export const habits = pgTable("habits", {
	id: serial("id").primaryKey().notNull(),
	name: text("name").notNull(),
	description: text("description"),
	frequency: frequency("frequency").default('daily').notNull(),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	user_id: text("user_id"),
});

export const habit_entries = pgTable("habit_entries", {
	id: serial("id").primaryKey().notNull(),
	habit_id: integer("habit_id").notNull().references(() => habits.id),
	completed_at: date("completed_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
	user_id: text("user_id"),
},
(table) => {
	return {
		idx_habit_entries_completed_at: index("idx_habit_entries_completed_at").using("btree", table.completed_at),
		idx_habit_entries_habit_id: index("idx_habit_entries_habit_id").using("btree", table.habit_id),
	}
});

export const users = pgTable("users", {
	id: serial("id").primaryKey().notNull(),
	email: varchar("email", { length: 255 }).notNull(),
	name: varchar("name", { length: 255 }),
	username: varchar("username", { length: 255 }),
});

export const user_rewards = pgTable("user_rewards", {
	user_id: text("user_id").primaryKey().notNull(),
	total_points: integer("total_points").default(0).notNull(),
	category_points: jsonb("category_points").default({}).notNull(),
	level: integer("level").default(1).notNull(),
	updated_at: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const habit_targets = pgTable("habit_targets", {
	id: serial("id").primaryKey().notNull(),
	habit_id: integer("habit_id").notNull().references(() => habits.id),
	goal_id: integer("goal_id").notNull().references(() => goals.id),
	target_completion_rate: integer("target_completion_rate").notNull(),
	current_completion_rate: integer("current_completion_rate"),
	user_id: text("user_id").notNull(),
});

export const goals = pgTable("goals", {
	id: serial("id").primaryKey().notNull(),
	title: text("title").notNull(),
	description: text("description"),
	type: text("type").notNull(),
	start_date: timestamp("start_date", { mode: 'string' }).notNull(),
	end_date: timestamp("end_date", { mode: 'string' }).notNull(),
	user_id: text("user_id").notNull(),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	status: text("status").default('in_progress').notNull(),
});