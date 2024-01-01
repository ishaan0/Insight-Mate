import { db } from ".";

let currentUser: any;

export const getCurrentUser = async () => {
  if (!currentUser) currentUser = await db.user.findFirst();
  return currentUser;
};
