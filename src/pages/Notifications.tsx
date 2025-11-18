import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";

const Notifications = () => {
  const { role } = useParams();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id);
      setNotifications(data || []);
    })();
  }, []);

  return (
    <Layout role={role as any}>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Notifications</h1>
        {notifications.length === 0 ? (
          <div className="text-muted-foreground">No notifications.</div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div key={n.id} className="p-4 border rounded">
                <div className="font-medium">{n.title}</div>
                <div className="text-sm text-muted-foreground">{n.message}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Notifications;
