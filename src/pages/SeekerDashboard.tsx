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

  useEffect(() => {
    getUserLocation();
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
    if (!searchBloodType) {
      toast({
        title: "Select blood type",
        description: "Please select a blood type to search.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data } = await supabase
        .from("donor_profiles")
        .select(`
          *,
          profiles:user_id (full_name, email, phone)
        `)
        .eq("blood_type", searchBloodType as any)
        .eq("is_available", true);

      let donorsWithDistance = data || [];

      if (userLocation) {
        donorsWithDistance = donorsWithDistance.map((donor) => ({
          ...donor,
          distance: calculateDistance(
            userLocation.lat,
            userLocation.lng,
            donor.location_lat,
            donor.location_lng
          ),
        })).sort((a, b) => a.distance - b.distance);
      }

      setDonors(donorsWithDistance);
      
      if (donorsWithDistance.length === 0) {
        toast({
          title: "No donors found",
          description: "No available donors found with this blood type.",
        });
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

  const sendBloodRequest = async (donorId: string, bloodType: string) => {
    setSendingRequest(donorId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: requestError } = await supabase
        .from("blood_requests")
        .insert([{
          seeker_id: user.id,
          donor_id: donorId,
          blood_type: bloodType as any,
          message: requestMessage,
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

  return (
    <Layout role="seeker">
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold">Find Blood Donors</h1>
          <p className="text-muted-foreground">Search for available donors by blood type</p>
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
                          <div className="font-semibold text-lg">{donor.profiles?.full_name}</div>
                          <div className="text-sm text-muted-foreground">{donor.profiles?.email}</div>
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
                      
                      {sendingRequest === donor.user_id && (
                        <div className="space-y-2">
                          <Label>Message (Optional)</Label>
                          <Textarea
                            placeholder="Add a message to your request..."
                            value={requestMessage}
                            onChange={(e) => setRequestMessage(e.target.value)}
                            rows={2}
                          />
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => sendBloodRequest(donor.user_id, donor.blood_type)}
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
      </div>
    </Layout>
  );
};

export default SeekerDashboard;
