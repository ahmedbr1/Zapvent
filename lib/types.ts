// Enums matching backend
export enum Location {
  GUC_CAIRO = "GUC Cairo",
  GUC_BERLIN = "GUC Berlin",
}

export enum Faculty {
  IET = "IET",
  MEDIA = "MEDIA",
  PHARMACY = "PHARMACY",
  BUSINESS = "BUSINESS",
  BIOTECHNOLOGY = "BIOTECHNOLOGY",
}

export enum FundingSource {
  EXTERNAL = "External",
  GUC = "GUC",
}

export enum EventType {
  WORKSHOP = "Workshop",
  SEMINAR = "Seminar",
  CONFERENCE = "Conference",
  TRIP = "Trip",
  BAZAAR = "Bazaar",
}

export enum UserRole {
  STUDENT = "Student",
  STAFF = "Staff",
  PROFESSOR = "Professor",
  TA = "TA",
}

export enum UserStatus {
  ACTIVE = "Active",
  BLOCKED = "Blocked",
  PENDING = "Pending",
}

export enum VendorStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum GymSessionType {
  YOGA = "Yoga",
  CARDIO = "Cardio",
  STRENGTH = "Strength",
  PILATES = "Pilates",
  CROSSFIT = "CrossFit",
  AEROBICS = "Aerobics",
  ZUMBA = "Zumba",
  KICKBOXING = "Kick-boxing",
}

export enum CourtType {
  TENNIS = "tennis",
  FOOTBALL = "football",
  BASKETBALL = "basketball",
}

// User Types
export interface User {
  _id: string;
  email: string;
  name: string;
  phoneNumber: string;
  role: UserRole;
  faculty: Faculty;
  studentId?: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Admin {
  _id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vendor {
  _id: string;
  email: string;
  businessName: string;
  phoneNumber: string;
  businessDescription: string;
  status: VendorStatus;
  commercialRegistrationNumber: string;
  taxCardNumber: string;
  commercialRegistrationDocument?: string;
  taxCardDocument?: string;
  createdAt: string;
  updatedAt: string;
}

// Event Types
export interface Event {
  _id: string;
  name: string;
  description: string;
  eventType: EventType;
  date: string;
  location: Location;
  capacity?: number;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  price?: number;
  fullAgenda?: string;
  faculty?: Faculty;
  requiredBudget?: number;
  participatingProfessors?: string[];
  fundingSource: FundingSource;
  websiteLink?: string;
  revenue: number;
  archived: boolean;
  registeredUsers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GymSession {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  type: GymSessionType;
  maxParticipants: number;
  registeredUsers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Court {
  _id: string;
  type: CourtType;
  name: string;
  isAvailable: boolean;
  location: Location;
  createdAt: string;
  updatedAt: string;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface UserRegisterData {
  email: string;
  password: string;
  name: string;
  phoneNumber: string;
  role: UserRole;
  faculty: Faculty;
  studentId?: string;
}

export interface VendorRegisterData {
  email: string;
  password: string;
  businessName: string;
  phoneNumber: string;
  businessDescription: string;
  commercialRegistrationNumber: string;
  taxCardNumber: string;
  commercialRegistrationDocument?: string;
  taxCardDocument?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User | Admin | Vendor;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}
