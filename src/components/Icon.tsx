import React from 'react';
import {
  LayoutDashboard,
  Library,
  PenTool,
  PieChart,
  Palette,
  ImagePlus,
  Upload,
  Images,
  Send,
  Heart,
  Clock,
  Check,
  Link,
  MessageSquare,
  User,
  Bell,
  Search,
  ChevronDown,
  Star,
  X,
  ArrowRight,
  LogOut,
  Mail,
  Bot,
  CheckCircle,
  Globe,
  Camera,
  AlertCircle,
  Download,
  Loader2,
  FileText
} from 'lucide-react';

interface IconProps {
  name: string;
  className?: string;
  style?: React.CSSProperties;
  fill?: boolean; // Lucide doesn't have 'fill' usually, but we can style fill
  size?: number | string;
}

const iconMap: { [key: string]: React.ElementType } = {
  'dashboard': LayoutDashboard,
  'library_books': Library,
  'stylus': PenTool,
  'pie_chart': PieChart,
  'palette': Palette,
  'add_photo_alternate': ImagePlus,
  'upload_file': Upload,
  'perm_media': Images,
  'send': Send,
  'favorite': Heart,
  'pending': Clock,
  'check': Check,
  'link': Link,
  'rate_review': MessageSquare,
  'person': User,
  'notifications': Bell,
  'search': Search,
  'expand_more': ChevronDown,
  'star': Star,
  'close': X,
  'arrow_forward': ArrowRight,
  'logout': LogOut,
  'mail': Mail,
  'smart_toy': Bot,
  'check_circle': CheckCircle,
  'public': Globe,
  'photo_camera': Camera,
  'error': AlertCircle,
  'download': Download,
  'refresh': Loader2,
  'description': FileText
};

export const Icon: React.FC<IconProps> = ({
  name,
  className = '',
  style = {},
  fill = false,
  size = 24
}) => {
  const LucideIcon = iconMap[name] || AlertCircle; // Fallback to AlertCircle if not found

  // Handle size prop logic
  const iconSize = typeof size === 'string' ? parseInt(size.replace('px', ''), 10) || 24 : size;

  return (
    <LucideIcon
      className={className}
      style={style}
      size={iconSize}
      fill={fill ? "currentColor" : "none"} // Lucide fill property fills the SVG path
    />
  );
};

export default Icon;
