export enum UserRole {
  Student = "Student",
  Staff = "Staff",
  Professor = "Professor",
  TA = "TA",
}

export enum AuthRole {
  User = "User",
  Admin = "Admin",
  EventsOffice = "EventsOffice",
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
  adminType?: "Admin" | "EventsOffice";
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
  fundingSource: FundingSource;
  extraRequiredResources?: string;
  capacity: number;
  registrationDeadline: string;
  createdBy?: string;
  createdByName?: string;
  createdByRole?: string;
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
}

export interface UserRegisteredEvent {
  id: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
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
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
