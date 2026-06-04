export type UserRole = 'coach' | 'member';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  type: 'swimming' | 'cardio' | 'strength' | 'wellness' | 'other';
  isCompleted: boolean;
  dueDate?: string;
  notes?: string; // Notes du coach
  memberComment?: string; // Commentaire du membre
  status?: 'pending' | 'done' | 'not_done'; // Statut défini par le membre
}

export interface WeeklyGoal {
  id: string;
  weekStart: string;
  tasks: Task[];
  completedCount: number;
  totalCount: number;
}
