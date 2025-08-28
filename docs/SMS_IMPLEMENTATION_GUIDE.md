# ImaneSafety - Guide d'implémentation SMS natif Android

## Vue d'ensemble

L'application ImaneSafety utilise un système hybride pour l'envoi d'alertes d'urgence :
- **Serveur (Supabase)** : Source de vérité, envoi d'emails périodiques
- **Natif (Android)** : Backup local SMS, fonctionne hors-ligne

## Architecture

```
[SOS Button] → [AlertService] → [1. Email immediat] + [2. SMS immediat] + [3. Schedule SMS local]
                              ↓
[Supabase CRON] → [Email périodique (5min)] 
[Android Service] → [SMS périodique (5min)]
```

## Installation et build

### 1. Installation des dépendances
```bash
npm install @byteowls/capacitor-sms
npx cap sync android
```

### 2. Build APK
```bash
npm run build
npx cap copy android
npx cap open android
```

Dans Android Studio :
1. Build → Generate Signed Bundle/APK
2. Choisir APK
3. Signer avec votre certificat
4. Build Release

### 3. Installation sur device
```bash
adb install app-release.apk
```

## Tests manuels

### Test 1 : SMS immédiat
1. ✅ Ouvrir l'app sur Android
2. ✅ Appuyer sur le bouton SOS
3. ✅ Accepter les permissions SMS si demandé
4. ✅ Vérifier qu'un SMS arrive immédiatement sur +212632282343
5. ✅ Vérifier que l'email arrive aussi

**Résultat attendu** : SMS + Email reçus dans les 30 secondes

### Test 2 : SMS périodique (simulation accélérée)
1. ✅ Après le Test 1, attendre 5 minutes
2. ✅ Vérifier qu'un deuxième SMS arrive
3. ✅ Pour accélérer : modifier `intervalSeconds` à 60s dans le code de test
4. ✅ Rebuild et tester la répétition minute par minute

**Résultat attendu** : SMS toutes les 5 minutes (ou 1 minute en mode test)

### Test 3 : Stop manuel
1. ✅ Après avoir lancé une alerte
2. ✅ Appuyer sur "Arrêter l'alerte"
3. ✅ Entrer le code secret : `imane15mohamed`
4. ✅ Confirmer l'arrêt
5. ✅ Vérifier qu'aucun SMS n'arrive après l'arrêt

**Résultat attendu** : Tous les envois s'arrêtent immédiatement

### Test 4 : Redémarrage du téléphone
1. ✅ Lancer une alerte SOS
2. ✅ Redémarrer le téléphone Android
3. ✅ Attendre que l'OS démarre complètement
4. ✅ Vérifier que les SMS continuent d'arriver

**Résultat attendu** : Service reprend automatiquement après reboot

### Test 5 : Mode hors-ligne
1. ✅ Activer le mode avion (pas de WiFi/Data)
2. ✅ Garder seulement le réseau mobile (SMS)
3. ✅ Lancer une alerte SOS
4. ✅ Vérifier que les SMS partent quand même

**Résultat attendu** : SMS fonctionne sans internet

### Test 6 : Refus de permissions
1. ✅ Désinstaller l'app
2. ✅ Réinstaller
3. ✅ Lors du premier SOS, refuser la permission SMS
4. ✅ Vérifier le message d'erreur
5. ✅ Relancer SOS → doit redemander permission

**Résultat attendu** : Message clair à l'utilisateur

## Vérification des logs

### Logs Android (Logcat)
```bash
adb logcat | grep -E "(EmergencySms|ImaneSafety)"
```

**Logs attendus :**
```
D/EmergencySmsService: Started emergency SMS for alert: uuid-123
D/EmergencySmsService: SMS sent to +212632282343
D/EmergencySmsService: Stopped emergency SMS for alert: uuid-123
```

### Logs JavaScript (Chrome DevTools)
1. Connecter le device via USB
2. Chrome → `chrome://inspect`
3. Inspecter l'app
4. Console → vérifier les logs

**Logs attendus :**
```
Sending emergency SMS...
Local SMS backup scheduled
Emergency alert sent successfully
```

## Checklist de validation

### ✅ Installation
- [ ] Plugin SMS installé
- [ ] Permissions Android déclarées
- [ ] Service et Receiver configurés

### ✅ Fonctionnalité de base
- [ ] SMS immédiat fonctionne
- [ ] Permissions demandées correctement
- [ ] Gestion du refus de permission
- [ ] Integration avec @byteowls/capacitor-sms

### ✅ Scheduling local
- [ ] Service Android démarre en foreground
- [ ] SMS périodiques envoyés toutes les 5min
- [ ] Service persist après reboot
- [ ] Notification visible pendant service actif

### ✅ Arrêt d'urgence
- [ ] Bouton stop fonctionne
- [ ] Code secret vérifié
- [ ] Service Android s'arrête
- [ ] SharedPreferences nettoyées

### ✅ Robustesse
- [ ] Fonctionne hors-ligne
- [ ] Gère les messages longs (multipart)
- [ ] Logs détaillés pour debugging
- [ ] Pas de crash en cas d'erreur SMS

## Fichiers modifiés

### Configuration
- `package.json` → Ajout @byteowls/capacitor-sms
- `capacitor.config.ts` → Configuration plugin SMS
- `android/app/src/main/AndroidManifest.xml` → Permissions et services

### Code TypeScript
- `src/native/sms.ts` → Wrapper principal (API exposée)
- `src/services/alertService.ts` → Integration SMS dans workflow

### Code Android (Kotlin)
- `MainActivity.kt` → Registration du plugin
- `EmergencySmsPlugin.kt` → Bridge JS ↔ Android
- `EmergencySmsService.kt` → Service foreground pour SMS périodiques
- `BootReceiver.kt` → Restart automatique après reboot

## Commandes de build complètes

```bash
# 1. Installation
npm install
npm install @byteowls/capacitor-sms

# 2. Build web
npm run build

# 3. Sync to Android
npx cap copy android
npx cap sync android

# 4. Ouvrir Android Studio
npx cap open android

# 5. Dans Android Studio :
# - Build → Generate Signed Bundle/APK
# - APK → Next → Create new keystore ou utiliser existant
# - Build Release

# 6. Install sur device
adb install app/build/outputs/apk/release/app-release.apk
```

## Support et debugging

En cas de problème :

1. **Vérifier les logs** : `adb logcat | grep -E "(EmergencySms|Capacitor)"`
2. **Permissions** : Settings → Apps → ImaneSafety → Permissions
3. **Service actif** : Settings → Apps → ImaneSafety → Battery → Background activity
4. **Notification** : Vérifier qu'elle apparaît pendant l'alerte active

## Limitations connues

1. **SMS multipart** : Messages >160 caractères sont divisés
2. **Carrier limits** : Certains opérateurs limitent SMS/minute
3. **Battery optimization** : Android peut tuer le service (nécessite whitelist)
4. **Permission denial** : Si user refuse SMS, feature indisponible

La solution gère ces cas avec fallbacks appropriés.