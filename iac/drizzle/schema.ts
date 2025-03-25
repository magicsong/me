import { sql } from "drizzle-orm"
import { index, integer, jsonb, numeric, pgEnum, pgTable, primaryKey, serial, text, timestamp, varchar, uniqueIndex } from "drizzle-orm/pg-core"

export const frequency = pgEnum("frequency", ['daily', 'weekly', 'monthly'])
export const status = pgEnum("status", ['active', 'inactive', 'archived'])
// 添加难度级别枚举
export const difficulty = pgEnum("difficulty", ['easy', 'medium', 'hard'])

export const products = pgTable("products", {
	id: serial("id").primaryKey().notNull(),
	image_url: text("image_url").notNull(),
	name: text("name").notNull(),
	status: status("status").notNull(),
	price: numeric("price", { precision: 10, scale:  2 }).notNull(),
	stock: integer("stock").notNull(),
	available_at: timestamp("available_at", { mode: 'string', withTimezone: true }).notNull(),
});

export const habits = pgTable("habits", {
	id: serial("id").primaryKey().notNull(),
	name: text("name").notNull(),
	description: text("description"),
	frequency: frequency("frequency").default('daily').notNull(),
	created_at: timestamp("created_at", { mode: 'string', withTimezone: true }).defaultNow().notNull(),
	user_id: text("user_id"),
	category: text("category"),
	reward_points: integer("reward_points").default(1).notNull(),
	status: status("status").default('active').notNull(),
});

export const habit_entries = pgTable("habit_entries", {
	id: serial("id").primaryKey().notNull(),
	habit_id: integer("habit_id").notNull().references(() => habits.id),
	completed_at: timestamp("completed_at", { mode: 'string', withTimezone: true }).defaultNow().notNull(),
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
	start_date: timestamp("start_date", { mode: 'string', withTimezone: true }).notNull(),
	end_date: timestamp("end_date", { mode: 'string', withTimezone: true }).notNull(),
	user_id: text("user_id").notNull(),
	created_at: timestamp("created_at", { mode: 'string', withTimezone: true }).defaultNow().notNull(),
	status: text("status").default('in_progress').notNull(),
});

