export type UserRole = 'SYSTEM_ADMIN' | 'IT_MANAGER' | 'TECHNICIAN' | 'EMPLOYEE' | 'ASSET_MANAGER';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  skills: string[];
  active: boolean;
  lastLogin?: string;
  createdAt: string;
}

export type TicketStatus =
  | 'OPEN'
  | 'TRIAGED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REOPENED';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TicketCategory =
  | 'HARDWARE'
  | 'SOFTWARE'
  | 'NETWORK'
  | 'ACCESS_IAM'
  | 'SECURITY';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SLATimers {
  responseDeadline?: string;
  resolutionDeadline?: string;
  firstRespondedAt?: string;
  resolvedAt?: string;
  responseBreached: boolean;
  resolutionBreached: boolean;
  isPaused: boolean;
  pausedAt?: string;
  totalPausedDurationMs: number;
}

export interface RiskScore {
  score: number;
  level?: RiskLevel;
  calculatedAt: string;
  factors: string[];
}

export interface AIAnalysis {
  suggestedCategory?: TicketCategory;
  suggestedPriority?: TicketPriority;
  confidence?: number;
  probableIssue?: string;
  applied: boolean;
  topKeywords?: string[];
  requiresManualTriage?: boolean;
  triageReason?: string;
  suggestedSkills?: string[];
}

export interface Ticket {
  _id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  requesterId: string | User;
  assigneeId?: string | User;
  teamId?: string;
  assetId?: string | Asset;
  slaPolicyId?: string;
  slaTimers: SLATimers;
  riskScore: RiskScore;
  aiAnalysis?: AIAnalysis;
  tags: string[];
  reopenCount: number;
  reopenReason?: string;
  resolutionSummary?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type TicketEventType =
  | 'TICKET_CREATED'
  | 'STATUS_CHANGE'
  | 'ASSIGNED'
  | 'PRIORITY_OVERRIDE'
  | 'COMMENT_ADDED'
  | 'WORK_LOG_RECORDED'
  | 'SLA_BREACH_RESPONSE'
  | 'SLA_BREACH_RESOLUTION'
  | 'SLA_WARNING';

export interface TicketEvent {
  _id: string;
  ticketId: string;
  actorId: string | User;
  eventType: TicketEventType;
  previousValue?: any;
  newValue?: any;
  note?: string;
  isInternal: boolean;
  createdAt: string;
}

export type WorkLogActivity =
  | 'DIAGNOSTICS'
  | 'HARDWARE_REPAIR'
  | 'SOFTWARE_INSTALL'
  | 'NETWORK_CONFIG'
  | 'COMMUNICATION'
  | 'VENDOR_SUPPORT'
  | 'RESEARCH'
  | 'OTHER';

export interface WorkLog {
  _id: string;
  ticketId: string;
  technicianId: string | User;
  timeSpentMinutes: number;
  activityType: WorkLogActivity;
  description: string;
  loggedAt: string;
}

export type AssetType =
  | 'LAPTOP'
  | 'DESKTOP'
  | 'SERVER'
  | 'NETWORK_DEVICE'
  | 'PERIPHERAL'
  | 'SOFTWARE_LICENSE';

export type AssetStatus =
  | 'PROCURED'
  | 'IN_STOCK'
  | 'ASSIGNED'
  | 'UNDER_REPAIR'
  | 'RETIRED';

export interface Asset {
  _id: string;
  assetTag: string;
  serialNumber: string;
  name: string;
  type: AssetType;
  ownerId?: string | User;
  department: string;
  location: string;
  status: AssetStatus;
  purchaseDate: string;
  warrantyExpiry: string;
  vendor: string;
  cost?: number;
  isCritical: boolean;
  specifications: Record<string, any>;
  incidentTicketIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TechnicianRoutingRank {
  technicianId: string;
  name: string;
  email: string;
  department: string;
  skills: string[];
  matchedSkills: string[];
  activeTicketCount: number;
  scores: {
    skillScore: number;
    workloadScore: number;
    affinityScore: number;
    compositeScore: number;
  };
  rationale: string;
}

export interface RAGCitation {
  articleCode: string;
  heading: string;
  relevanceScore: number;
  chunkText: string;
}

export interface RAGQueryResponse {
  answer: string;
  citations: RAGCitation[];
  has_sufficient_context: boolean;
  confidence: number;
}
