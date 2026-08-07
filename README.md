# Poke Challenge

Application web de mini-jeux Pokémon en français, construite avec [Next.js](https://nextjs.org) 16 et React 19.

Deux interfaces sont disponibles :

- **Bac training** — entraînement sur les 26 Pokémon du bac (A → Z)
- **Arène** — tous les Pokémon du Pokédex (~1000 entrées), avec des modes supplémentaires (cri, Pokédle, description…)

## Prérequis

- **Node.js** 20 ou plus récent (LTS recommandé)
- **npm** (fourni avec Node.js)

Vérifie ta version :

```bash
node -v
npm -v
```

## Dupliquer le projet

### Depuis Git

```bash
git clone <url-du-depot> poke-challenge
cd poke-challenge
```

### Sans Git

Télécharge ou copie le dossier du projet, puis ouvre un terminal à la racine (`poke-challenge/`).

## Installation

À la racine du projet :

```bash
npm install
```

Les dépendances sont listées dans `package.json`. Le lockfile `package-lock.json` garantit des versions reproductibles.

## Lancer en développement

```bash
npm run dev
```

L’application démarre sur **[http://localhost:4000](http://localhost:4000)** (port **4000**, pas 3000).

Le serveur utilise Turbopack. Les modifications dans le code sont rechargées automatiquement.

## Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement sur le port 4000 |
| `npm run build` | Build de production (génère aussi les données Pokémon si besoin) |
| `npm run start` | Lance le build de production (après `npm run build`) |
| `npm run lint` | Analyse ESLint |
| `npm run generate:pokemon` | Régénère `data/pokemon.json` depuis l’API PokéAPI |

## Build et production

```bash
npm run build
npm run start
```

Par défaut, `next start` écoute sur le port **3000**. Pour un autre port :

```bash
PORT=4000 npm run start
```

Le script `prebuild` exécute automatiquement la génération des données Pokémon avant le build. Si `data/pokemon.json` existe déjà (cas normal en clone), le script réutilise ce fichier et met à jour `data/pokemon-search.json`.

## Variables d’environnement

Copie `.env.example` vers `.env` (local) et renseigne les secrets.

Pour Google OAuth (local) :
1. Google Cloud Console → Credentials → client OAuth **Application Web**
2. Redirect URI : `http://localhost:4000/api/auth/callback/google`
3. Coller `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` dans `.env`, redémarrer `npm run dev`

En prod (Vercel, etc.) : mêmes clés avec `NEXTAUTH_URL=https://ton-domaine.com`, un autre client Google (ou la 2ᵉ URI de redirect), et les URLs de la **BDD prod**.

`MYSTERY_ROUND_SECRET` / `NEXTAUTH_SECRET` : secrets forts et **différents** en local vs prod.

## Bases de données (local + prod)

Deux projets Supabase distincts. Le schéma vit dans `prisma/migrations/` — les deux BDD doivent recevoir les mêmes migrations.

### Première mise à jour d’une BDD vide

Avec les URLs de **cette** BDD dans `.env` :

```bash
npm run prisma:generate
npx prisma migrate deploy
```

`migrate deploy` applique les migrations existantes sans en créer de nouvelles (idéal pour une BDD neuve / prod).

### Workflow quotidien

1. **Local** (`.env` = BDD local) :
   ```bash
   npm run prisma:migrate -- --name nom_du_changement
   ```
   → crée une migration + l’applique sur le local.

2. **Prod** (sans écraser ton `.env` local) :
   ```bash
   DATABASE_URL="…" DIRECT_URL="…" npx prisma migrate deploy
   ```
   → applique seulement les migrations manquantes. **Ne jamais** `migrate reset` en prod.

### URLs Supabase (important pour Vercel)

Sur Vercel, `db.<ref>.supabase.co:5432` échoue souvent (`P1001`). Utilise le **pooler** (Dashboard Supabase → Project Settings → Database → Connection string) :

| Variable | Mode | Port | Exemple d’hôte |
|----------|------|------|----------------|
| `DATABASE_URL` | Transaction | **6543** | `…pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | Session | **5432** | `…pooler.supabase.com:5432/postgres` |

User = `postgres.<project-ref>` (pas seulement `postgres`). Mets les deux en Production sur Vercel, puis redéploie.

## Données Pokémon

Le catalogue est stocké localement :

| Fichier | Rôle |
|---------|------|
| `data/pokemon.json` | Catalogue complet (serveur uniquement) : noms, descriptions, stats, URLs upstream |
| `data/pokemon-search.json` | Index léger côté client : `{ id, nameFr }` pour l’autocomplétion |
| `data/bac-list.ts` | Les 26 Pokémon du bac |

### Régénérer depuis PokéAPI

Le dépôt inclut déjà `data/pokemon.json`. Pour le recréer depuis [PokéAPI](https://pokeapi.co) (plusieurs minutes, connexion Internet requise) :

```bash
npm run generate:pokemon
```

Cela appelle `scripts/generate-pokemon-data.ts` avec `FORCE_GENERATE_POKEMON=1`.

## Modes de jeu

| Mode | URL | Description |
|------|-----|-------------|
| Image → Nom | `/game/image-to-name` | QCM : image → nom |
| Nom → Image | `/game/name-to-image` | QCM : nom → image |
| Lettre → Nom | `/game/letter-input` | Saisie libre par lettre |
| Image flou | `/game/blur-guess` | Image floutée qui se dévoile |
| Image zoom | `/game/zoom-guess` | Image zoomée qui se dézoome |
| Pokémon → Cri | `/game/cry-guess` | Arène uniquement |
| Pokédle | `/game/pokedle` | Arène uniquement |
| Description → Pokémon | `/game/description-guess` | Arène uniquement |
| Shuffle | `/game/shuffle` | Enchaînement de modes choisis |

Pour le mode **bac training**, ajoute `?interface=bac-training` à l’URL, par exemple :

```
http://localhost:4000/game/image-to-name?interface=bac-training
```

## Structure du projet

```
app/                    Pages et routes API Next.js
components/game/        Composants des mini-jeux
components/ui/          Composants UI (shadcn)
data/                   Données Pokémon (JSON + liste du bac)
lib/games/              Logique de jeu, jetons, rounds serveur
lib/pokemon/            Accès aux données et validation des noms
scripts/                Génération des données depuis PokéAPI
public/                 Assets statiques
```

Les images et cris ne sont pas exposés directement avec l’ID PokéAPI côté client : ils passent par des routes proxy (`/api/media/...`) avec jetons chiffrés.

## Déploiement

Le projet est compatible avec tout hébergeur Node.js (Vercel, Railway, Docker, etc.).

Checklist :

1. `npm run build` doit passer sans erreur
2. Définir `MYSTERY_ROUND_SECRET` dans les variables d’environnement
3. Commiter `data/pokemon.json` (ou lancer `generate:pokemon` au build — déjà géré par `prebuild`)
4. S’assurer que `data/pokemon-search.json` est présent (généré par `prebuild`)

Sur **Vercel**, connecte le dépôt : le build exécutera `prebuild` puis `next build` automatiquement.

## Dépannage

**Le port 4000 est déjà utilisé**

```bash
# macOS / Linux
lsof -i :4000
```

Arrête le processus concerné ou modifie le port dans `package.json` (`"dev": "next dev --turbopack -p 4001"`).

**Erreur `next/image` et URLs `/api/media/...`**

Les patterns d’images locales sont configurés dans `next.config.ts`. Redémarre le serveur de dev après toute modification de ce fichier.

**Génération Pokémon qui échoue**

Réessaie avec `npm run generate:pokemon`. En CI, le build continue avec le fichier existant si la génération échoue et que `data/pokemon.json` est déjà présent.

## Licence

Projet privé (`"private": true` dans `package.json`). Adapter selon la politique de ton organisation ou de ton dépôt.
