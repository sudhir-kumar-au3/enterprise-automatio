import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Comment, TeamMember } from '@/lib/collaboration-data'
import { services } from '@/lib/architecture-data'
import { cn } from '@/lib/utils'
import { 
  CheckCircle, 
  Clock, 
  Heart, 
  ArrowBendUpLeft,
  DotsThree,
  Sparkle
} from '@phosphor-icons/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface CommentCardProps {
  comment: Comment
  author?: TeamMember
  compact?: boolean
  showActions?: boolean
  onResolve?: (commentId: string) => void
  onReply?: (commentId: string) => void
  onLike?: (commentId: string) => void
}

// Time formatting helper
const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString('default', { month: 'short', day: 'numeric' })
}

const CommentCard = ({ 
  comment, 
  author, 
  compact = false,
  showActions = true,
  onResolve,
  onReply,
  onLike
}: CommentCardProps) => {
  const service = (services || []).find(s => s.id === comment.contextId)
  
  if (compact) {
    return (
      <div className={cn(
        "flex gap-3 p-3 rounded-xl border bg-card hover:bg-muted/50 transition-all group",
        comment.isResolved && "opacity-60 bg-muted/30"
      )}>
        <div className="relative">
          <Avatar className={cn(
            "h-8 w-8 border-2 transition-colors",
            comment.isResolved ? "border-green-500/30" : "border-transparent"
          )}>
            <AvatarImage src={author?.avatarUrl} alt={author?.name} />
            <AvatarFallback className={cn(
              "text-xs font-semibold",
              comment.isResolved ? "bg-green-500/10 text-green-600" : "bg-primary/10 text-primary"
            )}>
              {author?.name.split(' ').map(n => n[0]).join('') || 'U'}
            </AvatarFallback>
          </Avatar>
          {author?.isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">{author?.name || 'Unknown'}</p>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock size={10} />
              {formatTimeAgo(comment.timestamp)}
            </span>
            {service && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-1">
                <Sparkle size={8} />
                {service.name}
              </Badge>
            )}
            {comment.isResolved && (
              <Badge className="text-[10px] h-4 px-1.5 gap-1 bg-green-500/10 text-green-600 border border-green-500/30">
                <CheckCircle size={8} weight="fill" />
                Resolved
              </Badge>
            )}
          </div>
          <p className={cn(
            "text-sm text-foreground line-clamp-2",
            comment.isResolved && "text-muted-foreground"
          )}>
            {comment.content}
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <div className={cn(
      "flex gap-3 p-4 rounded-xl border bg-card hover:shadow-md transition-all group",
      comment.isResolved && "bg-muted/30"
    )}>
      {/* Avatar with online status */}
      <div className="relative flex-shrink-0">
        <Avatar className={cn(
          "h-10 w-10 border-2 transition-colors",
          comment.isResolved ? "border-green-500/30" : "border-transparent hover:border-primary/30"
        )}>
          <AvatarImage src={author?.avatarUrl} alt={author?.name} />
          <AvatarFallback className={cn(
            "font-semibold",
            comment.isResolved ? "bg-green-500/10 text-green-600" : "bg-primary/10 text-primary"
          )}>
            {author?.name.split(' ').map(n => n[0]).join('') || 'U'}
          </AvatarFallback>
        </Avatar>
        {author?.isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">{author?.name || 'Unknown'}</p>
            {author?.role && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                {author.role}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock size={12} />
              {formatTimeAgo(comment.timestamp)}
            </span>
          </div>
          
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <DotsThree size={16} weight="bold" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {onResolve && (
                  <DropdownMenuItem onClick={() => onResolve(comment.id)}>
                    <CheckCircle size={14} className="mr-2" />
                    {comment.isResolved ? 'Reopen' : 'Resolve'}
                  </DropdownMenuItem>
                )}
                {onReply && (
                  <DropdownMenuItem onClick={() => onReply(comment.id)}>
                    <ArrowBendUpLeft size={14} className="mr-2" />
                    Reply
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        {/* Context Badge */}
        <div className="flex items-center gap-2 mt-1">
          {service && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1">
              <Sparkle size={10} />
              {service.name}
            </Badge>
          )}
          {comment.isResolved && (
            <Badge className="text-[10px] h-5 px-1.5 gap-1 bg-green-500/10 text-green-600 border border-green-500/30">
              <CheckCircle size={10} weight="fill" />
              Resolved
            </Badge>
          )}
        </div>
        
        {/* Content */}
        <p className={cn(
          "text-sm mt-2 leading-relaxed",
          comment.isResolved && "text-muted-foreground"
        )}>
          {comment.content}
        </p>
        
        {/* Actions Footer */}
        {showActions && (
          <div className="flex items-center gap-1 mt-3 pt-2 border-t border-transparent group-hover:border-border transition-colors">
            {onLike && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-red-500"
                onClick={() => onLike(comment.id)}
              >
                <Heart size={14} />
                Like
              </Button>
            )}
            {onReply && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-primary"
                onClick={() => onReply(comment.id)}
              >
                <ArrowBendUpLeft size={14} />
                Reply
              </Button>
            )}
            {onResolve && !comment.isResolved && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-green-600"
                onClick={() => onResolve(comment.id)}
              >
                <CheckCircle size={14} />
                Resolve
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default CommentCard
