export enum ROLES {
  ADMIN = "admin",
  LEARNER = "learner",
}
export enum STATUSES {
  PENDING = "pending",
  CONFIRM = "confirmed",
  DENIED = "denied",
}
export enum GRADES {
  TNTHPT = "tốt nghiệp THPT",
  TWELFTH = "12",
  ELEVENTH = "11",
  TENTH = "10",
  NINTH = "9",
}
export enum TOPICS {
  ALGEBRA = "algebra",
  GEOMETRY = "geometry",
  COMBINATION = "combination",
}
export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  userRole: ROLES;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
  isHidden: boolean;
}

export interface Course {
  id: string;
  title: string;
  courseDescription: string;
  price: number;
  grade: GRADES;
  learnerCount: number;
  sectionCount: number;
  lectureCount: number;
  thumbnailUrl: string;
  isHidden: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export interface Section {
  id: string;
  title: string;
  courseId: string;
  sectionOrder: number;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export interface Lecture {
  id: string;
  title: string;
  sectionId: string;
  lectureOrder: number;
  note: string;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Enrollment {
  id: string;
  learnerId: string;
  courseId: string;
  createdAt: Date;
  updatedAt: Date;
  isHidden: boolean;
}

export interface Comment {
  id: string;
  commentText: string;
  parentId: string;
  userId: string;
  lectureId: string;
  createdAt: Date;
  updatedAt: Date;
  isHidden: boolean;
}

export interface DepositRequest {
  id: string;
  learnerId: string;
  amount: number;
  imageUrl: string;
  depositRequestStatus: STATUSES;
  createdAt: Date;
  updatedAt: Date;
  isHidden: boolean;
}

export interface Video {
  id: string;
  fileName: string;
  length: number;
  size: number;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export interface Topic {
  id: string;
  title: string;
  fileUrl: string;
  fileName: string;
  topicType: TOPICS;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}
