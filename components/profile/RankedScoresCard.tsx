import { Trophy } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    buildRankedScoreEntries,
    type RankedScoreEntry,
} from "@/lib/games/ranked-score-entries";
import { cn } from "@/lib/utils";

export type { RankedScoreEntry };

interface RankedScoresCardProps {
    scores: RankedScoreEntry[];
    isOwnProfile?: boolean;
    showAvatar?: boolean;
}

export function RankedScoresCard({ scores, isOwnProfile = false, showAvatar = false }: RankedScoresCardProps) {
    const displayScores = buildRankedScoreEntries(scores);

    return (
        <Card className="border-border/60 bg-background/80 ring-0">
            <CardHeader>
                <div className={cn(showAvatar && "flex items-start gap-4")}>
                    <div className="min-w-0 space-y-1">
                        <CardTitle>{isOwnProfile ? "Tes scores classés" : "Scores classés"}</CardTitle>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ul className="grid gap-2 sm:grid-cols-2">
                    {displayScores.map((score) => (
                        <li
                            key={score.mode}
                            className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5"
                        >
                            <span className="text-sm text-muted-foreground">{score.modeLabel}</span>
                            <div className="flex items-center gap-2">
                                {score.bestTopRank != null ? (
                                    <span
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 tabular-nums dark:text-amber-400"
                                        title={`Meilleur classement top 20 : #${score.bestTopRank}`}
                                    >
                                        <Trophy className="size-3.5 shrink-0" aria-hidden />#{score.bestTopRank}
                                    </span>
                                ) : null}
                                <span className="font-heading text-base font-semibold tabular-nums">
                                    {score.bestWinStreak > 0 ? score.bestWinStreak : "—"}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}
