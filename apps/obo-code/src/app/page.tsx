import { Button, Card, CardContent, CardHeader, CardTitle } from "@nexus-tools/ui";
import { capitalize } from "@nexus-tools/utils";

export default function Home() {
  const appName = capitalize("obo-code");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">{appName}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground text-center">
            Welcome to {appName} - Part of Nexus Tools Monorepo
          </p>
          <Button>Get Started</Button>
        </CardContent>
      </Card>
    </main>
  );
}
