import { Button } from "@nexus-tools/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@nexus-tools/design-system/components/ui/card";

export default function Home() {
  return (
    <main className="flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center p-24">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Obo Playground</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground text-center">
            Welcome to Obo Playground - Part of Nexus Tools Monorepo
          </p>
          <Button>Get Started</Button>
        </CardContent>
      </Card>
    </main>
  );
}
