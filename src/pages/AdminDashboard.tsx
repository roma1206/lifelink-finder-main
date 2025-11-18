import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, Users, Droplets, Activity, Ban, CheckCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AdminDashboard = () => {
  const { toast } = useToast();
  const [donors, setDonors] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDonors: 0,
    availableDonors: 0,
    totalRequests: 0,
    pendingRequests: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load donors
      const { data: donorsData } = await supabase
        .from("donor_profiles")
        .select(`
          *,
          profiles:user_id (full_name, email)
        `)
        .order("created_at", { ascending: false });

      setDonors(donorsData || []);

      // Load requests
      const { data: requestsData } = await supabase
        .from("blood_requests")
        .select(`
          *,
          seeker:seeker_id (full_name, email),
          donor:donor_id (full_name, email)
        `)
        .order("created_at", { ascending: false });

      setRequests(requestsData || []);

      // Calculate stats
      const availableCount = donorsData?.filter(d => d.is_available).length || 0;
      const pendingCount = requestsData?.filter(r => r.status === 'pending').length || 0;

      setStats({
        totalDonors: donorsData?.length || 0,
        availableDonors: availableCount,
        totalRequests: requestsData?.length || 0,
        pendingRequests: pendingCount,
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDonorStatus = async (donorId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("donor_profiles")
        .update({ is_available: !currentStatus })
        .eq("id", donorId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: "Donor availability has been updated.",
      });

      loadDashboardData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateRequestStatus = async (requestId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("blood_requests")
        .update({ status: status as "pending" | "fulfilled" | "cancelled" })
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Request updated",
        description: `Request marked as ${status}.`,
      });

      loadDashboardData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredDonors = donors.filter((donor) =>
    donor.profiles?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    donor.profiles?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    donor.blood_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Layout role="admin">
        <div className="text-center py-12">Loading dashboard...</div>
      </Layout>
    );
  }

  return (
    <Layout role="admin">
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage donors and blood requests</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Total Donors</div>
                  <div className="text-3xl font-bold">{stats.totalDonors}</div>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Available</div>
                  <div className="text-3xl font-bold text-success">{stats.availableDonors}</div>
                </div>
                <Droplets className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Total Requests</div>
                  <div className="text-3xl font-bold">{stats.totalRequests}</div>
                </div>
                <Activity className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                  <div className="text-3xl font-bold text-primary">{stats.pendingRequests}</div>
                </div>
                <Activity className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Donor Management */}
        <Card>
          <CardHeader>
            <CardTitle>Donor Management</CardTitle>
            <CardDescription>View and manage all registered donors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search donors by name, email, or blood type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-3">
              {filteredDonors.map((donor) => (
                <div
                  key={donor.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="space-y-1 flex-1">
                    <div className="font-medium">{donor.profiles?.full_name}</div>
                    <div className="text-sm text-muted-foreground">{donor.profiles?.email}</div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{donor.blood_type}</Badge>
                      <Badge variant={donor.is_available ? "default" : "secondary"}>
                        {donor.is_available ? "Available" : "Unavailable"}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant={donor.is_available ? "outline" : "success"}
                    size="sm"
                    onClick={() => toggleDonorStatus(donor.id, donor.is_available)}
                  >
                    {donor.is_available ? <Ban className="h-4 w-4 mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    {donor.is_available ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Request Management */}
        <Card>
          <CardHeader>
            <CardTitle>Blood Requests</CardTitle>
            <CardDescription>Manage all blood donation requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border rounded-lg"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{request.blood_type}</Badge>
                      <Badge variant={
                        request.status === "pending" ? "default" :
                        request.status === "fulfilled" ? "secondary" : "outline"
                      }>
                        {request.status}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-sm">
                        <span className="font-medium">Seeker:</span> {request.seeker?.full_name}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Donor:</span> {request.donor?.full_name}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(request.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={request.status}
                      onValueChange={(value) => updateRequestStatus(request.id, value)}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="fulfilled">Fulfilled</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
