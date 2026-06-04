# Refonte de l'affichage des séances (côté membre)

## Objectif

Transformer l'écran de séance d'une liste de champs techniques en un **déroulé humain en blocs**, adapté au type (musculation, course, Hyrox, mobilité, respiration, récupération, bien-être). Aucune donnée perdue, 100% compatible avec les programmes existants (dont "Respiration — Cycle 4 semaines").

## Approche : pas de migration SQL

On garde le schéma `tasks` actuel. Les nouveaux "blocs" sont **dérivés** des champs existants (`exercise_notes`, `notes`, `duration`, `sets_reps`, `rest`, `intensity`) via un parseur côté frontend. Un format optionnel enrichi (markdown léger `## Bloc 1` dans `exercise_notes`) sera reconnu pour les futurs programmes — sans casser les anciens.

## Architecture frontend

### 1. Nouveau parseur — `src/lib/sessionBlocks.ts`
- Entrée : un `TaskWithDetails`
- Sortie : `SessionView { header, blocks[], footer }`
- Règles de parsing :
  - Si `exercise_notes` contient `## Bloc` → découpe en blocs nommés
  - Sinon → un seul bloc "Déroulé" contenant les lignes (séparées par `\n` ou ` | ` selon mémoire)
  - Chaque ligne → item avec champs détectés (durée `\d+(min|s)`, reps `\d+x\d+`, repos `repos:`, intensité, texte libre)
- **Filtrage par type** : table `RELEVANT_FIELDS[type]`
  - `strength` / `hyrox` : sets_reps, rest, intensity, exercise_notes
  - `cardio` (course) : duration, intensity, heart_zones, exercise_notes (pas sets_reps)
  - `wellness` / `respiration` / `mobility` / `recovery` : duration, exercise_notes, notes (pas sets_reps, pas intensity, pas rest)
  - `swimming` : duration, sets_reps, exercise_notes
- Estimation durée si absente : somme des durées détectées dans les blocs.

### 2. Nouveau composant — `src/components/session/SessionView.tsx`
Remplace l'affichage actuel d'une séance membre. Structure :

```text
┌─────────────────────────────────────┐
│ HEADER                              │
│ • Titre                             │
│ • Type (badge coloré + icône)       │
│ • Objectif (description)            │
│ • Durée estimée • Difficulté        │
│ • 💬 Message du coach (si notes)    │
├─────────────────────────────────────┤
│ BLOC 1 — Échauffement               │
│   • item · durée · consigne         │
│   • item                            │
├─────────────────────────────────────┤
│ BLOC 2 — Corps de séance            │
│   ...                               │
├─────────────────────────────────────┤
│ FOOTER                              │
│ • Bouton "Marquer comme fait"       │
│ • Champ ressenti (1–5 emoji)        │
│ • Commentaire libre                 │
│ • Réponse du coach (si présente)    │
└─────────────────────────────────────┘
```

Sous-composants :
- `SessionHeader` — titre, badges, message coach
- `SessionBlock` — un bloc avec items
- `SessionBlockItem` — une ligne avec icônes contextuelles (⏱ durée, 🔁 reps, 💤 repos)
- `SessionFooter` — validation, ressenti, commentaire

### 3. Intégration
Identifier le ou les emplacements actuels qui rendent le détail d'une séance membre (probablement `TaskCard` en mode expanded sur `Dashboard.tsx`) et remplacer le rendu détaillé par `<SessionView task={...} />`. Le rendu compact (carte fermée) reste inchangé pour ne pas casser la liste.

### 4. Filtrage des champs vides
Tout champ null/vide n'est jamais rendu. Aucun label "—" ou "non renseigné".

## Design system
- Réutilise les tokens existants (`bg-card`, `text-muted-foreground`, `bg-primary/10`)
- Bloc = `Card` avec en-tête `bg-muted/40` et numéro de bloc en pastille primary
- Icônes lucide-react contextuelles par type de séance
- Animation `motion.div` douce à l'ouverture des blocs

## Compatibilité
- ✅ Programmes existants : parseur fallback "un bloc unique" → 0 perte
- ✅ Respiration cycle 4 semaines : déjà au format ligne par ligne avec ` | ` → rendu propre, sans champs musculation
- ✅ Futurs programmes : coach peut écrire `## Bloc — Échauffement\n...\n## Bloc — Corps\n...` dans `exercise_notes`
- ✅ Côté coach (Library, MemberDetail) : aucun changement, l'édition reste sur les champs actuels

## Hors scope (sera proposé séparément si demandé)
- Édition côté coach d'un format "blocs" structuré avec UI dédiée
- Migration des données existantes vers un format JSON

## Livrables
1. `src/lib/sessionBlocks.ts` — parseur + types + table de pertinence
2. `src/components/session/SessionView.tsx` + sous-composants
3. Intégration dans le détail de séance membre (Dashboard / TaskCard)
4. Aucune migration SQL