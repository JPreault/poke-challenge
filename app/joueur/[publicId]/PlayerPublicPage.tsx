"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { RankedScoresCard, type RankedScoreEntry } from "@/components/profile/RankedScoresCard";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PublicPlayerResponse {
    pseudo: string;
    publicId: string;
    userName: string;
    rankedScores: RankedScoreEntry[];
}

interface PlayerPublicPageProps {
    publicId: string;
}

export function PlayerPublicPage({ publicId }: PlayerPublicPageProps) {
    const { data: session } = useSession();
    const [data, setData] = useState<PublicPlayerResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isOwnProfile = Boolean(session?.user?.publicId) && session?.user?.publicId?.toUpperCase() === publicId.toUpperCase();

    useEffect(() => {
        let active = true;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/players/${publicId}`, {
                    cache: "no-store",
                });
                if (!response.ok) {
                    if (active) setError("Joueur introuvable.");
                    return;
                }
                const payload = (await response.json()) as PublicPlayerResponse;
                if (active) setData(payload);
            } catch {
                if (active) setError("Impossible de charger le profil.");
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();
        return () => {
            active = false;
        };
    }, [publicId]);

    if (loading) {
        return <div className="w-full pb-16 pt-4 text-muted-foreground">Chargement du profil…</div>;
    }

    if (error || !data) {
        return (
            <main className="flex w-full flex-col gap-4 pb-16 pt-8">
                <h1 className="font-heading text-3xl font-bold">Joueur introuvable</h1>
                <p className="text-muted-foreground">{error ?? "Ce profil n'existe pas ou n'est plus disponible."}</p>
            </main>
        );
    }

    return (
        <main className="flex w-full flex-col gap-8 pb-16 pt-8">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                    <h1 className="font-heading text-3xl font-bold">{data.userName}</h1>
                </div>
                {isOwnProfile ? (
                    <Link href="/profile" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}>
                        Modifier mon profil
                    </Link>
                ) : null}
            </header>

            <RankedScoresCard scores={data.rankedScores} showAvatar={false} />
        </main>
    );
}
