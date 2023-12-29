import { redirect } from "next/navigation";
import React from "react";

const page = () => {
  const user = { name: "ishaan", id: "3498739847jldfjlo34343" };

  if (!user || !user.id) redirect("/");
  return <div></div>;
};

export default page;
