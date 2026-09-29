import * as ImagePicker from "expo-image-picker";

export type AttachKind = "camera" | "library";

export async function pickPhoto(
  kind: AttachKind,
): Promise<{ mime: "image/jpeg" | "image/png" | "image/webp"; data: string } | null> {
  if (kind === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return null;
  } else {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return null;
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    quality: 0.8,
    base64: true,
  };
  const result =
    kind === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset?.base64) return null;
  const mime =
    asset.mimeType === "image/png" || asset.mimeType === "image/webp" || asset.mimeType === "image/jpeg"
      ? asset.mimeType
      : "image/jpeg";
  return { mime, data: asset.base64 };
}
