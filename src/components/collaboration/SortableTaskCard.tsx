import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Task, TeamMember } from '@/lib/collaboration-data'
import TaskCard from './TaskCard'

export interface SortableTaskCardProps {
  task: Task
  onClick: () => void
  onStatusChange?: (status: Task['status']) => void
  isDraggable?: boolean
  teamMembers?: TeamMember[]
  allTasks?: Task[]
}

const SortableTaskCard = ({ 
  task, 
  onClick, 
  onStatusChange, 
  isDraggable = true, 
  teamMembers, 
  allTasks = [] 
}: SortableTaskCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: !isDraggable })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="w-full">
      <TaskCard
        task={task}
        onClick={onClick}
        onStatusChange={onStatusChange}
        isDraggable={isDraggable}
        isDragging={isDragging}
        teamMembers={teamMembers}
        allTasks={allTasks}
      />
    </div>
  )
}

export default SortableTaskCard
