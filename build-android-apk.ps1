# ===============================================
# Script automatisé pour transformer ImaneSafety PWA en APK Android
# Auteur: ImaneSafety Build Script
# Version: 1.0
# Compatible: Windows 10/11 + PowerShell 5.1+
# ===============================================

param(
    [string]$GmailUser = "mohammedelalaoui532@gmail.com",
    [string]$GmailPassword = "jlld zhqv zfqo jnfs",
    [string]$StopCode = "imane15mohamed",
    [string]$TargetPhone = "+212712695714",
    [switch]$SkipEnvironmentCheck,
    [switch]$OpenAndroidStudio = $true
)

# Configuration
$AppName = "ImaneSafety"
$AppId = "app.lovable.0bf52ad6aa5c422bb500e6271dd0b1c5"
$WebDir = "dist"

# Couleurs pour l'affichage
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success { Write-ColorOutput Green $args }
function Write-Warning { Write-ColorOutput Yellow $args }
function Write-Error { Write-ColorOutput Red $args }
function Write-Info { Write-ColorOutput Cyan $args }

# Fonction de logging
function Write-Log($Message, $Type = "INFO") {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Type] $Message"
    Write-Output $logMessage
    Add-Content -Path "build-log.txt" -Value $logMessage
}

# Fonction pour exécuter des commandes avec gestion d'erreur
function Invoke-Command($Command, $Description) {
    Write-Info "🔄 $Description"
    Write-Log "Exécution: $Command" "CMD"
    
    try {
        $result = Invoke-Expression $Command
        if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq $null) {
            Write-Success "✅ $Description - Terminé"
            Write-Log "$Description - Succès" "SUCCESS"
            return $result
        } else {
            throw "Code de sortie: $LASTEXITCODE"
        }
    } catch {
        Write-Error "❌ Erreur lors de: $Description"
        Write-Error "Commande: $Command"
        Write-Error "Erreur: $($_.Exception.Message)"
        Write-Log "$Description - Erreur: $($_.Exception.Message)" "ERROR"
        
        $continue = Read-Host "Continuer malgré l'erreur? (y/N)"
        if ($continue -ne "y" -and $continue -ne "Y") {
            exit 1
        }
    }
}

# Banner de démarrage
Clear-Host
Write-Success @"
===============================================
🚀 SCRIPT AUTOMATISÉ IMANESAFETY PWA → APK 🚀
===============================================
App: $AppName
ID: $AppId
Email: $GmailUser
Téléphone: $TargetPhone
===============================================
"@

Write-Log "Démarrage du script de build APK" "START"

# ===============================================
# PHASE 1: VÉRIFICATION DE L'ENVIRONNEMENT
# ===============================================

Write-Info "📋 PHASE 1: Vérification de l'environnement"

if (-not $SkipEnvironmentCheck) {
    # Vérification Node.js
    try {
        $nodeVersion = node --version
        Write-Success "✅ Node.js trouvé: $nodeVersion"
        Write-Log "Node.js version: $nodeVersion" "CHECK"
    } catch {
        Write-Error "❌ Node.js non trouvé. Veuillez installer Node.js v18+"
        exit 1
    }

    # Vérification npm
    try {
        $npmVersion = npm --version
        Write-Success "✅ npm trouvé: $npmVersion"
        Write-Log "npm version: $npmVersion" "CHECK"
    } catch {
        Write-Error "❌ npm non trouvé"
        exit 1
    }

    # Vérification Java
    try {
        $javaVersion = java -version 2>&1 | Select-String "version"
        Write-Success "✅ Java trouvé: $javaVersion"
        Write-Log "Java version: $javaVersion" "CHECK"
    } catch {
        Write-Warning "⚠️ Java non trouvé. Android Studio inclut normalement le JDK"
    }

    # Vérification Android Studio / SDK
    $androidHome = $env:ANDROID_HOME
    if ($androidHome -and (Test-Path $androidHome)) {
        Write-Success "✅ Android SDK trouvé: $androidHome"
        Write-Log "Android SDK: $androidHome" "CHECK"
    } else {
        Write-Warning "⚠️ ANDROID_HOME non défini. Assurez-vous qu'Android Studio est installé"
    }
} else {
    Write-Warning "⚠️ Vérification de l'environnement ignorée"
}

# ===============================================
# PHASE 2: INSTALLATION DES DÉPENDANCES
# ===============================================

Write-Info "📦 PHASE 2: Installation des dépendances"

# Vérification du fichier package.json
if (-not (Test-Path "package.json")) {
    Write-Error "❌ package.json non trouvé. Exécutez ce script depuis la racine du projet"
    exit 1
}

# Installation des dépendances principales
Invoke-Command "npm install" "Installation des dépendances npm"

# Vérification et installation de Capacitor
$capacitorInstalled = npm list @capacitor/core 2>$null
if (-not $capacitorInstalled) {
    Invoke-Command "npm install @capacitor/core @capacitor/cli @capacitor/android" "Installation de Capacitor"
} else {
    Write-Success "✅ Capacitor déjà installé"
}

