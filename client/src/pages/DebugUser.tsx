import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export default function DebugUser() {
  const { user, isAuthenticated } = useAuth();
  const { data: dbUser } = trpc.auth.me.useQuery();

  return (
    <div className="container mx-auto px-4 py-6 sm:p-8">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Debug User Info</h1>
      
      <div className="space-y-4 sm:space-y-6">
        <div className="bg-card p-4 sm:p-6 rounded-xl border shadow-sm">
          <h2 className="font-bold text-base sm:text-lg mb-3">Auth Hook Data:</h2>
          <div className="bg-muted/50 p-3 sm:p-4 rounded-lg overflow-x-auto border">
            <pre className="text-xs sm:text-sm font-mono whitespace-pre">{JSON.stringify({ user, isAuthenticated }, null, 2)}</pre>
          </div>
        </div>

        <div className="bg-card p-4 sm:p-6 rounded-xl border shadow-sm">
          <h2 className="font-bold text-base sm:text-lg mb-3">DB User Data:</h2>
          <div className="bg-muted/50 p-3 sm:p-4 rounded-lg overflow-x-auto border">
            <pre className="text-xs sm:text-sm font-mono whitespace-pre">{JSON.stringify(dbUser, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
