'use server'
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { auth } from '@/lib/auth';

import {
    createGoalInDB, 
    updateGoalInDB, 
    deleteGoalInDB, 
    createHabitTargetInDB,
    updateHabitTargetInDB,
    deleteHabitTargetInDB,
    calculateGoalProgress,
    getGoalByIdInDB,
    getGoalsInDB,
} from '@/lib/db-goal';

// Schema for goal validation
const goalSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    type: z.enum(['annual', 'quarterly', 'monthly', 'custom']),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    habitTargets: z.array(z.object({
        habitId: z.number(),
        targetCompletionRate: z.number().min(0).max(100),
        currentCompletionRate: z.number().min(0).max(100).optional(),
    }))
});

export async function createNewGoal(formData: FormData) {
    const session = await auth();
    if (!session?.user) {
        throw new Error('You must be logged in to create a goal');
    }

    const rawData = {
        title: formData.get('title'),
        description: formData.get('description'),
        type: formData.get('type'),
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate'),
        habitTargets: JSON.parse(formData.get('habitTargets') as string || '[]'),
    };

    const validatedData = goalSchema.parse(rawData);
    
    const result = await createGoalInDB({
        ...validatedData,
        userId: session.user.id,
        habitTargets: validatedData.habitTargets.map(target => ({
            ...target,
            userId: session.user.id,
            goalId: '', // This will be set in the createGoal function
        }))
    });

    if (!result) {
        throw new Error('Failed to create goal');
    }

    revalidatePath('/goals');
    redirect('/goals');
}

export async function updateExistingGoal(id: string, formData: FormData) {
    const session = await auth();
    if (!session?.user) {
        throw new Error('You must be logged in to update a goal');
    }

    const rawData = {
        title: formData.get('title'),
        description: formData.get('description'),
        type: formData.get('type'),
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate'),
        habitTargets: JSON.parse(formData.get('habitTargets') as string || '[]'),
    };

    const validatedData = goalSchema.parse(rawData);
    
    const result = await updateGoalInDB(id, validatedData);

    if (!result) {
        throw new Error('Failed to update goal');
    }

    revalidatePath(`/goals/${id}`);
    revalidatePath('/goals');
    redirect(`/goals/${id}`);
}

export async function deleteExistingGoal(id: string) {
    const session = await auth();
    if (!session?.user) {
        throw new Error('You must be logged in to delete a goal');
    }

    const success = await deleteGoalInDB(id);

    if (!success) {
        throw new Error('Failed to delete goal');
    }

    revalidatePath('/goals');
    redirect('/goals');
}

export async function updateGoalProgress(goalId: string) {
    const session = await auth();
    if (!session?.user) {
        throw new Error('You must be logged in to update goal progress');
    }

    await calculateGoalProgress(goalId);
    revalidatePath(`/goals/${goalId}`);
    revalidatePath('/goals');
}

export async function updateHabitTargetCompletion(
    targetId: number, 
    completionRate: number
) {
    const session = await auth();
    if (!session?.user) {
        throw new Error('You must be logged in to update habit completion');
    }

    const result = await updateHabitTargetInDB(targetId, { 
        currentCompletionRate: completionRate 
    });

    if (!result) {
        throw new Error('Failed to update habit completion');
    }

    // Assume we can get the goalId from the result
    const goalId = result.goalId;
    await updateGoalProgress(goalId);
}

export async function getGoals(userId: string) {
    const session = await auth();
    if (!session?.user) {
        throw new Error('You must be logged in to get goals');
    }

    const goalsData = await getGoalsInDB(userId);
    
    // Group goals by their ID
    const goalsMap = new Map();
    
    goalsData.forEach(item => {
        const goalId = item.goals.id;
        
        if (!goalsMap.has(goalId)) {
            // Initialize a new goal entry with an empty habitTargets array
            goalsMap.set(goalId, {
                ...item.goals,
                habitTargets: []
            });
        }
        
        // Add this habit target to the goal's habitTargets array
        goalsMap.get(goalId).habitTargets.push({
            id: item.habit_targets.id,
            habitId: item.habit_targets.habitId,
            goalId: item.habit_targets.goalId,
            targetCompletionRate: item.habit_targets.targetCompletionRate,
            currentCompletionRate: item.habit_targets.currentCompletionRate || 0,
            userId: item.habit_targets.userId,
            habit: item.habits // Include habit details
        });
    });
    
    // Convert the map back to an array
    const formattedGoals = Array.from(goalsMap.values());
    
    return formattedGoals;
}

export async function getGoalById(id: string) {
    const session = await auth();
    if (!session?.user) {
        throw new Error('You must be logged in to get goal by ID');
    }   

    const goal = await getGoalByIdInDB(id);
    return goal;
}