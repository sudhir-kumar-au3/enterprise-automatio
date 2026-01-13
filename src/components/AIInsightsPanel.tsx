import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Lightbulb, 
  AlertTriangle, 
  TrendingUp, 
  ChevronRight, 
  Loader2, 
  RefreshCw,
  Brain,
  Zap,
  CheckCircle2,
  Scale,
  Calendar,
  Users,
  BarChart3,
  ArrowUpRight,
  Play,
  Target,
  MessageSquare,
  Send,
  Bot,
  Wand2,
  Activity,
  Shield,
  Gauge,
  Clock,
  ChevronDown,
  ExternalLink,
  TrendingDown,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAI } from '@/contexts';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useTasks, useTeamMembers } from '@/hooks';

// Real-time analysis types
interface AnalysisResult {
  insights: AnalyzedInsight[];
  workload: WorkloadData;
  risks: RiskData[];
  suggestions: string[];
  lastAnalyzed: number;
}

interface AnalyzedInsight {
  id: string;
  type: 'optimization' | 'warning' | 'suggestion' | 'prediction';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  action?: () => void;
  actionLabel?: string;
}

interface WorkloadData {
  balanceScore: number;
  totalTasks: number;
  avgTasksPerMember: number;
  overloaded: { id: string; name: string; tasks: number; recommended: number }[];
  underutilized: { id: string; name: string; tasks: number; capacity: number }[];
}

interface RiskData {
  taskId: string;
  taskTitle: string;
  dueDate: number;
  riskLevel: 'medium' | 'high' | 'critical';
  probability: number;
  reasons: string[];
  suggestion: string;
}

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: number;
  isTyping?: boolean;
}

