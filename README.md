# monin

monin is a React Native (Expo) mobile app designed to help users track their expenses by parsing email notifications. 

## Features
Current features (v1.0.00) include
- Auto-categorization
- Data visualization
- Financial insights

> monin is still actively in development!

## How to run the app
- Installation
  1. Download APK file here on your Android device
  2. Install the APK and app will open

## Skills & Technologies
- TypeScript
- React Native (Expo)
- Regex (for email parsing)
- SQLite + Drizzle ORM (for local database)
- Expo modules (auth, secure store, router, etc.)
- Data visualization (Victory Native, Skia)
- ESLint & Prettier

## Folder structure
```
monin/
├── assets/                 # Static content
├── db/                     # db schema, seed and client
├── drizzle/                # Drizzle ORM migrations and metadata
├── src/
│   ├── app/                # App routes
│   ├── components/         # Reusable UI components
│   ├── context/            # React context providers
│   ├── hooks/              # Custom React hooks
│   ├── screens/            # App screens (Home, Settings, Transactions)
│   ├── services/           # Business logic and integrations (categorization, Gmail, transactions)
│   ├── types/              # TypeScript type definitions
│   └── utils/              # helper functions
├── app.json                # Expo app configuration
├── babel.config.js         # Babel configuration
├── drizzle.config.ts       # Drizzle ORM config
├── eas.json                # Expo Application Services config
├── eslint.config.js        # ESLint configuration
├── metro.config.js         # Metro bundler config
├── package.json            # Project dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── README.md               # Project documentation
```

## Dependencies
Key dependencies include:
- expo
- react-native
- drizzle-orm
- victory-native
- @expo/vector-icons
- expo-auth-session
- expo-secure-store
- sqlite
- eslint, prettier, typescript

> Refer to the `package.json` file for the full list of dependencies and their versions

## What the app looks like
[![Watch the video](https://raw.githubusercontent.com/raysonoon/monin/main/assets/monin-v1.0.00.png)](https://raw.githubusercontent.com/raysonoon/monin/main/assets/monin-v1.0.00-demo.mp4)
