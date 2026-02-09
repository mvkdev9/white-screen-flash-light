import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, Dimensions, Animated, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Brightness from 'expo-brightness';
import { useKeepAwake } from 'expo-keep-awake';
import * as Battery from 'expo-battery';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import { Settings, X, Lightbulb, Zap, Palette, PartyPopper } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

SplashScreen.preventAutoHideAsync();

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const STORAGE_KEY = '@flashlight_settings';
const LAUNCH_KEY = '@first_launch';

const ONBOARDING_DATA = [
  { id: '1', title: 'Welcome', desc: 'Your minimalist light source.', icon: Lightbulb, color: '#FFD700' },
  { id: '2', title: 'Gestures', desc: 'Swipe UP/DOWN to control brightness.', icon: Zap, color: '#007BFF' },
  { id: '3', title: 'Colors', desc: 'Pick from presets or use the wheel.', icon: Palette, color: '#FF69B4' },
  { id: '4', title: 'Disco', desc: 'Triple speed rainbow with strobe!', icon: PartyPopper, color: '#39FF14' },
];

export default function App() {
  useKeepAwake();
  const [color, setColor] = useState('#FFFFFF');
  const [brightness, setBrightness] = useState(1);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [overlayAnim] = useState(new Animated.Value(300));
  const [showHint, setShowHint] = useState(true);
  const [rainbowHue, setRainbowHue] = useState(0);
  const [isBlackOut, setIsBlackOut] = useState(false);
  const [flashCounter, setFlashCounter] = useState(0);
  const [rainbowSpeed, setRainbowSpeed] = useState(2);
  const [hsl, setHsl] = useState({ h: 0, s: 0, l: 100 });
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const [saved, firstLaunch] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(LAUNCH_KEY)
        ]);
        if (saved) {
          const { color: savedColor, hsl: savedHsl } = JSON.parse(saved);
          setColor(savedColor);
          setHsl(savedHsl);
        }
        setIsFirstLaunch(firstLaunch === null);
        const level = await Battery.getBatteryLevelAsync();
        setBatteryLevel(level);
      } catch (e) { console.log('Init error:', e); }
      finally { SplashScreen.hideAsync(); }
    };
    init();
    const subscription = Battery.addBatteryLevelListener(({ batteryLevel }) => setBatteryLevel(batteryLevel));
    return () => subscription.remove();
  }, []);

  const finishOnboarding = async () => {
    await AsyncStorage.setItem(LAUNCH_KEY, 'false');
    setIsFirstLaunch(false);
  };

  // Save settings when color or HSL changes
  useEffect(() => {
    const saveSettings = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ color, hsl }));
      } catch (e) { console.log('Save error:', e); }
    };
    if (color !== 'RAINBOW') saveSettings();
  }, [color, hsl]);

  const updateColorFromHex = (hex: string) => {
    if (color === hex) return;
    setColor(hex);
    if (hex === 'RAINBOW') return;
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    setHsl({ h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) });
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (color === 'RAINBOW') {
      interval = setInterval(() => {
        setFlashCounter((prev) => {
          const next = (prev + 1) % 5;
          const newBlackout = next >= 3;
          setIsBlackOut(curr => curr !== newBlackout ? newBlackout : curr);
          if (next === 0) {
            setRainbowHue((h) => (h + rainbowSpeed * 3) % 360);
          }
          return next;
        });
      }, 30);
    } else {
      setIsBlackOut(false);
    }
    return () => clearInterval(interval);
  }, [color === 'RAINBOW', rainbowSpeed]);

  const dynamicColor = useMemo(() => {
    if (color === 'RAINBOW') {
      if (isBlackOut) return '#000000';
      return `hsl(${rainbowHue}, 100%, 50%)`;
    }
    return color;
  }, [color, isBlackOut, rainbowHue]);

  useEffect(() => {
    (async () => {
      const { status } = await Brightness.requestPermissionsAsync();
      if (status === 'granted') {
        const current = await Brightness.getBrightnessAsync();
        setBrightness(current);
      }
    })();
    const timer = setTimeout(() => setShowHint(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  const toggleSettings = () => {
    const toValue = isSettingsOpen ? 300 : 0;
    Animated.spring(overlayAnim, { toValue, useNativeDriver: true, friction: 8 }).start();
    setIsSettingsOpen(!isSettingsOpen);
  };

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.BEGAN) setShowHint(false);
  };

  const handlePan = async (event: any) => {
    const { translationY } = event.nativeEvent;
    const sensitivity = 0.001;
    const change = -translationY * sensitivity;
    let newBrightness = Math.max(0.1, Math.min(1, brightness + change));
    setBrightness(newBrightness);
    try { await Brightness.setBrightnessAsync(newBrightness); } catch (e) { console.log('Brightness error:', e); }
  };

  if (isFirstLaunch === null) return null;

  if (isFirstLaunch) {
    return (
      <View style={styles.onboardingContainer}>
        <StatusBar style="dark" />
        <Animated.FlatList
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          data={ONBOARDING_DATA}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <View style={styles.slide}>
              <View style={[styles.iconCircle, { backgroundColor: item.color + '20' }]}>
                <item.icon color={item.color} size={64} />
              </View>
              <Text style={styles.slideTitle}>{item.title}</Text>
              <Text style={styles.slideDesc}>{item.desc}</Text>
              {index === ONBOARDING_DATA.length - 1 && (
                <TouchableOpacity style={styles.getStartedBtn} onPress={finishOnboarding}>
                  <Text style={styles.getStartedText}>Get Started</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: dynamicColor }]}>
        <StatusBar hidden />
        <PanGestureHandler onGestureEvent={handlePan} onHandlerStateChange={onHandlerStateChange}>
          <View style={StyleSheet.absoluteFill}>
            <TouchableOpacity activeOpacity={1} style={styles.touchSurface} onPress={() => isSettingsOpen && toggleSettings()} />
            {showHint && (
              <View style={styles.hintContainer} pointerEvents="none">
                <Text style={[styles.hintText, { color: color === '#FFFFFF' ? '#666' : '#FFF' }]}>↑ Swipe Up for Brightness ↓</Text>
              </View>
            )}
          </View>
        </PanGestureHandler>
        <TouchableOpacity style={[styles.settingsTrigger, { backgroundColor: color === '#FFFFFF' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.2)' }]} onPress={toggleSettings}>
          <Settings color={color === '#FFFFFF' ? '#555' : '#FFF'} size={24} opacity={0.8} />
        </TouchableOpacity>
        <Animated.View style={[styles.overlay, { transform: [{ translateX: overlayAnim }] }]}>
          <View style={styles.overlayHeader}>
            <Text style={styles.overlayTitle}>Settings</Text>
            <TouchableOpacity onPress={toggleSettings}><X color="#333" size={24} /></TouchableOpacity>
          </View>
          <Text style={styles.label}>Quick Presets</Text>
          <View style={styles.presetGrid}>
            {['#FFFFFF', '#FFF4E0', '#FF0000', '#007BFF', '#39FF14', '#FF69B4', '#6A0DAD', '#FF8C00'].map((c) => (
              <TouchableOpacity key={c} style={[styles.presetCircle, { backgroundColor: c, borderWidth: color === c ? 3 : 1, borderColor: color === c ? '#007BFF' : '#DDD' }]} onPress={() => updateColorFromHex(c)} />
            ))}
          </View>
          <Text style={[styles.label, { marginTop: 20 }]}>Custom Color Wheel</Text>
          <View style={styles.wheelContainer}>
            <PanGestureHandler onGestureEvent={(e) => {
              const centerX = 100, centerY = 100;
              const x = e.nativeEvent.x - centerX, y = e.nativeEvent.y - centerY;
              let angle = Math.atan2(y, x) * (180 / Math.PI);
              if (angle < 0) angle += 360;
              const distance = Math.sqrt(x * x + y * y);
              const s = Math.min(100, Math.round((distance / 100) * 100));
              const newH = Math.round(angle);
              setHsl(prev => ({ ...prev, h: newH, s }));
              setColor(`hsl(${newH}, ${s}%, ${hsl.l}%)`);
            }}>
              <View style={styles.circularWheel}>
                <View style={[styles.wheelBackground, { backgroundColor: `hsl(${hsl.h}, 100%, 50%)` }]}>
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: 'white', opacity: 1 - hsl.s / 100, borderRadius: 100 }]} />
                </View>
                <View style={[styles.wheelThumb, { left: 100 + (hsl.s / 100) * 100 * Math.cos(hsl.h * Math.PI / 180) - 12, top: 100 + (hsl.s / 100) * 100 * Math.sin(hsl.h * Math.PI / 180) - 12 }]} />
              </View>
            </PanGestureHandler>
          </View>
          <TouchableOpacity style={[styles.rainbowButton, { backgroundColor: color === 'RAINBOW' ? '#007BFF' : '#F0F0F0' }]} onPress={() => setColor('RAINBOW')}>
            <Text style={{ color: color === 'RAINBOW' ? '#FFF' : '#333', fontWeight: 'bold' }}>✨ Rainbow Disco Mode</Text>
          </TouchableOpacity>
          {color === 'RAINBOW' && (
            <View style={styles.speedSection}>
              <Text style={styles.smallLabel}>Disco Speed</Text>
              <PanGestureHandler onGestureEvent={(e) => {
                const trackWidth = 230;
                const x = Math.max(0, Math.min(trackWidth, e.nativeEvent.x));
                const speed = Math.round((x / trackWidth) * 14) + 1;
                setRainbowSpeed(speed);
              }}>
                <View style={styles.speedTrack}>
                  <View style={[styles.speedThumb, { left: Math.max(0, Math.min(206, ((rainbowSpeed - 1) / 14) * 230 - 12)) }]} />
                </View>
              </PanGestureHandler>
            </View>
          )}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Swipe UP to increase brightness</Text>
            <Text style={styles.infoText}>Swipe DOWN to decrease brightness</Text>
            <View style={styles.statsRow}>
              <Text style={styles.statLabel}>Brightness: {Math.round(brightness * 100)}%</Text>
              <Text style={styles.statLabel}>Battery: {batteryLevel !== null ? Math.round(batteryLevel * 100) : '--'}%</Text>
            </View>
          </View>
          <Text style={styles.footerText}>Screen will stay awake while app is open.</Text>
        </Animated.View>
      </View>
    </GestureHandlerRootView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  onboardingContainer: { flex: 1, backgroundColor: '#FFF' },
  slide: { width: SCREEN_WIDTH, flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  iconCircle: { width: 150, height: 150, borderRadius: 75, alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
  slideTitle: { fontSize: 32, fontWeight: '800', color: '#333', marginBottom: 20 },
  slideDesc: { fontSize: 18, color: '#666', textAlign: 'center', lineHeight: 26 },
  getStartedBtn: { marginTop: 50, backgroundColor: '#007BFF', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 30, shadowColor: '#007BFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  getStartedText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  touchSurface: { flex: 1 },
  settingsTrigger: { position: 'absolute', top: 55, right: 20, padding: 12, borderRadius: 25, zIndex: 10 },
  hintContainer: { position: 'absolute', bottom: 100, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  hintText: { fontSize: 16, fontWeight: '500', opacity: 0.5, letterSpacing: 1 },
  overlay: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 280, backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: 25, paddingTop: 60, shadowColor: '#000', shadowOffset: { width: -2, height: 0 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, zIndex: 20 },
  overlayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  overlayTitle: { fontSize: 22, fontWeight: '700', color: '#333' },
  label: { fontSize: 16, fontWeight: '600', color: '#666', marginBottom: 15 },
  pickerSection: { width: '100%', marginBottom: 30 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 5 },
  presetCircle: { width: 45, height: 45, borderRadius: 23, borderColor: '#DDD' },
  wheelContainer: { width: 200, height: 200, alignSelf: 'center', marginVertical: 15 },
  circularWheel: { width: 200, height: 200, borderRadius: 100, backgroundColor: '#EEE', overflow: 'hidden' },
  wheelBackground: { flex: 1, borderRadius: 100 },
  wheelThumb: { position: 'absolute', width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFF', borderWidth: 3, borderColor: '#007BFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 3 },
  rainbowButton: { width: '100%', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  speedSection: { marginTop: 15, width: '100%' },
  smallLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 8, textAlign: 'center' },
  speedTrack: { height: 6, borderRadius: 3, backgroundColor: '#EEE', borderWidth: 1, borderColor: '#DDD' },
  speedThumb: { position: 'absolute', top: -9, width: 24, height: 24, borderRadius: 12, backgroundColor: '#007BFF', borderWidth: 3, borderColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  infoBox: { backgroundColor: '#F5F5F5', padding: 15, borderRadius: 12, marginTop: 'auto' },
  infoText: { fontSize: 13, color: '#666', lineHeight: 18 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  statLabel: { fontSize: 13, fontWeight: 'bold', color: '#444' },
  footerText: { fontSize: 11, color: '#999', textAlign: 'center', marginTop: 20 }
});
