import Dashboard from '@/components/Dashboard';
import { getCurrentUser } from '@/db/localTempDb';
import { redirect } from 'next/navigation';

const page = async () => {
  // const [user] = await db.user.findMany();
  var user = await getCurrentUser();

  if (!user || !user.id) redirect('/');

  return <Dashboard />;
};

export default page;
