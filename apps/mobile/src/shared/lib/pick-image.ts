import { IMAGE_TOO_LARGE_COPY, LIMITS } from "@spring/shared";
import * as DocumentPicker from "expo-document-picker";
import { EncodingType, readAsStringAsync } from "expo-file-system/legacy";
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

export async function pickPdf(): Promise<{ mime: "application/pdf"; data: string; name: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/pdf",
    copyToCacheDirectory: true,
    multiple: false,
    base64: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  if (asset.size != null && asset.size > LIMITS.uploadMaxBytes) {
    throw new Error(IMAGE_TOO_LARGE_COPY);
  }
  const name = asset.name && asset.name.toLowerCase().endsWith(".pdf") ? asset.name : "document.pdf";
  let data = (asset.base64 ?? "").replace(/\s/g, "");
  if (!data && asset.uri.startsWith("data:")) {
    const comma = asset.uri.indexOf(",");
    data = comma >= 0 ? asset.uri.slice(comma + 1).replace(/\s/g, "") : "";
  }
  if (!data && asset.file) {
    data = uint8ToBase64(new Uint8Array(await asset.file.arrayBuffer()));
  }
  if (!data) {
    data = await readAsStringAsync(asset.uri, { encoding: EncodingType.Base64 });
  }
  if (!data) return null;
  if (Math.floor(data.length * 0.75) > LIMITS.uploadMaxBytes) {
    throw new Error(IMAGE_TOO_LARGE_COPY);
  }
  return { mime: "application/pdf", data, name };
}

function uint8ToBase64(bytes: Uint8Array): string {
  const chunk = 0x8000;
  const parts: string[] = [];
  for (let index = 0; index < bytes.length; index += chunk) {
    parts.push(String.fromCharCode(...bytes.subarray(index, index + chunk)));
  }
  return btoa(parts.join(""));
}
