import { GoalForm } from '../goal-form';
import { getHabits } from '../../habits/actions';
import { auth } from '@/lib/auth';

export default async function NewGoalPage() {
  const session = await auth();
  
  // 获取用户所有习惯以供选择
  const habits = session?.user ? await getHabits() : [];
  
  return (
    <div className="max-w-3xl mx-auto py-6">
      <h1 className="text-3xl font-bold tracking-tight mb-6">创建新目标</h1>
      <GoalForm habits={habits} />
    </div>
  );
}
