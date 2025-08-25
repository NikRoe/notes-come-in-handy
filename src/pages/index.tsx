import { signIn, signOut } from "next-auth/react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

export default function Home() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Notes App</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAuthenticated ? (
            <div className="space-y-4 text-center">
              <p className="text-lg text-muted-foreground">
                Welcome back, {user?.name}!
              </p>
              <div className="flex items-center justify-center space-x-4">
                {user?.image && (
                  <Image
                    src={user.image}
                    alt={user.name || "User"}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <span className="text-sm text-muted-foreground">{user?.email}</span>
              </div>
              <Button 
                onClick={() => signOut()} 
                variant="destructive"
                className="w-full"
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <p className="text-lg text-muted-foreground">
                Sign in to access your notes
              </p>
              <Button 
                onClick={() => signIn()} 
                className="w-full"
              >
                Sign In
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
