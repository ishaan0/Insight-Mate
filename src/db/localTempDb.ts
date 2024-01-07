import { User } from "@prisma/client";
import { db } from ".";

let currentUser: User | null;

export const getCurrentUser = async () => {
  if (!currentUser) currentUser = await db.user.findFirst();
  return currentUser;
};
