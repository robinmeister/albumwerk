import { ImagePriceObject, Package, PriceWithQuantity } from "../../../utils/types";

export const calculateTotalPrice = (imagePriceObjectList: ImagePriceObject[]): number => {
  let totalPrice = 0;
  imagePriceObjectList.forEach((imagePriceObject : ImagePriceObject) => {
    if(imagePriceObject.price.length > 0) {
      const prices : PriceWithQuantity[] = imagePriceObject.price;
      prices.forEach((price : PriceWithQuantity) => {
        const amount : number = parseFloat(price.amount);
        const multiplier : number = price.quantity;
        totalPrice += amount * multiplier;
      }
      );
    }
  });
  // round to 2 decimal places
  totalPrice = Math.round(totalPrice * 100) / 100;
  return totalPrice;
};

export const calculateTotalPackagePrice = (pkg: Package, numberOfImages: number) : string => {
  if (numberOfImages <= pkg.numberOfImages) {
    return pkg.totalPrice;
  } else {
    return (parseFloat(pkg.totalPrice) + (numberOfImages - pkg.numberOfImages) * parseFloat(pkg.singlePrice)).toFixed(2).toString();
  }
}
