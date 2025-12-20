# monin

React Native app to track expenses through email notifications

## Folder structure
Refer [here](https://javascript.plainenglish.io/react-native-folder-structures-architecture-explained-5177027dc2bb)

```
myApp/
├── App.tsx
├── assets/
│   └── images/
│   └── fonts/
├── components/
│   └── Button.tsx
│   └── Header.tsx
├── screens/
│   └── HomeScreen.tsx
│   └── LoginScreen.tsx
├── navigation/
│   └── AppNavigator.tsx
├── constants/
│   └── Colors.ts
│   └── Strings.ts
├── utils/
│   └── formatDate.ts
│   └── validators.ts
├── services/
│   └── api.ts
├── types/
│   └── index.ts
└── package.json
```

OR

```
├── assets/
├── scripts/
├── src/
│   ├── app/
│   │   ├── api/                    # API routes in a separate folder
│   │   │   ├── event+api.ts
│   │   │   └── user+api.ts
│   │   ├── layout.tsx
│   │   ├── layout.web.tsx         # separate layout file for web
│   │   ├── index.tsx
│   │   ├── events.tsx
│   │   └── settings.tsx
│   ├── components/
│   │   ├── Table/
│   │   │   ├── Cell.tsx
│   │   │   └── index.tsx
│   │   ├── BarChart.tsx
│   │   ├── BarChart.web.tsx        # separate components for web and native
│   │   └── Button.tsx
│   ├── screens/
│   │   ├── Home/
│   │   │   ├── Card.tsx            # component only used in the home page
│   │   │   └── index.tsx           # returned from /src/app/index.tsx
│   │   ├── Events.tsx              # returned from /src/app/events.tsx
│   │   └── Settings.tsx            # returned from /src/app/settings.tsx
│   ├── server/                     # code used in /api
│   │   ├── auth.ts
│   │   └── db.ts
│   ├── utils/                      # reusable utilities
│   │   ├── formatDate.ts
│   │   ├── formatDate.test.ts      # unit test next to the file being tested
│   │   └── pluralize.ts
│   ├── hooks/
│   │   ├── useAppState.ts
│   │   └── useTheme.ts
├── app.json
├── eas.json
└── package.json
```

## Features (MVP)

1. Email parsing (Gmail)
2. Push notification reminders (from email parsing/user scheduled)
3. Smart categorisation rules
4. Data visualisation (monthly cash flow, spending trends across categories)
5. Export data to csv, excel

## Future features

1. Custom categories & tags
2. Search & filter
3. Recurring transactions
4. Budget goals
5. Import old transaction email data, csv, excel
6. Support Outlook emails

## TODOs

- [x] Define features
- [x] Create figma design
  - [x] Login page
  - [x] Home page
  - [x] Settings page
  - [x] Use Bolt generate UI
  - [x] Use Figma make and touch up UI
- [x] Set up dev env
  - [x] Update dependencies
  - [x] File structure
- [ ] Create UI
  - [x] LoginScreen
  - [x] HomeScreen
    - [x] Configure Victory Native for bar chart
  - [ ] SettingsScreen
    - [x] Configure routing to SettingsScreen
    - [x] Explore email parsing in Gmail (Backend API)
    - [x] Install required dependencies
    - [x] Set up Google Authentication
      - [x] Initial auth request
      - [x] Code exchange for tokens
      - [ ] Persist session
        - [ ] Cookie for web (bug now. might not be necessary)
        - [x] Expo secure storage for native
        - [x] Refresh token API
    - [x] Create a test protected API (at least for native) 
    - [x] Link to Gmail APIs
    - [ ] Refresh logic for googleAccessToken (in gcloud?)
    - [x] Parse an existing transaction email
    - [ ] Match SettingsScreen UI
- [x] Gmail API restricted scope verification
- [x] Create new Gmail and set up email forwarding
  - [x] PayLah
  - [x] YouTrip 
- [x] Analyse email templates
  - [x] PayLah
  - [x] YouTrip 
- [x] Refactor email fetching logic
- [x] Parse email transactions
  - [x] PayLah
  - [x] YouTrip
- [x] Refactor email parsing logic
- [x] Regex to extract transaction data
- [x] Implement categorisation service
- [x] Configure SQLite DB and Drizzle ORM
- [x] Integrate user categorization rules with SQLite
  - [x] Transfer hard-coded categories and rules into database
  - [x] Test transactions are automatically categorized
- [x] UI to add category
- [ ] Add delete existing category feature
- [ ] UI to add categorization rules
- [ ] Add providers into database
- [ ] Separate bank logic from merchant logic (?)
- [ ] UI to add custom provider
- [ ] Display PayLah transaction data in UI
- [ ] Display YouTrip transaction data in UI
- [ ] Google verification center stuff
- [ ] Try, catch for async fetch calls
- [ ] Email parsing error handling
- [x] Configure Expo router
- [ ] Frontend
- [ ] Backend
- [ ] Deploy

### FEATURE TODO

## Dependencies
- Expo SDK v54
- Babel
- ESLint

> Run `npx expo-doctor` to update dependencies if required

## Getting Started
| Command                         | Description                                                                                                                         |
|----------------------------------|-------------------------------------------------------------------------------------------------------------------------------------|
| `npx expo start`                   | Starts the development server (whether you are using a development build or Expo Go).                                               |
| `npx expo prebuild`                | Generates native Android and iOS directories using Prebuild.                                                                        |
| `npx expo run:android`             | Compiles native Android app locally.                                                                                                |
| `npx expo run:ios`                 | Compiles native iOS app locally.                                                                                                   |
|` npx expo install package-name`    | Used to install a new library or validate and update specific libraries in your project by adding --fix option to this command.     |
| `npx expo lint`                    | Setup and configures ESLint. If ESLint is already configured, this command will lint your project files.                            |
