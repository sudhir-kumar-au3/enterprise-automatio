import AutomationRule, {
  AutomationRuleDocument,
  IAutomationRule,
} from "../models/AutomationRule";
import Task from "../models/Task";
import Activity from "../models/Activity";
import logger from "../utils/logger";
import { webhookService } from "./webhook.service.js";

export interface AutomationContext {
  task?: any;
  previousTask?: any;
  user?: any;
  comment?: any;
  changes?: Record<string, { old: any; new: any }>;
  organizationId?: string; // Added for multi-tenancy
}

class AutomationService {
  /**
   * Create a new automation rule
   */
  async createRule(
    data: Partial<IAutomationRule>,
    organizationId: string
  ): Promise<AutomationRuleDocument> {
    const rule = new AutomationRule({ ...data, organizationId });
    await rule.save();
    logger.info(`Automation rule created: ${rule.name}`);
    return rule;
  }

  /**
   * Update an automation rule
   */
  async updateRule(
    ruleId: string,
    updates: Partial<IAutomationRule>,
    organizationId: string
  ): Promise<AutomationRuleDocument | null> {
    const rule = await AutomationRule.findOneAndUpdate(
      { _id: ruleId, organizationId },
      updates,
      { new: true }
    );
    if (rule) {
      logger.info(`Automation rule updated: ${rule.name}`);
    }
    return rule;
  }

  /**
   * Delete an automation rule
   */
  async deleteRule(ruleId: string, organizationId: string): Promise<boolean> {
    const result = await AutomationRule.findOneAndDelete({
      _id: ruleId,
      organizationId,
    });
    return !!result;
  }

