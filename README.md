# TrackEase Subscription Tracker

This project is built with [Expo](https://expo.dev/) and React Native.

## Running on iOS

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create an `.env` file based on `.env.example` and fill in your Supabase credentials.
3. Generate native iOS project files:
   ```bash
   npx expo prebuild --platform ios
   ```
4. Open the generated `ios/TrackEase.xcworkspace` in Xcode.
5. Set up signing and run the application on a simulator or real device.

## Building for the App Store

This project is configured for [EAS Build](https://docs.expo.dev/build/introduction/). To create an App Store ready build run:

```bash
npx eas build --platform ios --profile production
```

After the build completes you can submit it with:

```bash
npx eas submit --platform ios --profile production
```

These steps require the Expo CLI, EAS CLI and Xcode.
