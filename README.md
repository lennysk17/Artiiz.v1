# Artiiz MVP v1

🚀 **Application de gestion pour artisans plombiers-chauffagistes**

## 📋 Description

Artiiz est une Progressive Web App (PWA) moderne conçue pour les plombiers et chauffagistes. Elle offre une suite complète d'outils pour gérer votre activité professionnelle :

- 📊 **Dashboard Vision** : KPIs en temps réel, analyse météo prédictive, cartographie des zones d'intervention
- ⚡ **Dashboard Action** : Gestion des urgences, suivi des interventions, liens clients (Trakiiz/Diag)
- 💼 **Dashboard Gestion** : Facturation, devis, signatures électroniques, génération de PDF

## ✨ Fonctionnalités principales

### Vision Dashboard
- Calcul automatique du CA basé sur les factures payées
- Temps moyen d'intervention calculé en temps réel
- Intégration Google My Business pour la réputation
- Analyse IA des risques météo et pannes (gel, humidité)
- Cartographie interactive avec zones d'influence

### Action Dashboard
- Création de missions avec liens clients uniques
- Suivi GPS en temps réel (Trakiiz)
- Upload de photos de diagnostic par les clients
- Notifications push en temps réel
- Gestion des interventions d'urgence

### Gestion Dashboard
- Création de devis vocaux via IA
- Génération automatique de factures PDF
- Signatures électroniques
- Suivi des paiements
- Intégration Stripe (prêt)

## 🛠️ Technologies

- **Frontend** : React 19, TypeScript, Vite
- **Backend** : Supabase (PostgreSQL + Realtime)
- **IA** : Google Gemini (Gemini 2.5 Flash, Gemini 3 Flash)
- **Cartographie** : Leaflet
- **PDF** : jsPDF
- **Styling** : Vanilla CSS avec thème jour/nuit

## 🚀 Installation

```bash
# Cloner le repository
git clone https://github.com/lennysk17/Artiiz.v1.git
cd Artiiz.v1

# Installer les dépendances
npm install

# Configurer les variables d'environnement
# Créer un fichier .env.local avec :
# VITE_SUPABASE_URL=votre_url_supabase
# VITE_SUPABASE_ANON_KEY=votre_clé_anon
# API_KEY=votre_clé_gemini

# Lancer en développement
npm run dev

# Build pour production
npm run build
```

## 📦 Structure du projet

```
artiiz-mvp-1/
├── components/          # Composants réutilisables
│   ├── ArtiizCopilot.tsx    # Assistant IA vocal
│   ├── BottomNav.tsx        # Navigation mobile
│   ├── Sidebar.tsx          # Navigation desktop
│   └── ...
├── pages/              # Pages principales
│   ├── VisionDashboard.tsx  # Dashboard stratégique
│   ├── ActionDashboard.tsx  # Dashboard opérationnel
│   ├── GestionDashboard.tsx # Dashboard facturation
│   ├── TrackPage.tsx        # Page de suivi client
│   └── DiagPage.tsx         # Page de diagnostic client
├── services/           # Services externes
│   ├── supabaseClient.ts    # Configuration Supabase
│   └── geminiService.ts     # Intégration IA
├── types.ts            # Types TypeScript
└── App.tsx             # Point d'entrée
```

## 🗄️ Base de données Supabase

### Tables principales

- **profiles** : Profils utilisateurs (plombiers)
- **interventions** : Missions et interventions
- **invoices** : Factures et devis
- **notifications** : Notifications en temps réel

### Realtime activé sur :
- `interventions` (nouveaux diagnostics)
- `invoices` (paiements)
- `notifications` (alertes)

## 🎨 Thèmes

L'application supporte deux thèmes :
- **Day Mode** : Interface claire et professionnelle
- **Night Mode** : Interface sombre pour réduire la fatigue visuelle

## 🔐 Sécurité

- Authentification Supabase
- Row Level Security (RLS) activé
- Tokens uniques à durée limitée pour les liens clients
- Variables d'environnement pour les clés API

## 📱 PWA

L'application est installable sur mobile et desktop grâce au fichier `manifest.json`.

## 🤖 IA & Automatisation

- **Lia (Copilot)** : Assistant vocal pour conseils techniques
- **Analyse prédictive** : Corrélation météo/pannes
- **Devis vocaux** : Génération automatique via reconnaissance vocale
- **Optimisation SEO** : Conseils pour Google My Business

## 📄 Licence

Propriétaire - © 2024 Artiiz

## 👨‍💻 Auteur

Développé par **Lenny** avec l'assistance d'**Antigravity AI**

## 🔗 Liens utiles

- [Repository GitHub](https://github.com/lennysk17/Artiiz.v1)
- [Supabase](https://supabase.com)
- [Google Gemini](https://ai.google.dev)

---

**Version** : 1.0.0 (Production-ready)
**Dernière mise à jour** : 31 décembre 2024
