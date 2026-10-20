export type AuthSession = {
  token: string;
  role: string;
  email: string;
};

export type LoginResponse = {
  accessToken: string;
  role: string;
  email: string;
};

export type Salary = {
  id: string;
  amountMinor: number;
  currency: string;
  effectiveDate: string;
  reason: string | null;
};

export type Employee = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  country: string;
  jobTitle: string;
  status: string;
  hireDate: string;
  terminationDate: string | null;
  version: number;
  currentSalary?: Salary | null;
};

export type EmployeePage = {
  items: Employee[];
  total: number;
  page: number;
  pageSize: number;
};

export type SummaryRow = {
  currency: string;
  department?: string;
  country?: string;
  employmentStatus?: string;
  count: number;
  suppressed: boolean;
  min?: number;
  max?: number;
  average?: number;
  median?: number;
};

export type QuestionResponse =
  | {
      supported: true;
      intent: string;
      metric: string;
      filters: Record<string, string | undefined>;
      currency: string | null;
      results: Array<Record<string, unknown>>;
      definition: string;
      rowCount: number;
    }
  | {
      supported: false;
      reason: string;
      clarification?: string;
      suggestions: string[];
    };
