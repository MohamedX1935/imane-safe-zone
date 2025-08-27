import { useState, useEffect } from 'react';
import { EmergencyButton } from '@/components/EmergencyButton';
import { StopAlert } from '@/components/StopAlert';
import { AlertStatus } from '@/components/AlertStatus';
import { Alert, AlertService } from '@/services/alertService';
import { Heart, Shield } from 'lucide-react';

const Index = () => {
  const [activeAlert, setActiveAlert] = useState<Alert | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkActiveAlert();
  }, []);

  const checkActiveAlert = async () => {
    try {
      setIsLoading(true);
      const alert = await AlertService.getActiveAlert();
      setActiveAlert(alert);
    } catch (error) {
      console.error('Error checking active alert:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAlertCreated = async (alertId: string) => {
    const alert = await AlertService.getAlert(alertId);
    setActiveAlert(alert);
  };

  const handleAlertStopped = () => {
    setActiveAlert(null);
  };

  const refreshAlert = async () => {
    if (activeAlert) {
      const updated = await AlertService.getAlert(activeAlert.id);
      setActiveAlert(updated);
    }
  };

  // Auto-refresh alert status every 30 seconds
  useEffect(() => {
    if (activeAlert && activeAlert.status === 'active') {
      const interval = setInterval(refreshAlert, 30000);
      return () => clearInterval(interval);
    }
  }, [activeAlert]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="w-12 h-12 text-primary" />
            <h1 className="text-4xl font-bold text-primary">ImaneSafety</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Application d'urgence pour Imane. Envoi automatique de votre position par SMS et email en cas de danger.
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto space-y-8">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Vérification des alertes actives...</p>
            </div>
          ) : activeAlert ? (
            <div className="space-y-8">
              {/* Reassuring Message */}
              {activeAlert.status === 'active' && (
                <div className="text-center bg-white/80 rounded-2xl p-8 shadow-lg">
                  <Heart className="w-16 h-16 text-pink-500 mx-auto mb-4 animate-pulse" />
                  <h2 className="text-2xl font-bold text-primary mb-3">
                    Imane, reste calme, ton alerte a été envoyée et tu es en sécurité.
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    Tes contacts d'urgence ont été prévenus. L'aide arrive.
                  </p>
                </div>
              )}

              {/* Alert Status */}
              <div className="grid md:grid-cols-2 gap-8">
                <AlertStatus alert={activeAlert} />
                
                {/* Stop Controls */}
                {activeAlert.status === 'active' && (
                  <StopAlert 
                    alertId={activeAlert.id}
                    onAlertStopped={handleAlertStopped}
                  />
                )}
              </div>

              {/* Show SOS again if alert is stopped or done */}
              {activeAlert.status !== 'active' && (
                <div className="text-center pt-8">
                  <EmergencyButton 
                    onAlertCreated={handleAlertCreated}
                  />
                </div>
              )}
            </div>
          ) : (
            /* No Active Alert - Show SOS Button */
            <div className="text-center space-y-8">
              <EmergencyButton 
                onAlertCreated={handleAlertCreated}
              />
              
              {/* Safety Information */}
              <div className="bg-white/80 rounded-xl p-6 max-w-2xl mx-auto shadow-lg">
                <h3 className="text-lg font-semibold mb-4 text-center">ℹ️ Comment ça marche</h3>
                <div className="text-sm text-muted-foreground space-y-2 text-left">
                  <p>• <strong>Appui SOS</strong> : Envoi immédiat de votre position GPS</p>
                  <p>• <strong>Envois automatiques</strong> : Toutes les 5 minutes pendant 2 heures</p>
                  <p>• <strong>Contacts d'urgence</strong> : SMS et email automatiques</p>
                  <p>• <strong>Arrêt sécurisé</strong> : Code secret pour stopper l'alerte</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-16 pt-8 border-t border-muted">
          <p className="text-xs text-muted-foreground">
            ImaneSafety - Application d'urgence sécurisée
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
