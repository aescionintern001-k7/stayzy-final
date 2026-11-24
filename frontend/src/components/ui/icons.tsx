import React from "react";
import type { LucideIcon, LucideProps } from "lucide-react";
import {
  Search,
  MapPin,
  Navigation,
  Home,
  Building2,
  Building,
  BedDouble,
  Bed,
  Calendar,
  CalendarDays,
  Clock,
  Users,
  Heart,
  Star,
  Wifi,
  Utensils,
  Wind,
  ShowerHead,
  Shield,
  ShieldCheck,
  CreditCard,
  IndianRupee,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ArrowLeft,
  Menu,
  X,
  Check,
  CheckCircle2,
  CheckCircle,
  AlertCircle,
  Info,
  HelpCircle,
  Phone,
  Mail,
  User,
  UserCheck,
  UserRound,
  Settings,
  Bell,
  Camera,
  Image,
  Eye,
  EyeOff,
  Plus,
  Minus,
  Pencil,
  Trash2,
  Trash,
  Loader2,
  Lock,
  LogOut,
  Zap,
  Laptop,
  KeyRound,
  Shirt,
  Compass,
  RotateCcw,
} from "lucide-react";

/**
 * Standardized icon size scales:
 * - sm: 14px (inline metadata, micro tags, status pills)
 * - md: 18px (standard controls, button labels, table cells)
 * - lg: 22px (navigation links, tab headers, highlighted cards)
 * - xl: 32px (hero highlights, modal banners, empty states)
 */
export type IconSize = "sm" | "md" | "lg" | "xl" | number;

export interface IconProps extends Omit<LucideProps, "size"> {
  size?: IconSize;
  className?: string;
}

export function getIconSizeAndStroke(
  size: IconSize = "md",
  customStroke?: number | string
): { size: number; strokeWidth: number | string } {
  if (typeof size === "number") {
    return {
      size,
      strokeWidth: customStroke ?? (size >= 32 ? 1.5 : size >= 20 ? 1.75 : 2),
    };
  }

  switch (size) {
    case "sm":
      return { size: 14, strokeWidth: customStroke ?? 2 };
    case "md":
      return { size: 18, strokeWidth: customStroke ?? 1.8 };
    case "lg":
      return { size: 22, strokeWidth: customStroke ?? 1.75 };
    case "xl":
      return { size: 32, strokeWidth: customStroke ?? 1.5 };
    default:
      return { size: 18, strokeWidth: customStroke ?? 1.8 };
  }
}

/**
 * Creates a standardized Stayzy icon component wrapping a Lucide icon.
 */
function createIcon(IconComponent: LucideIcon) {
  const WrappedIcon = React.forwardRef<SVGSVGElement, IconProps>(
    ({ size = "md", strokeWidth: customStroke, className, ...props }, ref) => {
      const { size: pixelSize, strokeWidth: defaultStroke } = getIconSizeAndStroke(
        size,
        customStroke
      );
      return (
        <IconComponent
          ref={ref}
          size={pixelSize}
          strokeWidth={customStroke ?? defaultStroke}
          className={className}
          aria-hidden={props["aria-label"] ? undefined : true}
          {...props}
        />
      );
    }
  );
  WrappedIcon.displayName = `Icon(${IconComponent.displayName || IconComponent.name || "Lucide"})`;
  return WrappedIcon;
}

