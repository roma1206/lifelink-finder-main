import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Droplets, MapPin, Calendar, Activity } from "lucide-react";
import { Link } from "react-router-dom";

const DonorDashboard = () => {
  const { toast } = useToast();
  const [donorProfile, setDonorProfile] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    loadDonorData();
  }, []);

  const loadDonorData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // If no authenticated user, show demo data so the UI is rich for local/static mode
        const demoProfile = {
          id: "demo_donor_1",
          user_id: "demo_user_1",
          full_name: "Alex Johnson",
          blood_type: "O+",
          is_available: true,
          location_address: "Downtown Clinic",
          last_donation_date: null,
        };
        setDonorProfile(demoProfile);
        setRequests([
          {
            id: "req_demo_1",
            seeker_id: "demo_seeker_1",
            profiles: { full_name: "Ravi Patel", email: "ravi.patel@example.com" },
            created_at: new Date().toISOString(),
            status: "pending",
            blood_type: "O+",
          },
        ]);
        return;
      }

      const { data: profile } = await supabase
        .from("donor_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setDonorProfile(profile);

      const { data: requestsData } = await supabase
        .from("blood_requests")
        .select(`
          *,
          profiles:seeker_id (full_name, email)
        `)
        .eq("donor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      setRequests(requestsData || []);
    } catch (error) {
      console.error("Error loading donor data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async () => {
    if (!donorProfile) return;
    
    setToggling(true);
    try {
      const newStatus = !donorProfile.is_available;
      
      const { error } = await supabase
        .from("donor_profiles")
        .update({ is_available: newStatus })
        .eq("id", donorProfile.id);

      if (error) throw error;

      setDonorProfile({ ...donorProfile, is_available: newStatus });
      
      toast({
        title: newStatus ? "You're now available!" : "Status updated",
        description: newStatus 
          ? "Seekers can now find and contact you." 
          : "You're marked as unavailable.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <Layout role="donor">
        <div className="text-center py-12">Loading...</div>
      </Layout>
    );
  }

  if (!donorProfile) {
    return (
      <Layout role="donor">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Complete Your Donor Profile</CardTitle>
            <CardDescription>
              Please complete your profile to start helping those in need.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/donor/profile">
              <Button variant="hero" className="w-full">
                Complete Profile
              </Button>
            </Link>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout role="donor">
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Donor Dashboard</h1>
            <p className="text-muted-foreground">Manage your availability and requests</p>
          </div>
        </div>

        {/* Availability Toggle Card */}
        <Card className="border-2 shadow-elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Donation Status</CardTitle>
                <CardDescription>Toggle your availability for blood donation</CardDescription>
              </div>
              <Badge 
                variant={donorProfile.is_available ? "default" : "secondary"}
                className="text-lg px-4 py-2"
              >
                {donorProfile.is_available ? "Available" : "Unavailable"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Droplets className="h-4 w-4" />
                  Blood Type
                </div>
                <div className="text-2xl font-bold text-primary">{donorProfile.blood_type}</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Location
                </div>
                <div className="text-sm font-medium truncate">{donorProfile.location_address}</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Last Donation
                </div>
                <div className="text-sm font-medium">
                  {donorProfile.last_donation_date 
                    ? new Date(donorProfile.last_donation_date).toLocaleDateString()
                    : "Never"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  Requests
                </div>
                <div className="text-sm font-medium">{requests.length} total</div>
              </div>
            </div>
            
            <Button 
              onClick={toggleAvailability}
              disabled={toggling}
              variant={donorProfile.is_available ? "outline" : "hero"}
              size="lg"
              className="w-full"
            >
              {toggling ? "Updating..." : donorProfile.is_available 
                ? "Mark as Unavailable" 
                : "Mark as Available"}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-4">
            <CardTitle className="text-lg">Share Availability</CardTitle>
            <CardDescription>Share a quick link or QR so nearby seekers can contact you.</CardDescription>
            <CardContent>
              <Button className="mt-3" variant="outline">Copy Link</Button>
            </CardContent>
          </Card>
          <Card className="p-4">
            <CardTitle className="text-lg">Update Location</CardTitle>
            <CardDescription>Keep your location up-to-date to be found by seekers.</CardDescription>
            <CardContent>
              <Button className="mt-3">Update Location</Button>
            </CardContent>
          </Card>
          <Card className="p-4">
            <CardTitle className="text-lg">Health Notes</CardTitle>
            <CardDescription>Log last donation or health notes for your records.</CardDescription>
            <CardContent>
              <Button className="mt-3">Add Note</Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Blood Requests</CardTitle>
            <CardDescription>People who have requested blood from you</CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No requests yet. When seekers find you, they'll appear here.
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="font-medium">{request.profiles?.full_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {request.profiles?.email}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={
                        request.status === "pending" ? "default" :
                        request.status === "fulfilled" ? "secondary" : "outline"
                      }>
                        {request.status}
                      </Badge>
                      <Badge variant="outline">{request.blood_type}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default DonorDashboard;
