import { relations, sql, InferSelectModel } from "drizzle-orm"
import { index, integer, jsonb, numeric, pgEnum, pgTable, primaryKey, serial, text, timestamp, varchar, uniqueIndex, uuid, boolean, foreignKey } from "drizzle-orm/pg-core"
import { comment } from "postcss"
import { number } from "zod"

export const frequency = pgEnum("frequency", ['daily', 'weekly', 'monthly','scenario'])
export const status = pgEnum("status", ['active', 'inactive', 'archived'])
// 添加难度级别枚举
export const difficulty = pgEnum("difficulty", ['easy', 'medium', 'hard'])
// 添加总结类型枚举
export const summaryType = pgEnum("summary_type", ['daily', 'three_day', 'weekly'])

export const habits = pgTable("habits", {
	id: serial("id").primaryKey().notNull(),
	name: text("name").notNull(),
	description: text("description"),
	frequency: frequency("frequency").default('daily').notNull(),
	created_at: timestamp("created_at", { mode: 'string', withTimezone: true }).defaultNow().notNull(),
	user_id: text("user_id").notNull(),
	category: text("category"),
	reward_points: integer("reward_points").default(1).notNull(),
	status: status("status").default('active').notNull(),
	streak: integer("streak").default(0),
	checkin_days: jsonb("checkin_days").default([1,2,3,4,5,6,7]).notNull(),
	is_pinned: boolean("is_pinned").default(false),
});

