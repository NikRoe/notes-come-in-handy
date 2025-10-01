import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth/next";
import { getProviders, signIn } from "next-auth/react";
import { authOptions } from "../../lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Provider {
  name: string;
  id: string;
}

interface SignInProps {
  providers: Record<string, Provider>;
}

export default function SignIn({ providers }: SignInProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign in to Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.values(providers).map((provider) => (
            <Button
              key={provider.name}
              onClick={() => signIn(provider.id)}
              className="w-full"
              variant="default"
            >
              Sign in with {provider.name}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (session) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  const providers = await getProviders();

  return {
    props: {
      providers: providers ?? {},
    },
  };
};
