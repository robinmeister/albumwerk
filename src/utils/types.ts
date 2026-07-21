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
}

export type TableOrder = {
  id: string;
  userId: string;
  shootingId: string;
  userEmail?: string;
  shootingTitle?: string;
  totalPrice: number;
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