// 添加习惯难度评价表
export const habit_difficulties = pgTable("habit_difficulties", {
	id: serial("id").primaryKey().notNull(),
	habit_id: integer("habit_id").notNull().references(() => habits.id),
	user_id: text("user_id").notNull(),
	completed_at: timestamp("completed_at", { mode: 'string', withTimezone: true }).defaultNow().notNull(),
	difficulty: difficulty("difficulty").notNull(),
	comment: text("comment"),
	created_at: timestamp("created_at", { mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => {
	return {
		idx_habit_difficulties_habit_id: index("idx_habit_difficulties_habit_id").using("btree", table.habit_id),
		idx_habit_difficulties_completed_at: index("idx_habit_difficulties_completed_at").using("btree", table.completed_at),
	}
});

// LLM缓存记录表
export const llm_cache_records = pgTable("llm_cache_records", {
	id: serial("id").primaryKey().notNull(),
	request_hash: text("request_hash").notNull(),
	prompt: text("prompt").notNull(),
	model: text("model").notNull(),
	response_content: text("response_content").notNull(),
	response_thinking: text("response_thinking"),
	created_at: timestamp("created_at", { mode: 'string', withTimezone: true }).defaultNow().notNull(),
	user_id: text("user_id"),
},
(table) => {
	return {
		idx_llm_cache_records_request_hash: index("idx_llm_cache_records_request_hash").using("btree", table.request_hash),
		idx_llm_cache_records_created_at: index("idx_llm_cache_records_created_at").using("btree", table.created_at),
	}
});

// 番茄钟状态枚举
export const pomodoroStatus = pgEnum("pomodoro_status", ['running', 'completed', 'canceled', 'paused'])

// 番茄钟记录表
export const pomodoros = pgTable("pomodoros", {
	id: serial("id").primaryKey().notNull(),
	title: text("title").notNull(),
	description: text("description"),
	duration: integer("duration").default(25).notNull(), // 默认25分钟
	status: pomodoroStatus("status").default('running').notNull(),
	start_time: timestamp("start_time", { mode: 'string', withTimezone: true }).notNull(),
	end_time: timestamp("end_time", { mode: 'string', withTimezone: true }),
	user_id: text("user_id").notNull(),
	habit_id: integer("habit_id").references(() => habits.id),
	goal_id: integer("goal_id").references(() => goals.id),
	created_at: timestamp("created_at", { mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => {
	return {
		idx_pomodoros_user_id: index("idx_pomodoros_user_id").using("btree", table.user_id),
		idx_pomodoros_status: index("idx_pomodoros_status").using("btree", table.status),
		idx_pomodoros_start_time: index("idx_pomodoros_start_time").using("btree", table.start_time),
	}
});

// 番茄钟标签表
export const pomodoro_tags = pgTable("pomodoro_tags", {
	id: serial("id").primaryKey().notNull(),
	name: text("name").notNull(),
	color: text("color").default('#FF5722').notNull(), // 默认番茄红色
	user_id: text("user_id").notNull(),
	created_at: timestamp("created_at", { mode: 'string', withTimezone: true }).defaultNow().notNull(),
});

// 番茄钟与标签的关联表
export const pomodoro_tag_relations = pgTable("pomodoro_tag_relations", {
	pomodoro_id: integer("pomodoro_id").notNull().references(() => pomodoros.id),
	tag_id: integer("tag_id").notNull().references(() => pomodoro_tags.id),
},
(table) => {
	return {
		pk: primaryKey({ columns: [table.pomodoro_id, table.tag_id] }),
	}
});

// Todo状态枚举
export const todoStatus = pgEnum("todo_status", ['pending', 'in_progress', 'completed', 'archived'])

// Todo优先级枚举
export const todoPriority = pgEnum("todo_priority", ['low', 'medium', 'high', 'urgent'])

// Todos表
export const todos = pgTable("todos", {
	id: serial("id").primaryKey().notNull(),
	title: text("title").notNull(),
	description: text("description"),
	status: todoStatus("status").default('pending').notNull(),
	priority: todoPriority("priority").default('medium').notNull(),
	due_date: timestamp("due_date", { mode: 'string', withTimezone: true }),
	user_id: text("user_id").notNull(),
	created_at: timestamp("created_at", { mode: 'string', withTimezone: true }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { mode: 'string', withTimezone: true }).defaultNow().notNull(),
	completed_at: timestamp("completed_at", { mode: 'string', withTimezone: true }),
},
(table) => {
	return {
		idx_todos_user_id: index("idx_todos_user_id").using("btree", table.user_id),
		idx_todos_status: index("idx_todos_status").using("btree", table.status),
		idx_todos_due_date: index("idx_todos_due_date").using("btree", table.due_date),
	}
});

// Todo与标签的关联表
export const todo_tag_relations = pgTable("todo_tag_relations", {
	todo_id: integer("todo_id").notNull().references(() => todos.id, { onDelete: 'cascade' }),
	tag_id: integer("tag_id").notNull().references(() => pomodoro_tags.id, { onDelete: 'cascade' }),
},
(table) => {
	return {
		pk: primaryKey({ columns: [table.todo_id, table.tag_id] }),
	}
});

// Todo与番茄钟的关联表
export const todo_pomodoro_relations = pgTable("todo_pomodoro_relations", {
	todo_id: integer("todo_id").notNull().references(() => todos.id, { onDelete: 'cascade' }),
	pomodoro_id: integer("pomodoro_id").notNull().references(() => pomodoros.id, { onDelete: 'cascade' }),
},
(table) => {
	return {
		pk: primaryKey({ columns: [table.todo_id, table.pomodoro_id] }),
	}
});

// 添加每日总结表
export const daily_summaries = pgTable("daily_summaries", {
	id: serial("id").primaryKey().notNull(),
	user_id: text("user_id").notNull(),
	date: text("date").notNull(), // 格式 YYYY-MM-DD
	content: jsonb("content").notNull(), // 存储整个总结内容
	created_at: timestamp("created_at", { mode: 'string', withTimezone: true }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { mode: 'string', withTimezone: true }).defaultNow().notNull(),
	ai_summary: text("ai_summary"), // AI生成的总结
	ai_feedback_actions: jsonb("ai_feedback_actions"), // AI反馈行动
},
(table) => {
	return {
		idx_daily_summaries_user_id: index("idx_daily_summaries_user_id").using("btree", table.user_id),
		idx_daily_summaries_date: index("idx_daily_summaries_date").using("btree", table.date),
		// 创建复合唯一索引，确保每个用户每天只有一条总结
		unique_user_date: uniqueIndex("unique_user_date").on(table.user_id, table.date),
	}
});