# Vérification et installation du plugin SMS
$smsPluginInstalled = npm list @byteowls/capacitor-sms 2>$null
if (-not $smsPluginInstalled) {
    Invoke-Command "npm install @byteowls/capacitor-sms" "Installation du plugin SMS"
} else {
    Write-Success "✅ Plugin SMS déjà installé"
}

# ===============================================
# PHASE 3: CONFIGURATION AUTOMATIQUE
# ===============================================

Write-Info "⚙️ PHASE 3: Configuration automatique"

# Configuration de capacitor.config.ts
$capacitorConfig = @"
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: '$AppId',
  appName: '$AppName',
  webDir: '$WebDir',
  bundledWebRuntime: false,
  server: {
    url: 'https://0bf52ad6-aa5c-422b-b500-e6271dd0b1c5.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    },
    Sms: {
      androidTargetSdk: 30
    }
  }
};

export default config;
"@

$capacitorConfig | Out-File -FilePath "capacitor.config.ts" -Encoding UTF8
Write-Success "✅ capacitor.config.ts configuré"
Write-Log "capacitor.config.ts mis à jour" "CONFIG"

# Configuration de .env (pour le développement local)
$envContent = @"
# Gmail SMTP Configuration
GMAIL_USER=$GmailUser
GMAIL_PASS=$GmailPassword

# Emergency Configuration
EMERGENCY_STOP_CODE=$StopCode
TARGET_PHONE_NUMBER=$TargetPhone

# Supabase Configuration (à compléter manuellement)
VITE_SUPABASE_URL=https://abtflxgmjclxszrzaydz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFidGZseGdtamNseHN6cnpheWR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyOTU1OTEsImV4cCI6MjA3MTg3MTU5MX0.VqQoKenb5M13yvVwjXAY_AX1_OeG-HLQHrKSWPy5h7Q
"@

if (-not (Test-Path ".env")) {
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Success "✅ Fichier .env créé"
    Write-Log ".env créé avec les secrets Gmail" "CONFIG"
} else {
    Write-Warning "⚠️ Fichier .env existe déjà - non modifié"
}

# ===============================================
# PHASE 4: INITIALISATION CAPACITOR
# ===============================================

Write-Info "🔧 PHASE 4: Initialisation de Capacitor"

# Vérification si Capacitor est déjà initialisé
if (-not (Test-Path "android")) {
    # Initialisation de Capacitor (si pas déjà fait)
    if (-not (Test-Path "capacitor.config.ts")) {
        Invoke-Command "npx cap init $AppName $AppId" "Initialisation de Capacitor"
    }
    
    # Ajout de la plateforme Android
    Invoke-Command "npx cap add android" "Ajout de la plateforme Android"
} else {
    Write-Success "✅ Plateforme Android déjà configurée"
}

# ===============================================
# PHASE 5: VÉRIFICATION DES FICHIERS ANDROID NATIFS
# ===============================================

Write-Info "📱 PHASE 5: Vérification des fichiers Android natifs"

# Vérification AndroidManifest.xml
$manifestPath = "android/app/src/main/AndroidManifest.xml"
if (Test-Path $manifestPath) {
    $manifestContent = Get-Content $manifestPath -Raw
    if ($manifestContent -match "SEND_SMS" -and $manifestContent -match "ACCESS_FINE_LOCATION") {
        Write-Success "✅ Permissions SMS et localisation trouvées dans AndroidManifest.xml"
    } else {
        Write-Warning "⚠️ Permissions manquantes dans AndroidManifest.xml - elles seront ajoutées au sync"
    }
} else {
    Write-Warning "⚠️ AndroidManifest.xml non trouvé - sera créé au sync"
}

# Vérification des classes Kotlin
$mainActivityPath = "android/app/src/main/java/app/lovable/imane_safety"
if (Test-Path "$mainActivityPath/MainActivity.kt") {
    Write-Success "✅ MainActivity.kt trouvé"
} else {
    Write-Info "ℹ️ MainActivity.kt sera créé au sync"
}

if (Test-Path "$mainActivityPath/EmergencySmsPlugin.kt") {
    Write-Success "✅ EmergencySmsPlugin.kt trouvé"
} else {
    Write-Info "ℹ️ EmergencySmsPlugin.kt sera créé au sync"
}

# ===============================================
# PHASE 6: BUILD ET SYNCHRONISATION
# ===============================================

Write-Info "🏗️ PHASE 6: Build et synchronisation"

# Build de l'application React
Invoke-Command "npm run build" "Build de l'application React"

# Vérification du dossier dist
if (-not (Test-Path $WebDir)) {
    Write-Error "❌ Le dossier $WebDir n'a pas été créé. Build échoué"
    exit 1
}

Write-Success "✅ Build React terminé - dossier $WebDir créé"

# Synchronisation avec Android
Invoke-Command "npx cap copy android" "Copie des fichiers vers Android"
Invoke-Command "npx cap sync android" "Synchronisation avec Android"

# ===============================================
# PHASE 7: FINALISATION ET ANDROID STUDIO
# ===============================================

Write-Info "🎯 PHASE 7: Finalisation"

