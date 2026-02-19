"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/schemas/auth";
import { signIn } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { Suspense, useEffect, useState } from "react";
import { Eye, EyeOff, Leaf, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const errorParam = searchParams.get("error");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");

  const errorMessages: Record<string, string> = {
    tenant_deactivated: t("tenantDeactivated"),
  };

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (errorParam && errorMessages[errorParam]) {
      toast.error(errorMessages[errorParam]);
    }
  }, [errorParam]);

  async function onSubmit(values: LoginInput) {
    setIsLoading(true);
    try {
      const result = await signIn.email({
        email: values.email,
        password: values.password,
      });

      if (result.error) {
        const msg = result.error.message ?? result.error.statusText ?? "";
        if (msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("credential")) {
          toast.error(t("invalidCredentials"));
        } else if (msg.toLowerCase().includes("disattivat")) {
          toast.error(msg);
        } else {
          toast.error(msg || t("invalidCredentialsGeneric"));
        }
        return;
      }

      const redirectTo =
        callbackUrl &&
        callbackUrl.startsWith("/") &&
        !callbackUrl.startsWith("//")
          ? callbackUrl
          : "/";
      router.push(redirectTo);
      router.refresh();
    } catch {
      toast.error(t("loginError"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
          <Leaf className="size-8 text-primary-foreground" />
        </div>
        <div className="text-center">
          <span className="text-2xl font-bold tracking-tight">Greenfleet</span>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {tCommon("monitoringSubtitle")}
          </p>
        </div>
      </div>

      {/* Error banner */}
      {errorParam && errorMessages[errorParam] && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessages[errorParam]}
        </div>
      )}

      <Card className="border-border/50 shadow-xl dark:backdrop-blur-2xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-xl font-bold">{t("login")}</CardTitle>
          <CardDescription>
            {t("loginDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("email")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t("emailPlaceholder")}
                        autoComplete="email"
                        className="h-10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("password")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          className="h-10 pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword((v) => !v)}
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="h-10 w-full font-semibold shadow-md shadow-primary/20"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {t("loginLoading")}
                  </>
                ) : (
                  t("login")
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

function LoginFormSkeleton() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
          <Leaf className="size-8 text-primary-foreground" />
        </div>
        <div className="text-center">
          <span className="text-2xl font-bold tracking-tight">Greenfleet</span>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {tCommon("monitoringSubtitle")}
          </p>
        </div>
      </div>
      <Card className="border-border/50 shadow-xl dark:backdrop-blur-2xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-xl font-bold">{t("login")}</CardTitle>
          <CardDescription>
            {t("loginDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-4 w-12 animate-pulse rounded bg-muted" />
              <div className="h-10 animate-pulse rounded-md bg-muted" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-10 animate-pulse rounded-md bg-muted" />
            </div>
            <div className="h-10 animate-pulse rounded-md bg-muted" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
