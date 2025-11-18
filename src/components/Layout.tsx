import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Droplets, LogOut, User, Bell } from "lucide-react";
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface LayoutProps {
  children: React.ReactNode;
  role?: "donor" | "seeker" | "admin";
}

const Layout = ({ children, role }: LayoutProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    // Read current session but do not force navigation to /auth. Pages should be
    // viewable without an active session; actions that require auth will handle
    // prompting the user. We still update local `user` state so header can show
    // the correct Sign In / Sign Out UI.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        // Do not auto-navigate to /auth on sign-out; keep UX simple and allow pages to render.
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadNotificationCount();
      
      const channel = supabase
        .channel('notifications-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => loadNotificationCount()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadNotificationCount = async () => {
    if (!user) return;
    
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", user.id)
      .eq("read", false);

    setNotificationCount(count || 0);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You've been successfully signed out.",
    });
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <Link to={role ? `/${role}` : "/"} className="flex items-center gap-2">
              <Droplets className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">LifeLink</span>
            </Link>
            
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  {role && (
                    <>
                      <Link to={`/${role}/notifications`}>
                        <Button variant="ghost" size="icon" className="relative">
                          <Bell className="h-5 w-5" />
                          {notificationCount > 0 && (
                            <Badge 
                              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-primary"
                            >
                              {notificationCount}
                            </Badge>
                          )}
                        </Button>
                      </Link>
                      <Link to={`/${role}/profile`}>
                        <Button variant="ghost" size="icon">
                          <User className="h-5 w-5" />
                        </Button>
                      </Link>
                    </>
                  )}
                  <Button variant="ghost" size="icon" onClick={handleSignOut}>
                    <LogOut className="h-5 w-5" />
                  </Button>
                </>
              ) : (
                <Link to="/auth">
                  <Button variant="ghost">Sign In</Button>
                </Link>
              )}
            </div>
          </nav>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
