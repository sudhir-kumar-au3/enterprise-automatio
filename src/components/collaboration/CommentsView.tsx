import { useState, Dispatch, SetStateAction, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  ChatCircleDots, 
  PaperPlaneTilt,
  CheckCircle,
  Clock,
  FunnelSimple,
  MagnifyingGlass,
  X,
  Pencil,
  Trash,
  Smiley,
  ArrowBendUpLeft,
  At
} from '@phosphor-icons/react'
import { Comment, TeamMember, hasPermission, Reaction } from '@/lib/collaboration-data'
import { services } from '@/lib/architecture-data'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

// Common emoji reactions
const EMOJI_OPTIONS = ['👍', '👎', '❤️', '🎉', '🚀', '👀', '💯', '🔥']

export interface CommentsViewProps {
  comments: Comment[]
  setComments: Dispatch<SetStateAction<Comment[]>>
  teamMembers: TeamMember[]
  currentUser: TeamMember
  createCommentApi: (data: { content: string; contextType: string; contextId: string; mentions?: string[] }) => Promise<{ success: boolean; data?: Comment; error?: string }>
  updateCommentApi: (id: string, data: { content: string }) => Promise<{ success: boolean; data?: Comment; error?: string }>
  deleteCommentApi: (id: string) => Promise<{ success: boolean; error?: string }>
  toggleResolveApi: (commentId: string) => Promise<{ success: boolean; data?: Comment; error?: string }>
  addReactionApi: (commentId: string, emoji: string) => Promise<{ success: boolean; data?: Comment; error?: string }>
  removeReactionApi: (commentId: string) => Promise<{ success: boolean; data?: Comment; error?: string }>
  addReplyApi: (commentId: string, data: { content: string; mentions?: string[] }) => Promise<{ success: boolean; data?: Comment; error?: string }>
}

const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

// Extract mentions from content (e.g., @user-1)
const extractMentions = (content: string): string[] => {
  const mentionRegex = /@(\S+)/g
  const matches = content.match(mentionRegex)
  return matches ? matches.map(m => m.slice(1)) : []
}

// Mention Autocomplete Component
interface MentionInputProps {
  value: string
  onChange: (value: string) => void
  teamMembers: TeamMember[]
  placeholder?: string
  className?: string
  onKeyDown?: (e: React.KeyboardEvent) => void
  disabled?: boolean
  textareaRef?: React.RefObject<HTMLTextAreaElement>
}

