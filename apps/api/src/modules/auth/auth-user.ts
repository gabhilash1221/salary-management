import type { RoleName } from '../../common/reference-data';

export type AuthUser = {
  userId: string;
  email: string;
  role: RoleName;
};
