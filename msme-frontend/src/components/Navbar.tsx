import { NavLink, useNavigate } from "react-router-dom";
import { Leaf, Moon, Sun, LogOut, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { toast } from "@/hooks/use-toast";
import Logo from "@/assets/logo.svg";

const Navbar = () => {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (_event === "SIGNED_IN") navigate("/home"); // ✅ go to /home after login
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Logged out successfully!",
      });
      navigate("/"); // ✅ back to login
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md border-b border-border bg-background/70">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo + Brand */}
        <NavLink
          to="/home"
          className="flex items-center gap-2 transition-all hover:scale-105"
        >
          <img
            src={Logo}
            alt="App Logo"
            className="h-8 w-8 select-none drop-shadow-md transition-all hover:drop-shadow-lg"
          />
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Vivasāya Nanban
          </span>
        </NavLink>

        {/* Navigation Links */}
        <div className="flex items-center gap-6">
          {[
            { path: "/home", label: "Home" },
            { path: "/devices", label: "Devices" },
            { path: "/predict", label: "Predict" },
          ].map(({ path, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/home"}
              className={({ isActive }) =>
                `relative px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-primary to-accent" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Right-side controls */}
        <div className="flex items-center gap-2">
          {user ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <LogIn className="h-4 w-4" />
              Login
            </Button>
          )}

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="ml-4 relative"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
