import React from 'react';
import {
  Zap,
  Cpu,
  MessageCircle,
  ShieldCheck,
  Lock,
  Navigation,
  Activity,
  CreditCard,
  Gamepad2,
  Calculator,
  Smartphone,
  MapPin,
  Camera,
  Mic,
  Users,
  FolderArchive,
  MessageSquareText,
  Sliders,
  Bluetooth,
  Bell,
  History,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

interface AppIconProps {
  name: string;
  className?: string;
}

export const AppIcon: React.FC<AppIconProps> = ({ name, className = 'w-5 h-5' }) => {
  switch (name) {
    case 'Zap':
      return <Zap className={className} />;
    case 'Cpu':
      return <Cpu className={className} />;
    case 'MessageCircle':
      return <MessageCircle className={className} />;
    case 'ShieldCheck':
      return <ShieldCheck className={className} />;
    case 'Lock':
      return <Lock className={className} />;
    case 'Navigation':
      return <Navigation className={className} />;
    case 'Activity':
      return <Activity className={className} />;
    case 'CreditCard':
      return <CreditCard className={className} />;
    case 'Gamepad2':
      return <Gamepad2 className={className} />;
    case 'Calculator':
      return <Calculator className={className} />;
    case 'MapPin':
      return <MapPin className={className} />;
    case 'Camera':
      return <Camera className={className} />;
    case 'Mic':
      return <Mic className={className} />;
    case 'Users':
      return <Users className={className} />;
    case 'FolderArchive':
      return <FolderArchive className={className} />;
    case 'MessageSquareText':
      return <MessageSquareText className={className} />;
    case 'Sliders':
      return <Sliders className={className} />;
    case 'Bluetooth':
      return <Bluetooth className={className} />;
    case 'Bell':
      return <Bell className={className} />;
    case 'History':
      return <History className={className} />;
    case 'CheckCircle2':
      return <CheckCircle2 className={className} />;
    case 'AlertTriangle':
      return <AlertTriangle className={className} />;
    case 'XCircle':
      return <XCircle className={className} />;
    default:
      return <Smartphone className={className} />;
  }
};
