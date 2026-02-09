# White Screen Flashlight

A minimalist, high-performance utility app that transforms your smartphone into a clean, adjustable light source. Designed with an "invisible" UI to provide maximum illumination without distractions.

## ✨ Features

- **Full-Screen Illumination:** Defaults to pure white for maximum light output.
- **Intuitive Gestures:** 
  - **Swipe Up:** Increase brightness.
  - **Swipe Down:** Decrease brightness.
- **Subtle UI:** A faint settings icon in the top-right corner ensures the light remains unobstructed.
- **Quick Presets:** Instant access to common lighting modes (Warm White, Night Red, Electric Blue, etc.).
- **Custom Color Wheel:** A professional-grade circular picker for selecting any color and saturation.
- **🌈 Rainbow Disco Mode:** 
  - Dynamic color-cycling mode.
  - High-intensity strobe effect with a 60/40 light-to-black ratio.
  - **Adjustable Speed:** Slider to control the transition pace from calming to party mode.
- **Stay Awake:** Automatically prevents the device from dimming or entering sleep mode while active.
- **Persistence:** Remembers your last used color and HSL settings across sessions.
- **Battery Monitoring:** View your current battery percentage directly within the settings menu.

## 🛠 Tech Stack

- **Framework:** Expo (React Native)
- **Language:** TypeScript
- **Gestures:** React Native Gesture Handler
- **Utilities:** Expo Brightness, Expo Keep Awake, Expo Battery, AsyncStorage

## 🚀 Getting Started

1. **Navigate to the project directory:**
   ```bash
   cd white-screen-flashlight
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npx expo start
   ```

4. **Run on your device:**
   - Scan the QR code with the **Expo Go** app (Android) or Camera app (iOS).
   - Alternatively, press `i` for iOS Simulator or `a` for Android Emulator.

## 💡 Usage

- **Brightness:** Vertical swipe anywhere on the main screen.
- **Settings:** Tap the gear icon in the top-right corner.
- **Color:** Tap a preset circle or drag on the circular color wheel.
- **Disco:** Tap "✨ Rainbow Disco Mode" and use the slider to adjust the flicker speed.

## 📄 License

MIT
