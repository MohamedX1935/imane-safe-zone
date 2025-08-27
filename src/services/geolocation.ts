export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface LocationError {
  code: number;
  message: string;
}

export class GeolocationService {
  private static readonly options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 20000,
    maximumAge: 0
  };

  private static readonly ACCURACY_THRESHOLD = 50; // meters

  static async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      let bestLocation: LocationData | null = null;
      let timeoutId: NodeJS.Timeout;
      let watchId: number;

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (watchId) navigator.geolocation.clearWatch(watchId);
      };

      const handleSuccess = (position: GeolocationPosition) => {
        const location: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };

        // If accuracy is good enough, return immediately
        if (location.accuracy <= this.ACCURACY_THRESHOLD) {
          cleanup();
          resolve(location);
          return;
        }

        // Store best location so far
        if (!bestLocation || location.accuracy < bestLocation.accuracy) {
          bestLocation = location;
        }
      };

      const handleError = (error: GeolocationPositionError) => {
        cleanup();
        
        // If we have a location, use it
        if (bestLocation) {
          resolve(bestLocation);
          return;
        }

        reject({
          code: error.code,
          message: this.getErrorMessage(error.code)
        } as LocationError);
      };

      // Set timeout to return best location after 20 seconds
      timeoutId = setTimeout(() => {
        cleanup();
        if (bestLocation) {
          resolve(bestLocation);
        } else {
          reject(new Error('Location timeout - no position acquired'));
        }
      }, 20000);

      // Start watching position
      watchId = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        this.options
      );
    });
  }

  static createGoogleMapsLink(latitude: number, longitude: number): string {
    return `https://maps.google.com/?q=${latitude},${longitude}`;
  }

  static formatLocationMessage(location: LocationData): string {
    const mapsLink = this.createGoogleMapsLink(location.latitude, location.longitude);
    const timestamp = new Date(location.timestamp).toLocaleString('fr-FR');
    
    return `🚨 ALERTE URGENCE IMANE 🚨

Position GPS:
• Latitude: ${location.latitude.toFixed(6)}
• Longitude: ${location.longitude.toFixed(6)}
• Précision: ${location.accuracy.toFixed(0)}m
• Heure: ${timestamp}

Lien Google Maps:
${mapsLink}

Ceci est un message d'urgence automatique envoyé par ImaneSafety.`;
  }

  private static getErrorMessage(code: number): string {
    switch (code) {
      case 1:
        return 'Permission de géolocalisation refusée';
      case 2:
        return 'Position non disponible';
      case 3:
        return 'Timeout de géolocalisation';
      default:
        return 'Erreur de géolocalisation inconnue';
    }
  }
}