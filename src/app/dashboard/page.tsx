import Dashboard from "@/components/Dashboard";
import { db } from "@/db";
import { getCurrentUser } from "@/db/localTempDb";
import { redirect } from "next/navigation";
import React from "react";

const page = async () => {
  // const [user] = await db.user.findMany();
  const user = await getCurrentUser();

  if (!user || !user.id) redirect("/");

  return <Dashboard />;
};

export default page;
