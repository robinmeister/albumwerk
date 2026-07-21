import { deleteImageByUrl } from "../../../config/storage-compat";

import { Shooting } from "../../../utils/types";

export const emptyShooting: Shooting = {
  id: "",
  type: "",
  title: "",
  description: "",
  packageId: "",
  priceIds: [],
  userIds: [],
  withUserSelection: false,
}

export const handleDelete = async (
    selected: string[],
    _selectedShootingId: string,
    onSuccess: () => void,
    onError: (error: unknown) => void
): Promise<void> => {
    await Promise.all(
      selected.map(async (image) => {
        try {
          await deleteImageByUrl(image);
          onSuccess();
        } catch (error) {
          onError(error);
        }
      })
    );
};
