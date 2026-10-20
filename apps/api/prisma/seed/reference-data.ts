export const JOB_TITLES = [
  'Analyst',
  'Specialist',
  'Manager',
  'Director',
  'Coordinator',
  'Engineer',
] as const;

export const FIRST_NAMES = [
  'Ava',
  'Noah',
  'Mia',
  'Liam',
  'Sofia',
  'Ethan',
  'Priya',
  'Arjun',
  'Emma',
  'Oliver',
  'Hannah',
  'Lucas',
  'Chloe',
  'Henry',
  'Amelia',
  'Jack',
] as const;

export const LAST_NAMES = [
  'Patel',
  'Sharma',
  'Nguyen',
  'Garcia',
  'Brown',
  'Wilson',
  'Martin',
  'Dubois',
  'Schmidt',
  'Rossi',
  'Campbell',
  'Murphy',
  'Khan',
  'Singh',
  'Cohen',
  'Silva',
] as const;

export const ANNUAL_RANGE_MAJOR: Record<string, { min: number; max: number }> =
  {
    INR: { min: 600_000, max: 5_000_000 },
    USD: { min: 70_000, max: 220_000 },
    EUR: { min: 55_000, max: 160_000 },
    GBP: { min: 50_000, max: 150_000 },
    CAD: { min: 65_000, max: 180_000 },
  };

export const DEMO_USERS = [
  { id: 'user_hr_manager', email: 'hr.manager@acme.test', role: 'HR_MANAGER' },
  { id: 'user_hr_viewer', email: 'hr.viewer@acme.test', role: 'HR_VIEWER' },
  {
    id: 'user_directory',
    email: 'directory.user@acme.test',
    role: 'DIRECTORY_USER',
  },
  { id: 'user_auditor', email: 'auditor@acme.test', role: 'AUDITOR' },
] as const;
