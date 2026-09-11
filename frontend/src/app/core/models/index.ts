import {
  AppointmentStatus, AppointmentType, ConversationMode, ConversationStatus, HandoffReason,
  LeadSource, LeadStatus, LeadTemperature, MessageAuthor, MessageDeliveryStatus, MessageDirection,
  PropertyPurpose, PropertyStatus, PropertyType,
} from "./enums";

export * from "./enums";

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface LoginResponse {
  token: string;
  expiresAtUtc: string;
  userId: string;
  tenantId: string;
  name: string;
  email: string;
  role: string;
  tenantName: string;
  mustChangePassword: boolean;
  isPlatformAdmin: boolean;
}

export interface PropertyListItem {
  id: string;
  code: string;
  title: string;
  type: PropertyType;
  purpose: PropertyPurpose;
  status: PropertyStatus;
  salePrice: number | null;
  rentPrice: number | null;
  neighborhood: string;
  city: string;
  state: string;
  bedrooms: number;
  suites: number;
  bathrooms: number;
  parkingSpots: number;
  usableArea: number | null;
  acceptsFinancing: boolean;
  coverPhotoUrl: string | null;
}

export interface PropertySearchFilter {
  term?: string;
  type?: PropertyType;
  purpose?: PropertyPurpose;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  city?: string;
  onlyAvailable?: boolean;
  page?: number;
  pageSize?: number;
}

export interface PropertyPhoto {
  id: string;
  url: string;
  caption: string | null;
  isCover: boolean;
  sortOrder: number;
}

export interface PropertyDetail {
  id: string;
  code: string;
  title: string;
  description: string | null;
  type: PropertyType;
  purpose: PropertyPurpose;
  status: PropertyStatus;
  salePrice: number | null;
  rentPrice: number | null;
  condoFee: number | null;
  propertyTax: number | null;
  acceptsFinancing: boolean;
  acceptsExchange: boolean;
  street: string | null;
  number: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string | null;
  totalArea: number | null;
  usableArea: number | null;
  bedrooms: number;
  suites: number;
  bathrooms: number;
  parkingSpots: number;
  floorNumber: number | null;
  yearBuilt: number | null;
  assignedUserId: string | null;
  features: string[];
  photos: PropertyPhoto[];
}

/** Espelha UpsertPropertyRequest do backend. Usado tanto para criar quanto editar. */
export interface UpsertPropertyRequest {
  code: string;
  title: string;
  description: string | null;
  type: PropertyType;
  purpose: PropertyPurpose;
  status: PropertyStatus;
  salePrice: number | null;
  rentPrice: number | null;
  condoFee: number | null;
  propertyTax: number | null;
  acceptsFinancing: boolean;
  acceptsExchange: boolean;
  street: string | null;
  number: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string | null;
  totalArea: number | null;
  usableArea: number | null;
  bedrooms: number;
  suites: number;
  bathrooms: number;
  parkingSpots: number;
  floorNumber: number | null;
  yearBuilt: number | null;
  assignedUserId: string | null;
  features: string[];
}

export interface ConversationListItem {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  mode: ConversationMode;
  status: ConversationStatus;
  handoffReason: HandoffReason;
  leadStatus: LeadStatus;
  temperature: LeadTemperature;
  lastMessagePreview: string | null;
  lastMessageAtUtc: string | null;
  unreadCount: number;
  assignedUserId: string | null;
}

export interface RelatedProperty {
  id: string;
  code: string;
  title: string;
}

export interface Message {
  id: string;
  direction: MessageDirection;
  author: MessageAuthor;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  deliveryStatus: MessageDeliveryStatus;
  sentAtUtc: string;
  properties: RelatedProperty[];
}

export interface ConversationDetail {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  mode: ConversationMode;
  status: ConversationStatus;
  handoffReason: HandoffReason;
  assignedUserId: string | null;
  messages: Message[];
}

export interface LeadPreference {
  purpose: PropertyPurpose | null;
  propertyType: PropertyType | null;
  minPrice: number | null;
  maxPrice: number | null;
  minBedrooms: number | null;
  minBathrooms: number | null;
  minParkingSpots: number | null;
  minArea: number | null;
  city: string | null;
  neighborhoods: string[];
  needsFinancing: boolean | null;
}

export interface LeadListItem {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  source: LeadSource;
  status: LeadStatus;
  temperature: LeadTemperature;
  assignedUserId: string | null;
  assignedUserName: string | null;
  lastContactAtUtc: string | null;
  nextContactAtUtc: string | null;
  preferenceSummary: string | null;
}

export interface LeadDetail extends Omit<LeadListItem, "preferenceSummary" | "assignedUserName"> {
  notes: string | null;
  aiSummary: string | null;
  preference: LeadPreference;
}

export interface FunnelStage {
  status: LeadStatus;
  count: number;
}

export interface DashboardSummary {
  newLeads: number;
  leadsInProgress: number;
  hotLeads: number;
  idleLeads: number;
  conversationsWaitingBroker: number;
  automatedConversations: number;
  totalProperties: number;
  availableProperties: number;
  messagesSentToday: number;
  aiRepliesToday: number;
  aiCacheHitsToday: number;
  upcomingAppointments: number;
  funnel: FunnelStage[];
}

export interface AppointmentListItem {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  propertyId: string | null;
  propertyCode: string | null;
  propertyTitle: string | null;
  assignedUserId: string | null;
  assignedUserName: string | null;
  type: AppointmentType;
  status: AppointmentStatus;
  scheduledAtUtc: string;
  notes: string | null;
}

export interface UpsertAppointmentRequest {
  leadId: string;
  propertyId: string | null;
  assignedUserId: string | null;
  type: AppointmentType;
  scheduledAtUtc: string;
  notes: string | null;
}

export enum UserRole { Corretor = 1, Gestor = 2, Admin = 3 }

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.Corretor]: "Corretor",
  [UserRole.Gestor]: "Gestor",
  [UserRole.Admin]: "Administrador",
};

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAtUtc: string | null;
  createdAtUtc: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  role: UserRole;
}

export interface CreatedUser {
  id: string;
  name: string;
  email: string;
  initialPassword: string;
}

export interface UpdateUserRequest {
  name: string;
  role: UserRole;
  isActive: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface TenantSettings {
  aiPersona: string | null;
  evolutionInstanceName: string | null;
  whatsAppConnected: boolean;
  whatsAppNumber: string | null;
  monthlyAiMessageLimit: number;
  monthlyAiMessageCount: number;
}

export interface UpdateTenantSettingsRequest {
  aiPersona: string | null;
  evolutionInstanceName: string | null;
}

export interface WhatsAppQrCode {
  base64Image: string | null;
  alreadyConnected: boolean;
}

/** Uma conta = um tenant inteiro (corretor autônomo), não um usuário do mesmo tenant. */
export interface PlatformAccount {
  tenantId: string;
  tenantName: string;
  tenantIsActive: boolean;
  ownerUserId: string;
  ownerName: string;
  ownerEmail: string;
  mustChangePassword: boolean;
  whatsAppConnected: boolean;
  whatsAppNumber: string | null;
  propertiesCount: number;
  lastLoginAtUtc: string | null;
  createdAtUtc: string;
}

export interface CreateAccountRequest {
  tenantName: string;
  ownerName: string;
  ownerEmail: string;
}

export interface CreatedAccount {
  tenantId: string;
  ownerUserId: string;
  ownerEmail: string;
  initialPassword: string;
}
