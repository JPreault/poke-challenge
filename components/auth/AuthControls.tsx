"use client";

import { LogIn } from "lucide-react";
import { Menu } from "@base-ui/react/menu";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function getPseudoInitial(input: { pseudo?: string | null; name?: string | null }): string {
    const label = input.pseudo?.trim() || input.name?.trim() || "?";
    return label.charAt(0).toUpperCase();
}

export function AuthControls() {
    const router = useRouter();
    const { data: session, status } = useSession();

    if (status === "loading") {
        return (
            <div className="flex size-11 items-center justify-center rounded-full border border-border/60 bg-muted/50 text-xs text-muted-foreground">
                …
            </div>
        );
    }

    if (!session?.user) {
        return (
            <>
                <Button
                    size="icon"
                    className="size-11 sm:hidden"
                    aria-label="Connexion Google"
                    onClick={() => signIn("google", { callbackUrl: "/" })}
                >
                    <LogIn className="size-4" aria-hidden />
                </Button>
                <Button
                    size="sm"
                    className="hidden sm:inline-flex"
                    onClick={() => signIn("google", { callbackUrl: "/" })}
                >
                    Connexion Google
                </Button>
            </>
        );
    }

    const initial = getPseudoInitial({
        pseudo: session.user.pseudo,
        name: session.user.name,
    });

    return (
        <Menu.Root modal={false}>
            <Menu.Trigger
                aria-label="Menu compte"
                className={cn(
                    "flex size-11 items-center justify-center rounded-full border border-border/70 bg-primary text-sm font-semibold text-primary-foreground shadow-sm",
                    "transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    "data-popup-open:bg-primary/90",
                )}
            >
                {initial}
            </Menu.Trigger>
            <Menu.Portal>
                <Menu.Positioner side="bottom" align="end" sideOffset={8} positionMethod="fixed" className="z-1000">
                    <Menu.Popup
                        className={cn(
                            "pointer-events-auto min-w-40 origin-top-right rounded-xl border border-border/70 bg-popover p-1 text-popover-foreground shadow-lg",
                            "outline-none",
                            "data-starting-style:scale-95 data-starting-style:opacity-0",
                            "data-ending-style:scale-95 data-ending-style:opacity-0",
                            "transition-[transform,opacity] duration-150",
                        )}
                    >
                        <Menu.Item closeOnClick={false} className={menuItemClassName} onClick={() => router.push("/profile")}>
                            Profil
                        </Menu.Item>
                        <Menu.Item closeOnClick={false} className={menuItemClassName} onClick={() => void signOut({ callbackUrl: "/" })}>
                            Déconnexion
                        </Menu.Item>
                    </Menu.Popup>
                </Menu.Positioner>
            </Menu.Portal>
        </Menu.Root>
    );
}

const menuItemClassName = cn(
    "flex min-h-11 w-full cursor-pointer items-center rounded-lg px-3 py-2 text-sm outline-none",
    "hover:bg-muted focus-visible:bg-muted data-highlighted:bg-muted",
);