  /**
   * Get all automation rules for an organization
   */
  async getRules(
    organizationId: string,
    filters?: { isActive?: boolean }
  ): Promise<AutomationRuleDocument[]> {
    const query: Record<string, any> = { organizationId };
    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }
    return AutomationRule.find(query).sort({ priority: -1, createdAt: -1 });
  }

  /**
   * Get a single rule by ID
   */
  async getRule(
    ruleId: string,
    organizationId: string
  ): Promise<AutomationRuleDocument | null> {
    return AutomationRule.findOne({ _id: ruleId, organizationId });
  }

  /**
   * Process automation triggers for a specific event
   */
  async processTrigger(
    triggerType: string,
    context: AutomationContext
  ): Promise<void> {
    try {
      if (!context.organizationId) {
        logger.warn("No organizationId in automation context, skipping");
        return;
      }

      const rules = await AutomationRule.find({
        organizationId: context.organizationId,
        isActive: true,
        trigger: triggerType,
      }).sort({ createdAt: -1 });

      for (const rule of rules) {
        try {
          const shouldExecute = await this.evaluateConditions(rule, context);

          if (shouldExecute) {
            await this.executeActions(rule, context);

            // Update rule statistics
            rule.lastExecutedAt = Date.now();
            rule.executionCount += 1;
            await rule.save();

            logger.info(`Automation rule executed: ${rule.name}`);
          }
        } catch (error) {
          logger.error(`Error executing automation rule ${rule.name}:`, error);
        }
      }
    } catch (error) {
      logger.error(
        `Error processing automation trigger ${triggerType}:`,
        error
      );
    }
  }

  /**
   * Evaluate if all conditions for a rule are met
   */
  private async evaluateConditions(
    rule: AutomationRuleDocument,
    context: AutomationContext
  ): Promise<boolean> {
    const { conditions } = rule;

    if (!conditions || conditions.length === 0) {
      return true;
    }

    for (const condition of conditions) {
      const fieldValue = this.getFieldValue(context, condition.field);
      const matches = this.evaluateCondition(
        fieldValue,
        condition.operator,
        condition.value
      );

      if (!matches) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get field value from context using dot notation
   */
  private getFieldValue(context: AutomationContext, field: string): any {
    const parts = field.split(".");
    let value: any = context;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    fieldValue: any,
    operator: string,
    conditionValue: any
  ): boolean {
    switch (operator) {
      case "equals":
        return fieldValue === conditionValue;
      case "not_equals":
        return fieldValue !== conditionValue;
      case "contains":
        return String(fieldValue)
          .toLowerCase()
          .includes(String(conditionValue).toLowerCase());
      case "not_contains":
        return !String(fieldValue)
          .toLowerCase()
          .includes(String(conditionValue).toLowerCase());
      case "greater_than":
        return Number(fieldValue) > Number(conditionValue);
      case "less_than":
        return Number(fieldValue) < Number(conditionValue);
      case "is_empty":
        return (
          fieldValue === null || fieldValue === undefined || fieldValue === ""
        );
      case "is_not_empty":
        return (
          fieldValue !== null && fieldValue !== undefined && fieldValue !== ""
        );
      case "in":
        return (
          Array.isArray(conditionValue) && conditionValue.includes(fieldValue)
        );
      case "not_in":
        return (
          Array.isArray(conditionValue) && !conditionValue.includes(fieldValue)
        );
      case "changed_to":
        return fieldValue === conditionValue;
      case "changed_from":
        return fieldValue === conditionValue;
      default:
        return false;
    }
  }

  /**
   * Execute all actions for a rule
   */
  private async executeActions(
    rule: AutomationRuleDocument,
    context: AutomationContext
  ): Promise<void> {
    for (const action of rule.actions) {
      try {
        await this.executeAction(action, context);
      } catch (error) {
        logger.error(`Error executing action ${action.type}:`, error);
      }
    }
  }

  /**
   * Execute a single action
   */
  private async executeAction(
    action: IAutomationRule["actions"][0],
    context: AutomationContext
  ): Promise<void> {
    const { task, organizationId } = context;

    switch (action.type) {
      case "update_field":
        if (task && action.config.field && action.config.value !== undefined) {
          await Task.findOneAndUpdate(
            { _id: task._id || task.id, organizationId },
            { [action.config.field]: action.config.value }
          );
        }
        break;

      case "assign_task":
        if (task && action.config.assigneeId) {
          await Task.findOneAndUpdate(
            { _id: task._id || task.id, organizationId },
            { assigneeId: action.config.assigneeId }
          );
        }
        break;

      case "update_task_status":
        if (task && action.config.status) {
          await Task.findOneAndUpdate(
            { _id: task._id || task.id, organizationId },
            { status: action.config.status }
          );
        }
        break;

      case "update_task_priority":
        if (task && action.config.priority) {
          await Task.findOneAndUpdate(
            { _id: task._id || task.id, organizationId },
            { priority: action.config.priority }
          );
        }
        break;

      case "add_tag":
        if (task && action.config.tag) {
          await Task.findOneAndUpdate(
            { _id: task._id || task.id, organizationId },
            { $addToSet: { tags: action.config.tag } }
          );
        }
        break;

      case "remove_tag":
        if (task && action.config.tag) {
          await Task.findOneAndUpdate(
            { _id: task._id || task.id, organizationId },
            { $pull: { tags: action.config.tag } }
          );
        }
        break;

      case "send_notification":
        // Notification would be handled by notification service
        logger.info(`Notification: ${action.config.message}`);
        break;

      case "send_email":
        // Email would be handled by email service
        logger.info(`Email to ${action.config.to}: ${action.config.subject}`);
        break;

      case "create_task":
        if (action.config.taskTemplate && organizationId) {
          await Task.create({
            ...action.config.taskTemplate,
            organizationId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
        break;

      case "send_webhook":
        if (action.config.webhookUrl) {
          await webhookService.sendWebhook(action.config.webhookUrl, {
            event: "automation_triggered",
            rule: { id: context.task?.id },
            data: { ...context } as Record<string, unknown>,
          });
        }
        break;

      case "add_comment":
        if (task && action.config.comment) {
          // Would create a comment using comment service
          logger.info(
            `Auto-comment on task ${task._id}: ${action.config.comment}`
          );
        }
        break;

      case "move_to_context":
        if (task && action.config.contextType && action.config.contextId) {
          await Task.findOneAndUpdate(
            { _id: task._id || task.id, organizationId },
            {
              contextType: action.config.contextType,
              contextId: action.config.contextId,
            }
          );
        }
        break;

      default:
        logger.warn(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Get predefined automation templates
   */
  getTemplates(): Array<{
    name: string;
    description: string;
    trigger: IAutomationRule["trigger"];
    conditions: IAutomationRule["conditions"];
    actions: IAutomationRule["actions"];
  }> {
    return [
      {
        name: "Auto-assign on high priority",
        description:
          "Automatically assign high priority tasks to a specific team member",
        trigger: "task_created",
        conditions: [
          { field: "task.priority", operator: "equals", value: "high" },
        ],
        actions: [{ type: "assign_task", config: { assigneeId: "" } }],
      },
      {
        name: "Move to done on all subtasks complete",
        description: "Mark task as done when all subtasks are completed",
        trigger: "task_updated",
        conditions: [
          {
            field: "task.subtasksCompleted",
            operator: "equals",
            value: true,
          },
        ],
        actions: [{ type: "update_task_status", config: { status: "done" } }],
      },
      {
        name: "Notify on overdue",
        description: "Send notification when task becomes overdue",
        trigger: "task_due_soon",
        conditions: [],
        actions: [
          {
            type: "send_notification",
            config: { message: "Task is overdue!" },
          },
          { type: "add_tag", config: { tag: "overdue" } },
        ],
      },
      {
        name: "Escalate stale tasks",
        description:
          "Increase priority of tasks that haven't been updated in a week",
        trigger: "task_updated",
        conditions: [
          { field: "task.status", operator: "not_equals", value: "done" },
        ],
        actions: [
          { type: "update_task_priority", config: { priority: "high" } },
          { type: "add_tag", config: { tag: "needs-attention" } },
        ],
      },
    ];
  }
}

export const automationService = new AutomationService();
export default automationService;
