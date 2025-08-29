import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, MapPin, Mail, MessageSquare, CheckCircle } from 'lucide-react';
import { Alert, AlertService } from '@/services/alertService';
import { GeolocationService } from '@/services/geolocation';

interface AlertStatusProps {
  alert: Alert;
}

export const AlertStatus = ({ alert }: AlertStatusProps) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [nextSend, setNextSend] = useState<Date | null>(null);

  useEffect(() => {
    const updateTimes = () => {
      const now = new Date();
      const endTime = new Date(alert.end_at);
      const remainingMs = endTime.getTime() - now.getTime();

      if (remainingMs > 0) {
        const hours = Math.floor(remainingMs / (1000 * 60 * 60));
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining('Expiré');
      }

      setNextSend(AlertService.calculateNextSend(alert));
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000);

    return () => clearInterval(interval);
  }, [alert]);

  const getStatusColor = () => {
    switch (alert.status) {
      case 'active':
        return 'destructive';
      case 'stopped':
        return 'secondary';
      case 'done':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusText = () => {
    switch (alert.status) {
      case 'active':
        return 'ALERTE ACTIVE';
      case 'stopped':
        return 'ARRÊTÉE';
      case 'done':
        return 'TERMINÉE';
      default:
        return 'STATUT INCONNU';
    }
  };

  const remainingAlerts = AlertService.getRemainingAlerts(alert);
  const mapsLink = alert.latitude && alert.longitude 
    ? GeolocationService.createGoogleMapsLink(alert.latitude, alert.longitude)
    : null;

  return (
    <Card className={`status-card ${alert.status === 'active' ? 'status-active' : 'status-safe'}`}>
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          {alert.status === 'active' ? (
            <AlertTriangle className="w-5 h-5 text-primary" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-600" />
          )}
          Statut d'alerte
        </CardTitle>
        <Badge variant={getStatusColor()} className="mx-auto">
          {getStatusText()}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Alert Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Envois effectués</span>
            <span className="font-semibold">{alert.total_sent} / {alert.max_sends}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(alert.total_sent / alert.max_sends) * 100}%` }}
            />
          </div>
        </div>

        {/* Time Information */}
        {alert.status === 'active' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div className="text-center sm:text-left">
                <p className="font-medium">Temps restant</p>
                <p className="text-primary font-bold">{timeRemaining}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <div className="text-center sm:text-left">
                <p className="font-medium">Envois restants</p>
                <p className="text-secondary font-bold">{remainingAlerts}</p>
              </div>
            </div>
          </div>
        )}

        {/* Next Send Time */}
        {nextSend && alert.status === 'active' && (
          <div className="text-center p-2 sm:p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-xs sm:text-sm font-medium text-orange-800">
              Prochain envoi: {nextSend.toLocaleTimeString('fr-FR')}
            </p>
          </div>
        )}

        {/* Last Sent */}
        {alert.last_sent && (
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground justify-center sm:justify-start">
            <Mail className="w-4 h-4" />
            <span>Dernier envoi: {new Date(alert.last_sent).toLocaleString('fr-FR')}</span>
          </div>
        )}

        {/* Location */}
        {alert.latitude && alert.longitude && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="w-4 h-4" />
              Position enregistrée
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Lat: {alert.latitude.toFixed(6)}</p>
              <p>Lng: {alert.longitude.toFixed(6)}</p>
              {alert.accuracy && <p>Précision: {alert.accuracy.toFixed(0)}m</p>}
            </div>
            {mapsLink && (
              <a 
                href={mapsLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block text-xs bg-primary text-primary-foreground px-3 py-1 rounded hover:bg-primary/90 transition-colors"
              >
                🗺️ Voir sur Google Maps
              </a>
            )}
          </div>
        )}

        {/* Contact Info */}
        <div className="text-xs text-muted-foreground space-y-1 border-t pt-3 text-center sm:text-left">
          <p>📱 SMS: {alert.emergency_number}</p>
          <p>📧 Email: {alert.emergency_email}</p>
        </div>
      </CardContent>
    </Card>
  );
};