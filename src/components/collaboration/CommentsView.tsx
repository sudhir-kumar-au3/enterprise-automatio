import { useState, Dispatch, SetStateAction, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  X
} from '@phosphor-icons/react'
import { Comment, TeamMember, hasPermission } from '@/lib/collaboration-data'
import { services } from '@/lib/architecture-data'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export interface CommentsViewProps {
  comments: Comment[]
  setComments: Dispatch<SetStateAction<Comment[]>>
  teamMembers: TeamMember[]
  currentUser: TeamMember
  createCommentApi: (data: { content: string; contextType: string; contextId: string }) => Promise<{ success: boolean; data?: Comment; error?: string }>
  toggleResolveApi: (commentId: string) => Promise<{ success: boolean; data?: Comment; error?: string }>
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

const CommentsView = ({ comments, setComments, teamMembers, currentUser, createCommentApi, toggleResolveApi }: CommentsViewProps) => {
  const [newComment, setNewComment] = useState('')
  const [selectedService, setSelectedService] = useState('general')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const addComment = async () => {
    if (!newComment.trim()) return

    if (!hasPermission(currentUser, 'create_comments')) {
      toast.error('You do not have permission to create comments')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createCommentApi({
        content: newComment,
        contextType: 'service',
        contextId: selectedService
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

  const toggleResolve = async (commentId: string) => {
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
                <Textarea
                  ref={textareaRef}
                  placeholder="Share your thoughts, feedback, or questions..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
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
                          <ChatCircleDots size={18} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Add emoji</TooltipContent>
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
                const service = (services || []).find(s => s.id === comment.contextId)
                return (
                  <Card key={comment.id} className={comment.isResolved ? 'opacity-60' : ''}>
                    <CardContent className="pt-6">
                      <div className="flex gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={author?.avatarUrl} alt={author?.name} />
                          <AvatarFallback>
                            {author?.name.split(' ').map(n => n[0]).join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-sm">{author?.name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatTimeAgo(comment.timestamp)} · {service?.name || 'General'}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleResolve(comment.id)}
                              className="gap-1"
                            >
                              <CheckCircle size={16} weight={comment.isResolved ? 'fill' : 'regular'} />
                              {comment.isResolved ? 'Resolved' : 'Resolve'}
                            </Button>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
