import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Droplets, Loader2 } from "lucide-react";
import { User, Session } from '@supabase/supabase-js';

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  
  const [signUpData, setSignUpData] = useState({
    email: "",
    password: "",
    fullName: "",
    role: searchParams.get("role") || "donor",
    bloodType: "",
  });

  const [signInData, setSignInData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          checkUserRoleAndRedirect(session.user.id);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkUserRoleAndRedirect(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkUserRoleAndRedirect = async (userId: string) => {
    // First try the user_roles table
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    let role: string | null = null;
    if (roles && roles.length > 0) {
      role = roles[0].role;
    }

    // Fallback to legacy storage key used by older stubs
    if (!role) {
      try {
        const legacy = JSON.parse(localStorage.getItem("lifelink_roles") || "{}");
        if (legacy && legacy[userId]) role = legacy[userId];
      } catch (e) {
        // ignore
      }
    }

    if (role) {
      if (role === "admin") navigate("/admin");
      else if (role === "donor") navigate("/donor");
      else if (role === "seeker") navigate("/seeker");
      return true;
    }

    return false;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: signUpData.fullName,
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Create role for user
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert([{ user_id: data.user.id, role: signUpData.role as "admin" | "donor" | "seeker" }]);

        if (roleError) throw roleError;

        // If user signed up as a donor, create an initial donor_profile row
        if (signUpData.role === "donor") {
          try {
            const profile = {
              id: `profile_${data.user.id}`,
              user_id: data.user.id,
              full_name: signUpData.fullName,
              email: signUpData.email,
              phone: null,
              blood_type: null,
              is_available: true,
              location_address: null,
              location_lat: null,
              location_lng: null,
              created_at: new Date().toISOString(),
            };
            const { error: profileError } = await supabase.from("donor_profiles").insert(profile);
            if (profileError) {
              // non-fatal: log and continue
              console.warn("Failed to create donor profile on signup:", profileError);
            }
          } catch (e) {
            console.warn("Exception creating donor profile:", e);
          }
        }
        // If user signed up as a seeker, create an initial seeker_profiles row
        if (signUpData.role === "seeker") {
          try {
            const seeker = {
              id: `seeker_${data.user.id}`,
              user_id: data.user.id,
              full_name: signUpData.fullName,
              email: signUpData.email,
              phone: null,
              blood_type_needed: null,
              urgency_level: null,
              location_address: null,
              location_lat: null,
              location_lng: null,
              needs_by: null,
              message: null,
              created_at: new Date().toISOString(),
            };
            const { error: seekerError } = await supabase.from("seeker_profiles").insert(seeker);
            if (seekerError) {
              console.warn("Failed to create seeker profile on signup:", seekerError);
            }
          } catch (e) {
            console.warn("Exception creating seeker profile:", e);
          }
        }

        toast({
          title: "Account created!",
          description: "You can now sign in with your credentials.",
        });
        // After creating role, attempt to redirect based on role
        await checkUserRoleAndRedirect(data.user.id);
      } else {
        // When Supabase is configured to require email confirmation, signUp may not
        // return a user immediately. Store the chosen role keyed by email in
        // localStorage so we can reconcile it when the user signs in.
        try {
          const key = 'lifelink_roles_by_email';
          const existing = JSON.parse(localStorage.getItem(key) || '{}');
          existing[signUpData.email] = signUpData.role;
          localStorage.setItem(key, JSON.stringify(existing));
          // Also store pending profile data so we can create donor_profiles after confirmation
          const pKey = 'lifelink_pending_profiles';
          const pending = JSON.parse(localStorage.getItem(pKey) || '{}');
          pending[signUpData.email] = { full_name: signUpData.fullName, email: signUpData.email };
          localStorage.setItem(pKey, JSON.stringify(pending));
        } catch (e) {
          // ignore localStorage errors
        }

        toast({
          title: 'Account created — confirm your email',
          description: 'Check your inbox and confirm the link. You will be redirected to your dashboard; complete confirmation to enable full features.',
        });
        // If user signed up as donor but confirmation is required, still redirect
        // them to the donor dashboard so they can see the UI; we'll reconcile
        // their role/profile after they confirm and sign in.
        if (signUpData.role === 'donor') {
          navigate('/donor');
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInData.email,
        password: signInData.password,
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
      });

      // If sign in returned user data, check role and redirect. Also attempt to fetch current user as fallback.
      const userId = data?.user?.id;
      let redirected = false;
      if (userId) {
        redirected = await checkUserRoleAndRedirect(userId);
      } else {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) redirected = await checkUserRoleAndRedirect(userData.user.id);
      }

      // If no redirect happened (user has no role yet), try to reconcile any
      // role stored locally keyed by email (from signUp when email confirmation
      // was required). If found, insert into user_roles and redirect.
      if (!redirected && data?.user) {
        try {
          const key = 'lifelink_roles_by_email';
          const mapping = JSON.parse(localStorage.getItem(key) || '{}');
          const role = mapping[signInData.email];
          if (role) {
            // insert mapping into user_roles for this user id
            const { error: roleError } = await supabase.from('user_roles').insert([{ user_id: data.user.id, role }]);
            if (!roleError) {
              // cleanup local mapping
              delete mapping[signInData.email];
              localStorage.setItem(key, JSON.stringify(mapping));
              // If role is donor, also create donor_profiles if we have pending profile data
              if (role === 'donor') {
                try {
                  const pKey = 'lifelink_pending_profiles';
                  const pending = JSON.parse(localStorage.getItem(pKey) || '{}');
                  const profileData = pending[signInData.email];
                  if (profileData) {
                    const profile = {
                      id: `profile_${data.user.id}`,
                      user_id: data.user.id,
                      full_name: profileData.full_name,
                      email: profileData.email,
                      phone: null,
                      blood_type: null,
                      is_available: true,
                      location_address: null,
                      location_lat: null,
                      location_lng: null,
                      created_at: new Date().toISOString(),
                    };
                    const { error: profileError } = await supabase.from('donor_profiles').insert(profile);
                    if (!profileError) {
                      delete pending[signInData.email];
                      localStorage.setItem(pKey, JSON.stringify(pending));
                    }
                  }
                } catch (e) {
                  // ignore
                }
              // If role is seeker, also create seeker_profiles if we have pending profile data
              if (role === 'seeker') {
                try {
                  const pKey = 'lifelink_pending_profiles';
                  const pending = JSON.parse(localStorage.getItem(pKey) || '{}');
                  const profileData = pending[signInData.email];
                  if (profileData) {
                    const seeker = {
                      id: `seeker_${data.user.id}`,
                      user_id: data.user.id,
                      full_name: profileData.full_name,
                      email: profileData.email,
                      phone: null,
                      blood_type_needed: null,
                      urgency_level: null,
                      location_address: null,
                      location_lat: null,
                      location_lng: null,
                      needs_by: null,
                      message: null,
                      created_at: new Date().toISOString(),
                    };
                    const { error: seekerError } = await supabase.from('seeker_profiles').insert(seeker);
                    if (!seekerError) {
                      delete pending[signInData.email];
                      localStorage.setItem(pKey, JSON.stringify(pending));
                    }
                  }
                } catch (e) {
                  // ignore
                }
              }
              }
              // redirect now
              await checkUserRoleAndRedirect(data.user.id);
              return;
            }
          }
        } catch (e) {
          // ignore errors and fall back to homepage
        }

        // Finally, if still not redirected, send them home so they can pick a role
        navigate("/");
      }
    } catch (error: any) {
      // Helpful handling when Supabase requires email confirmation
      const msg = String(error?.message || error);
      if (msg.toLowerCase().includes("email not confirmed") || msg.toLowerCase().includes("confirmation")) {
        toast({
          title: "Email not confirmed",
          description: "Please confirm your email address. Check your inbox for the confirmation link. You can also send a magic sign-in link.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const sendMagicLink = async () => {
    if (!signInData.email) {
      toast({ title: 'Enter email', description: 'Please enter your email to send a magic link.' });
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithOtp({ email: signInData.email });
      if (error) throw error;
      toast({ title: 'Magic link sent', description: 'Check your email for a login link.' });
    } catch (e: any) {
      toast({ title: 'Error sending magic link', description: e.message || String(e), variant: 'destructive' });
    }
  };

  // Note: we intentionally don't early-return when a user session exists.
  // The `checkUserRoleAndRedirect` call in useEffect will redirect users who have
  // an assigned role. If a signed-in user does not yet have a role, we keep showing
  // the auth UI so they can complete signup/profile flows. This avoids a stuck
  // "Redirecting..." state when the role is missing.

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Droplets className="h-10 w-10 text-primary" />
            <span className="text-3xl font-bold">LifeLink</span>
          </div>
          <h1 className="text-2xl font-bold">Welcome</h1>
          <p className="text-muted-foreground">Sign in or create an account to continue</p>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <Card>
              <CardHeader>
                <CardTitle>Sign In</CardTitle>
                <CardDescription>Enter your credentials to access your account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="your@email.com"
                      value={signInData.email}
                      onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      value={signInData.password}
                      onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                  <div className="mt-2 text-sm flex items-center justify-between">
                    <button type="button" className="text-primary underline" onClick={sendMagicLink}>
                      Send magic sign-in link
                    </button>
                    <button type="button" className="text-muted-foreground" onClick={() => setSignInData({ ...signInData, password: '' })}>
                      Clear password
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Create Account</CardTitle>
                <CardDescription>Join as a donor or seeker to get started</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullname">Full Name</Label>
                    <Input
                      id="fullname"
                      type="text"
                      placeholder="John Doe"
                      value={signUpData.fullName}
                      onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={signUpData.password}
                      onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Join As</Label>
                    <Select
                      value={signUpData.role}
                      onValueChange={(value) => setSignUpData({ ...signUpData, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="donor">Donor</SelectItem>
                        <SelectItem value="seeker">Seeker</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bloodType">Blood Group</Label>
                    <Select
                      value={signUpData.bloodType}
                      onValueChange={(value) => setSignUpData({ ...signUpData, bloodType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Auth;
