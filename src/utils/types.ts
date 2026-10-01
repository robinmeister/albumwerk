export type Package = {
  id: string;
  title: string;
  numberOfImages: number;
  totalPrice: string;
  singlePrice: string;
  description?: string;
};

export type Price = {
  id: string;
  title: string;
  description: string;
  amount: string;
  isDownloadable: boolean;
  // catalog fields: product type + physical size ("13×18 cm")
  category?: "digital" | "print" | "canvas" | "poster" | "other";
  size?: string;
  labSku?: string;
}

export type ImagePriceObject = {
  image: string;
  price: PriceWithQuantity[];
  filePath?: string;
}

export type PriceWithQuantity = {
  id: string;
  title: string;
  description: string;
  amount: string;
  isDownloadable: boolean;
  labSku?: string;
  quantity: number;
}

export type User = {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  phone?: string;
  state?: string;
  city?: string;
  street?: string;
  zip?: string;
  country?: string;
  shootingIds?: string[];
  downloadableImages?: string[];
}

export type Shooting = {
  id: string;
  type: string;
  title: string;
  description: string;
  packageId: string;
  priceIds: string[];
  userIds: string[];
  withUserSelection: boolean;
}

export type Order = {
  id: string;
  imagePriceObjectList: string;
  shootingId: string;
  userId: string;
  shipping?: number;
}

export type TableOrder = {
  id: string;
  userId: string;
  shootingId: string;
  userEmail?: string;
  shootingTitle?: string;
  totalPrice: number;
  // bezahlter Versand, steckt schon in totalPrice
  shipping?: number;
  finished: boolean;
  imagePriceObjectList?: string;
}

export type FinishedOrder = {
  id: string;
  orderId: string;
  userId: string;
  shootingId: string;
  imagePriceObjectList: string;
  userEmail: string;
  shootingTitle: string;
  totalPrice: number;
  finished: boolean;
}

export type UserOrder = {
  user: string;
  orderValue: number;
}

// --- Support (pb_migrations/1784600008_support.js) --------------------------

export type SupportCategory = "technical" | "album" | "order" | "billing" | "other";
export type SupportStatus = "open" | "waiting" | "resolved" | "closed";
type SupportTarget = "admin" | "vendor";
type SupportForwardState = "none" | "sent" | "failed";

export type SupportTicket = {
  id: string;
  userId: string;
  subject: string;
  category: SupportCategory;
  target: SupportTarget;
  status: SupportStatus;
  context: unknown;
  consentForward: boolean;
  forwardState: SupportForwardState;
  forwardedAt: string;
  forwardRef: string;
  forwardError: string;
  lastMessageAt: string;
  unreadForAdmin: boolean;
  unreadForUser: boolean;
  created: string;
  updated: string;
  expand?: { userId?: { id: string; email: string; firstName?: string; lastName?: string } };
}

export type SupportMessage = {
  id: string;
  ticketId: string;
  authorId: string;
  authorRole: "user" | "admin" | "vendor";
  body: string;
  created: string;
}