export function AIInsightsPanel() {
  const { insights, isAnalyzing, generateInsights, dismissInsight } = useAI();
  const { tasks } = useTasks();
  const { members: teamMembers } = useTeamMembers();
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && chatMessages.length === 0) {
      setChatMessages([{
        id: 'welcome',
        role: 'assistant',
        content: "Hi! I'm your AI assistant. I can help analyze your project, identify risks, and suggest improvements. Try asking me something like:\n\n• \"How is our team's workload?\"\n• \"Show me tasks at risk\"\n• \"What should I focus on today?\"",
        timestamp: Date.now()
      }]);
    }
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Perform real analysis when panel opens or data changes
  const runAnalysis = async () => {
    if (!tasks || !teamMembers) return;
    
    setIsRunningAnalysis(true);
    
    // Simulate processing time for UX
    await new Promise(r => setTimeout(r, 800));
    
    const activeTasks = tasks.filter(t => t.status !== 'done');
    const now = Date.now();
    
    // === WORKLOAD ANALYSIS ===
    const tasksByMember: Record<string, number> = {};
    teamMembers.forEach(m => { tasksByMember[m.id] = 0; });
    
    activeTasks.forEach(task => {
      if (task.assigneeId && tasksByMember[task.assigneeId] !== undefined) {
        tasksByMember[task.assigneeId]++;
      }
    });
    
    const counts = Object.values(tasksByMember);
    const totalTasks = counts.reduce((a, b) => a + b, 0);
    const avgTasks = teamMembers.length > 0 ? totalTasks / teamMembers.length : 0;
    
    const overloaded = teamMembers
      .filter(m => tasksByMember[m.id] > avgTasks * 1.4)
      .map(m => ({
        id: m.id,
        name: m.name,
        tasks: tasksByMember[m.id],
        recommended: Math.round(avgTasks)
      }));
    
    const underutilized = teamMembers
      .filter(m => tasksByMember[m.id] < avgTasks * 0.6 && avgTasks > 1)
      .map(m => ({
        id: m.id,
        name: m.name,
        tasks: tasksByMember[m.id],
        capacity: Math.round(avgTasks - tasksByMember[m.id])
      }));
    
    // Calculate balance score
    const maxTasks = Math.max(...counts, 1);
    const minTasks = Math.min(...counts, 0);
    const balanceScore = maxTasks > 0 ? Math.round(100 - ((maxTasks - minTasks) / maxTasks * 50)) : 100;
    
    // === RISK ANALYSIS ===
    const risks: RiskData[] = activeTasks
      .filter(t => t.dueDate)
      .map(task => {
        const daysUntilDue = (task.dueDate! - now) / (1000 * 60 * 60 * 24);
        const reasons: string[] = [];
        let riskScore = 0;
        
        if (daysUntilDue < 0) {
          reasons.push('Overdue');
          riskScore += 50;
        } else if (daysUntilDue < 1) {
          reasons.push('Due today');
          riskScore += 35;
        } else if (daysUntilDue < 3) {
          reasons.push('Due soon');
          riskScore += 20;
        }
        
        if (task.status === 'todo') {
          reasons.push('Not started');
          riskScore += 25;
        }
        
        if (!task.assigneeId) {
          reasons.push('Unassigned');
          riskScore += 20;
        }
        
        if (task.priority === 'critical' || task.priority === 'high') {
          reasons.push('High priority');
          riskScore += 10;
        }
        
        const probability = Math.min(riskScore / 100, 0.95);
        let riskLevel: 'medium' | 'high' | 'critical' = 'medium';
        let suggestion = 'Monitor progress';
        
        if (probability >= 0.7) {
          riskLevel = 'critical';
          suggestion = 'Immediate action needed - reassign or extend deadline';
        } else if (probability >= 0.5) {
          riskLevel = 'high';
          suggestion = 'Consider adding resources or adjusting scope';
        } else if (probability >= 0.3) {
          suggestion = 'Keep monitoring and remove blockers';
        }
        
        return { taskId: task.id, taskTitle: task.title, dueDate: task.dueDate!, riskLevel, probability, reasons, suggestion };
      })
      .filter(r => r.probability >= 0.3)
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 5);
    
    // === GENERATE INSIGHTS ===
    const analyzedInsights: AnalyzedInsight[] = [];
    
    if (overloaded.length > 0) {
      analyzedInsights.push({
        id: 'workload-imbalance',
        type: 'optimization',
        title: 'Workload Imbalance Detected',
        description: `${overloaded.length} team member${overloaded.length > 1 ? 's have' : ' has'} ${Math.round((overloaded[0]?.tasks || 0) / avgTasks * 100 - 100)}% more tasks than average.`,
        confidence: 0.87,
        impact: 'high',
        actionLabel: 'View Workload'
      });
    }
    
    if (risks.length > 0) {
      analyzedInsights.push({
        id: 'deadline-risks',
        type: 'warning',
        title: `${risks.length} Task${risks.length > 1 ? 's' : ''} at Risk`,
        description: `Based on current progress, ${risks.length} task${risks.length > 1 ? 's' : ''} may miss ${risks.length > 1 ? 'their deadlines' : 'its deadline'}.`,
        confidence: 0.72,
        impact: 'high',
        actionLabel: 'Review Risks'
      });
    }
    
    const longRunning = activeTasks.filter(t => {
      if (t.status !== 'in-progress' || !t.updatedAt) return false;
      const daysInProgress = (now - t.updatedAt!) / (1000 * 60 * 60 * 24);
      return daysInProgress > 5;
    });
    
    if (longRunning.length > 0) {
      analyzedInsights.push({
        id: 'long-running',
        type: 'suggestion',
        title: 'Consider Breaking Down Large Tasks',
        description: `"${longRunning[0].title}" has been in progress for ${Math.round((now - longRunning[0].updatedAt!) / (1000 * 60 * 60 * 24))} days.`,
        confidence: 0.65,
        impact: 'medium',
        actionLabel: 'View Task'
      });
    }
    
    const unassigned = activeTasks.filter(t => !t.assigneeId);
    if (unassigned.length > 2) {
      analyzedInsights.push({
        id: 'unassigned-tasks',
        type: 'warning',
        title: `${unassigned.length} Unassigned Tasks`,
        description: 'These tasks need to be assigned to team members for proper tracking.',
        confidence: 0.9,
        impact: 'medium',
        actionLabel: 'Assign Tasks'
      });
    }
    
    const completedRecently = tasks.filter(t => {
      if (t.status !== 'done' || !t.updatedAt) return false;
      const daysSinceComplete = (now - t.updatedAt) / (1000 * 60 * 60 * 24);
      return daysSinceComplete <= 7;
    });
    
    if (completedRecently.length >= 5) {
      analyzedInsights.push({
        id: 'high-completion',
        type: 'prediction',
        title: 'Great Progress This Week!',
        description: `Your team completed ${completedRecently.length} tasks in the last 7 days. Keep up the momentum!`,
        confidence: 0.95,
        impact: 'low'
      });
    }
    
    // === SMART SUGGESTIONS ===
    const suggestions: string[] = [];
    
    if (activeTasks.some(t => t.priority === 'critical' && t.status === 'todo')) {
      suggestions.push('Start critical priority tasks immediately');
    }
    if (underutilized.length > 0 && overloaded.length > 0) {
      suggestions.push(`Reassign tasks from ${overloaded[0]?.name} to ${underutilized[0]?.name}`);
    }
    if (activeTasks.filter(t => !t.dueDate).length > 3) {
      suggestions.push('Set deadlines for tasks without due dates');
    }
    if (activeTasks.length > 20) {
      suggestions.push('Consider prioritizing and archiving low-priority items');
    }
    suggestions.push('Review blocked tasks for dependency issues');
    suggestions.push('Schedule a team sync to discuss progress');
    
    setAnalysis({
      insights: analyzedInsights,
      workload: { balanceScore, totalTasks, avgTasksPerMember: Math.round(avgTasks * 10) / 10, overloaded, underutilized },
      risks,
      suggestions: suggestions.slice(0, 5),
      lastAnalyzed: now
    });
    
    setIsRunningAnalysis(false);
  };

  // Run analysis when panel opens
  useEffect(() => {
    if (isOpen && !analysis) {
      runAnalysis();
    }
  }, [isOpen]);

  // Handle chat input
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: Date.now()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));

    const response = generateAIResponse(inputValue, analysis);
    
    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: response,
      timestamp: Date.now()
    };

    setIsTyping(false);
    setChatMessages(prev => [...prev, assistantMessage]);
  };

  const generateAIResponse = (query: string, analysis: AnalysisResult | null): string => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('workload') || lowerQuery.includes('balance')) {
      if (!analysis) return "Let me analyze your workload first. Click the Analyze button to get started.";
      const { workload } = analysis;
      if (workload.overloaded.length > 0) {
        return `Your workload balance score is ${workload.balanceScore}/100. ${workload.overloaded[0].name} is overloaded with ${workload.overloaded[0].tasks} tasks (recommended: ${workload.overloaded[0].recommended}). Consider redistributing some tasks.`;
      }
      return `Great news! Your team's workload is well-balanced with a score of ${workload.balanceScore}/100. You have ${workload.totalTasks} active tasks across ${teamMembers?.length || 0} team members.`;
    }
    
    if (lowerQuery.includes('risk') || lowerQuery.includes('deadline') || lowerQuery.includes('overdue')) {
      if (!analysis) return "I need to analyze your project first. Click the Analyze button.";
      if (analysis.risks.length === 0) {
        return "All tasks are currently on track! No deadline risks detected. Keep up the great work! 🎉";
      }
      const criticalRisks = analysis.risks.filter(r => r.riskLevel === 'critical');
      if (criticalRisks.length > 0) {
        return `⚠️ Alert: ${criticalRisks.length} task(s) need immediate attention!\n\n**${criticalRisks[0].taskTitle}** has a ${Math.round(criticalRisks[0].probability * 100)}% risk of missing its deadline. ${criticalRisks[0].suggestion}`;
      }
      return `I found ${analysis.risks.length} task(s) with potential deadline risks. The highest risk is "${analysis.risks[0].taskTitle}" at ${Math.round(analysis.risks[0].probability * 100)}%. Switch to the Risks tab for details.`;
    }
    
    if (lowerQuery.includes('focus') || lowerQuery.includes('today') || lowerQuery.includes('priority')) {
      const activeTasks = tasks?.filter(t => t.status !== 'done') || [];
      const criticalTasks = activeTasks.filter(t => t.priority === 'critical');
      const todayTasks = activeTasks.filter(t => {
        if (!t.dueDate) return false;
        const today = new Date();
        const dueDate = new Date(t.dueDate);
        return dueDate.toDateString() === today.toDateString();
      });
      
      let response = "Here's what I recommend focusing on:\n\n";
      if (criticalTasks.length > 0) {
        response += `🔴 **Critical Priority:** ${criticalTasks.length} task(s) need immediate attention\n`;
      }
      if (todayTasks.length > 0) {
        response += `📅 **Due Today:** ${todayTasks.length} task(s)\n`;
      }
      if (analysis?.risks.length) {
        response += `⚠️ **At Risk:** ${analysis.risks.length} task(s) may miss deadline\n`;
      }
      response += "\nWould you like me to show you the details?";
      return response;
    }
    
    if (lowerQuery.includes('help') || lowerQuery.includes('what can you do')) {
      return "I can help you with:\n\n• **Workload Analysis** - Check team balance and capacity\n• **Risk Assessment** - Identify tasks at risk of missing deadlines\n• **Suggestions** - Get actionable recommendations\n• **Focus Areas** - Know what to prioritize today\n\nJust ask me anything about your project!";
    }
    
    if (lowerQuery.includes('suggestion') || lowerQuery.includes('recommend') || lowerQuery.includes('improve')) {
      if (!analysis?.suggestions.length) return "Let me analyze your project first to generate suggestions.";
      return `Here are my top recommendations:\n\n${analysis.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nWould you like more details on any of these?`;
    }
    
    return "I understand you're asking about your project. Try asking me about:\n• Team workload and balance\n• Tasks at risk of missing deadlines\n• What to focus on today\n• Recommendations for improvement";
  };

  // Quick action prompts
  const quickPrompts = [
    { label: 'Workload', icon: Scale, prompt: 'How is our team workload?' },
    { label: 'At Risk', icon: AlertTriangle, prompt: 'Show me tasks at risk' },
    { label: 'Focus', icon: Target, prompt: 'What should I focus on today?' },
  ];

  const totalIssues = (analysis?.risks.length || 0) + (analysis?.workload.overloaded.length || 0);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "relative h-9 w-9 transition-all duration-300",
                  isOpen && "bg-purple-500/10"
                )}
                data-ai-trigger
              >
                <div className="relative">
                  <Sparkles className={cn(
                    "h-[1.2rem] w-[1.2rem] transition-all duration-300",
                    totalIssues > 0 ? "text-purple-500" : "text-muted-foreground",
                    isOpen && "scale-110"
                  )} />
                  {totalIssues > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
                      <span className="relative inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-[9px] font-bold text-white shadow-lg">
                        {Math.min(totalIssues, 9)}
                      </span>
                    </span>
                  )}
                </div>
              </Button>
            </SheetTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              AI Assistant
              {totalIssues > 0 && <Badge variant="secondary" className="ml-1 h-4 text-[10px]">{totalIssues}</Badge>}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <SheetContent className="w-full sm:max-w-[420px] p-0 flex flex-col gap-0 border-l-purple-500/20">
        {/* Animated Header */}
        <div className="relative overflow-hidden">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-pink-500/10" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent opacity-60" />
          
          {/* Floating particles effect */}
          <div className="absolute top-2 right-14 h-2 w-2 rounded-full bg-purple-400/40 animate-pulse" />
          <div className="absolute top-6 right-20 h-1.5 w-1.5 rounded-full bg-blue-400/40 animate-pulse delay-300" />
          <div className="absolute bottom-3 right-16 h-1 w-1 rounded-full bg-pink-400/40 animate-pulse delay-700" />
          
          <div className="relative px-4 py-4 pr-12">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                </div>
                <div>
                  <h2 className="font-semibold text-base flex items-center gap-2">
                    AI Assistant
                    <Badge variant="secondary" className="text-[10px] h-4 bg-purple-500/10 text-purple-600 border-purple-500/20">
                      Beta
                    </Badge>
                  </h2>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Activity className="h-3 w-3 text-green-500" />
                    {analysis ? `Monitoring ${analysis.workload.totalTasks} tasks` : 'Ready to assist'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={runAnalysis}
                disabled={isRunningAnalysis}
                className="h-8 text-xs gap-1.5 bg-background/50 backdrop-blur-sm hover:bg-background/80 border-purple-500/20"
              >
                {isRunningAnalysis ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="hidden sm:inline">Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="h-3 w-3" />
                    <span className="hidden sm:inline">Analyze</span>
                  </>
                )}
              </Button>
            </div>
            
            {/* Quick Stats Row */}
            {analysis && (
              <div className="flex gap-2 mt-3">
                <QuickStat 
                  icon={Gauge} 
                  label="Balance" 
                  value={`${analysis.workload.balanceScore}%`}
                  color={analysis.workload.balanceScore >= 70 ? 'green' : analysis.workload.balanceScore >= 40 ? 'yellow' : 'red'}
                />
                <QuickStat 
                  icon={AlertTriangle} 
                  label="At Risk" 
                  value={analysis.risks.length.toString()}
                  color={analysis.risks.length > 0 ? 'red' : 'green'}
                />
                <QuickStat 
                  icon={Lightbulb} 
                  label="Insights" 
                  value={analysis.insights.length.toString()}
                  color="purple"
                />
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-2 border-b bg-muted/30">
            <TabsList className="h-10 w-full bg-transparent p-0 gap-1">
              <TabsTrigger 
                value="chat" 
                className="flex-1 h-9 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg gap-1.5"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Chat
              </TabsTrigger>
              <TabsTrigger 
                value="insights" 
                className="flex-1 h-9 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Insights
                {(analysis?.insights.length || 0) > 0 && (
                  <span className="h-4 min-w-4 px-1 rounded-full bg-purple-500/20 text-purple-600 text-[10px] font-medium flex items-center justify-center">
                    {analysis?.insights.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="workload" 
                className="flex-1 h-9 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg gap-1.5"
              >
                <Scale className="h-3.5 w-3.5" />
                Team
              </TabsTrigger>
              <TabsTrigger 
                value="risks" 
                className="flex-1 h-9 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg gap-1.5"
              >
                <Shield className="h-3.5 w-3.5" />
                Risks
                {(analysis?.risks.length || 0) > 0 && (
                  <span className="h-4 min-w-4 px-1 rounded-full bg-red-500/20 text-red-600 text-[10px] font-medium flex items-center justify-center">
                    {analysis?.risks.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Chat Tab */}
          <TabsContent value="chat" className="flex-1 flex flex-col m-0 min-h-0">
            <ScrollArea className="flex-1" ref={scrollRef}>
              <div className="p-3 space-y-3">
                {chatMessages.map((message) => (
                  <ChatBubble key={message.id} message={message} />
                ))}
                {isTyping && (
                  <div className="flex items-start gap-2">
                    <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            {/* Quick Prompts */}
            {chatMessages.length <= 1 && (
              <div className="px-3 pb-2">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {quickPrompts.map((prompt) => (
                    <Button
                      key={prompt.label}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs whitespace-nowrap flex-shrink-0 gap-1.5 bg-purple-500/5 border-purple-500/20 hover:bg-purple-500/10"
                      onClick={() => {
                        setInputValue(prompt.prompt);
                        inputRef.current?.focus();
                      }}
                    >
                      <prompt.icon className="h-3 w-3" />
                      {prompt.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Chat Input */}
            <div className="p-3 border-t bg-muted/30">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder="Ask me anything..."
                    className="pr-10 h-10 bg-background border-purple-500/20 focus-visible:ring-purple-500/30"
                  />
                </div>
                <Button 
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isTyping}
                  size="icon"
                  className="h-10 w-10 bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/25"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="flex-1 m-0 min-h-0">
            <ScrollArea className="h-full">
              <div className="p-3 space-y-3">
                {isRunningAnalysis ? (
                  <LoadingState message="Analyzing your workspace..." />
                ) : !analysis?.insights.length ? (
                  <EmptyState 
                    icon={CheckCircle2}
                    title="All looks good!"
                    description="No issues detected. Your project is on track."
                    variant="success"
                  />
                ) : (
                  analysis.insights.map((insight) => (
                    <InsightCard 
                      key={insight.id} 
                      insight={insight}
                      onAction={() => {
                        if (insight.id === 'workload-imbalance') setActiveTab('workload');
                        if (insight.id === 'deadline-risks') setActiveTab('risks');
                      }}
                    />
                  ))
                )}
                
                {/* Suggestions Section */}
                {analysis?.suggestions && analysis.suggestions.length > 0 && (
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                      <span className="flex items-center gap-1.5">
                        <Lightbulb className="h-3.5 w-3.5" />
                        Smart Suggestions
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2">
                      {analysis.suggestions.map((suggestion, i) => (
                        <SuggestionCard key={i} suggestion={suggestion} index={i} />
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Workload Tab */}
          <TabsContent value="workload" className="flex-1 m-0 min-h-0">
            <ScrollArea className="h-full">
              <div className="p-3 space-y-3">
                {isRunningAnalysis ? (
                  <LoadingState message="Analyzing workload..." />
                ) : analysis?.workload ? (
                  <>
                    {/* Balance Score Card */}
                    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-background to-muted/50 p-4">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              className="text-muted-foreground/10"
                            />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="url(#gradient)"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeDasharray={`${analysis.workload.balanceScore}, 100`}
                              className="transition-all duration-1000"
                            />
                            <defs>
                              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor={analysis.workload.balanceScore >= 70 ? '#22c55e' : analysis.workload.balanceScore >= 40 ? '#eab308' : '#ef4444'} />
                                <stop offset="100%" stopColor={analysis.workload.balanceScore >= 70 ? '#10b981' : analysis.workload.balanceScore >= 40 ? '#f59e0b' : '#dc2626'} />
                              </linearGradient>
                            </defs>
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold">{analysis.workload.balanceScore}</span>
                            <span className="text-[10px] text-muted-foreground">/ 100</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm mb-1">Team Balance Score</h3>
                          <p className="text-xs text-muted-foreground mb-2">
                            {analysis.workload.balanceScore >= 70 
                              ? 'Excellent distribution!' 
                              : analysis.workload.balanceScore >= 40 
                                ? 'Could be improved'
                                : 'Needs attention'}
                          </p>
                          <div className="flex gap-3 text-xs">
                            <div>
                              <span className="text-muted-foreground">Tasks: </span>
                              <span className="font-medium">{analysis.workload.totalTasks}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Avg: </span>
                              <span className="font-medium">{analysis.workload.avgTasksPerMember}/person</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Overloaded Members */}
                    {analysis.workload.overloaded.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold flex items-center gap-1.5 text-red-600">
                          <TrendingUp className="h-3.5 w-3.5" />
                          Overloaded ({analysis.workload.overloaded.length})
                        </h4>
                        {analysis.workload.overloaded.map(member => (
                          <MemberWorkloadCard 
                            key={member.id}
                            name={member.name}
                            tasks={member.tasks}
                            target={member.recommended}
                            type="overloaded"
                          />
                        ))}
                      </div>
                    )}

                    {/* Underutilized Members */}
                    {analysis.workload.underutilized.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold flex items-center gap-1.5 text-blue-600">
                          <TrendingDown className="h-3.5 w-3.5" />
                          Available Capacity ({analysis.workload.underutilized.length})
                        </h4>
                        {analysis.workload.underutilized.map(member => (
                          <MemberWorkloadCard 
                            key={member.id}
                            name={member.name}
                            tasks={member.tasks}
                            target={member.tasks + member.capacity}
                            type="available"
                          />
                        ))}
                      </div>
                    )}

                    {analysis.workload.overloaded.length === 0 && analysis.workload.underutilized.length === 0 && (
                      <EmptyState
                        icon={CheckCircle2}
                        title="Workload Balanced"
                        description="Tasks are well-distributed across your team."
                        variant="success"
                      />
                    )}
                  </>
                ) : null}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Risks Tab */}
          <TabsContent value="risks" className="flex-1 m-0 min-h-0">
            <ScrollArea className="h-full">
              <div className="p-3 space-y-3">
                {isRunningAnalysis ? (
                  <LoadingState message="Analyzing deadline risks..." />
                ) : !analysis?.risks.length ? (
                  <EmptyState
                    icon={Shield}
                    title="All Tasks On Track"
                    description="No deadline risks detected. Great job keeping things on schedule!"
                    variant="success"
                  />
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {analysis.risks.length} task{analysis.risks.length > 1 ? 's' : ''} may miss deadline
                      </p>
                      <Badge variant="outline" className="text-[10px]">
                        Sorted by risk level
                      </Badge>
                    </div>
                    {analysis.risks.map(risk => (
                      <RiskCard key={risk.taskId} risk={risk} />
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        {analysis && activeTab !== 'chat' && (
          <div className="px-4 py-2 border-t bg-gradient-to-r from-muted/30 to-muted/50">
            <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1.5">
              <Clock className="h-3 w-3" />
              Last analyzed {formatTimeAgo(analysis.lastAnalyzed)}
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// Helper Components
function QuickStat({ icon: Icon, label, value, color }: { 
  icon: React.ElementType; 
  label: string; 
  value: string; 
  color: 'green' | 'yellow' | 'red' | 'purple' 
}) {
  const colors = {
    green: 'bg-green-500/10 text-green-600 border-green-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    red: 'bg-red-500/10 text-red-600 border-red-500/20',
    purple: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  };
  
  return (
    <div className={cn("flex-1 rounded-lg border px-2.5 py-1.5 backdrop-blur-sm", colors[color])}>
      <div className="flex items-center gap-1.5">
        <Icon className="h-3 w-3" />
        <span className="text-[10px] opacity-80">{label}</span>
      </div>
      <p className="text-sm font-bold mt-0.5">{value}</p>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={cn("flex items-start gap-2", isUser && "flex-row-reverse")}>
      {!isUser && (
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-sm">
          <Bot className="h-3.5 w-3.5 text-white" />
        </div>
      )}
      <div className={cn(
        "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
        isUser 
          ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-tr-sm shadow-lg shadow-purple-500/20" 
          : "bg-muted rounded-tl-sm"
      )}>
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
}

function InsightCard({ insight, onAction }: { insight: AnalyzedInsight; onAction?: () => void }) {
  const config = {
    optimization: { icon: TrendingUp, gradient: 'from-green-500 to-emerald-500', bg: 'bg-green-500/5', border: 'border-green-500/20', badge: 'bg-green-500/10 text-green-600' },
    warning: { icon: AlertTriangle, gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-500/5', border: 'border-amber-500/20', badge: 'bg-amber-500/10 text-amber-600' },
    suggestion: { icon: Lightbulb, gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500/5', border: 'border-blue-500/20', badge: 'bg-blue-500/10 text-blue-600' },
    prediction: { icon: Target, gradient: 'from-purple-500 to-pink-500', bg: 'bg-purple-500/5', border: 'border-purple-500/20', badge: 'bg-purple-500/10 text-purple-600' },
  }[insight.type];
  
  const Icon = config.icon;
  
  return (
    <div className={cn("rounded-xl border p-3 transition-all hover:shadow-md", config.bg, config.border)}>
      <div className="flex items-start gap-3">
        <div className={cn("h-9 w-9 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-sm", config.gradient)}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold truncate">{insight.title}</h4>
            {insight.impact === 'high' && (
              <Badge variant="destructive" className="text-[9px] h-4 px-1.5">High</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-2.5 leading-relaxed">{insight.description}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={cn("text-[10px] h-5 font-normal", config.badge)}>{insight.type}</Badge>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <span className={cn("h-1.5 w-1.5 rounded-full", 
                  insight.confidence >= 0.8 ? "bg-green-500" : 
                  insight.confidence >= 0.5 ? "bg-yellow-500" : "bg-red-500"
                )} />
                {Math.round(insight.confidence * 100)}% confidence
              </span>
            </div>
            {insight.actionLabel && (
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1 hover:bg-background" onClick={onAction}>
                {insight.actionLabel}
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SuggestionCard({ suggestion, index }: { suggestion: string; index: number }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-gradient-to-r from-background to-muted/30 hover:shadow-sm transition-all cursor-pointer group">
      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white shadow-sm">
        {index + 1}
      </div>
      <p className="text-sm flex-1 pt-0.5">{suggestion}</p>
      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
    </div>
  );
}

function MemberWorkloadCard({ name, tasks, target, type }: { 
  name: string; 
  tasks: number; 
  target: number;
  type: 'overloaded' | 'available';
}) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);
  const isOverloaded = type === 'overloaded';
  const percentage = isOverloaded ? 100 : Math.round((tasks / target) * 100);
  
  return (
    <div className={cn(
      "rounded-xl border p-3 transition-all hover:shadow-sm",
      isOverloaded ? "bg-red-500/5 border-red-500/20" : "bg-blue-500/5 border-blue-500/20"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "h-10 w-10 rounded-full flex items-center justify-center text-xs font-semibold shadow-sm",
          isOverloaded 
            ? "bg-gradient-to-br from-red-500 to-orange-500 text-white" 
            : "bg-gradient-to-br from-blue-500 to-cyan-500 text-white"
        )}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium truncate">{name}</p>
            <span className={cn(
              "text-xs font-semibold",
              isOverloaded ? "text-red-600" : "text-blue-600"
            )}>
              {tasks}/{target}
            </span>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
                isOverloaded 
                  ? "bg-gradient-to-r from-red-500 to-orange-500" 
                  : "bg-gradient-to-r from-blue-500 to-cyan-500"
              )}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2 pl-13 flex items-center gap-1">
        <ArrowRight className="h-3 w-3" />
        {isOverloaded 
          ? `Reassign ${tasks - target} task${tasks - target > 1 ? 's' : ''}`
          : `Can take ${target - tasks} more task${target - tasks > 1 ? 's' : ''}`
        }
      </p>
    </div>
  );
}

function RiskCard({ risk }: { risk: RiskData }) {
  const levelConfig = {
    medium: { gradient: 'from-yellow-500 to-amber-500', bg: 'bg-yellow-500/5', border: 'border-yellow-500/20' },
    high: { gradient: 'from-orange-500 to-red-400', bg: 'bg-orange-500/5', border: 'border-orange-500/20' },
    critical: { gradient: 'from-red-500 to-pink-500', bg: 'bg-red-500/5', border: 'border-red-500/20' },
  }[risk.riskLevel];
  
  const daysUntilDue = Math.ceil((risk.dueDate - Date.now()) / (1000 * 60 * 60 * 24));
  
  return (
    <div className={cn("rounded-xl border p-3 transition-all hover:shadow-md", levelConfig.bg, levelConfig.border)}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold truncate flex-1">{risk.taskTitle}</p>
        <Badge 
          className={cn(
            "text-[10px] capitalize flex-shrink-0 text-white shadow-sm",
            `bg-gradient-to-r ${levelConfig.gradient}`
          )}
        >
          {risk.riskLevel}
        </Badge>
      </div>
      
      <div className="flex items-center gap-3 mb-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)}d overdue` : daysUntilDue === 0 ? 'Due today' : `${daysUntilDue}d left`}
        </span>
        <span>•</span>
        <span className="font-medium text-foreground">{Math.round(risk.probability * 100)}% risk</span>
      </div>
      
      <div className="flex flex-wrap gap-1.5 mb-2">
        {risk.reasons.map((reason, i) => (
          <Badge key={i} variant="outline" className="text-[10px] h-5 bg-background/50">{reason}</Badge>
        ))}
      </div>
      
      <div className="flex items-start gap-2 p-2 rounded-lg bg-background/50 border border-dashed">
        <Lightbulb className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-yellow-500" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">{risk.suggestion}</p>
      </div>
    </div>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-xl shadow-purple-500/30">
          <Sparkles className="h-7 w-7 text-white animate-pulse" />
        </div>
        <div className="absolute inset-0 rounded-2xl border-2 border-purple-400 animate-ping opacity-30" />
        <div className="absolute -inset-2 rounded-3xl border border-purple-300/30 animate-pulse" />
      </div>
      <p className="mt-5 text-sm font-medium">{message}</p>
      <p className="text-xs text-muted-foreground mt-1">This may take a moment...</p>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, variant = 'default' }: {
  icon: React.ElementType;
  title: string;
  description: string;
  variant?: 'default' | 'success';
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className={cn(
        "h-14 w-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg",
        variant === 'success' 
          ? "bg-gradient-to-br from-green-500 to-emerald-500 shadow-green-500/25" 
          : "bg-gradient-to-br from-gray-400 to-gray-500 shadow-gray-500/25"
      )}>
        <Icon className="h-7 w-7 text-white" />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-[220px] leading-relaxed">{description}</p>
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default AIInsightsPanel;
