export enum ROLES {
  ADMIN = "admin",
  LEARNER = "learner",
}

export enum STATUSES {
  PENDING = "pending",
  CONFIRM = "confirmed",
  DENIED = "denied",
}
export enum COURSE_TYPE {
  THEORY = "theory",
  EXAMINATION_SOLVING = "examination solving",
}
export enum GRADES {
  TWELFTH = "12",
  ELEVENTH = "11",
  TENTH = "10",
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
}

export interface Course {
  id: string;
  title: string;
  courseDescription: string;
  price: number;
  courseType: COURSE_TYPE;
  grade: GRADES;
  learnerCount: number;
  sectionCount: number;
  lectureCount: number;
  thumbnailUrl: string;
  isHidden: boolean;
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
}

export interface Video {
  id: string;
  fileName: string;
  length: number;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}