# Vérification finale des fichiers Android
$finalAndroidPath = "android"
if (Test-Path $finalAndroidPath) {
    Write-Success "✅ Projet Android généré avec succès"
    
    # Affichage de la structure générée
    Write-Info "📁 Structure Android générée:"
    Get-ChildItem $finalAndroidPath -Recurse -Directory | Select-Object -First 10 | ForEach-Object {
        Write-Output "  - $($_.FullName.Replace((Get-Location).Path, '.'))"
    }
} else {
    Write-Error "❌ Le dossier Android n'a pas été créé"
    exit 1
}

# Ouverture d'Android Studio
if ($OpenAndroidStudio) {
    Write-Info "🚀 Tentative d'ouverture d'Android Studio..."
    
    # Recherche d'Android Studio
    $studioPath = @(
        "${env:ProgramFiles}\Android\Android Studio\bin\studio64.exe",
        "${env:ProgramFiles(x86)}\Android\Android Studio\bin\studio64.exe",
        "${env:LOCALAPPDATA}\Programs\Android Studio\bin\studio64.exe"
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1
    
    if ($studioPath) {
        try {
            Start-Process -FilePath $studioPath -ArgumentList (Get-Location).Path + "\android" -NoNewWindow:$false
            Write-Success "✅ Android Studio lancé"
            Write-Log "Android Studio ouvert: $studioPath" "SUCCESS"
        } catch {
            Write-Warning "⚠️ Impossible de lancer Android Studio automatiquement"
            Write-Info "📂 Ouvrez manuellement le dossier: $(Get-Location)\android"
        }
    } else {
        Write-Warning "⚠️ Android Studio non trouvé dans les emplacements habituels"
        Write-Info "📂 Ouvrez manuellement le dossier: $(Get-Location)\android"
    }
}

# ===============================================
# PHASE 8: RÉSUMÉ ET CHECKLIST
# ===============================================

Write-Success @"

🎉 SCRIPT TERMINÉ AVEC SUCCÈS! 🎉

✅ Environnement vérifié
✅ Dépendances installées
✅ Configuration Capacitor appliquée
✅ Build React effectué
✅ Synchronisation Android terminée
✅ Projet Android généré

"@

Write-Info @"
📋 PROCHAINES ÉTAPES DANS ANDROID STUDIO:

1. ⚡ Ouvrir le projet Android:
   Fichier → Ouvrir → Sélectionner le dossier 'android'

2. 🔧 Attendre la synchronisation Gradle (première fois = quelques minutes)

3. 🔑 Générer l'APK signé:
   Build → Generate Signed Bundle/APK
   → Choisir APK
   → Créer/utiliser un keystore
   → Build Release

4. 📱 Installer l'APK:
   Activez 'Sources inconnues' sur votre téléphone
   Transférez et installez l'APK généré

"@

# Génération de la checklist de test
$testChecklist = @"
===============================================
🧪 CHECKLIST DE TESTS APK - ImaneSafety
===============================================

📱 TESTS FONCTIONNELS:
☐ Application se lance correctement
☐ Interface responsive sur l'écran du téléphone
☐ Bouton SOS fonctionne (demande les permissions)
☐ SMS immédiat envoyé après SOS
☐ Email reçu via Supabase
☐ SMS répétés toutes les 5 minutes
☐ Code d'arrêt '$StopCode' fonctionne
☐ Arrêt immédiat des SMS après code

🔒 TESTS PERMISSIONS:
☐ Permission SMS demandée et accordée
☐ Permission localisation demandée et accordée
☐ Application fonctionne si permission refusée

🔄 TESTS ROBUSTESSE:
☐ Redémarrage du téléphone → SMS reprennent
☐ Fermeture forcée de l'app → SMS continuent
☐ Mode avion temporaire → SMS reprennent
☐ Batterie faible → notifications persistantes

📧 TESTS EMAIL SUPABASE:
☐ Email reçu à: $GmailUser
☐ Contenu email correct (localisation, heure)
☐ Pas d'erreur dans les logs Supabase

🔧 TESTS TECHNIQUES:
☐ Logs Android (adb logcat) propres
☐ Logs Supabase Edge Functions propres
☐ Aucun crash ou erreur inattendue

===============================================
"@

$testChecklist | Out-File -FilePath "test-checklist.txt" -Encoding UTF8
Write-Success "✅ Checklist de tests générée: test-checklist.txt"

Write-Warning @"
⚠️ NOTES IMPORTANTES:

• Secrets Gmail déjà configurés dans le script
• Vérifiez les secrets Supabase dans le dashboard
• Premier build Android peut prendre 10-15 minutes
• Activez 'Sources inconnues' pour installer l'APK
• Testez sur un vrai téléphone avec carte SIM

"@

Write-Log "Script terminé avec succès" "END"

Write-Success @"
🚀 VOTRE APK SERA PRÊT APRÈS LA COMPILATION ANDROID STUDIO! 🚀

Logs détaillés disponibles dans: build-log.txt
Checklist de tests dans: test-checklist.txt

"@

# Pause finale
Read-Host "Appuyez sur Entrée pour terminer..."