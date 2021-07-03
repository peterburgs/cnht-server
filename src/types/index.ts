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
