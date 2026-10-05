export type RuleField =
  | "from"
  | "to"
  | "cc"
  | "subject"
  | "body"
  | "hasAttachment"
  | "attachmentName"
  | "attachmentType"
  | "sizeBytes";

export type RuleOperator =
  | "equals"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "regex"
  | "greaterThan"
  | "lessThan";

export type RuleAction =
  | { type: "moveToFolder"; value: "INBOX" | "SENT" | "DRAFTS" | "TRASH" }
  | { type: "markAsRead" }
  | { type: "markAsUnread" }
  | { type: "flag" }
  | { type: "applyLabel"; value: string }
  | { type: "stopProcessing" }
  | { type: "moveToFolder"; value: string };

export type RuleCondition = {
  field: RuleField;
  operator: RuleOperator;
  value: string | number | boolean;
};

export type ConditionGroup = {
  logic: "AND" | "OR";
  conditions?: RuleCondition[];
  groups?: ConditionGroup[];
};

export type MessageLike = {
  fromAddress?: string;
  toAddresses?: string[];
  ccAddresses?: string[];
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
  hasAttachment?: boolean;
  attachments?: Array<{ filename?: string; contentType?: string; sizeBytes?: number }>;
  sizeBytes?: number;
};

function normalizeString(value: unknown): string {
  return String(value ?? "").toLowerCase();
}

function getStringField(message: MessageLike, field: RuleField): string {
  switch (field) {
    case "from":
      return message.fromAddress ?? "";
    case "to":
      return (message.toAddresses ?? []).join(",");
    case "cc":
      return (message.ccAddresses ?? []).join(",");
    case "subject":
      return message.subject ?? "";
    case "body":
      return (message.bodyText ?? message.bodyHtml ?? "");
    case "attachmentName":
      return (message.attachments ?? []).map((attachment) => attachment.filename ?? "").join(",");
    case "attachmentType":
      return (message.attachments ?? []).map((attachment) => attachment.contentType ?? "").join(",");
    default:
      return "";
  }
}

function compareValue(actual: string | number | boolean | undefined, operator: RuleOperator, expected: string | number | boolean) {
  const actualString = normalizeString(actual);
  const expectedString = normalizeString(expected);

  switch (operator) {
    case "equals":
      return actualString === expectedString;
    case "contains":
      return actualString.includes(expectedString);
    case "startsWith":
      return actualString.startsWith(expectedString);
    case "endsWith":
      return actualString.endsWith(expectedString);
    case "regex": {
      const Re2Factory = new Function("return require('re2')")() as { default?: any; Re2?: any; };
      const RE2 = Re2Factory.default ?? Re2Factory.Re2 ?? Re2Factory;
      const regex = new RE2(String(expected), "i");
      return regex.test(actualString);
    }
    case "greaterThan":
      return Number(actual ?? 0) > Number(expected ?? 0);
    case "lessThan":
      return Number(actual ?? 0) < Number(expected ?? 0);
    default:
      return false;
  }
}

export function matchesCondition(message: MessageLike, condition: RuleCondition): boolean {
  const fieldValue = condition.field === "hasAttachment"
    ? Boolean(message.hasAttachment ?? (message.attachments ?? []).length > 0)
    : condition.field === "sizeBytes"
      ? Number(message.sizeBytes ?? 0)
      : getStringField(message, condition.field);

  return compareValue(fieldValue, condition.operator, condition.value);
}

export function evaluateConditionGroup(message: MessageLike, group: ConditionGroup): boolean {
  const conditions = group.conditions ?? [];
  const childGroups = group.groups ?? [];
  const conditionResults = conditions.map((condition) => matchesCondition(message, condition));
  const groupResults = childGroups.map((child) => evaluateConditionGroup(message, child));
  const allResults = [...conditionResults, ...groupResults];

  if (allResults.length === 0) {
    return true;
  }

  return group.logic === "AND"
    ? allResults.every(Boolean)
    : allResults.some(Boolean);
}

export function evaluateRule(message: MessageLike, rule: { conditions: ConditionGroup; actions: RuleAction[] }) {
  const matches = evaluateConditionGroup(message, rule.conditions);
  return {
    matches,
    actions: matches ? rule.actions : [],
  };
}

export function evaluateRules(
  message: MessageLike,
  rules: Array<{
    enabled: boolean;
    stopProcessing: boolean;
    priority?: number;
    conditions: ConditionGroup;
    actions: RuleAction[];
  }>,
) {
  const appliedActions: RuleAction[] = [];

  for (const rule of [...rules].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))) {
    if (!rule.enabled) continue;
    const result = evaluateRule(message, rule);
    if (result.matches) {
      appliedActions.push(...result.actions);
      if (rule.stopProcessing) break;
    }
  }

  return appliedActions;
}
