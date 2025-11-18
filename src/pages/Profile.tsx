import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";

const Profile = () => {
  const { role } = useParams();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  return (
    <Layout role={role as any}>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Profile</h1>
        {user ? (
          <div className="space-y-2">
            <div><strong>ID:</strong> {user.id}</div>
            <div><strong>Email:</strong> {user.email}</div>
            <div><strong>Full name:</strong> {user.full_name || "-"}</div>
            <div className="text-sm text-muted-foreground">Role: {role}</div>
          </div>
        ) : (
          <div className="text-muted-foreground">No user information available.</div>
        )}
      </div>
    </Layout>
  );
};

export default Profile;
