import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export default function DebugUser() {
  const { user, isAuthenticated } = useAuth();
  const { data: dbUser } = trpc.auth.me.useQuery();

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Debug User Info</h1>
      
      <div className="space-y-4">
        <div className="bg-card p-4 rounded-lg">
          <h2 className="font-bold mb-2">Auth Hook Data:</h2>
          <pre className="text-sm">{JSON.stringify({ user, isAuthenticated }, null, 2)}</pre>
        </div>

        <div className="bg-card p-4 rounded-lg">
          <h2 className="font-bold mb-2">DB User Data:</h2>
          <pre className="text-sm">{JSON.stringify(dbUser, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