// Direct Named Icon Components
export const SearchIcon = createIcon(Search);
export const MapPinIcon = createIcon(MapPin);
export const NavigationIcon = createIcon(Navigation);
export const HomeIcon = createIcon(Home);
export const BuildingIcon = createIcon(Building2);
export const BuildingSimpleIcon = createIcon(Building);
export const BedIcon = createIcon(BedDouble);
export const BedSimpleIcon = createIcon(Bed);
export const CalendarIcon = createIcon(Calendar);
export const CalendarDaysIcon = createIcon(CalendarDays);
export const ClockIcon = createIcon(Clock);
export const UsersIcon = createIcon(Users);
export const HeartIcon = createIcon(Heart);
export const StarIcon = createIcon(Star);
export const WifiIcon = createIcon(Wifi);
export const UtensilsIcon = createIcon(Utensils);
export const WindIcon = createIcon(Wind);
export const ShowerIcon = createIcon(ShowerHead);
export const ShieldIcon = createIcon(Shield);
export const ShieldCheckIcon = createIcon(ShieldCheck);
export const CreditCardIcon = createIcon(CreditCard);
export const RupeeIcon = createIcon(IndianRupee);
export const FilterIcon = createIcon(Filter);
export const SlidersIcon = createIcon(SlidersHorizontal);
export const ChevronDownIcon = createIcon(ChevronDown);
export const ChevronRightIcon = createIcon(ChevronRight);
export const ChevronLeftIcon = createIcon(ChevronLeft);
export const ArrowRightIcon = createIcon(ArrowRight);
export const ArrowLeftIcon = createIcon(ArrowLeft);
export const MenuIcon = createIcon(Menu);
export const XIcon = createIcon(X);
export const CheckIcon = createIcon(Check);
export const CheckCircleIcon = createIcon(CheckCircle2);
export const CheckCircleSimpleIcon = createIcon(CheckCircle);
export const AlertCircleIcon = createIcon(AlertCircle);
export const InfoIcon = createIcon(Info);
export const HelpCircleIcon = createIcon(HelpCircle);
export const PhoneIcon = createIcon(Phone);
export const MailIcon = createIcon(Mail);
export const UserIcon = createIcon(User);
export const UserCheckIcon = createIcon(UserCheck);
export const UserRoundIcon = createIcon(UserRound);
export const SettingsIcon = createIcon(Settings);
export const BellIcon = createIcon(Bell);
export const CameraIcon = createIcon(Camera);
export const ImageIcon = createIcon(Image);
export const EyeIcon = createIcon(Eye);
export const EyeOffIcon = createIcon(EyeOff);
export const PlusIcon = createIcon(Plus);
export const MinusIcon = createIcon(Minus);
export const PencilIcon = createIcon(Pencil);
export const TrashIcon = createIcon(Trash2);
export const TrashSimpleIcon = createIcon(Trash);
export const LoaderIcon = createIcon(Loader2);
export const LockIcon = createIcon(Lock);
export const LogOutIcon = createIcon(LogOut);
export const ZapIcon = createIcon(Zap);
export const LaptopIcon = createIcon(Laptop);
export const KeyRoundIcon = createIcon(KeyRound);
export const ShirtIcon = createIcon(Shirt);
export const CompassIcon = createIcon(Compass);
export const RotateCcwIcon = createIcon(RotateCcw);

/**
 * Centralized Icons dictionary for structured imports:
 * `import { Icons } from '@/components/ui/icons'`
 */
export const Icons = {
  // Discovery & Location
  Search: SearchIcon,
  MapPin: MapPinIcon,
  Navigation: NavigationIcon,
  Compass: CompassIcon,

  // Accommodation & Inventory
  Home: HomeIcon,
  Building: BuildingIcon,
  BuildingSimple: BuildingSimpleIcon,
  Bed: BedIcon,
  BedSimple: BedSimpleIcon,

  // Schedule & Time
  Calendar: CalendarIcon,
  CalendarDays: CalendarDaysIcon,
  Clock: ClockIcon,

  // Social & Community
  Users: UsersIcon,
  Heart: HeartIcon,
  Star: StarIcon,

  // Living Amenities
  Wifi: WifiIcon,
  Utensils: UtensilsIcon,
  Wind: WindIcon,
  Shower: ShowerIcon,
  ShowerHead: ShowerIcon,
  Shield: ShieldIcon,
  ShieldCheck: ShieldCheckIcon,
  Zap: ZapIcon,
  Laptop: LaptopIcon,
  KeyRound: KeyRoundIcon,
  Shirt: ShirtIcon,

  // Financial & Transactions
  CreditCard: CreditCardIcon,
  Rupee: RupeeIcon,

  // Filtering & Controls
  Filter: FilterIcon,
  Sliders: SlidersIcon,
  ChevronDown: ChevronDownIcon,
  ChevronRight: ChevronRightIcon,
  ChevronLeft: ChevronLeftIcon,
  ArrowRight: ArrowRightIcon,
  ArrowLeft: ArrowLeftIcon,
  Menu: MenuIcon,
  X: XIcon,

  // Feedback & Statuses
  Check: CheckIcon,
  CheckCircle: CheckCircleIcon,
  CheckCircleSimple: CheckCircleSimpleIcon,
  AlertCircle: AlertCircleIcon,
  Info: InfoIcon,
  HelpCircle: HelpCircleIcon,

  // Contact & Profile
  Phone: PhoneIcon,
  Mail: MailIcon,
  User: UserIcon,
  UserCheck: UserCheckIcon,
  UserRound: UserRoundIcon,
  Settings: SettingsIcon,
  Bell: BellIcon,

  // Media
  Camera: CameraIcon,
  Image: ImageIcon,
  Eye: EyeIcon,
  EyeOff: EyeOffIcon,

  // CRUD & Operations
  Plus: PlusIcon,
  Minus: MinusIcon,
  Pencil: PencilIcon,
  Trash: TrashIcon,
  TrashSimple: TrashSimpleIcon,
  Loader: LoaderIcon,
  RotateCcw: RotateCcwIcon,
  Refresh: RotateCcwIcon,
  Lock: LockIcon,
  LogOut: LogOutIcon,
};