const MentionInput = ({ value, onChange, teamMembers, placeholder, className, onKeyDown, disabled, textareaRef }: MentionInputProps) => {
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 })
  const internalRef = useRef<HTMLTextAreaElement>(null)
  const ref = textareaRef || internalRef

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    onChange(newValue)

    // Check for @ trigger
    const cursorPos = e.target.selectionStart
    const textBeforeCursor = newValue.slice(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)
      // Only show if @ is at start or preceded by space, and no space after @
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' '
      if ((charBeforeAt === ' ' || charBeforeAt === '\n' || lastAtIndex === 0) && !textAfterAt.includes(' ')) {
        setMentionSearch(textAfterAt.toLowerCase())
        setShowMentions(true)
        return
      }
    }
    setShowMentions(false)
  }

  const insertMention = (member: TeamMember) => {
    const cursorPos = ref.current?.selectionStart || 0
    const textBeforeCursor = value.slice(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    const textAfterCursor = value.slice(cursorPos)
    
    const newValue = value.slice(0, lastAtIndex) + `@${member.name} ` + textAfterCursor
    onChange(newValue)
    setShowMentions(false)
    
    // Focus back on textarea
    setTimeout(() => ref.current?.focus(), 0)
  }

  const filteredMembers = teamMembers.filter(m => 
    m.name.toLowerCase().includes(mentionSearch) || 
    m.email.toLowerCase().includes(mentionSearch)
  ).slice(0, 5)

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        value={value}
        onChange={handleInput}
        placeholder={placeholder}
        className={className}
        onKeyDown={(e) => {
          if (showMentions && filteredMembers.length > 0) {
            if (e.key === 'Tab' || e.key === 'Enter') {
              e.preventDefault()
              insertMention(filteredMembers[0])
              return
            }
            if (e.key === 'Escape') {
              setShowMentions(false)
              return
            }
          }
          onKeyDown?.(e)
        }}
        disabled={disabled}
      />
      {showMentions && filteredMembers.length > 0 && (
        <div className="absolute z-50 bottom-full mb-1 left-0 w-64 bg-popover border rounded-lg shadow-lg overflow-hidden">
          <div className="p-1">
            <p className="text-xs text-muted-foreground px-2 py-1">Mention someone</p>
            {filteredMembers.map(member => (
              <button
                key={member.id}
                className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded text-left"
                onClick={() => insertMention(member)}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={member.avatarUrl} />
                  <AvatarFallback className="text-xs">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{member.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Emoji Picker Component
interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  existingReactions?: Reaction[]
  currentUserId: string
}

const EmojiPicker = ({ onSelect, existingReactions = [], currentUserId }: EmojiPickerProps) => {
  const userReaction = existingReactions.find(r => r.userId === currentUserId)
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
          <Smiley size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="flex gap-1 flex-wrap max-w-[200px]">
          {EMOJI_OPTIONS.map(emoji => (
            <button
              key={emoji}
              onClick={() => onSelect(emoji)}
              className={cn(
                "text-lg p-1.5 hover:bg-accent rounded transition-colors",
                userReaction?.emoji === emoji && "bg-primary/10 ring-1 ring-primary"
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Reactions Display Component
interface ReactionsDisplayProps {
  reactions: Reaction[]
  teamMembers: TeamMember[]
  currentUserId: string
  onAddReaction: (emoji: string) => void
  onRemoveReaction: () => void
}

const ReactionsDisplay = ({ reactions, teamMembers, currentUserId, onAddReaction, onRemoveReaction }: ReactionsDisplayProps) => {
  if (reactions.length === 0) return null

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = []
    acc[r.emoji].push(r)
    return acc
  }, {} as Record<string, Reaction[]>)

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {Object.entries(groupedReactions).map(([emoji, reactionList]) => {
        const hasUserReacted = reactionList.some(r => r.userId === currentUserId)
        const reactorNames = reactionList
          .map(r => teamMembers.find(m => m.id === r.userId)?.name || 'Unknown')
          .join(', ')

        return (
          <Tooltip key={emoji}>
            <TooltipTrigger asChild>
              <button
                onClick={() => hasUserReacted ? onRemoveReaction() : onAddReaction(emoji)}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors",
                  hasUserReacted 
                    ? "bg-primary/10 border-primary/30 text-primary" 
                    : "bg-muted/50 border-transparent hover:bg-muted"
                )}
              >
                <span>{emoji}</span>
                <span className="font-medium">{reactionList.length}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">{reactorNames}</p>
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

// Comment Card Component
interface CommentCardProps {
  comment: Comment
  author: TeamMember | undefined
  currentUser: TeamMember
  teamMembers: TeamMember[]
  onToggleResolve: () => void
  onEdit: (content: string) => void
  onDelete: () => void
  onAddReaction: (emoji: string) => void
  onRemoveReaction: () => void
  onReply: (content: string, mentions?: string[]) => void
  isEditing: boolean
  setEditingId: (id: string | null) => void
}

const CommentCard = ({ 
  comment, 
  author, 
  currentUser, 
  teamMembers,
  onToggleResolve, 
  onEdit, 
  onDelete,
  onAddReaction,
  onRemoveReaction,
  onReply,
  isEditing,
  setEditingId
}: CommentCardProps) => {
  const [editContent, setEditContent] = useState(comment.content)
  const [showReply, setShowReply] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false)
  const [isSubmittingReply, setIsSubmittingReply] = useState(false)
  
  const service = (services || []).find(s => s.id === comment.contextId)
  const canEdit = comment.authorId === currentUser.id
  const canDelete = comment.authorId === currentUser.id || hasPermission(currentUser, 'delete_comments')

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return
    setIsSubmittingEdit(true)
    await onEdit(editContent)
    setIsSubmittingEdit(false)
    setEditingId(null)
  }

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) return
    setIsSubmittingReply(true)
    const mentions = extractMentions(replyContent)
    await onReply(replyContent, mentions.length > 0 ? mentions : undefined)
    setReplyContent('')
    setShowReply(false)
    setIsSubmittingReply(false)
  }

  // Render content with highlighted mentions
  const renderContent = (content: string) => {
    const parts = content.split(/(@\S+)/g)
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const mentionName = part.slice(1)
        const mentionedMember = teamMembers.find(m => 
          m.name.toLowerCase() === mentionName.toLowerCase() ||
          m.id === mentionName
        )
        return (
          <span key={i} className="text-primary font-medium bg-primary/10 px-1 rounded">
            {part}
          </span>
        )
      }
      return part
    })
  }

  return (
    <Card className={cn("transition-opacity", comment.isResolved && 'opacity-60')}>
      <CardContent className="pt-4 pb-3">
        <div className="flex gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={author?.avatarUrl} alt={author?.name} />
            <AvatarFallback className="text-xs">
              {author?.name.split(' ').map(n => n[0]).join('') || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{author?.name || 'Unknown'}</p>
                  <span className="text-xs text-muted-foreground">·</span>
                  <p className="text-xs text-muted-foreground">
                    {formatTimeAgo(comment.timestamp)}
                  </p>
                  {service && (
                    <>
                      <span className="text-xs text-muted-foreground">·</span>
                      <Badge variant="outline" className="text-[10px] h-5">
                        {service.name}
                      </Badge>
                    </>
                  )}
                  {comment.isResolved && (
                    <Badge variant="secondary" className="text-[10px] h-5 gap-1 bg-green-500/10 text-green-600">
                      <CheckCircle size={10} weight="fill" />
                      Resolved
                    </Badge>
                  )}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 -mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="19" cy="12" r="1" />
                      <circle cx="5" cy="12" r="1" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onToggleResolve}>
                    <CheckCircle size={16} className="mr-2" />
                    {comment.isResolved ? 'Reopen' : 'Resolve'}
                  </DropdownMenuItem>
                  {canEdit && (
                    <DropdownMenuItem onClick={() => setEditingId(comment.id)}>
                      <Pencil size={16} className="mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                            <Trash size={16} className="mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete comment?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the comment.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <MentionInput
                  value={editContent}
                  onChange={setEditContent}
                  teamMembers={teamMembers}
                  className="min-h-[60px] text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setEditingId(null)
                      setEditContent(comment.content)
                    }
                  }}
                />
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setEditingId(null)
                      setEditContent(comment.content)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={!editContent.trim() || isSubmittingEdit}
                  >
                    {isSubmittingEdit ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{renderContent(comment.content)}</p>
            )}

            {/* Reactions */}
            <ReactionsDisplay
              reactions={comment.reactions || []}
              teamMembers={teamMembers}
              currentUserId={currentUser.id}
              onAddReaction={onAddReaction}
              onRemoveReaction={onRemoveReaction}
            />

            {/* Action buttons */}
            {!isEditing && (
              <div className="flex items-center gap-1 pt-1">
                <EmojiPicker
                  onSelect={onAddReaction}
                  existingReactions={comment.reactions}
                  currentUserId={currentUser.id}
                />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                  onClick={() => setShowReply(!showReply)}
                >
                  <ArrowBendUpLeft size={14} />
                  Reply
                </Button>
              </div>
            )}

            {/* Reply input */}
            {showReply && (
              <div className="mt-3 pl-4 border-l-2 border-muted space-y-2">
                <MentionInput
                  value={replyContent}
                  onChange={setReplyContent}
                  teamMembers={teamMembers}
                  placeholder="Write a reply... Use @ to mention"
                  className="min-h-[60px] text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleSubmitReply()
                    }
                    if (e.key === 'Escape') {
                      setShowReply(false)
                      setReplyContent('')
                    }
                  }}
                />
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setShowReply(false)
                      setReplyContent('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleSubmitReply}
                    disabled={!replyContent.trim() || isSubmittingReply}
                    className="gap-1"
                  >
                    <PaperPlaneTilt size={14} weight="fill" />
                    {isSubmittingReply ? 'Sending...' : 'Reply'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const CommentsView = ({ 
  comments, 
  setComments, 
  teamMembers, 
  currentUser, 
  createCommentApi, 
  updateCommentApi,
  deleteCommentApi,
  toggleResolveApi,
  addReactionApi,
  removeReactionApi,
  addReplyApi
}: CommentsViewProps) => {
  const [newComment, setNewComment] = useState('')
  const [selectedService, setSelectedService] = useState('general')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const addComment = async () => {
    if (!newComment.trim()) return

    if (!hasPermission(currentUser, 'create_comments')) {
      toast.error('You do not have permission to create comments')
      return
    }

    setIsSubmitting(true)
    try {
      const mentions = extractMentions(newComment)
      const result = await createCommentApi({
        content: newComment,
        contextType: 'service',
        contextId: selectedService,
        mentions: mentions.length > 0 ? mentions : undefined
      })
      if (result.success && result.data) {
        setComments(current => [...current, result.data!])
        setNewComment('')
        toast.success('Comment posted successfully')
      } else {
        toast.error(result.error || 'Failed to post comment')
      }
    } catch (error) {
      toast.error('Failed to post comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleResolve = async (commentId: string) => {
    const comment = comments.find(c => c.id === commentId)
    if (comment && comment.authorId !== currentUser.id && !hasPermission(currentUser, 'delete_comments')) {
      toast.error('You can only resolve your own comments')
      return
    }

    try {
      const result = await toggleResolveApi(commentId)
      if (result.success && result.data) {
        setComments(current =>
          current.map(c => c.id === commentId ? { ...c, isResolved: !c.isResolved } : c)
        )
        toast.success(comment?.isResolved ? 'Comment reopened' : 'Comment resolved')
      } else {
        toast.error(result.error || 'Failed to update comment')
      }
    } catch (error) {
      toast.error('Failed to update comment')
    }
  }

  const handleEditComment = async (commentId: string, content: string) => {
    try {
      const result = await updateCommentApi(commentId, { content })
      if (result.success && result.data) {
        setComments(current =>
          current.map(c => c.id === commentId ? { ...c, content } : c)
        )
        toast.success('Comment updated')
      } else {
        toast.error(result.error || 'Failed to update comment')
      }
    } catch (error) {
      toast.error('Failed to update comment')
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    try {
      const result = await deleteCommentApi(commentId)
      if (result.success) {
        setComments(current => current.filter(c => c.id !== commentId))
        toast.success('Comment deleted')
      } else {
        toast.error(result.error || 'Failed to delete comment')
      }
    } catch (error) {
      toast.error('Failed to delete comment')
    }
  }

  const handleAddReaction = async (commentId: string, emoji: string) => {
    try {
      const result = await addReactionApi(commentId, emoji)
      if (result.success && result.data) {
        setComments(current =>
          current.map(c => c.id === commentId ? { ...c, reactions: result.data!.reactions } : c)
        )
      } else {
        toast.error(result.error || 'Failed to add reaction')
      }
    } catch (error) {
      toast.error('Failed to add reaction')
    }
  }

  const handleRemoveReaction = async (commentId: string) => {
    try {
      const result = await removeReactionApi(commentId)
      if (result.success && result.data) {
        setComments(current =>
          current.map(c => c.id === commentId ? { ...c, reactions: result.data!.reactions } : c)
        )
      } else {
        toast.error(result.error || 'Failed to remove reaction')
      }
    } catch (error) {
      toast.error('Failed to remove reaction')
    }
  }

  const handleAddReply = async (parentId: string, content: string, mentions?: string[]) => {
    try {
      const result = await addReplyApi(parentId, { content, mentions })
      if (result.success && result.data) {
        setComments(current => [...current, result.data!])
        toast.success('Reply posted')
      } else {
        toast.error(result.error || 'Failed to post reply')
      }
    } catch (error) {
      toast.error('Failed to post reply')
    }
  }

  const filteredComments = comments
    .filter(comment => {
      if (filter === 'resolved') return comment.isResolved
      if (filter === 'unresolved') return !comment.isResolved
      return true
    })
    .filter(comment => {
      if (!searchQuery) return true
      const author = teamMembers.find(m => m.id === comment.authorId)
      return (
        comment.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        author?.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })

  const stats = {
    total: comments.length,
    resolved: comments.filter(c => c.isResolved).length,
    unresolved: comments.filter(c => !c.isResolved).length
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
                <ChatCircleDots size={22} weight="fill" className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Discussion</h3>
                <p className="text-xs text-muted-foreground">{stats.total} comments</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 mr-2">
              <Badge variant="outline" className="gap-1.5 bg-green-500/10 text-green-600 border-green-500/30">
                <CheckCircle size={12} weight="fill" />
                {stats.resolved} resolved
              </Badge>
              <Badge variant="outline" className="gap-1.5 bg-amber-500/10 text-amber-600 border-amber-500/30">
                <Clock size={12} weight="fill" />
                {stats.unresolved} open
              </Badge>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={showSearch ? "secondary" : "outline"} 
                  size="icon" 
                  className="h-9 w-9"
                  onClick={() => setShowSearch(!showSearch)}
                >
                  <MagnifyingGlass size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Search comments</TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 h-9">
                  <FunnelSimple size={16} />
                  <span className="hidden sm:inline">
                    {filter === 'all' ? 'All' : filter === 'resolved' ? 'Resolved' : 'Open'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFilter('all')}>
                  <ChatCircleDots size={16} className="mr-2" />
                  All Comments
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('unresolved')}>
                  <Clock size={16} className="mr-2 text-amber-500" />
                  Open
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('resolved')}>
                  <CheckCircle size={16} className="mr-2 text-green-500" />
                  Resolved
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {showSearch && (
          <div className="relative">
            <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search comments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X size={14} />
              </Button>
            )}
          </div>
        )}

        {/* New Comment Input */}
        <Card className="overflow-hidden border-2 border-dashed border-muted-foreground/20 hover:border-primary/30 transition-colors">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {currentUser.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{currentUser.name}</span>
                  <span className="text-xs text-muted-foreground">posting to</span>
                  <Select value={selectedService} onValueChange={setSelectedService}>
                    <SelectTrigger className="h-7 w-auto text-xs gap-1 border-dashed">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">
                        <span className="flex items-center gap-2">
                          <ChatCircleDots size={14} />
                          General
                        </span>
                      </SelectItem>
                      {(services || []).map(service => (
                        <SelectItem key={service.id} value={service.id}>
                          <span className="flex items-center gap-2">
                            {service.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <MentionInput
                  value={newComment}
                  onChange={setNewComment}
                  teamMembers={teamMembers}
                  placeholder="Share your thoughts, feedback, or questions... Use @ to mention someone"
                  className="min-h-[80px] resize-none border-0 p-0 focus-visible:ring-0 text-sm placeholder:text-muted-foreground/60"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      addComment()
                    }
                  }}
                />
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <At size={18} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Mention someone (@)</TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      ⌘ + Enter to post
                    </span>
                    <Button 
                      onClick={addComment} 
                      disabled={!newComment.trim() || isSubmitting}
                      className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                    >
                      <PaperPlaneTilt size={16} weight="fill" />
                      Post
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments List */}
        <div className="space-y-3">
          {filteredComments.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center mx-auto mb-4">
                  <ChatCircleDots size={32} className="text-blue-500" />
                </div>
                <p className="font-medium text-lg mb-1">
                  {searchQuery ? 'No comments found' : 'No comments yet'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery 
                    ? 'Try adjusting your search query'
                    : 'Start the conversation by posting the first comment!'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {[...filteredComments].reverse().map((comment) => {
                const author = teamMembers.find(m => m.id === comment.authorId)
                return (
                  <CommentCard
                    key={comment.id}
                    comment={comment}
                    author={author}
                    currentUser={currentUser}
                    teamMembers={teamMembers}
                    onToggleResolve={() => handleToggleResolve(comment.id)}
                    onEdit={(content) => handleEditComment(comment.id, content)}
                    onDelete={() => handleDeleteComment(comment.id)}
                    onAddReaction={(emoji) => handleAddReaction(comment.id, emoji)}
                    onRemoveReaction={() => handleRemoveReaction(comment.id)}
                    onReply={(content, mentions) => handleAddReply(comment.id, content, mentions)}
                    isEditing={editingId === comment.id}
                    setEditingId={setEditingId}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

export default CommentsView