export const habit_entries = pgTable("habit_entries", {
	id: serial("id").primaryKey().notNull(),
	habit_id: integer("habit_id").notNull().references(() => habits.id),
	completed_at: timestamp("completed_at", { mode: 'string', withTimezone: true }).defaultNow().notNull(),
	user_id: text("user_id").notNull(),
	tier_id: integer("tier_id").references(() => habit_challenge_tiers.id),
	comment: text("comment"),
	difficulty: difficulty("difficulty"),
	status: text('status'),
	failure_reason: text('failure_reason'),
},
	(table) => {
		return {
			idx_habit_entries_completed_at: index("idx_habit_entries_completed_at").using("btree", table.completed_at),
			idx_habit_entries_habit_id: index("idx_habit_entries_habit_id").using("btree", table.habit_id),
			idx_habit_entries_tier_id: index("idx_habit_entries_tier_id").using("btree", table.tier_id),
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

// 添加习惯挑战阶梯表
export const habit_challenge_tiers = pgTable("habit_challenge_tiers", {
	id: serial("id").primaryKey().notNull(),
	habit_id: integer("habit_id").notNull().references(() => habits.id, { onDelete: 'cascade' }),
	name: text("name").notNull(),
	level: integer("level").default(1).notNull(),
	description: text("description"),
	reward_points: integer("reward_points").notNull(),
	completion_criteria: jsonb("completion_criteria").default({}),
	created_at: timestamp("created_at", { mode: 'string', withTimezone: true }).defaultNow().notNull(),
	user_id: text("user_id").notNull(),
},
(table) => {
	return {
		idx_challenge_tiers_habit_id: index("idx_challenge_tiers_habit_id").using("btree", table.habit_id),
		idx_challenge_tiers_level: index("idx_challenge_tiers_level").using("btree", table.level),
	}
});

export const habit_targets = pgTable("habit_targets", {
	id: serial("id").primaryKey().notNull(),
	habit_id: integer("habit_id").notNull().references(() => habits.id),
	goal_id: integer("goal_id").notNull().references(() => goals.id),
	target_completion_rate: integer("target_completion_rate").notNull(),
	current_completion_rate: integer("current_completion_rate"),
	user_id: text("user_id").notNull(),
});

export const HabitTarget = habit_targets.$inferSelect
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
	todo_id: integer("todo_id").references(() => todos.id),
},
	(table) => {
		return {
			idx_pomodoros_user_id: index("idx_pomodoros_user_id").using("btree", table.user_id),
			idx_pomodoros_status: index("idx_pomodoros_status").using("btree", table.status),
			idx_pomodoros_start_time: index("idx_pomodoros_start_time").using("btree", table.start_time),
		}
	});

// 番茄钟与标签的关联表
export const pomodoro_tag_relations = pgTable("pomodoro_tag_relations", {
	pomodoro_id: integer("pomodoro_id").notNull().references(() => pomodoros.id),
	tag_id: integer("tag_id").notNull().references(() => tags.id),
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
	planned_date: timestamp("planned_date", { mode: 'string', withTimezone: true }),
	planned_start_time: timestamp("planned_start_time", { mode: 'string', withTimezone: true }),
	planned_end_time: timestamp("planned_end_time", { mode: 'string', withTimezone: true }),
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
	tag_id: integer("tag_id").notNull().references(() => tags.id, { onDelete: 'cascade' }),
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
	summary_type: summaryType("summary_type").default('daily'), // 总结类型：日常、三天、周总结
},
	(table) => {
		return {
			idx_daily_summaries_user_id: index("idx_daily_summaries_user_id").using("btree", table.user_id),
			idx_daily_summaries_date: index("idx_daily_summaries_date").using("btree", table.date),
			// 创建复合唯一索引，确保每个用户每天只有一条总结
			unique_user_date: uniqueIndex("unique_user_date").on(table.user_id, table.date),
		}
	});

// 笔记表
export const notes = pgTable("notes", {
	id: serial("id").primaryKey(),
	title: varchar("title", { length: 255 }).notNull(),
	content: text("content").notNull(),
	category: varchar("category", { length: 100 }),
	user_id: varchar("user_id", { length: 255 }).notNull(),
	created_at: timestamp("created_at", { mode: 'string', withTimezone: true }).defaultNow(),
	updated_at: timestamp("updated_at", { mode: 'string', withTimezone: true }).defaultNow(),
});

// 标签表
export const tags = pgTable("tags", {
	id: serial("id").primaryKey(),
	name: varchar("name", { length: 100 }).notNull(),
	color: varchar("color", { length: 50 }),
	kind:  varchar("kind", { length: 50 }),
	user_id: varchar("user_id", { length: 255 }).notNull(),
}, (table) => {
	return {
		nameUserIdIdx: uniqueIndex("nameUserIdIdx").on(table.name, table.user_id),
	};
});

// 笔记-标签关联表
export const notesTags = pgTable("notes_tags", {
	note_id: serial("note_id").references(() => notes.id).notNull(),
	tag_id: serial("tag_id").references(() => tags.id).notNull(),
}, (table) => {
	return {
		pk: primaryKey({ columns: [table.note_id, table.tag_id] }),
	};
});

// 定义关系
export const notesRelations = relations(notes, ({ many }) => ({
	tags: many(notesTags),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
	notes: many(notesTags),
}));

export const notesTagsRelations = relations(notesTags, ({ one }) => ({
	note: one(notes, {
		fields: [notesTags.note_id],
		references: [notes.id],
	}),
	tag: one(tags, {
		fields: [notesTags.tag_id],
		references: [tags.id],
	}),
}));

// 添加AI洞察类型枚举
export const insightKind = pgEnum("insight_kind", [
	'daily_summary',     // 日常总结
	'three_day_summary', // 三天总结
	'weekly_summary',    // 周总结
	'monthly_summary',   // 月度总结
	'quarterly_summary', // 季度总结
	'yearly_summary',    // 年度总结
	'personal_profile',  // 个人画像
	'habit_analysis',    // 习惯分析
	'goal_tracking',     // 目标进度跟踪
	'productivity_trend', // 生产力趋势
	'daily_quote',
])

// 添加AI洞察表
export const ai_insights = pgTable("ai_insights", {
	id: serial("id").primaryKey().notNull(),
	user_id: text("user_id").notNull(),
	kind: insightKind("kind").notNull(),
	title: text("title").notNull(),
	content: text("content").notNull(),     // AI 分析内容（文本格式）
	content_json: jsonb("content_json"),    // 结构化的 AI 分析内容（JSON 格式，可选）

	// 时间范围
	time_period_start: timestamp("time_period_start", { mode: 'string', withTimezone: true }).notNull(),
	time_period_end: timestamp("time_period_end", { mode: 'string', withTimezone: true }).notNull(),

	// 元数据
	metadata: jsonb("metadata").default({}), // 存储额外的元数据（如周数、月份等）

	// 系统时间戳
	created_at: timestamp("created_at", { mode: 'string', withTimezone: true }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { mode: 'string', withTimezone: true }).defaultNow().notNull(),

	// 引用和关联
	reference_ids: jsonb("reference_ids").default([]), // 可以引用相关的记录ID（如习惯、目标等）
	tags: jsonb("tags").default([]),                  // 标签数组
},
	(table) => {
		return {
			idx_ai_insights_user_id: index("idx_ai_insights_user_id").using("btree", table.user_id),
			idx_ai_insights_kind: index("idx_ai_insights_kind").using("btree", table.kind),
			idx_ai_insights_created_at: index("idx_ai_insights_created_at").using("btree", table.created_at),
		}
	});


export type User = InferSelectModel<typeof users>;

export const chat = pgTable('Chat', {
	id: uuid('id').primaryKey().notNull().defaultRandom(),
	createdAt: timestamp('createdAt').notNull(),
	title: text('title').notNull(),
	userId: text('userId')
		.notNull(),
	visibility: varchar('visibility', { enum: ['public', 'private'] })
		.notNull()
		.default('private'),
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://github.com/vercel/ai-chatbot/blob/main/docs/04-migrate-to-parts.md
export const messageDeprecated = pgTable('Message', {
	id: uuid('id').primaryKey().notNull().defaultRandom(),
	chatId: uuid('chatId')
		.notNull()
		.references(() => chat.id),
	role: varchar('role').notNull(),
	content: jsonb('content').notNull(),
	createdAt: timestamp('createdAt').notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable('Message_v2', {
	id: uuid('id').primaryKey().notNull().defaultRandom(),
	chatId: uuid('chatId')
		.notNull()
		.references(() => chat.id),
	role: varchar('role').notNull(),
	parts: jsonb('parts').notNull(),
	attachments: jsonb('attachments').notNull(),
	createdAt: timestamp('createdAt').notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://github.com/vercel/ai-chatbot/blob/main/docs/04-migrate-to-parts.md
export const voteDeprecated = pgTable(
	'Vote',
	{
		chatId: uuid('chatId')
			.notNull()
			.references(() => chat.id),
		messageId: uuid('messageId')
			.notNull()
			.references(() => messageDeprecated.id),
		isUpvoted: boolean('isUpvoted').notNull(),
	},
	(table) => {
		return {
			pk: primaryKey({ columns: [table.chatId, table.messageId] }),
		};
	},
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
	'Vote_v2',
	{
		chatId: uuid('chatId')
			.notNull()
			.references(() => chat.id),
		messageId: uuid('messageId')
			.notNull()
			.references(() => message.id),
		isUpvoted: boolean('isUpvoted').notNull(),
	},
	(table) => {
		return {
			pk: primaryKey({ columns: [table.chatId, table.messageId] }),
		};
	},
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
	'Document',
	{
		id: uuid('id').notNull().defaultRandom(),
		createdAt: timestamp('createdAt').notNull(),
		title: text('title').notNull(),
		content: text('content'),
		kind: varchar('text', { enum: ['text', 'code', 'image', 'sheet'] })
			.notNull()
			.default('text'),
		userId: text('userId')
			.notNull()
	},
	(table) => {
		return {
			pk: primaryKey({ columns: [table.id, table.createdAt] }),
		};
	},
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
	'Suggestion',
	{
		id: uuid('id').notNull().defaultRandom(),
		documentId: uuid('documentId').notNull(),
		documentCreatedAt: timestamp('documentCreatedAt').notNull(),
		originalText: text('originalText').notNull(),
		suggestedText: text('suggestedText').notNull(),
		description: text('description'),
		isResolved: boolean('isResolved').notNull().default(false),
		userId: text('userId')
			.notNull(),
		createdAt: timestamp('createdAt').notNull(),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.id] }),
		documentRef: foreignKey({
			columns: [table.documentId, table.documentCreatedAt],
			foreignColumns: [document.id, document.createdAt],
		}),
	}),
);

export type Suggestion = InferSelectModel<typeof suggestion>;


// 情景表定义
export const scenarios = pgTable('scenarios', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	user_id: text('user_id').notNull(),
	icon: text('icon'),
	color: text('color'),
	created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// 活跃情景表
export const active_scenarios = pgTable('active_scenarios', {
	id: serial('id').primaryKey(),
	scenario_id: integer('scenario_id').references(() => scenarios.id).notNull(),
	user_id: text('user_id').notNull(),
	activated_at: timestamp('activated_at', { withTimezone: true }).defaultNow().notNull(),
	deactivated_at: timestamp('deactivated_at', { withTimezone: true }),
	is_active: boolean('is_active').default(true).notNull()
});

// 习惯-情景关联表
export const habit_scenarios = pgTable('habit_scenarios', {
	id: serial('id').primaryKey(),
	habit_id: integer('habit_id').references(() => habits.id).notNull(),
	scenario_id: integer('scenario_id').references(() => scenarios.id).notNull(),
	user_id: text('user_id').notNull(),
	created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});