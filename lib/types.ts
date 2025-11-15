export enum UserRole {
  Student = "Student",
  Staff = "Staff",
  Professor = "Professor",
  TA = "TA",
}

export enum AuthRole {
  User = "User",
  Admin = "Admin",
  EventOffice = "EventOffice",
  Vendor = "Vendor",
}

export enum UserStatus {
  Active = "Active",
  Blocked = "Blocked",
}

export enum VendorStatus {
  Pending = "pending",
  Approved = "approved",
  Rejected = "rejected",
}

export enum EventType {
  Workshop = "Workshop",
  Seminar = "Seminar",
  Conference = "Conference",
  Trip = "Trip",
  Bazaar = "Bazaar",
}

export enum Location {
  Cairo = "GUC Cairo",
  Berlin = "GUC Berlin",
}

export enum Faculty {
  MET = "MET",
  IET = "IET",
  MCTR = "MCTR",
  ARCH = "ARCH",
  BI = "BI",
  Civil = "Civil",
  Dentistry = "Dentistry",
  Pharmacy = "Pharmacy",
}

export enum FundingSource {
  External = "External",
  GUC = "GUC",
}

export enum GymSessionType {
  Yoga = "Yoga",
  Cardio = "Cardio",
  Strength = "Strength",
  Pilates = "Pilates",
  CrossFit = "CrossFit",
}

export enum CourtType {
  Tennis = "tennis",
  Football = "football",
  Basketball = "basketball",
}

export interface SessionUser {
  id: string;
  email: string;
  role: AuthRole;
  name?: string;
  userRole?: UserRole;
  adminType?: "Admin" | "EventOffice";
  status?: string;
  companyName?: string;
  logo?: string;
}

export interface ApiError {
  status: number;
  message: string;
  issues?: Record<string, string[]>;
}

export interface SessionState {
  token: string;
  user: SessionUser;
}

export interface EventSummary {
  id: string;
  name: string;
  eventType: EventType;
  description: string;
  location: Location;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  participatingProfessors?: string[];
  participatingProfessorIds?: string[];
  capacity?: number;
  registeredCount?: number;
  price?: number;
  vendors?: VendorSummary[];
  isRegistered?: boolean;
  fundingSource?: FundingSource;
  fullAgenda?: string;
  websiteLink?: string;
  extraRequiredResources?: string;
  requiredBudget?: number;
  archived?: boolean;
}

export interface Workshop {
  id: string;
  name: string;
  location: Location;
  startDate: string;
  endDate: string;
  description: string;
  fullAgenda: string;
  faculty: string;
  participatingProfessorIds: string[];
  participatingProfessors: string[];
  requiredBudget: number;
  price: number;
  fundingSource: FundingSource;
  extraRequiredResources?: string;
  capacity: number;
  registrationDeadline: string;
  createdBy?: string;
  createdByName?: string;
  createdByRole?: string;
  workshopStatus?: string;
  requestedEdits?: string | null;
}

export interface ProfessorSummary {
  id: string;
  name: string;
  email: string;
}

export interface VendorSummary {
  id: string;
  companyName: string;
  status?: VendorStatus;
  logo?: string;
  booth?: {
    location: string;
    startTime: string;
    endTime: string;
  };
  hasPaid?: boolean;
}

export interface UserRegisteredEvent {
  id: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  status: "Past" | "Upcoming";
}

export interface CourtSlot {
  courtType: CourtType;
  name: string;
  availability: Array<{
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }>;
}

export interface GymSession {
  id: string;
  date: string;
  time: string;
  duration: number;
  type: GymSessionType;
  maxParticipants: number;
  registeredCount?: number;
  registeredUsers?: string[];
  isRegistered?: boolean;
  remainingSpots?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FavoriteEvent {
  id: string;
  name: string;
  description: string;
  eventType: string;
  location: string;
  startDate: string;
  endDate: string;
  price?: number;
}

export interface EventRatingEntry {
  id: string;
  rating: number;
  comment?: string;
  eventId: string;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface EventRatingsSummary {
  event: {
    id: string;
    name: string;
    startDate?: string;
    endDate?: string;
  };
  averageRating: number;
  totalRatings: number;
  ratings: EventRatingEntry[];
}

export interface EventComment {
  id: string;
  content: string;
  eventId: string;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  };
  parentCommentId?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventFeedbackPayload {
  ratings: EventRatingsSummary;
  comments: EventComment[];
}

export interface WorkshopParticipant {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role?: string;
  studentId?: string;
  staffId?: string;
}

export interface WorkshopParticipantsSnapshot {
  workshopId: string;
  workshopName: string;
  capacity: number;
  registeredCount: number;
  remainingSpots: number;
  participants: WorkshopParticipant[];
}

export interface LoyaltyProgramDetails {
  discountRate: number;
  promoCode: string;
  termsAndConditions: string;
  status: string;
  appliedAt?: string;
  cancelledAt?: string;
}

export interface LoyaltyPartner {
  id: string;
  companyName: string;
  email: string;
  logo?: string;
  loyaltyProgram: LoyaltyProgramDetails;
}

export interface VendorPollDuration {
  start: string;
  end: string;
}

export interface VendorPollOption {
  vendorId: string;
  vendorName: string;
  votes: number;
  logo?: string;
}

export interface VendorPoll {
  id: string;
  boothName: string;
  durations: VendorPollDuration[];
  options: VendorPollOption[];
  totalVotes: number;
  selectedVendorId?: string;
}

export interface NotificationEntry {
  message: string;
  seen: boolean;
  createdAt?: string;
}

export interface NotificationList {
  notifications: NotificationEntry[];
}

export interface WalletRefundRecord {
  eventId: string;
  eventName?: string;
  amount: number;
  refundedAt?: string;
  receiptNumber?: string;
  refundReference?: string;
}

export interface WalletSummary {
  balance: number;
  totalRefunded: number;
  refunds: WalletRefundRecord[];
}
