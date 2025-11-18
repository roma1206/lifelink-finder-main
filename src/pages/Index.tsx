import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, Droplets, Shield, Users } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Hero Section */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">LifeLink</span>
          </div>
          <Link to="/auth">
            <Button variant="outline">Sign In</Button>
          </Link>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-16">
        {/* Hero Content */}
        <div className="mx-auto max-w-4xl text-center space-y-8">
          <div className="inline-block">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Heart className="h-4 w-4" />
              Saving Lives Together
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            Connect Blood Donors
            <span className="bg-gradient-hero bg-clip-text text-transparent"> & Seekers</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A modern platform connecting those who need blood with willing donors in real-time.
            Fast, secure, and life-saving.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/auth?role=donor">
              <Button variant="hero" size="xl" className="w-full sm:w-auto">
                <Droplets className="h-5 w-5" />
                Become a Donor
              </Button>
            </Link>
            <Link to="/auth?role=seeker">
              <Button variant="outline" size="xl" className="w-full sm:w-auto">
                <Users className="h-5 w-5" />
                Find a Donor
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-5xl mx-auto">
          <div className="bg-card rounded-2xl p-8 shadow-soft hover:shadow-elevated transition-shadow">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <Droplets className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Easy Registration</h3>
            <p className="text-muted-foreground">
              Quick signup process for donors with profile management and availability control.
            </p>
          </div>

          <div className="bg-card rounded-2xl p-8 shadow-soft hover:shadow-elevated transition-shadow">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Smart Matching</h3>
            <p className="text-muted-foreground">
              Find nearby donors by blood type with geo-location based search and filtering.
            </p>
          </div>

          <div className="bg-card rounded-2xl p-8 shadow-soft hover:shadow-elevated transition-shadow">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Secure & Private</h3>
            <p className="text-muted-foreground">
              Your data is protected with enterprise-grade security and privacy controls.
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-24 bg-gradient-hero rounded-3xl p-12 text-white shadow-elevated">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold mb-2">24/7</div>
              <div className="text-white/90">Available Support</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">Fast</div>
              <div className="text-white/90">Request Response</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">Safe</div>
              <div className="text-white/90">Verified Donors</div>
            </div>
          </div>
        </div>
      </main>

      <footer className="container mx-auto px-4 py-8 mt-16 border-t">
        <div className="text-center text-muted-foreground">
          <p>&copy; 2025 LifeLink. Connecting lives through blood donation.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
