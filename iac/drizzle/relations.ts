import { relations } from "drizzle-orm/relations";
import { habits, habit_entries, habit_targets, goals } from "./schema";

export const habit_entriesRelations = relations(habit_entries, ({one}) => ({
	habit: one(habits, {
		fields: [habit_entries.habit_id],
		references: [habits.id]
	}),
}));

export const habitsRelations = relations(habits, ({many}) => ({
	habit_entries: many(habit_entries),
	habit_targets: many(habit_targets),
}));

export const habit_targetsRelations = relations(habit_targets, ({one}) => ({
	habit: one(habits, {
		fields: [habit_targets.habit_id],
		references: [habits.id]
	}),
	goal: one(goals, {
		fields: [habit_targets.goal_id],
		references: [goals.id]
	}),
}));

export const goalsRelations = relations(goals, ({many}) => ({
	habit_targets: many(habit_targets),
}));