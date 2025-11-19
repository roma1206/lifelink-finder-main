import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, MapPin, Send, Droplets } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const SeekerDashboard = () => {
  const { toast } = useToast();
  const [donors, setDonors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchBloodType, setSearchBloodType] = useState<string>("");
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [modalDonor, setModalDonor] = useState<any | null>(null);

  useEffect(() => {
    getUserLocation();
  }, []);

  // On mount, try to load current seeker profile and initial donors
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // try to load seeker profile for this user
          const { data: seekerRows } = await supabase.from('seeker_profiles').select('*').eq('user_id', user.id).limit(1);
          if (seekerRows && seekerRows.length > 0) {
            const seeker = seekerRows[0];
            if (seeker.blood_type_needed) setSearchBloodType(seeker.blood_type_needed);
          }
        }
      } catch (e) {
        // ignore
      }

      // load donors (all available by default)
      await loadDonors();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Seed demo donors if table is empty to provide a better UI experience
    (async () => {
      try {
        const { data } = await supabase.from("donor_profiles").select("*");
        if (!data || data.length === 0) {
          await supabase.from("donor_profiles").insert([
            {
              id: "demo_donor_1",
              user_id: "demo_user_1",
              full_name: "Alex Johnson",
              email: "alex.johnson@example.com",
              phone: "555-0101",
              blood_type: "O+",
              is_available: true,
              location_address: "Downtown Clinic",
              location_lat: 37.7749,
              location_lng: -122.4194,
              created_at: new Date().toISOString(),
            },
            {
              id: "demo_donor_2",
              user_id: "demo_user_2",
              full_name: "Priya Singh",
              email: "priya.singh@example.com",
              phone: "555-0202",
              blood_type: "A+",
              is_available: true,
              location_address: "City Hospital",
              location_lat: 37.7849,
              location_lng: -122.4094,
              created_at: new Date().toISOString(),
            },
          ]);
        }
      } catch (e) {
        // ignore seed errors
      }
    })();
  }, []);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          toast({
            title: "Location access denied",
            description: "Please enable location to find nearby donors.",
            variant: "destructive",
          });
        }
      );
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const searchDonors = async () => {
    // Use loadDonors to support searching and default load behavior
    await loadDonors(searchBloodType || undefined);
  };

  const loadDonors = async (bloodType?: string) => {
    setLoading(true);
    try {
      let query = supabase.from("donor_profiles").select(`*, profiles:user_id (full_name, email, phone)`)
        .eq("is_available", true);

      if (bloodType) {
        query = query.eq("blood_type", bloodType as any);
      }

      const { data } = await query;
      let donorsWithDistance = data || [];

      if (userLocation) {
        donorsWithDistance = donorsWithDistance.map((donor) => ({
          ...donor,
          distance: (donor.location_lat && donor.location_lng && userLocation)
            ? calculateDistance(
                userLocation.lat,
                userLocation.lng,
                donor.location_lat,
                donor.location_lng
              )
            : undefined,
        }));
      }

      // If seeker has a preferred blood type, prioritize exact matches first
      if (bloodType) {
        donorsWithDistance.sort((a, b) => {
          // exact match priority already filtered; just sort by distance if available
          if (a.distance != null && b.distance != null) return a.distance - b.distance;
          if (a.distance != null) return -1;
          if (b.distance != null) return 1;
          return 0;
        });
      } else if (userLocation) {
        donorsWithDistance = donorsWithDistance.sort((a, b) => {
          if (a.distance == null) return 1;
          if (b.distance == null) return -1;
          return a.distance - b.distance;
        });
      }

      setDonors(donorsWithDistance);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const sendBloodRequest = async (donorId: string, bloodType: string) => {
    setSendingRequest(donorId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const messageToSend = requestMessage;

      const { error: requestError } = await supabase
        .from("blood_requests")
        .insert([{
          seeker_id: user.id,
          donor_id: donorId,
          blood_type: bloodType as any,
          message: messageToSend,
          urgency_level: "high",
        }]);

      if (requestError) throw requestError;

      // Create notification for donor
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: donorId,
          title: "New Blood Request",
          message: `You have a new blood donation request for ${bloodType}.`,
          type: "blood_request",
        });

      if (notificationError) throw notificationError;

      toast({
        title: "Request sent!",
        description: "The donor will be notified about your request.",
      });

      setRequestMessage("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSendingRequest(null);
    }
  };

  const openContactModal = (donor: any) => {
    setModalDonor(donor);
    setRequestMessage("");
    setContactModalOpen(true);
  };

  const closeContactModal = () => {
    setModalDonor(null);
    setRequestMessage("");
    setContactModalOpen(false);
  };

  const confirmSendFromModal = async () => {
    if (!modalDonor) return;
    await sendBloodRequest(modalDonor.user_id || modalDonor.id, modalDonor.blood_type);
    closeContactModal();
  };

  const seedDemoData = async () => {
    try {
      await supabase.from("donor_profiles").insert([
        {
          id: `demo_donor_${Date.now()}`,
          user_id: `demo_user_${Date.now()}`,
          full_name: "Sofia Ramirez",
          email: "sofia.ramirez@example.com",
          phone: "555-0303",
          blood_type: "B+",
          is_available: true,
          location_address: "Community Health Center",
          location_lat: 37.768,
          location_lng: -122.431,
          created_at: new Date().toISOString(),
        },
      ]);

      await supabase.from("notifications").insert([
        {
          id: `demo_notif_${Date.now()}`,
          user_id: "demo_user_1",
          title: "Welcome to Lifeline Finder",
          message: "Demo data seeded. Try searching for donors.",
          type: "info",
          created_at: new Date().toISOString(),
        },
      ]);

      toast({ title: "Seeded demo data", description: "A demo donor and notification were added." });
    } catch (e: any) {
      toast({ title: "Seed failed", description: e?.message || String(e), variant: "destructive" });
    }
  };

  return (
    <Layout role="seeker">
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold">Find Blood Donors</h1>
          <p className="text-muted-foreground">Search for available donors by blood type</p>
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={seedDemoData}>Seed Demo Data</Button>
          </div>
        </div>

        {/* Search Card */}
        <Card>
          <CardHeader>
            <CardTitle>Search Donors</CardTitle>
            <CardDescription>
              Find available donors nearby based on blood type
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <Label>Blood Type</Label>
                <Select value={searchBloodType} onValueChange={setSearchBloodType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood type" />
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
              <div className="flex items-end">
                <Button onClick={searchDonors} disabled={loading} size="lg">
                  <Search className="h-5 w-5" />
                  {loading ? "Searching..." : "Search Donors"}
                </Button>
              </div>
            </div>
            {userLocation && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                Location detected - showing nearest donors first
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {donors.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Available Donors ({donors.length})</h2>
            {donors.map((donor) => (
              <Card key={donor.id} className="hover:shadow-elevated transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <Droplets className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold text-lg">{donor.full_name || donor.profiles?.full_name || donor.profiles?.full_name}</div>
                          <div className="text-sm text-muted-foreground">{donor.email || donor.profiles?.email}</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Blood Type</div>
                          <Badge variant="outline" className="text-sm">
                            {donor.blood_type}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Location</div>
                          <div className="text-sm truncate">{donor.location_address}</div>
                        </div>
                        {donor.distance && (
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Distance</div>
                            <div className="text-sm font-medium">
                              {donor.distance.toFixed(1)} km away
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Message input moved to modal for a cleaner UX */}
                    </div>

                    <Button
                      onClick={() => openContactModal(donor)}
                      disabled={sendingRequest !== null}
                      variant="hero"
                      size="lg"
                      className="md:self-start"
                    >
                      <Send className="h-5 w-5" />
                      {sendingRequest === donor.user_id ? "Sending..." : "Send Request"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Contact Modal */}
        {contactModalOpen && modalDonor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-lg bg-background rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold">Send Request to {modalDonor.full_name || modalDonor.profiles?.full_name}</h3>
              <p className="text-sm text-muted-foreground mt-1">Blood type: {modalDonor.blood_type}</p>
              <div className="mt-4">
                <Label>Message</Label>
                <Textarea value={requestMessage} onChange={(e) => setRequestMessage(e.target.value)} rows={4} />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" onClick={closeContactModal}>Cancel</Button>
                <Button onClick={confirmSendFromModal} variant="hero">Send Request</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SeekerDashboard;
