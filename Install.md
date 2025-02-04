1. **Podstawowe biblioteki do nawigacji i map:**

```bash
npx expo install react-native-maps
npx expo install expo-location
npx expo install @react-navigation/native-stack
```

2. **Przechowywanie danych lokalnie:**

```bash
npx expo install @react-native-async-storage/async-storage
```

3. **Obsługa offline i cache:**

```bash
npx expo install expo-file-system
npx expo install expo-sqlite
```

4. **Multimedia i audio:**

```bash
npx expo install expo-av
```

5. **Integracja z nawigacją systemową:**

```bash
npx expo install expo-intent-launcher
npx expo install expo-linking
```

6. **Obsługa stanu aplikacji:**

```bash
npm install @reduxjs/toolkit react-redux
```

7. **Obsługa zapytań HTTP:**

```bash
npm install axios
```

Po zainstalowaniu bibliotek, należy zrestartować serwer deweloperski:

```bash
npm run reset-project
expo start --clear
```
